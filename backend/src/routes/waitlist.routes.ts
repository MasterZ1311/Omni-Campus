import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import waitlistController from '../controllers/waitlist.controller';

const router = express.Router();

router.use(authenticateJWT);

// Read-only — all authenticated users
router.get('/me', waitlistController.getMyWaitlist.bind(waitlistController));

// Write actions — Faculty, Facility_Manager, Administrator only
// Students cannot join waitlists or take booking actions
const canBook = enforceRole(['Faculty', 'Facility_Manager', 'Administrator']);

router.post('/', canBook, waitlistController.addToWaitlist.bind(waitlistController));
router.delete('/:id', canBook, waitlistController.removeFromWaitlist.bind(waitlistController));
router.post('/:id/confirm', canBook, waitlistController.confirmOffer.bind(waitlistController));
router.post('/:id/decline', canBook, waitlistController.declineOffer.bind(waitlistController));

export default router;
