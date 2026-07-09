import { Request, Response } from 'express';
import conciergeService from '../services/concierge.service';

export class ConciergeController {
  /**
   * POST /api/concierge/query
   * Body: { message: string }
   * Returns structured resource suggestions based on natural language input.
   */
  async query(req: Request, res: Response) {
    try {
      const { message } = req.body as { message: string };
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const userId = (req as any).user?.id ?? 'anonymous';
      const result = await conciergeService.processQuery(message.trim(), userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new ConciergeController();
