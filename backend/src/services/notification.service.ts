import prisma from '../config/database';

export class NotificationService {
  private workerInterval: NodeJS.Timeout | null = null;
  private wsServer: any = null; // Will set this when WebSocket starts

  setWsServer(io: any) {
    this.wsServer = io;
  }

  async enqueueNotification(userId: string, type: string, channel: string, recipient: string, payload: any) {
    return prisma.notification.create({
      data: {
        userId,
        type,
        channel,
        recipient,
        payload: JSON.stringify(payload),
        status: 'Pending',
        retryCount: 0,
      },
    });
  }

  async processPendingNotifications() {
    try {
      const pending = await prisma.notification.findMany({
        where: { status: 'Pending' },
        take: 10,
      });

      for (const notif of pending) {
        await this.sendNotification(notif);
      }
    } catch (error) {
      console.error('Error in notification worker loop:', error);
    }
  }

  async sendNotification(notif: any) {
    const payload = JSON.parse(notif.payload);
    let success = true;

    try {
      // Simulate sending over channels
      console.log(`\n============== NOTIFICATION [${notif.channel.toUpperCase()}] ==============`);
      console.log(`To: ${notif.recipient}`);
      console.log(`Type: ${notif.type}`);
      console.log(`Payload:`, payload);
      console.log(`====================================================\n`);

      // In-app real-time socket emit
      if (notif.channel === 'in_app' && this.wsServer) {
        this.wsServer.to(`user:${notif.userId}`).emit('notification', {
          id: notif.id,
          type: notif.type,
          payload,
          createdAt: notif.createdAt,
        });
      }
    } catch (err) {
      success = false;
    }

    if (success) {
      await prisma.notification.update({
        where: { id: notif.id },
        data: {
          status: 'Sent',
          sentAt: new Date(),
        },
      });
    } else {
      const newRetryCount = notif.retryCount + 1;
      if (newRetryCount >= 3) {
        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            status: 'Dead_Letter',
            retryCount: newRetryCount,
          },
        });
        
        // Audit log escalation for DLQ
        await prisma.auditLog.create({
          data: {
            action: 'NOTIFICATION_ESCALATION_DLQ',
            entityType: 'Notification',
            entityId: notif.id,
            changes: JSON.stringify({ reason: 'Failed after 3 attempts' }),
          },
        });
      } else {
        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            retryCount: newRetryCount,
          },
        });
      }
    }
  }

  startWorker() {
    if (!this.workerInterval) {
      this.workerInterval = setInterval(() => {
        this.processPendingNotifications();
      }, 5000); // Check every 5 seconds
      console.log('📬 Notification background worker started');
    }
  }

  stopWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
  }
}

export default new NotificationService();
