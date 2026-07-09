import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import qrController from '../controllers/qr.controller';

const router = express.Router();

router.use(authenticateJWT);

// QR code generation and verification — Faculty, Facility_Manager, Administrator only
// Students cannot generate or scan QR codes for equipment access
const canScanQr = enforceRole(['Faculty', 'Facility_Manager', 'Administrator']);

router.get('/equipment/:resourceId', canScanQr, qrController.generateEquipmentQr.bind(qrController));
router.post('/verify', canScanQr, qrController.verifyQr.bind(qrController));

export default router;
