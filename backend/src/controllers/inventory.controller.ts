import { Request, Response } from 'express';
import prisma from '../config/database';

export class InventoryController {
  async getLabAssets(req: Request, res: Response) {
    try {
      const assets = await prisma.labAsset.findMany();
      res.json(assets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPeripherals(req: Request, res: Response) {
    try {
      const items = await prisma.inventoryItem.findMany();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async reportAssetIssue(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const asset = await prisma.labAsset.update({
        where: { id },
        data: { status: 'Fault' }
      });
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async resolveAssetIssue(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const asset = await prisma.labAsset.update({
        where: { id },
        data: { status: 'Online' }
      });
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new InventoryController();
