import { Request, Response } from 'express';
import crypto from 'crypto';

const QR_SECRET = process.env.QR_SECRET || 'omnicampus-qr-secret-key';
const QR_TTL_SECONDS = 3600; // 1 hour

export class QrController {
  /**
   * GET /api/qr/equipment/:resourceId
   * Generates a signed, time-limited QR payload for equipment check-out.
   * Returns a JSON object with a deep-link URL and base64 QR data.
   */
  generateEquipmentQr(req: Request, res: Response) {
    try {
      const { resourceId } = req.params;
      const expiresAt = Math.floor(Date.now() / 1000) + QR_TTL_SECONDS;

      const payload = `${resourceId}:${expiresAt}`;
      const signature = crypto
        .createHmac('sha256', QR_SECRET)
        .update(payload)
        .digest('hex');

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const deepLink = `${frontendUrl}/discovery?qr=${encodeURIComponent(resourceId)}&exp=${expiresAt}&sig=${signature}`;

      // Return the signed URL and metadata
      res.json({
        resourceId,
        deepLink,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        signature,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/qr/verify
   * Verifies a QR payload signature and returns the resourceId if valid.
   */
  verifyQr(req: Request, res: Response) {
    try {
      const { resourceId, expiresAt, signature } = req.body as {
        resourceId: string;
        expiresAt: number;
        signature: string;
      };

      if (!resourceId || !expiresAt || !signature) {
        return res.status(400).json({ error: 'Missing QR fields' });
      }

      const now = Math.floor(Date.now() / 1000);
      if (now > expiresAt) {
        return res.status(410).json({ error: 'QR code has expired' });
      }

      const payload = `${resourceId}:${expiresAt}`;
      const expected = crypto
        .createHmac('sha256', QR_SECRET)
        .update(payload)
        .digest('hex');

      if (expected !== signature) {
        return res.status(403).json({ error: 'Invalid QR signature' });
      }

      res.json({ valid: true, resourceId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new QrController();
