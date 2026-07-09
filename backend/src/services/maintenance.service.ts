import prisma from '../config/database';
import notificationService from './notification.service';

export class MaintenanceService {
  async scheduleMaintenance(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    reason: string,
    createdBy: string,
    notes?: string
  ) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId, deletedAt: null },
    });

    if (!resource) {
      throw new Error('Resource not found');
    }

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        resourceId,
        startTime,
        endTime,
        reason,
        notes: notes || '',
        createdBy,
        status: 'Scheduled',
      },
    });

    // Check if maintenance is current (start <= now <= end), and update resource status
    const now = new Date();
    if (startTime <= now && endTime >= now) {
      await prisma.resource.update({
        where: { id: resourceId },
        data: { status: 'Maintenance' },
      });
    }

    // Identify and cancel overlapping bookings
    const overlapping = await prisma.booking.findMany({
      where: {
        resourceId,
        status: 'Confirmed',
        OR: [
          { startTime: { gte: startTime, lt: endTime } },
          { endTime: { gt: startTime, lte: endTime } },
          { AND: [{ startTime: { lte: startTime } }, { endTime: { gte: endTime } }] },
        ],
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    for (const booking of overlapping) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'Cancelled',
          cancellationReason: `Cancelled due to scheduled resource maintenance: ${reason}`,
          cancelledAt: new Date(),
        },
      });

      // Query alternative suggestion resources
      const alternatives = await prisma.resource.findMany({
        where: {
          type: resource.type,
          capacity: resource.capacity ? { gte: resource.capacity } : undefined,
          status: 'Available',
          id: { not: resourceId },
          deletedAt: null,
        },
        take: 3,
      });

      // Send notification with suggestions (Requirement 16.4)
      await notificationService.enqueueNotification(
        booking.userId,
        'maintenance_alert',
        'email',
        booking.user.email,
        {
          bookingId: booking.id,
          resourceName: resource.name,
          startTime: booking.startTime,
          reason,
          alternatives: alternatives.map(r => ({ id: r.id, name: r.name, location: r.location })),
        }
      );
    }

    return schedule;
  }

  async completeMaintenance(scheduleId: string, completionNotes: string) {
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Maintenance schedule not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.maintenanceSchedule.update({
        where: { id: scheduleId },
        data: {
          status: 'Completed',
          notes: completionNotes,
          updatedAt: new Date(),
        },
      });

      // Check if there are other scheduled/in progress maintenance slots
      const activeCount = await tx.maintenanceSchedule.count({
        where: {
          resourceId: schedule.resourceId,
          status: { in: ['Scheduled', 'In_Progress'] },
          startTime: { lte: new Date() },
          endTime: { gte: new Date() },
        },
      });

      if (activeCount === 0) {
        await tx.resource.update({
          where: { id: schedule.resourceId },
          data: { status: 'Available' },
        });
      }
    });
  }
}

export default new MaintenanceService();
