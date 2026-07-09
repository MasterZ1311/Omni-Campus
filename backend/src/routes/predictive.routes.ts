import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import predictiveController from '../controllers/predictive.controller';

const router = express.Router();

router.use(authenticateJWT);
router.use(enforceRole(['Administrator', 'Facility_Manager']));

router.get('/maintenance-risk', predictiveController.getAllRisks.bind(predictiveController));
router.get('/maintenance-risk/:resourceId', predictiveController.getResourceRisk.bind(predictiveController));

export default router;
