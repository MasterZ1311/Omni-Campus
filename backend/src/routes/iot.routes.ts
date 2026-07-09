import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import iotController from '../controllers/iot.controller';

const router = express.Router();

router.use(authenticateJWT);

// Public to all authenticated users — read-only sensor data
router.get('/sensors', iotController.getAllSensors.bind(iotController));
router.get('/sensors/:resourceId', iotController.getResourceSensors.bind(iotController));

// Simulation endpoint — Admin only
router.post(
  '/simulate',
  enforceRole(['Administrator']),
  iotController.simulateReading.bind(iotController)
);

export default router;
