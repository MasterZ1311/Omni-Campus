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

router.get('/my-assignments', enforceRole(['Administrator', 'Facility_Manager', 'Faculty', 'Attender', 'Lab_Assistant']), staffController.getMyAssignments.bind(staffController));

router.patch('/assignments/:id/complete', enforceRole(['Administrator', 'Facility_Manager', 'Faculty', 'Attender', 'Lab_Assistant']), staffController.completeAssignment.bind(staffController));
export default router;
