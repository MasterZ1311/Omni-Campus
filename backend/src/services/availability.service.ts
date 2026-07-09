import prisma from '../config/database';
import { redisClient } from '../config/redis.config';

export class AvailabilityService {
  async getResourceAvailability(resourceId: string, startDate: Date, endDate: Date) {
    const cacheKey = `availability:${resourceId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId, deletedAt: null },
    });
    
    if (!resource) {
      throw new Error('Resource not found');
    }
    
    const bookings = await prisma.booking.findMany({
      where: {
        resourceId,
        status: 'Confirmed',
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        purpose: true,
        userId: true,
      },
    });
    
    const maintenance = await prisma.maintenanceSchedule.findMany({
      where: {
        resourceId,
        status: { in: ['Scheduled', 'In_Progress'] },
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    });
    
    const result = {
      resourceId,
      bufferMinutes: resource.bufferMinutes,
      bookedSlots: bookings.map(b => ({
        bookingId: b.id,
        startTime: b.startTime,
        endTime: b.endTime,
        purpose: b.purpose,
        userId: b.userId,
      })),
      maintenanceSlots: maintenance.map(m => ({
        maintenanceId: m.id,
        startTime: m.startTime,
        endTime: m.endTime,
        reason: m.reason,
      })),
    };
    
    await redisClient.setex(cacheKey, 60, JSON.stringify(result));
    
    return result;
  }

  /**
   * Quick availability check for a single time window.
   * Used by ConciergeService and other lightweight checks.
   */
  async checkAvailability(
    resourceId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ isAvailable: boolean; conflictCount: number }> {
    const conflictCount = await prisma.booking.count({
      where: {
        resourceId,
        status: 'Confirmed',
        OR: [
          { startTime: { gte: startTime, lt: endTime } },
          { endTime: { gt: startTime, lte: endTime } },
          { AND: [{ startTime: { lte: startTime } }, { endTime: { gte: endTime } }] },
        ],
      },
    });
    return { isAvailable: conflictCount === 0, conflictCount };
  }
}

export default new AvailabilityService();

