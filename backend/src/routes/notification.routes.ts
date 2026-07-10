import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import notificationController from '../controllers/notification.controller';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', notificationController.getMyNotifications.bind(notificationController));

export default router;
