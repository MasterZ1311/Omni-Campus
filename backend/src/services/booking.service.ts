import prisma from '../config/database';
import { CreateBookingDTO, ConflictCheckResult, TimeSlot } from '../types/booking.types';
import waitlistService from './waitlist.service';
import { Server } from 'socket.io';

let wsServer: Server | null = null;


export class BookingService {
  setWsServer(io: Server) {
    wsServer = io;
  }

  private emitResourceStatusChange(resourceId: string, status: string) {
    if (wsServer) {
      wsServer.to(`resource:${resourceId}`).emit('resource:status_change', {
        resourceId,
        status,
        timestamp: new Date().toISOString(),
      });
      wsServer.to('resources:all').emit('resource:status_change', {
        resourceId,
        status,
        timestamp: new Date().toISOString(),
      });
    }
  }

  validateDuration(startTime: Date, endTime: Date): { valid: boolean; error?: string } {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    if (durationMinutes < 30) {
      return { valid: false, error: 'Booking duration must be at least 30 minutes' };
    }
    
    if (durationMinutes > 8 * 60) {
      return { valid: false, error: 'Booking duration cannot exceed 8 hours' };
    }
    
    if (startTime >= endTime) {
      return { valid: false, error: 'End time must be after start time' };
    }
    
    if (startTime < new Date()) {
      return { valid: false, error: 'Cannot book in the past' };
    }
    
    return { valid: true };
  }
  
  async checkConflicts(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<ConflictCheckResult> {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { bufferMinutes: true },
    });
    
    if (!resource) {
      throw new Error('Resource not found');
    }
    
    const bufferMs = resource.bufferMinutes * 60 * 1000;
    const startWithBuffer = new Date(startTime.getTime() - bufferMs);
    const endWithBuffer = new Date(endTime.getTime() + bufferMs);
    
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        resourceId,
        status: 'Confirmed',
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        OR: [
          {
            startTime: {
              gte: startWithBuffer,
              lt: endWithBuffer,
            },
          },
          {
            endTime: {
              gt: startWithBuffer,
              lte: endWithBuffer,
            },
          },
          {
            AND: [
              { startTime: { lte: startWithBuffer } },
              { endTime: { gte: endWithBuffer } },
            ],
          },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    
    if (conflictingBookings.length > 0) {
      const alternatives = await this.generateAlternatives(resourceId, startTime, endTime);
      return {
        hasConflict: true,
        conflictingBookings,
        alternatives,
      };
    }
    
    return { hasConflict: false };
  }
  
  async generateAlternatives(
    resourceId: string,
    requestedStart: Date,
    requestedEnd: Date,
    limit = 3
  ): Promise<TimeSlot[]> {
    const duration = requestedEnd.getTime() - requestedStart.getTime();
    const alternatives: TimeSlot[] = [];
    
    const dayStart = new Date(requestedStart);
    dayStart.setHours(8, 0, 0, 0);
    
    const dayEnd = new Date(requestedStart);
    dayEnd.setHours(20, 0, 0, 0);
    
    let checkTime = dayStart;
    
    while (checkTime < dayEnd && alternatives.length < limit) {
      const slotEnd = new Date(checkTime.getTime() + duration);
      
      if (slotEnd <= dayEnd) {
        const conflict = await prisma.booking.findFirst({
          where: {
            resourceId,
            status: 'Confirmed',
            OR: [
              { startTime: { gte: checkTime, lt: slotEnd } },
              { endTime: { gt: checkTime, lte: slotEnd } },
              { AND: [{ startTime: { lte: checkTime } }, { endTime: { gte: slotEnd } }] },
            ],
          },
        });
        
        if (!conflict) {
          alternatives.push({
            startTime: new Date(checkTime),
            endTime: new Date(slotEnd),
          });
        }
      }
      
      checkTime = new Date(checkTime.getTime() + 30 * 60 * 1000);
    }
    
    return alternatives;
  }
  
  async createBooking(data: CreateBookingDTO, userId: string, userRole: string) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    
    const durationCheck = this.validateDuration(startTime, endTime);
    if (!durationCheck.valid) {
      throw new Error(durationCheck.error);
    }
    
    const daysLimit = userRole === 'Faculty' ? 90 : 14;
    const maxAdvanceDate = new Date();
    maxAdvanceDate.setDate(maxAdvanceDate.getDate() + daysLimit);
    if (startTime > maxAdvanceDate) {
      throw new Error(`Booking window exceeded. You can book up to ${daysLimit} days in advance.`);
    }
    
    const result = await prisma.$transaction(
      async (tx) => {
        const resource = await tx.resource.findUnique({
          where: { id: data.resourceId },
          select: { id: true, name: true, type: true, bufferMinutes: true, version: true, status: true },
        });
        
        if (!resource) {
          throw new Error('Resource not found');
        }
        
        if (resource.status !== 'Available') {
          throw new Error('Resource is not available');
        }
        
        const bufferMs = resource.bufferMinutes * 60 * 1000;
        const startWithBuffer = new Date(startTime.getTime() - bufferMs);
        const endWithBuffer = new Date(endTime.getTime() + bufferMs);
        
        const conflictingBookings = await tx.booking.findMany({
          where: {
            resourceId: data.resourceId,
            status: 'Confirmed',
            OR: [
              { startTime: { gte: startWithBuffer, lt: endWithBuffer } },
              { endTime: { gt: startWithBuffer, lte: endWithBuffer } },
              { AND: [{ startTime: { lte: startWithBuffer } }, { endTime: { gte: endWithBuffer } }] },
            ],
          },
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        });
        
        if (conflictingBookings.length > 0) {
          const canDisplace = userRole === 'Faculty' && conflictingBookings.every(b => b.user.role === 'Student');
          
          if (canDisplace) {
            for (const conflict of conflictingBookings) {
              await tx.booking.update({
                where: { id: conflict.id },
                data: {
                  status: 'Cancelled',
                  cancellationReason: 'Displaced by Faculty priority reservation',
                  cancelledAt: new Date(),
                },
              });
              
              const count = await tx.waitlistEntry.count({
                where: { resourceId: data.resourceId, status: 'Pending' },
              });
              
              await tx.waitlistEntry.create({
                data: {
                  userId: conflict.userId,
                  resourceId: data.resourceId,
                  desiredStartTime: conflict.startTime,
                  desiredEndTime: conflict.endTime,
                  status: 'Pending',
                  position: count + 1,
                },
              });
              
              await tx.notification.create({
                data: {
                  userId: conflict.userId,
                  type: 'priority_displaced',
                  channel: 'email',
                  recipient: conflict.user.email,
                  payload: JSON.stringify({
                    bookingId: conflict.id,
                    resourceName: resource.name,
                    startTime: conflict.startTime,
                  }),
                  status: 'Pending',
                },
              });
            }
          } else {
            const alternatives = await this.generateAlternatives(data.resourceId, startTime, endTime);
            throw new Error(
              JSON.stringify({
                error: 'Booking conflict detected',
                conflicts: conflictingBookings,
                alternatives,
              })
            );
          }
        }
        
        const booking = await tx.booking.create({
          data: {
            userId,
            resourceId: data.resourceId,
            startTime,
            endTime,
            purpose: data.purpose,
            status: 'Confirmed',
            recurrencePattern: data.recurrencePattern || 'None',
          },
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
            resource: { select: { id: true, name: true, type: true, location: true } },
          },
        });
        
        await tx.resource.update({
          where: { id: data.resourceId, version: resource.version },
          data: { version: { increment: 1 } },
        });
        
        return booking;
      },
      {
        isolationLevel: 'Serializable',
        timeout: 10000,
      }
    );
    
    // Emit resource status update to all subscribed frontend clients
    this.emitResourceStatusChange(result.resource.id, 'booked');

    return result;
  }

  async createRecurringBooking(data: CreateBookingDTO, userId: string, userRole: string) {
    if (userRole !== 'Faculty' && userRole !== 'Administrator') {
      throw new Error('Only Faculty can create recurring bookings');
    }

    const { recurrencePattern, recurrenceEndDate } = data;
    if (!recurrencePattern || recurrencePattern === 'None' || !recurrenceEndDate) {
      throw new Error('Invalid recurrence properties');
    }

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    const recurrenceEnd = new Date(recurrenceEndDate);
    const duration = end.getTime() - start.getTime();

    const dates: { start: Date; end: Date }[] = [];
    const checkDate = new Date(start);

    while (checkDate <= recurrenceEnd) {
      dates.push({
        start: new Date(checkDate),
        end: new Date(checkDate.getTime() + duration),
      });

      if (recurrencePattern === 'Daily') {
        checkDate.setDate(checkDate.getDate() + 1);
      } else if (recurrencePattern === 'Weekly') {
        checkDate.setDate(checkDate.getDate() + 7);
      } else {
        break; // Unsupported custom layouts
      }
    }

    const created: any[] = [];
    const skipped: { date: Date; reason: string }[] = [];
    const recurrenceGroupId = require('uuid').v4();

    for (const slot of dates) {
      try {
        const booking = await this.createBooking({
          resourceId: data.resourceId,
          startTime: slot.start,
          endTime: slot.end,
          purpose: data.purpose,
          recurrencePattern,
        }, userId, userRole);

        // Update with recurrence group
        await prisma.booking.update({
          where: { id: booking.id },
          data: { recurrenceGroupId },
        });

        created.push(booking);
      } catch (err: any) {
        skipped.push({
          date: slot.start,
          reason: err.message.includes('conflict') ? 'Booking conflict' : err.message,
        });
      }
    }

    return { created, skipped };
  }

  async updateBooking(id: string, updates: any, version: number, userId: string, userRole: string) {
    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Booking not found');
    }

    if (existing.userId !== userId && !['Administrator', 'Facility_Manager'].includes(userRole)) {
      throw new Error('Unauthorized');
    }

    if (existing.startTime <= new Date()) {
      throw new Error('Cannot modify booking that has already started');
    }

    if (existing.version !== version) {
      throw new Error('Booking was modified by another user. Please refresh.');
    }

    const newStart = updates.startTime ? new Date(updates.startTime) : existing.startTime;
    const newEnd = updates.endTime ? new Date(updates.endTime) : existing.endTime;

    // Validate new times
    if (updates.startTime || updates.endTime) {
      const durationCheck = this.validateDuration(newStart, newEnd);
      if (!durationCheck.valid) {
        throw new Error(durationCheck.error);
      }

      const conflicts = await this.checkConflicts(existing.resourceId, newStart, newEnd, id);
      if (conflicts.hasConflict) {
        throw new Error('Requested time slot has conflict');
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        startTime: newStart,
        endTime: newEnd,
        purpose: updates.purpose || existing.purpose,
        version: { increment: 1 },
      },
    });

    // Record modification in log
    await prisma.bookingModification.create({
      data: {
        bookingId: id,
        field: 'booking_details',
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
        modifiedBy: userId,
      },
    });

    return updated;
  }

  async cancelBooking(id: string, reason: string, userId: string, userRole: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.userId !== userId && !['Administrator', 'Facility_Manager'].includes(userRole)) {
      throw new Error('Unauthorized');
    }

    const now = new Date();
    // Calculate if late cancellation (within 2 hours of start time) (Requirement 6.3)
    const diffMs = booking.startTime.getTime() - now.getTime();
    const isLateCancellation = diffMs > 0 && diffMs < 2 * 60 * 60 * 1000;

    await prisma.booking.update({
      where: { id },
      data: {
        status: 'Cancelled',
        cancellationReason: reason,
        cancelledAt: now,
        isLateCancellation,
      },
    });

    // Trigger waitlist cascade (Requirement 6.4)
    await waitlistService.processSlotAvailable(booking.resourceId, booking.startTime, booking.endTime);
  }
  
  async getBookingById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        resource: { select: { id: true, name: true, type: true, location: true, amenities: true } },
      },
    });
  }
  
  async getUserBookings(userId: string, includeCompleted = false) {
    const where: any = { userId };
    
    if (!includeCompleted) {
      where.status = { in: ['Confirmed', 'Pending_Verification'] };
      where.endTime = { gte: new Date() };
    }
    
    return prisma.booking.findMany({
      where,
      include: {
        resource: { select: { id: true, name: true, type: true, location: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async createBookingRequestWithPermission(data: any, fileName: string | undefined, userId: string) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    const durationCheck = this.validateDuration(startTime, endTime);
    if (!durationCheck.valid) {
      throw new Error(durationCheck.error);
    }

    const conflicts = await this.checkConflicts(data.resourceId, startTime, endTime);
    if (conflicts.hasConflict) {
      throw new Error('Booking conflict: The resource is already booked during this time');
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        resourceId: data.resourceId,
        startTime,
        endTime,
        purpose: data.purpose,
        status: 'Pending_Verification',
        permissionSlipUrl: fileName ? `/uploads/${fileName}` : null,
        verifiedByFacultyId: data.verifiedByFacultyId,
      },
      include: {
        resource: { select: { id: true, name: true, type: true, location: true } },
      }
    });

    return booking;
  }

  async getPendingVerifications(facultyId: string) {
    return prisma.booking.findMany({
      where: {
        status: 'Pending_Verification',
        verifiedByFacultyId: facultyId,
      },
      include: {
        resource: { select: { id: true, name: true, type: true, location: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async verifyBookingRequest(bookingId: string, action: 'approve' | 'decline', facultyId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      throw new Error('Booking request not found');
    }

    if (booking.verifiedByFacultyId !== facultyId) {
      throw new Error('Unauthorized to verify this booking');
    }

    const updatedStatus = action === 'approve' ? 'Confirmed' : 'Cancelled';
    const cancellationReason = action === 'decline' ? 'Declined by Faculty' : null;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: updatedStatus,
        cancellationReason,
      },
      include: {
        resource: { select: { id: true, name: true, type: true, location: true } }
      }
    });

    return updated;
  }
}

export default new BookingService();
