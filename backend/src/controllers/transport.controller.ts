import { Request, Response } from 'express';
import transportService from '../services/transport.service';

export class TransportController {
  async getVehicles(req: Request, res: Response) {
    try {
      const data = await transportService.getVehicles();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSchedules(req: Request, res: Response) {
    try {
      const data = await transportService.getSchedules();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createRequest(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { pickupLocation, dropoffLocation, requestedTime, passengerCount } = req.body;

      if (!pickupLocation || !dropoffLocation || !requestedTime) {
        return res.status(400).json({ error: 'Pickup location, dropoff location, and requested time are required' });
      }

      const result = await transportService.createTransportRequest(userId, {
        pickupLocation,
        dropoffLocation,
        requestedTime: new Date(requestedTime),
        passengerCount: passengerCount ? parseInt(passengerCount, 10) : undefined,
      });

      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.includes('Unauthorized')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
}

export default new TransportController();
