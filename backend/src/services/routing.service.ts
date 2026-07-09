import prisma from '../config/database';

export interface ZoneDemand {
  zone: string;
  pendingCount: number;
}

export interface OptimalRoute {
  stops: string[];
  prioritizedZones: ZoneDemand[];
  estimatedTotalMinutes: number;
}

const INTER_STOP_MINUTES = 8; // average travel time between stops

export class RoutingService {
  /**
   * Compute the optimal shuttle route based on current pending TransportRequests.
   * Groups requests by campus zone, prioritizes highest-demand zones first,
   * and returns an ordered stop list.
   */
  async computeOptimalRoute(vehicleId?: string): Promise<OptimalRoute> {
    const where: any = { status: 'Pending' };
    if (vehicleId) where.vehicleId = vehicleId;

    const requests = await prisma.transportRequest.findMany({ where });

    // Tally demand per pickup zone
    const zoneMap = new Map<string, number>();
    for (const req of requests) {
      const zone = (req as any).campusZone ?? req.pickupLocation;
      zoneMap.set(zone, (zoneMap.get(zone) ?? 0) + req.passengerCount);
    }

    const prioritizedZones: ZoneDemand[] = [...zoneMap.entries()]
      .map(([zone, pendingCount]) => ({ zone, pendingCount }))
      .sort((a, b) => b.pendingCount - a.pendingCount);

    const stops = prioritizedZones.map((z) => z.zone);

    return {
      stops,
      prioritizedZones,
      estimatedTotalMinutes: stops.length * INTER_STOP_MINUTES,
    };
  }

  /**
   * Estimate arrival time at a given stop given current stop index.
   */
  estimateArrival(currentStopIndex: number, targetStopIndex: number): Date {
    const stopsAway = Math.abs(targetStopIndex - currentStopIndex);
    const arrivalMs = Date.now() + stopsAway * INTER_STOP_MINUTES * 60 * 1000;
    return new Date(arrivalMs);
  }

  /**
   * Get route for a specific vehicle schedule, enriched with live demand data.
   */
  async getVehicleRouteStatus(vehicleId: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        schedules: { orderBy: { startTime: 'asc' } },
        requests: { where: { status: { in: ['Pending', 'Approved'] } } },
      },
    });

    if (!vehicle) throw new Error('Vehicle not found');

    const optimalRoute = await this.computeOptimalRoute(vehicleId);
    const pendingPassengers = vehicle.requests.reduce(
      (sum, r) => sum + r.passengerCount, 0
    );

    return {
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        type: vehicle.type,
        capacity: vehicle.capacity,
        status: vehicle.status,
        driverName: vehicle.driverName,
        licensePlate: vehicle.licensePlate,
        gpsLatitude: (vehicle as any).gpsLatitude ?? null,
        gpsLongitude: (vehicle as any).gpsLongitude ?? null,
      },
      currentLoad: pendingPassengers,
      remainingSeats: Math.max(0, vehicle.capacity - pendingPassengers),
      optimalRoute,
      schedules: vehicle.schedules,
    };
  }
}

export default new RoutingService();
