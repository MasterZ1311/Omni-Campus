import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import iotController from '../controllers/iot.controller';

const router = express.Router();

router.use(authenticateJWT);

// IoT sensor data is operational telemetry — Faculty, Facility_Manager, Administrator only
// Students are not authorised to access raw sensor data
const canViewSensors = enforceRole(['Faculty', 'Facility_Manager', 'Administrator']);

router.get('/sensors', canViewSensors, iotController.getAllSensors.bind(iotController));
router.get('/sensors/:resourceId', canViewSensors, iotController.getResourceSensors.bind(iotController));

// Simulation — Administrator only
router.post(
  '/simulate',
  enforceRole(['Administrator']),
  iotController.simulateReading.bind(iotController)
);

export default router;
