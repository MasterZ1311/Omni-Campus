import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import qrController from '../controllers/qr.controller';

const router = express.Router();

router.use(authenticateJWT);

router.get('/equipment/:resourceId', qrController.generateEquipmentQr.bind(qrController));
router.post('/verify', qrController.verifyQr.bind(qrController));

export default router;
