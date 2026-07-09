import prisma from '../config/database';
import notificationService from './notification.service';

export class WaitlistService {
  private timeoutInterval: NodeJS.Timeout | null = null;

  async addToWaitlist(userId: string, resourceId: string, startTime: Date, endTime: Date) {
    const existing = await prisma.waitlistEntry.findFirst({
      where: {
        userId,
        resourceId,
        desiredStartTime: startTime,
        desiredEndTime: endTime,
        status: 'Pending',
      },
    });

    if (existing) {
      return { entry: existing, position: existing.position };
    }

    const count = await prisma.waitlistEntry.count({
      where: {
        resourceId,
        status: 'Pending',
      },
    });

    const entry = await prisma.waitlistEntry.create({
      data: {
        userId,
        resourceId,
        desiredStartTime: startTime,
        desiredEndTime: endTime,
        status: 'Pending',
        position: count + 1,
      },
      include: {
        resource: { select: { name: true } },
      },
    });

    return { entry, position: entry.position };
  }

  async removeFromWaitlist(entryId: string, userId: string) {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    if (entry.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.waitlistEntry.delete({
      where: { id: entryId },
    });

    // Reorder remaining waitlist positions
    const remaining = await prisma.waitlistEntry.findMany({
      where: {
        resourceId: entry.resourceId,
        status: 'Pending',
      },
      orderBy: { position: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      await prisma.waitlistEntry.update({
        where: { id: remaining[i].id },
        data: { position: i + 1 },
      });
    }
  }

  async processSlotAvailable(resourceId: string, startTime: Date, endTime: Date) {
    // Find first pending user in queue for this resource and overlapping slot
    const entry = await prisma.waitlistEntry.findFirst({
      where: {
        resourceId,
        status: 'Pending',
        desiredStartTime: { lte: startTime },
        desiredEndTime: { gte: endTime },
      },
      orderBy: { position: 'asc' },
      include: {
        user: { select: { id: true, email: true } },
        resource: { select: { name: true } },
      },
    });

    if (!entry) return;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes timeout

    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: 'Notified',
        notifiedAt: new Date(),
        expiresAt,
      },
    });

    // Send offer notification
    await notificationService.enqueueNotification(
      entry.userId,
      'waitlist_available',
      'email',
      entry.user.email,
      {
        entryId: entry.id,
        resourceName: entry.resource.name,
        startTime: entry.desiredStartTime,
        endTime: entry.desiredEndTime,
        expiresAt,
      }
    );
  }

  async confirmOffer(entryId: string, userId: string) {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    });

    if (!entry) {
      throw new Error('Offer not found');
    }

    if (entry.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (entry.status !== 'Notified') {
      throw new Error('Offer is not active');
    }

    if (entry.expiresAt && entry.expiresAt < new Date()) {
      throw new Error('Offer has expired');
    }

    // Attempt to book
    const bookingService = require('./booking.service').default;
    const booking = await bookingService.createBooking({
      resourceId: entry.resourceId,
      startTime: entry.desiredStartTime,
      endTime: entry.desiredEndTime,
      purpose: 'Waitlist confirmed booking',
    }, entry.userId, entry.user.role);

    await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'Confirmed' },
    });

    return booking;
  }

  async declineOffer(entryId: string, userId: string) {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new Error('Offer not found');
    }

    if (entry.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'Declined' },
    });

    // Cascade offer to next person
    await this.processSlotAvailable(entry.resourceId, entry.desiredStartTime, entry.desiredEndTime);
  }

  async checkTimeouts() {
    try {
      const expired = await prisma.waitlistEntry.findMany({
        where: {
          status: 'Notified',
          expiresAt: { lte: new Date() },
        },
      });

      for (const entry of expired) {
        await prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: 'Expired' },
        });

        console.log(`⏳ Waitlist offer ${entry.id} expired. Cascading offer to next user.`);
        await this.processSlotAvailable(entry.resourceId, entry.desiredStartTime, entry.desiredEndTime);
      }
    } catch (error) {
      console.error('Error checking waitlist timeouts:', error);
    }
  }

  startTimeoutCheck() {
    if (!this.timeoutInterval) {
      this.timeoutInterval = setInterval(() => {
        this.checkTimeouts();
      }, 15000); // Check every 15 seconds for rapid updates
      console.log('⏰ Waitlist expiration checker started');
    }
  }

  stopTimeoutCheck() {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
      this.timeoutInterval = null;
    }
  }
}

export default new WaitlistService();
