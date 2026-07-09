import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import waitlistController from '../controllers/waitlist.controller';

const router = express.Router();

router.use(authenticateJWT);

router.post('/', waitlistController.addToWaitlist.bind(waitlistController));
router.get('/me', waitlistController.getMyWaitlist.bind(waitlistController));
router.delete('/:id', waitlistController.removeFromWaitlist.bind(waitlistController));

router.post('/:id/confirm', waitlistController.confirmOffer.bind(waitlistController));
router.post('/:id/decline', waitlistController.declineOffer.bind(waitlistController));

export default router;
