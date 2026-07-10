import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import adminController from '../controllers/admin.controller';

const router = express.Router();

router.use(authenticateJWT);
router.use(enforceRole(['Administrator']));

router.get('/config', adminController.getConfigs.bind(adminController));
router.put('/config/:key', adminController.updateConfig.bind(adminController));

router.get('/users', adminController.listUsers.bind(adminController));
router.put('/users/:id/role', adminController.updateUserRole.bind(adminController));
router.post('/users/:id/suspend', adminController.suspendUser.bind(adminController));

router.get('/analytics/utilization', adminController.getUtilizationStats.bind(adminController));
router.get('/audit-logs', adminController.listAuditLogs.bind(adminController));

router.post('/notifications', adminController.sendNotification.bind(adminController));

export default router;
