import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import equipmentController from '../controllers/equipment.controller';

const router = express.Router();

router.use(authenticateJWT);

// Read-only — all authenticated users
router.get('/checkouts/me', equipmentController.getMyCheckouts.bind(equipmentController));

// Equipment actions — Faculty, Facility_Manager, Administrator only
// Students cannot check out or return equipment
const canCheckout = enforceRole(['Faculty', 'Facility_Manager', 'Administrator']);

router.post('/checkout', canCheckout, equipmentController.checkOut.bind(equipmentController));
router.post('/checkin/:checkoutId', canCheckout, equipmentController.checkIn.bind(equipmentController));

export default router;
