import express from 'express';
import passport from 'passport';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util';
import prisma from '../config/database';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /auth/login/local:
 *   post:
 *     summary: Authenticate user using local credentials
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
// Local Login (Admin Fallback)
router.post('/login/local', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);
    
    // Log successful authentication
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_LOCAL',
        entityType: 'AUTHENTICATION',
        entityId: user.id,
        ipAddress: req.ip || '',
      },
    }).catch(console.error);
    
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 8 * 60 * 60, // 8 hours in seconds
    });
  })(req, res, next);
});

// OIDC Login Initiation (Mocked)
router.get('/login/oidc', (req, res) => {
  const role = req.query.role || 'Student';
  const callbackURL = `http://localhost:5000/auth/oidc/callback?code=mock_code&state=mock_state&role=${role}`;
  res.redirect(callbackURL);
});

// OIDC Callback (Mocked)
router.get('/oidc/callback', async (req, res) => {
  try {
    const role = (req.query.role as string) || 'Student';
    
    // Look up default seeded user by role or create
    let email = 'student@campus.edu';
    let name = 'Alice Student';
    let ssoId = 'oidc-student-001';
    
    if (role === 'Faculty') {
      email = 'professor@campus.edu';
      name = 'Dr. Sarah Professor';
      ssoId = 'oidc-faculty-001';
    } else if (role === 'Facility_Manager') {
      email = 'facility@campus.edu';
      name = 'John Facility';
      ssoId = 'oidc-facility-001';
    } else if (role === 'Lab_Assistant') {
      email = 'labtech@campus.edu';
      name = 'Mike Tech';
      ssoId = 'oidc-labtech-001';
    } else if (role === 'Attender') {
      email = 'attender@campus.edu';
      name = 'Sam Attender';
      ssoId = 'oidc-attender-001';
    }
    
    let user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      // Create user if not seeded
      user = await prisma.user.create({
        data: {
          email,
          name,
          role,
          ssoProvider: 'oidc',
          ssoId,
          lastLogin: new Date(),
          preferences: JSON.stringify({}),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLogin: new Date(),
          role: role 
        },
      });
    }
    
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);
    
    // Log OIDC login
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_OIDC',
        entityType: 'AUTHENTICATION',
        entityId: user.id,
        ipAddress: req.ip || '',
      },
    }).catch(console.error);
    
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendURL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
  } catch (error) {
    console.error('OIDC Mock Callback failed:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oidc_failed`);
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Get all Faculty members
router.get('/faculty', authenticateJWT, async (req, res) => {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: 'Faculty' },
      select: { id: true, name: true, email: true },
    });
    res.json(faculty);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
