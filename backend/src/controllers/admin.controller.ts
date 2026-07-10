import { Request, Response } from 'express';
import prisma from '../config/database';
import analyticsService from '../services/analytics.service';

export class AdminController {
  async getConfigs(req: Request, res: Response) {
    try {
      const configs = await prisma.systemConfig.findMany();
      const parsed = configs.map(c => {
        try {
          return { ...c, value: JSON.parse(c.value) };
        } catch {
          return c;
        }
      });
      res.json(parsed);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateConfig(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { key } = req.params;
      const { value } = req.body;

      const config = await prisma.systemConfig.update({
        where: { key },
        data: {
          value: JSON.stringify(value),
          updatedBy: user.id,
          updatedAt: new Date(),
        },
      });

      res.json({
        ...config,
        value,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async listUsers(req: Request, res: Response) {
    try {
      const role = req.query.role as string;
      const search = req.query.search as string;

      const where: any = {};
      if (role) {
        where.role = role;
      }
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phoneNumber: true,
          ssoProvider: true,
          lastLogin: true,
          createdAt: true,
        },
      });

      res.json(users);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateUserRole(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { role } = req.body;

      const updated = await prisma.user.update({
        where: { id },
        data: { role },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE_USER_ROLE',
          entityType: 'User',
          entityId: id,
          changes: JSON.stringify({ role }),
          ipAddress: req.ip || '',
        },
      });

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async suspendUser(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { reason } = req.body;

      // Prevent admin from suspending themselves
      if (id === user.id) {
        return res.status(400).json({ error: 'Cannot suspend your own account.' });
      }

      await prisma.user.update({
        where: { id },
        data: { role: 'Suspended' },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'SUSPEND_USER',
          entityType: 'User',
          entityId: id,
          changes: JSON.stringify({ reason }),
          ipAddress: req.ip || '',
        },
      });

      res.json({ message: 'User suspended successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getUtilizationStats(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const resourceId = req.query.resourceId as string;

      const rates = await analyticsService.getUtilizationRate(startDate, endDate, resourceId);
      const summary = await analyticsService.getNoShowStats(startDate, endDate);

      res.json({ data: rates, summary });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async listAuditLogs(req: Request, res: Response) {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: { select: { name: true, email: true } },
        },
      });
      
      const parsed = logs.map(l => {
        try {
          return { ...l, changes: l.changes ? JSON.parse(l.changes) : null };
        } catch {
          return l;
        }
      });
      
      res.json(parsed);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async sendNotification(req: Request, res: Response) {
    try {
      const admin = (req as any).user;
      const { userId, type, channel, message } = req.body;

      // Input validation
      if (!userId || !channel || !message) {
        return res.status(400).json({ error: 'userId, channel, and message are required.' });
      }
      const validChannels = ['in_app', 'sms', 'email'];
      if (!validChannels.includes(channel)) {
        return res.status(400).json({ error: `channel must be one of: ${validChannels.join(', ')}` });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      let recipient = '';
      if (channel === 'sms') {
        recipient = targetUser.phoneNumber || 'Unknown Number';
        console.log(`[SMS Gateway Mock] Sending SMS to ${recipient}: ${message}`);
      } else {
        recipient = targetUser.email;
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          channel,
          recipient,
          payload: JSON.stringify({ message }),
          status: 'Sent',
          sentAt: new Date()
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'SEND_NOTIFICATION',
          entityType: 'Notification',
          entityId: notification.id,
          changes: JSON.stringify({ channel, recipient }),
          ipAddress: req.ip || '',
        },
      });

      res.status(201).json(notification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new AdminController();
