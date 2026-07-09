import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import maintenanceController from '../controllers/maintenance.controller';

const router = express.Router();

router.use(authenticateJWT);
router.use(enforceRole(['Administrator', 'Facility_Manager']));

router.post('/', maintenanceController.schedule.bind(maintenanceController));
router.post('/complete/:id', maintenanceController.complete.bind(maintenanceController));

export default router;
