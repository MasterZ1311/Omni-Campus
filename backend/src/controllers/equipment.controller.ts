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
      const user = (req as any).user;
      const { checkoutId } = req.params;
      const { conditionNotes, markMaintenance } = req.body;

      // Verify ownership: only the person who checked out OR a manager/admin can check in
      const checkout = await prisma.equipmentCheckout.findUnique({
        where: { id: checkoutId },
        select: { userId: true },
      });

      if (!checkout) {
        return res.status(404).json({ error: 'Checkout record not found' });
      }

      const isOwner = checkout.userId === user.id;
      const isManager = ['Facility_Manager', 'Administrator'].includes(user.role);

      if (!isOwner && !isManager) {
        return res.status(403).json({ error: 'You can only check in your own equipment' });
      }

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
