import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import transportController from '../controllers/transport.controller';

const router = express.Router();

router.use(authenticateJWT);

// Shuttle timetables — all authenticated users can view fixed schedules
router.get('/schedules', transportController.getSchedules.bind(transportController));

// Vehicle dispatch roster and on-demand requests — Faculty, Facility_Manager, Administrator only
// Students can only see the timetable; they cannot dispatch or see vehicle rosters
const canDispatch = enforceRole(['Faculty', 'Facility_Manager', 'Administrator']);

router.get('/vehicles', canDispatch, transportController.getVehicles.bind(transportController));
router.post('/request', canDispatch, transportController.createRequest.bind(transportController));

export default router;
