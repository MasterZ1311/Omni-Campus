import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import equipmentController from '../controllers/equipment.controller';

const router = express.Router();

router.use(authenticateJWT);

router.post('/checkout', equipmentController.checkOut.bind(equipmentController));
router.post('/checkin/:checkoutId', equipmentController.checkIn.bind(equipmentController));
router.get('/checkouts/me', equipmentController.getMyCheckouts.bind(equipmentController));

export default router;
