import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import complaintController from '../controllers/complaint.controller';

const router = express.Router();

router.use(authenticateJWT);

// Create a complaint (Any authenticated user)
router.post('/', complaintController.createComplaint);

// Get all complaints (Attenders, Admin, Facility Manager)
router.get('/', enforceRole(['Attender', 'Administrator', 'Facility_Manager']), complaintController.getComplaints);

// Route a complaint (Attenders, Admin, Facility Manager)
router.patch('/:id/route', enforceRole(['Attender', 'Administrator', 'Facility_Manager']), complaintController.routeComplaint);

export default router;
