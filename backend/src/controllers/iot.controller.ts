import { Request, Response } from 'express';
import iotService from '../services/iot.service';

export class IoTController {
  /**
   * GET /api/iot/sensors
   * Returns all sensors with their resource info and latest reading.
   */
  async getAllSensors(req: Request, res: Response) {
    try {
      const sensors = await iotService.getAllSensors();
      res.json({ count: sensors.length, data: sensors });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/iot/sensors/:resourceId
   * Returns sensor readings for a specific resource.
   */
  async getResourceSensors(req: Request, res: Response) {
    try {
      const { resourceId } = req.params;
      const limit = parseInt((req.query.limit as string) ?? '50');
      const sensors = await iotService.getResourceSensorReadings(resourceId, limit);
      res.json({ resourceId, sensors });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/iot/simulate
   * Simulate an IoT sensor reading (for development/testing only).
   * Body: { topic: string, payload: object }
   */
  async simulateReading(req: Request, res: Response) {
    try {
      const { topic, payload } = req.body as { topic: string; payload: object };
      if (!topic || !payload) {
        return res.status(400).json({ error: 'topic and payload are required' });
      }
      await iotService.handleSensorMessage(topic, Buffer.from(JSON.stringify(payload)));
      res.json({ success: true, topic, payload });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new IoTController();
