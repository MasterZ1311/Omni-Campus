import { Request, Response } from 'express';
import maintenanceService from '../services/maintenance.service';

export class MaintenanceController {
  async schedule(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { resourceId, startTime, endTime, reason, notes } = req.body;
      const schedule = await maintenanceService.scheduleMaintenance(
        resourceId,
        new Date(startTime),
        new Date(endTime),
        reason,
        user.id,
        notes
      );

      res.status(201).json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async complete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      await maintenanceService.completeMaintenance(id, notes || 'Maintenance completed successfully.');

      res.json({ message: 'Maintenance completed successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new MaintenanceController();
