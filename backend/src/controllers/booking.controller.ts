import { Request, Response } from 'express';
import bookingService from '../services/booking.service';
import prisma from '../config/database';

export class BookingController {
  async createBooking(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const booking = await bookingService.createBooking(req.body, user.id, user.role);
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_BOOKING',
          entityType: 'Booking',
          entityId: booking.id,
          changes: JSON.stringify({ created: booking }),
          ipAddress: req.ip || '',
        },
      });
      
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'booking_confirmation',
          channel: 'email',
          recipient: user.email,
          payload: JSON.stringify({
            bookingId: booking.id,
            resourceName: booking.resource.name,
            startTime: booking.startTime,
          }),
          status: 'Pending',
        },
      });
      
      res.status(201).json(booking);
    } catch (error: any) {
      console.error('Create booking error:', error);
      
      if (error.message.includes('conflict') || error.message.includes('Booking conflict')) {
        try {
          const conflictData = JSON.parse(error.message);
          return res.status(409).json(conflictData);
        } catch {
          return res.status(409).json({ error: error.message });
        }
      }
      
      res.status(400).json({ error: error.message || 'Failed to create booking' });
    }
  }

  async createRecurring(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const result = await bookingService.createRecurringBooking(req.body, user.id, user.role);
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_RECURRING_BOOKING',
          entityType: 'BookingGroup',
          entityId: result.created[0]?.recurrenceGroupId || 'none',
          changes: JSON.stringify({ count: result.created.length, skipped: result.skipped }),
          ipAddress: req.ip || '',
        },
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateBooking(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const version = parseInt(req.body.version || '0');
      const booking = await bookingService.updateBooking(
        req.params.id,
        req.body,
        version,
        user.id,
        user.role
      );

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE_BOOKING',
          entityType: 'Booking',
          entityId: booking.id,
          changes: JSON.stringify({ updated: req.body }),
          ipAddress: req.ip || '',
        },
      });

      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async cancelBooking(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { reason } = req.body;
      await bookingService.cancelBooking(req.params.id, reason || 'Cancelled by user', user.id, user.role);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CANCEL_BOOKING',
          entityType: 'Booking',
          entityId: req.params.id,
          changes: JSON.stringify({ reason }),
          ipAddress: req.ip || '',
        },
      });

      res.json({ message: 'Booking cancelled successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
  
  async getBooking(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const booking = await bookingService.getBookingById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      if (booking.userId !== user.id && !['Administrator', 'Facility_Manager'].includes(user.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(booking);
    } catch (error: any) {
      console.error('Get booking error:', error);
      res.status(400).json({ error: error.message || 'Failed to fetch booking' });
    }
  }
  
  async getMyBookings(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const includeCompleted = req.query.includeCompleted === 'true';
      const bookings = await bookingService.getUserBookings(user.id, includeCompleted);
      
      res.json(bookings);
    } catch (error: any) {
      console.error('Get my bookings error:', error);
      res.status(400).json({ error: error.message || 'Failed to fetch bookings' });
    }
  }

  async createBookingRequestWithPermission(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const file = req.file;
      
      const booking = await bookingService.createBookingRequestWithPermission(
        req.body,
        file?.filename,
        user.id
      );

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_BOOKING_REQUEST',
          entityType: 'Booking',
          entityId: booking.id,
          changes: JSON.stringify({ createdRequest: booking }),
          ipAddress: req.ip || '',
        },
      });

      res.status(201).json(booking);
    } catch (error: any) {
      console.error('Create booking request error:', error);
      res.status(400).json({ error: error.message || 'Failed to submit request' });
    }
  }

  async getPendingVerifications(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const requests = await bookingService.getPendingVerifications(user.id);
      res.json(requests);
    } catch (error: any) {
      console.error('Get pending verifications error:', error);
      res.status(400).json({ error: error.message || 'Failed to fetch verification requests' });
    }
  }

  async verifyBookingRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { action } = req.body; // 'approve' | 'decline'

      if (action !== 'approve' && action !== 'decline') {
        return res.status(400).json({ error: "Invalid action. Use 'approve' or 'decline'" });
      }

      const booking = await bookingService.verifyBookingRequest(id, action, user.id);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: `VERIFY_BOOKING_${action.toUpperCase()}`,
          entityType: 'Booking',
          entityId: booking.id,
          changes: JSON.stringify({ verifiedBooking: booking }),
          ipAddress: req.ip || '',
        },
      });

      res.json(booking);
    } catch (error: any) {
      console.error('Verify booking request error:', error);
      res.status(400).json({ error: error.message || 'Failed to verify request' });
    }
  }
}

export default new BookingController();
