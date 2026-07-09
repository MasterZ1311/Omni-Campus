import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import bookingController from '../controllers/booking.controller';

const router = express.Router();

router.use(authenticateJWT);

// Read-only — all authenticated users can view
router.get('/my', bookingController.getMyBookings.bind(bookingController));
router.get('/:id', bookingController.getBooking.bind(bookingController));

// Write actions — Faculty, Facility_Manager, Administrator only
// Students are read-only viewers
const canBook = enforceRole(['Faculty', 'Facility_Manager', 'Administrator']);

router.post('/', canBook, bookingController.createBooking.bind(bookingController));
router.post('/recurring', canBook, bookingController.createRecurring.bind(bookingController));
router.put('/:id', canBook, bookingController.updateBooking.bind(bookingController));
router.delete('/:id', canBook, bookingController.cancelBooking.bind(bookingController));

export default router;
