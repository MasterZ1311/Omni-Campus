import { Request, Response } from 'express';
import prisma from '../config/database';

export class NotificationController {
  async getMyNotifications(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 50;

      const notifications = await prisma.notification.findMany({
        where: { 
          userId: user.id,
          channel: 'in_app'
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      res.json(notifications);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new NotificationController();
