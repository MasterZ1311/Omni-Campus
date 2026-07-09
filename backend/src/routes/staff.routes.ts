import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import staffController from '../controllers/staff.controller';

const router = express.Router();

router.use(authenticateJWT);

router.get('/roster', enforceRole(['Administrator', 'Facility_Manager']), staffController.getRoster.bind(staffController));
router.post('/assignments', enforceRole(['Administrator', 'Facility_Manager']), staffController.createAssignment.bind(staffController));
router.put('/:staffId/status', staffController.updateStatus.bind(staffController));
router.get('/my-assignments', staffController.getMyAssignments.bind(staffController));

export default router;
