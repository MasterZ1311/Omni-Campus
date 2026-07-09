import { Request, Response } from 'express';
import waitlistService from '../services/waitlist.service';
import prisma from '../config/database';

export class WaitlistController {
  async addToWaitlist(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { resourceId, startTime, endTime } = req.body;
      const result = await waitlistService.addToWaitlist(
        user.id,
        resourceId,
        new Date(startTime),
        new Date(endTime)
      );

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMyWaitlist(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const entries = await prisma.waitlistEntry.findMany({
        where: { userId: user.id },
        include: {
          resource: { select: { name: true, location: true } },
        },
      });
      res.json(entries);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeFromWaitlist(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      await waitlistService.removeFromWaitlist(id, user.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async confirmOffer(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const booking = await waitlistService.confirmOffer(id, user.id);
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async declineOffer(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      await waitlistService.declineOffer(id, user.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new WaitlistController();
