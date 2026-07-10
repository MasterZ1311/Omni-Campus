import { Request, Response } from 'express';
import prisma from '../config/database';

class ComplaintController {
  async createComplaint(req: Request, res: Response) {
    try {
      const { title, description, location } = req.body;
      // req.user is set by authenticateJWT
      const userId = (req as any).user?.id;

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      const complaint = await prisma.complaint.create({
        data: {
          title,
          description,
          location,
          reportedById: userId,
          status: 'Pending',
        },
      });

      res.status(201).json(complaint);
    } catch (error) {
      console.error('Error creating complaint:', error);
      res.status(500).json({ error: 'Failed to create complaint' });
    }
  }

  async getComplaints(req: Request, res: Response) {
    try {
      const complaints = await prisma.complaint.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          reportedBy: {
            select: { name: true, role: true }
          }
        }
      });
      res.json(complaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      res.status(500).json({ error: 'Failed to fetch complaints' });
    }
  }

  async routeComplaint(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assignedToDept } = req.body;

      if (!assignedToDept) {
        return res.status(400).json({ error: 'assignedToDept is required' });
      }

      const complaint = await prisma.complaint.update({
        where: { id },
        data: {
          assignedToDept,
          status: 'Routed',
        },
      });

      res.json(complaint);
    } catch (error) {
      console.error('Error routing complaint:', error);
      res.status(500).json({ error: 'Failed to route complaint' });
    }
  }
}

export default new ComplaintController();
