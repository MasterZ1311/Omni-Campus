import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import prisma from '../config/database';

export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) return next(); // Not an API key request, proceed to next auth middleware or pass

    const validKey = await prisma.apiKey.findUnique({
      where: { key: apiKey, isActive: true },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });

    if (!validKey || (validKey.expiresAt && validKey.expiresAt < new Date())) {
      return res.status(401).json({ error: 'Invalid or expired API Key' });
    }

    // Update last used
    await prisma.apiKey.update({ where: { id: validKey.id }, data: { lastUsedAt: new Date() } });

    (req as any).user = validKey.user;
    (req as any).isApiKeyAuth = true;
    return next();
  } catch (error) {
    console.error('API Key authentication error:', error);
    return res.status(500).json({ error: 'Authentication processing failed' });
  }
}

export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // If already authenticated by API Key, skip JWT check
  if ((req as any).user && (req as any).isApiKeyAuth) {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export function enforceRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!allowedRoles.includes(user.role)) {
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          entityType: 'ACCESS_CONTROL',
          entityId: req.path,
          changes: JSON.stringify({
            requiredRoles: allowedRoles,
            userRole: user.role,
          }),
          ipAddress: req.ip || '',
        },
      }).catch(console.error);
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (payload) {
    prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true },
    }).then(user => {
      if (user) {
        (req as any).user = user;
      }
      next();
    }).catch(() => next());
  } else {
    next();
  }
}
