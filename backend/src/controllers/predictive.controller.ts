import { Request, Response } from 'express';
import predictiveService from '../services/predictive.service';

export class PredictiveController {
  /**
   * GET /api/predictive/maintenance-risk
   * Returns all resources ranked by maintenance risk score.
   */
  async getAllRisks(req: Request, res: Response) {
    try {
      const risks = await predictiveService.getMaintenanceRisk();
      res.json({
        count: risks.length,
        summary: {
          critical: risks.filter((r) => r.riskLevel === 'Critical').length,
          high: risks.filter((r) => r.riskLevel === 'High').length,
          medium: risks.filter((r) => r.riskLevel === 'Medium').length,
          low: risks.filter((r) => r.riskLevel === 'Low').length,
        },
        data: risks,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/predictive/maintenance-risk/:resourceId
   * Returns the risk profile for a single resource.
   */
  async getResourceRisk(req: Request, res: Response) {
    try {
      const { resourceId } = req.params;
      const risk = await predictiveService.getResourceRisk(resourceId);
      res.json(risk);
    } catch (err: any) {
      const status = err.message === 'Resource not found' ? 404 : 500;
      res.status(status).json({ error: err.message });
    }
  }

  /**
   * GET /api/predictive/utilization-forecast
   * Returns a 7-day predicted utilization index forecast.
   */
  async getForecast(req: Request, res: Response) {
    try {
      const forecast = await predictiveService.getUtilizationForecast();
      res.json(forecast);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new PredictiveController();
