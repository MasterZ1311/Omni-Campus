import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import inventoryController from '../controllers/inventory.controller';

const router = express.Router();

router.use(authenticateJWT);

router.get('/lab-assets', enforceRole(['Administrator', 'Facility_Manager', 'Lab_Assistant']), inventoryController.getLabAssets.bind(inventoryController));
router.get('/peripherals', enforceRole(['Administrator', 'Facility_Manager', 'Lab_Assistant']), inventoryController.getPeripherals.bind(inventoryController));

router.patch('/lab-assets/:id/report', enforceRole(['Administrator', 'Facility_Manager', 'Lab_Assistant']), inventoryController.reportAssetIssue.bind(inventoryController));
router.patch('/lab-assets/:id/resolve', enforceRole(['Administrator', 'Facility_Manager', 'Lab_Assistant']), inventoryController.resolveAssetIssue.bind(inventoryController));

export default router;
