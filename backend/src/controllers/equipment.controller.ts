import { Request, Response } from 'express';
import equipmentService from '../services/equipment.service';
import prisma from '../config/database';

export class EquipmentController {
  async checkOut(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { equipmentId, expectedReturnTime, linkedBookingId, conditionNotes } = req.body;
      const checkout = await equipmentService.checkOutEquipment(
        equipmentId,
        user.id,
        new Date(expectedReturnTime),
        linkedBookingId,
        conditionNotes
      );

      res.status(201).json(checkout);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async checkIn(req: Request, res: Response) {
    try {
      const { checkoutId } = req.params;
      const { conditionNotes, markMaintenance } = req.body;
      await equipmentService.checkInEquipment(
        checkoutId,
        conditionNotes || 'Returned',
        markMaintenance === true
      );

      res.json({ message: 'Checked in successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMyCheckouts(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const checkouts = await prisma.equipmentCheckout.findMany({
        where: { userId: user.id },
        include: {
          equipment: { select: { name: true, location: true } },
        },
      });
      res.json(checkouts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new EquipmentController();
