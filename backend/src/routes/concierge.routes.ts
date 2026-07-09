import express from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import conciergeController from '../controllers/concierge.controller';

const router = express.Router();

router.use(authenticateJWT);

router.post('/query', conciergeController.query.bind(conciergeController));

export default router;
