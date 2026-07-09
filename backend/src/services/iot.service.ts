import prisma from '../config/database';
import { Server } from 'socket.io';

let wsServer: Server | null = null;

export class IoTService {
  setWsServer(io: Server) {
    wsServer = io;
  }

  /**
   * Process an incoming MQTT sensor message.
   * Topic pattern: campus/<resourceId>/sensors/<sensorType>
   * Payload: JSON string with sensor reading data.
   */
  async handleSensorMessage(topic: string, payload: Buffer) {
    try {
      const parts = topic.split('/');
      // Expected: ['campus', resourceId, 'sensors', sensorType]
      if (parts.length < 4 || parts[0] !== 'campus' || parts[2] !== 'sensors') return;

      const resourceId = parts[1];
      const sensorType = parts[3];

      let data: Record<string, any>;
      try {
        data = JSON.parse(payload.toString());
      } catch {
        console.warn(`[IoT] Invalid JSON payload on topic: ${topic}`);
        return;
      }

      // Find or create sensor record
      let sensor = await prisma.ioTSensor.findFirst({
        where: { resourceId, sensorType },
      });

      if (!sensor) {
        sensor = await prisma.ioTSensor.create({
          data: {
            resourceId,
            sensorType,
            mqttTopic: topic,
            lastReading: JSON.stringify(data),
            lastCommunication: new Date(),
            isOnline: true,
          },
        });
      } else {
        await prisma.ioTSensor.update({
          where: { id: sensor.id },
          data: {
            lastReading: JSON.stringify(data),
            lastCommunication: new Date(),
            isOnline: true,
          },
        });
      }

      // Persist the reading
      await prisma.ioTReading.create({
        data: {
          sensorId: sensor.id,
          data: JSON.stringify(data),
          recordedAt: new Date(),
        },
      });

      // Handle occupancy sensor: check for unauthorized occupancy
      if (sensorType === 'occupancy') {
        await this.handleOccupancyReading(resourceId, data as any);
      }

      // Broadcast to frontend via Socket.IO
      if (wsServer) {
        wsServer.to(`resource:${resourceId}`).emit('iot:reading', {
          resourceId,
          sensorType,
          data,
          timestamp: new Date().toISOString(),
        });
        // Also broadcast to global sensor feed room
        wsServer.to('iot:feed').emit('iot:reading', {
          resourceId,
          sensorType,
          data,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[IoT] Error processing sensor message:', err);
    }
  }

  /**
   * Handle GPS position updates for vehicles.
   * Topic: campus/vehicles/<vehicleId>/gps
   */
  async handleVehicleGps(vehicleId: string, data: { lat: number; lng: number }) {
    try {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          gpsLatitude: data.lat,
          gpsLongitude: data.lng,
          gpsUpdatedAt: new Date(),
        } as any,
      });

      if (wsServer) {
        wsServer.to('transport:live').emit('vehicle:location', {
          vehicleId,
          lat: data.lat,
          lng: data.lng,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Vehicle may not exist in DB — skip silently
    }
  }

  /**
   * Handle RFID scan events for equipment tracking.
   * Topic: campus/rfid/<readerId>/scan
   */
  async handleRfidScan(readerId: string, data: { rfidTag: string; direction: 'IN' | 'OUT' }) {
    try {
      // Find equipment resource by RFID tag (stored in amenities JSON or name)
      const resource = await prisma.resource.findFirst({
        where: {
          type: 'Equipment',
          amenities: { contains: data.rfidTag },
          deletedAt: null,
        },
      });

      if (!resource) {
        console.warn(`[RFID] Unknown tag: ${data.rfidTag}`);
        return;
      }

      if (data.direction === 'OUT') {
        // Check for valid active checkout
        const activeCheckout = await prisma.equipmentCheckout.findFirst({
          where: {
            equipmentId: resource.id,
            actualReturnTime: null,
          },
        });

        if (!activeCheckout) {
          // Unauthorized exit — flag it
          await prisma.auditLog.create({
            data: {
              action: 'RFID_UNAUTHORIZED_EXIT',
              entityType: 'Resource',
              entityId: resource.id,
              changes: JSON.stringify({ rfidTag: data.rfidTag, readerId, direction: 'OUT' }),
            },
          });

          if (wsServer) {
            wsServer.to('iot:feed').emit('rfid:alert', {
              type: 'unauthorized_exit',
              resourceId: resource.id,
              resourceName: resource.name,
              rfidTag: data.rfidTag,
              timestamp: new Date().toISOString(),
            });
          }
          console.warn(`[RFID] ⚠️  Unauthorized exit: ${resource.name} (${data.rfidTag})`);
        }
      }
    } catch (err) {
      console.error('[RFID] Error processing scan:', err);
    }
  }

  /**
   * Cross-check occupancy sensor reading with active bookings.
   * If room is occupied but no booking exists, emit an alert.
   */
  private async handleOccupancyReading(resourceId: string, data: { occupied: boolean }) {
    if (!data.occupied) return;

    const now = new Date();
    const activeBooking = await prisma.booking.findFirst({
      where: {
        resourceId,
        status: 'Confirmed',
        startTime: { lte: now },
        endTime: { gte: now },
      },
    });

    if (!activeBooking) {
      if (wsServer) {
        wsServer.to('iot:feed').emit('iot:unauthorized_occupancy', {
          resourceId,
          timestamp: now.toISOString(),
          message: 'Room sensor reports occupancy but no active booking found.',
        });
      }
    }
  }

  /**
   * List all sensors with their latest reading.
   */
  async getAllSensors() {
    return prisma.ioTSensor.findMany({
      include: {
        resource: { select: { id: true, name: true, location: true, type: true } },
        readings: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastCommunication: 'desc' },
    });
  }

  /**
   * Get reading history for a specific resource's sensors.
   */
  async getResourceSensorReadings(resourceId: string, limit = 50) {
    const sensors = await prisma.ioTSensor.findMany({
      where: { resourceId },
      include: {
        readings: {
          orderBy: { recordedAt: 'desc' },
          take: limit,
        },
      },
    });
    return sensors;
  }
}

export default new IoTService();
