import { Request } from 'express';

/**
 * Extend Express Request to include authenticated user data.
 * Eliminates unsafe `(req as any).user` casts throughout the codebase.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
      isApiKeyAuth?: boolean;
    }
  }
}
