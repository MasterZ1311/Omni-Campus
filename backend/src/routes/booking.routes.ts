import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import bookingController from '../controllers/booking.controller';

const router = express.Router();

router.use(authenticateJWT);

router.post('/', bookingController.createBooking.bind(bookingController));
router.post('/recurring', bookingController.createRecurring.bind(bookingController));
router.get('/my', bookingController.getMyBookings.bind(bookingController));
router.get('/:id', bookingController.getBooking.bind(bookingController));

router.put('/:id', bookingController.updateBooking.bind(bookingController));
router.delete('/:id', bookingController.cancelBooking.bind(bookingController));

export default router;
