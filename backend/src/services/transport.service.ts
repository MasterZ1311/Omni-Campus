import prisma from '../config/database';

export class TransportService {
  /**
   * Fetch all vehicles and compute real-time seat availability
   */
  async getVehicles() {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        requests: {
          where: {
            status: { in: ['Pending', 'Approved'] },
          },
        },
        schedules: true,
      },
    });

    return vehicles.map((v) => {
      // Calculate active passengers currently booked on this vehicle
      const activePassengers = v.requests.reduce((sum, r) => sum + r.passengerCount, 0);
      const remainingSeats = Math.max(0, v.capacity - activePassengers);

      return {
        id: v.id,
        name: v.name,
        type: v.type,
        capacity: v.capacity,
        status: v.status,
        driverName: v.driverName,
        licensePlate: v.licensePlate,
        remainingSeats,
        schedules: v.schedules,
      };
    });
  }

  /**
   * Fetch all fixed route timetables
   */
  async getSchedules() {
    return prisma.vehicleSchedule.findMany({
      include: {
        vehicle: true,
      },
    });
  }

  /**
   * Request an on-demand dispatch
   */
  async createTransportRequest(userId: string, data: {
    pickupLocation: string;
    dropoffLocation: string;
    requestedTime: Date;
    passengerCount?: number;
  }) {
    const passengerCount = data.passengerCount ?? 1;

    // Check user role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'Student') {
      throw new Error('Unauthorized: Students are not permitted to dispatch vehicles on-demand');
    }

    // Find an active vehicle that has enough capacity
    const vehicles = await this.getVehicles();
    const availableVehicle = vehicles.find(
      (v) => v.status === 'Active' && v.remainingSeats >= passengerCount
    );

    const transportRequest = await prisma.transportRequest.create({
      data: {
        userId,
        vehicleId: availableVehicle?.id || null,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        requestedTime: data.requestedTime,
        passengerCount,
        status: availableVehicle ? 'Approved' : 'Pending',
      },
    });

    return {
      request: transportRequest,
      assignedVehicle: availableVehicle || null,
      message: availableVehicle
        ? `Request approved automatically. Vehicle ${availableVehicle.name} dispatched.`
        : 'No vehicles immediately available. Request placed in queue.',
    };
  }
}

export default new TransportService();
