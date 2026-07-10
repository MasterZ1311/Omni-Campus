import { Request, Response } from 'express';
import staffService from '../services/staff.service';
import prisma from '../config/database';

export class StaffController {
  async getRoster(req: Request, res: Response) {
    try {
      const roster = await staffService.getStaffRoster();
      res.json(roster);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createAssignment(req: Request, res: Response) {
    try {
      const { staffId, taskDescription, location, startTime, endTime } = req.body;

      if (!staffId || !taskDescription || !location || !startTime || !endTime) {
        return res.status(400).json({ error: 'All assignment fields are required' });
      }

      const assignment = await staffService.createAssignment({
        staffId,
        taskDescription,
        location,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });

      // Audit logs
      const user = (req as any).user;
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DISPATCH_STAFF',
          entityType: 'StaffAssignment',
          entityId: assignment.id,
          changes: JSON.stringify({ created: assignment }),
          ipAddress: req.ip || '',
        },
      });

      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { staffId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const updated = await staffService.updateStaffStatus(staffId, status);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getMyAssignments(req: Request, res: Response) {
    try {
      const email = (req as any).user.email;
      const assignments = await staffService.getAssignmentsByEmail(email);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async completeAssignment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const assignment = await prisma.staffAssignment.update({
        where: { id },
        data: { status: 'Completed' }
      });
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new StaffController();
