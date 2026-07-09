import prisma from '../config/database';
import { CreateResourceDTO, UpdateResourceDTO, ResourceFilters } from '../types/resource.types';

export class ResourceService {
  parseResource(resource: any) {
    if (!resource) return null;
    const parsed = { ...resource };
    if (typeof parsed.amenities === 'string') {
      try {
        parsed.amenities = JSON.parse(parsed.amenities);
      } catch {
        parsed.amenities = [];
      }
    }
    return parsed;
  }

  async createResource(data: CreateResourceDTO, managedBy: string) {
    const resource = await prisma.resource.create({
      data: {
        name: data.name,
        type: data.type,
        capacity: data.capacity,
        location: data.location,
        amenities: data.amenities ? JSON.stringify(data.amenities) : JSON.stringify([]),
        bufferMinutes: data.bufferMinutes || 0,
        status: data.status || 'Available',
        managedBy,
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    
    return this.parseResource(resource);
  }
  
  async getResourceById(id: string) {
    const resource = await prisma.resource.findUnique({
      where: { id, deletedAt: null },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        images: true,
        sensors: {
          select: { id: true, sensorType: true, isOnline: true },
        },
      },
    });
    
    return this.parseResource(resource);
  }
  
  async listResources(filters: ResourceFilters, page = 1, limit = 50) {
    const where: any = {
      deletedAt: null,
    };
    
    if (filters.type) {
      where.type = filters.type;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.minCapacity || filters.maxCapacity) {
      where.capacity = {};
      if (filters.minCapacity) where.capacity.gte = filters.minCapacity;
      if (filters.maxCapacity) where.capacity.lte = filters.maxCapacity;
    }
    
    if (filters.location) {
      where.location = {
        contains: filters.location,
      };
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { location: { contains: filters.search } },
      ];
    }
    
    const resources = await prisma.resource.findMany({
      where,
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        images: {
          take: 1,
          orderBy: { uploadedAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    let parsedResources = resources.map(r => this.parseResource(r));
    
    if (filters.amenities && filters.amenities.length > 0) {
      parsedResources = parsedResources.filter((r: any) => {
        const resourceAmenities = r.amenities || [];
        return filters.amenities!.every(a => resourceAmenities.includes(a));
      });
    }
    
    const total = parsedResources.length;
    const skip = (page - 1) * limit;
    const paginated = parsedResources.slice(skip, skip + limit);
    
    return {
      resources: paginated,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  async updateResource(id: string, data: UpdateResourceDTO, version: number) {
    const existing = await prisma.resource.findUnique({
      where: { id },
      select: { version: true, deletedAt: true },
    });
    
    if (!existing) {
      throw new Error('Resource not found');
    }
    
    if (existing.deletedAt) {
      throw new Error('Cannot update deleted resource');
    }
    
    if (existing.version !== version) {
      throw new Error('Resource was updated by another user. Please refresh and try again.');
    }
    
    const updateData: any = { ...data };
    if (data.amenities) {
      updateData.amenities = JSON.stringify(data.amenities);
    }
    
    const updated = await prisma.resource.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    
    return this.parseResource(updated);
  }
  
  async deleteResource(id: string) {
    const resource = await prisma.resource.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'Unavailable',
      },
    });
    
    return this.parseResource(resource);
  }

  async getVacantClassrooms() {
    const classrooms = await prisma.resource.findMany({
      where: {
        type: 'Classroom',
        deletedAt: null,
        status: 'Available',
      },
    });

    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const vacantClassrooms = [];

    const formatTime = (d: Date) => {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    for (const r of classrooms) {
      const bookings = await prisma.booking.findMany({
        where: {
          resourceId: r.id,
          status: 'Confirmed',
          startTime: { lte: endOfDay },
          endTime: { gte: now },
        },
        orderBy: { startTime: 'asc' },
      });

      const maintenance = await prisma.maintenanceSchedule.findMany({
        where: {
          resourceId: r.id,
          status: { in: ['Scheduled', 'In_Progress'] },
          startTime: { lte: endOfDay },
          endTime: { gte: now },
        },
        orderBy: { startTime: 'asc' },
      });

      const blockouts = [
        ...bookings.map(b => ({ startTime: b.startTime, endTime: b.endTime, type: 'Booking' })),
        ...maintenance.map(m => ({ startTime: m.startTime, endTime: m.endTime, type: 'Maintenance' })),
      ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      const currentBlockout = blockouts.find(b => b.startTime <= now && b.endTime >= now);

      if (currentBlockout) {
        vacantClassrooms.push({
          ...this.parseResource(r),
          isVacant: false,
          currentStatus: 'Occupied',
          until: currentBlockout.endTime,
          message: `Occupied until ${formatTime(currentBlockout.endTime)}`,
        });
      } else {
        const nextBlockout = blockouts.find(b => b.startTime > now);
        if (nextBlockout) {
          const diffMs = nextBlockout.startTime.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

          vacantClassrooms.push({
            ...this.parseResource(r),
            isVacant: true,
            currentStatus: 'Vacant',
            until: nextBlockout.startTime,
            message: `Vacant for the next ${durationStr}`,
          });
        } else {
          vacantClassrooms.push({
            ...this.parseResource(r),
            isVacant: true,
            currentStatus: 'Vacant',
            until: null,
            message: 'Vacant for the rest of the day',
          });
        }
      }
    }

    return vacantClassrooms;
  }
}

export default new ResourceService();
