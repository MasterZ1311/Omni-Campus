import prisma from '../config/database';

export class AnalyticsService {
  async getUtilizationRate(startDate: Date, endDate: Date, resourceId?: string) {
    const where: any = {
      status: 'Confirmed',
      startTime: { gte: startDate },
      endTime: { lte: endDate },
    };

    if (resourceId) {
      where.resourceId = resourceId;
    }

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        resourceId: true,
        startTime: true,
        endTime: true,
      },
    });

    const resources = await prisma.resource.findMany({
      where: resourceId ? { id: resourceId } : { deletedAt: null },
      select: { id: true, name: true },
    });

    const daysCount = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const standardDailyHours = 12; // 8 AM to 8 PM
    const totalAvailableHours = daysCount * standardDailyHours;

    const utilizationRates = resources.map(r => {
      const resourceBookings = bookings.filter(b => b.resourceId === r.id);
      
      const totalBookedMs = resourceBookings.reduce((sum, b) => {
        return sum + (b.endTime.getTime() - b.startTime.getTime());
      }, 0);
      
      const totalBookedHours = totalBookedMs / (1000 * 60 * 60);
      const utilizationRate = Math.min(100, Math.round((totalBookedHours / totalAvailableHours) * 100));

      return {
        resourceId: r.id,
        resourceName: r.name,
        bookedHours: parseFloat(totalBookedHours.toFixed(1)),
        availableHours: totalAvailableHours,
        utilizationRate,
      };
    });

    return utilizationRates;
  }

  async getNoShowStats(startDate: Date, endDate: Date) {
    const totalBookings = await prisma.booking.count({
      where: {
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
    });

    const noShows = await prisma.booking.count({
      where: {
        status: 'No_Show',
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
    });

    const cancelled = await prisma.booking.count({
      where: {
        status: 'Cancelled',
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
    });

    return {
      totalBookings,
      noShowCount: noShows,
      noShowRate: totalBookings > 0 ? Math.round((noShows / totalBookings) * 100) : 0,
      cancellationCount: cancelled,
      cancellationRate: totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0,
    };
  }

  generateCSV(headers: string[], rows: any[][]): string {
    const headerLine = headers.join(',');
    const rowLines = rows.map(r => 
      r.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') ? `"${str}"` : str;
      }).join(',')
    );
    return [headerLine, ...rowLines].join('\n');
  }
}

export default new AnalyticsService();
