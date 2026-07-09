import { Request, Response } from 'express';
import resourceService from '../services/resource.service';
import prisma from '../config/database';
import path from 'path';
import fs from 'fs';

export class ResourceController {
  async createResource(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const resource = await resourceService.createResource(req.body, user.id);
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_RESOURCE',
          entityType: 'Resource',
          entityId: resource.id,
          changes: JSON.stringify({ created: resource }),
          ipAddress: req.ip || '',
        },
      });
      
      res.status(201).json(resource);
    } catch (error: any) {
      console.error('Create resource error:', error);
      res.status(400).json({ error: error.message || 'Failed to create resource' });
    }
  }
  
  async getResource(req: Request, res: Response) {
    try {
      const resource = await resourceService.getResourceById(req.params.id);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      res.json(resource);
    } catch (error: any) {
      console.error('Get resource error:', error);
      res.status(400).json({ error: error.message || 'Failed to fetch resource' });
    }
  }
  
  async listResources(req: Request, res: Response) {
    try {
      const filters: any = {
        type: req.query.type,
        status: req.query.status,
        minCapacity: req.query.minCapacity ? parseInt(req.query.minCapacity as string) : undefined,
        maxCapacity: req.query.maxCapacity ? parseInt(req.query.maxCapacity as string) : undefined,
        location: req.query.location,
        amenities: req.query.amenities ? (req.query.amenities as string).split(',') : undefined,
        search: req.query.search,
      };
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await resourceService.listResources(filters, page, limit);
      
      res.json(result);
    } catch (error: any) {
      console.error('List resources error:', error);
      res.status(400).json({ error: error.message || 'Failed to list resources' });
    }
  }
  
  async updateResource(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const version = parseInt(req.body.version || '0');
      const { version: _, ...updateData } = req.body;
      
      const resource = await resourceService.updateResource(req.params.id, updateData, version);
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE_RESOURCE',
          entityType: 'Resource',
          entityId: resource.id,
          changes: JSON.stringify({ updated: updateData }),
          ipAddress: req.ip || '',
        },
      });
      
      res.json(resource);
    } catch (error: any) {
      console.error('Update resource error:', error);
      
      if (error.message.includes('another user')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(400).json({ error: error.message || 'Failed to update resource' });
    }
  }
  
  async deleteResource(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const resource = await resourceService.deleteResource(req.params.id);
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE_RESOURCE',
          entityType: 'Resource',
          entityId: resource.id,
          changes: JSON.stringify({ deletedAt: resource.deletedAt }),
          ipAddress: req.ip || '',
        },
      });
      
      res.json({ message: 'Resource deleted successfully', resource });
    } catch (error: any) {
      console.error('Delete resource error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete resource' });
    }
  }

  async uploadImage(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const resourceId = req.params.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const isFloorPlan = req.body.isFloorPlan === 'true';
      
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId, deletedAt: null },
      });
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      const image = await prisma.resourceImage.create({
        data: {
          resourceId,
          fileUrl: `http://localhost:5000/uploads/${file.filename}`,
          fileType: file.mimetype,
          fileSizeKb: Math.round(file.size / 1024),
          isFloorPlan,
        },
      });
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPLOAD_RESOURCE_IMAGE',
          entityType: 'ResourceImage',
          entityId: image.id,
          changes: JSON.stringify({ created: image }),
          ipAddress: req.ip || '',
        },
      });
      
      res.status(201).json(image);
    } catch (error: any) {
      console.error('Upload image error:', error);
      res.status(400).json({ error: error.message || 'Failed to upload image' });
    }
  }

  async deleteImage(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id: resourceId, imageId } = req.params;
      
      const image = await prisma.resourceImage.findFirst({
        where: { id: imageId, resourceId },
      });
      
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }
      
      const filename = path.basename(image.fileUrl);
      const filePath = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await prisma.resourceImage.delete({
        where: { id: imageId },
      });
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE_RESOURCE_IMAGE',
          entityType: 'ResourceImage',
          entityId: imageId,
          changes: JSON.stringify({ deleted: image }),
          ipAddress: req.ip || '',
        },
      });
      
      res.json({ message: 'Image deleted successfully' });
    } catch (error: any) {
      console.error('Delete image error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete image' });
    }
  }

  async getAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const availabilityService = require('../services/availability.service').default;
      const result = await availabilityService.getResourceAvailability(id, startDate, endDate);
      
      res.json(result);
    } catch (error: any) {
      console.error('Get availability error:', error);
      res.status(400).json({ error: error.message || 'Failed to fetch availability' });
    }
  }
}

export default new ResourceController();
