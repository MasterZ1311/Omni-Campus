import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import transportController from '../controllers/transport.controller';

const router = express.Router();

router.use(authenticateJWT);

router.get('/vehicles', transportController.getVehicles.bind(transportController));
router.get('/schedules', transportController.getSchedules.bind(transportController));
router.post('/request', transportController.createRequest.bind(transportController));

export default router;
