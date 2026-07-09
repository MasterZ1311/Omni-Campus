import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import staffController from '../controllers/staff.controller';

const router = express.Router();

router.use(authenticateJWT);

// Staff roster and assignment creation — Administrator and Facility_Manager only
router.get('/roster', enforceRole(['Administrator', 'Facility_Manager']), staffController.getRoster.bind(staffController));
router.post('/assignments', enforceRole(['Administrator', 'Facility_Manager']), staffController.createAssignment.bind(staffController));

// Status updates — only staff themselves (Facility_Manager) or admins can update status
// NOT accessible to Students or Faculty
router.put('/:staffId/status', enforceRole(['Administrator', 'Facility_Manager']), staffController.updateStatus.bind(staffController));

// My assignments — Facility_Manager and Administrator can view assignments
// Faculty may also view their own tech-support assignments
router.get('/my-assignments', enforceRole(['Administrator', 'Facility_Manager', 'Faculty']), staffController.getMyAssignments.bind(staffController));

export default router;
