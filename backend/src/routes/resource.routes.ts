import express from 'express';
import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
import resourceController from '../controllers/resource.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = express.Router();

router.get('/', authenticateJWT, resourceController.listResources.bind(resourceController));
router.get('/classrooms/vacant', authenticateJWT, resourceController.getVacantClassrooms.bind(resourceController));
router.get('/:id', authenticateJWT, resourceController.getResource.bind(resourceController));
router.get('/:id/availability', authenticateJWT, resourceController.getAvailability.bind(resourceController));

router.post(
  '/',
  authenticateJWT,
  enforceRole(['Administrator', 'Facility_Manager']),
  resourceController.createResource.bind(resourceController)
);

router.put(
  '/:id',
  authenticateJWT,
  enforceRole(['Administrator', 'Facility_Manager']),
  resourceController.updateResource.bind(resourceController)
);

router.delete(
  '/:id',
  authenticateJWT,
  enforceRole(['Administrator', 'Facility_Manager']),
  resourceController.deleteResource.bind(resourceController)
);

// File uploads for resource images and floor plans
router.post(
  '/:id/images',
  authenticateJWT,
  enforceRole(['Administrator', 'Facility_Manager']),
  uploadMiddleware.single('file'),
  resourceController.uploadImage.bind(resourceController)
);

router.delete(
  '/:id/images/:imageId',
  authenticateJWT,
  enforceRole(['Administrator', 'Facility_Manager']),
  resourceController.deleteImage.bind(resourceController)
);

export default router;
