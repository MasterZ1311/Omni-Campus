import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import bookingController from '../controllers/booking.controller';

const router = express.Router();

router.use(authenticateJWT);

// Read-only — all authenticated users can view
/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     summary: Get all bookings for the authenticated user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of user bookings
 */
router.get('/my', bookingController.getMyBookings.bind(bookingController));
router.get('/:id', bookingController.getBooking.bind(bookingController));

// Write actions — Faculty, Facility_Manager, Administrator only
// Students are read-only viewers
const canBook = enforceRole(['Faculty', 'Facility_Manager', 'Administrator']);

// Student permission request route
router.post(
  '/request-with-permission',
  enforceRole(['Student']),
  uploadMiddleware.single('permissionSlip'),
  bookingController.createBookingRequestWithPermission.bind(bookingController)
);

// Faculty verification routes
router.get(
  '/pending-verifications',
  enforceRole(['Faculty']),
  bookingController.getPendingVerifications.bind(bookingController)
);

router.patch(
  '/:id/verify',
  enforceRole(['Faculty']),
  bookingController.verifyBookingRequest.bind(bookingController)
);

router.post('/', canBook, bookingController.createBooking.bind(bookingController));
router.post('/recurring', canBook, bookingController.createRecurring.bind(bookingController));
router.put('/:id', canBook, bookingController.updateBooking.bind(bookingController));
router.delete('/:id', canBook, bookingController.cancelBooking.bind(bookingController));

export default router;
