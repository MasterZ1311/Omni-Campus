import prisma from '../config/database';
import analyticsService from './analytics.service';

export interface ResourceRiskScore {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  location: string;
  maintenanceFrequency: number; // count in last 90 days
  utilizationRate: number;      // percent 0-100
  riskScore: number;            // 0-100 composite score
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  lastMaintenanceDate: Date | null;
  predictedNextMaintenance: Date | null;
  recommendations: string[];
}

export class PredictiveService {
  /**
   * Compute maintenance risk scores for all resources.
   * Risk = (maintenanceFrequency × 0.6) + (utilizationRate × 0.4)
   * Weights emphasize how often a resource has needed maintenance historically.
   */
  async getMaintenanceRisk(): Promise<ResourceRiskScore[]> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    // Fetch all active resources
    const resources = await prisma.resource.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        maintenance: {
          where: { createdAt: { gte: ninetyDaysAgo } },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, reason: true, status: true },
        },
      },
    });

    // Get utilization rates for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const utilizationData = await analyticsService.getUtilizationRate(thirtyDaysAgo, now);
    const utilizationMap = new Map(
      utilizationData.map((u) => [u.resourceId, u.utilizationRate])
    );

    const scored: ResourceRiskScore[] = resources.map((r) => {
      const maintenanceFrequency = r.maintenance.length;
      const utilizationRate = utilizationMap.get(r.id) ?? 0;
      const lastMaintenance = r.maintenance[0]?.createdAt ?? null;

      // Normalize maintenance frequency: cap at 10 events → 100 pts
      const freqScore = Math.min(100, (maintenanceFrequency / 10) * 100);
      const riskScore = Math.round(freqScore * 0.6 + utilizationRate * 0.4);

      let riskLevel: ResourceRiskScore['riskLevel'];
      if (riskScore >= 75) riskLevel = 'Critical';
      else if (riskScore >= 50) riskLevel = 'High';
      else if (riskScore >= 25) riskLevel = 'Medium';
      else riskLevel = 'Low';

      // Predict next maintenance: average interval between past schedules
      let predictedNextMaintenance: Date | null = null;
      if (maintenanceFrequency >= 2) {
        const sorted = [...r.maintenance].sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          intervals.push(sorted[i].createdAt.getTime() - sorted[i - 1].createdAt.getTime());
        }
        const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (lastMaintenance) {
          predictedNextMaintenance = new Date(lastMaintenance.getTime() + avgIntervalMs);
        }
      }

      // Generate human-readable recommendations
      const recommendations: string[] = [];
      if (riskLevel === 'Critical') {
        recommendations.push('Schedule preventive maintenance immediately.');
        recommendations.push('Consider temporary replacement or backup resource.');
      } else if (riskLevel === 'High') {
        recommendations.push('Inspect resource within the next 7 days.');
        recommendations.push(`High utilization (${utilizationRate}%) — consider reducing booking window.`);
      } else if (riskLevel === 'Medium') {
        recommendations.push('Monitor resource closely over the next 30 days.');
      } else {
        recommendations.push('Resource is in good condition — continue regular checks.');
      }

      if (maintenanceFrequency > 5) {
        recommendations.push(`Frequent maintenance (${maintenanceFrequency}× in 90 days) — consider capital replacement.`);
      }

      return {
        resourceId: r.id,
        resourceName: r.name,
        resourceType: r.type,
        location: r.location,
        maintenanceFrequency,
        utilizationRate,
        riskScore,
        riskLevel,
        lastMaintenanceDate: lastMaintenance,
        predictedNextMaintenance,
        recommendations,
      };
    });

    // Sort by riskScore descending
    return scored.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Get the risk profile for a single resource.
   */
  async getResourceRisk(resourceId: string): Promise<ResourceRiskScore> {
    const all = await this.getMaintenanceRisk();
    const found = all.find((r) => r.resourceId === resourceId);
    if (!found) throw new Error('Resource not found');
    return found;
  }
}

export default new PredictiveService();
