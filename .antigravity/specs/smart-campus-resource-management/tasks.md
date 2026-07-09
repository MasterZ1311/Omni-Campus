# Implementation Plan: Smart Campus Resource Management System

## ⚠️ UPDATED: Beginner-Friendly Detailed Instructions

**This task list has been significantly expanded with step-by-step instructions designed for AI models or developers who need explicit guidance.** Each task now includes:

1. **Exact file paths** - Full paths like `backend/src/services/booking.service.ts`
2. **Complete code snippets** - Ready-to-use TypeScript/JavaScript code
3. **Step-by-step procedures** - Numbered steps (STEP 1, STEP 2, etc.)
4. **npm commands** - Exact terminal commands to run
5. **Testing instructions** - curl commands with examples
6. **Data flow explanations** - What connects to what
7. **Verification steps** - How to confirm each step works

**Format Key:**
- **STEP N: Description** - Individual actionable step
- Code blocks with exact file content
- Inline comments explaining logic
- Terminal commands ready to copy-paste
- Expected outputs and verification methods

**Tasks 1.1-1.3, 2.1, and 4.1** have been fully expanded as examples. The remaining tasks follow the same detailed pattern.

---

## Overview

This implementation plan breaks down the Smart Campus Resource Management System into a 48-hour hackathon timeline across 4 phases. The plan prioritizes a working MVP in Phase 1, enhances it with core features in Phase 2, adds advanced functionality in Phase 3, and polishes integration in Phase 4. Each task includes specific requirements references and property-based test tasks for the 29 correctness properties defined in the design document.

## Phase 1: Core MVP (Hours 0-16)

### 1. Project Setup and Infrastructure

- [ ] 1.1 Initialize project structure and development environment
  
  **STEP 1: Create Project Root Directory**
  - Create directory: `E:\Github\Zero X Hackathon\smart-campus-system\`
  - Navigate to this directory for all subsequent commands
  
  **STEP 2: Initialize Backend Structure**
  - Create directory: `backend/`
  - Navigate to `backend/`
  - Run: `npm init -y` to create package.json
  - Install dependencies: `npm install express cors helmet morgan winston dotenv bcrypt jsonwebtoken passport passport-openidconnect passport-local express-session connect-redis ioredis socket.io prisma @prisma/client bull multer sharp aws-sdk express-validator swagger-jsdoc swagger-ui-express express-rate-limit`
  - Install dev dependencies: `npm install -D typescript @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/passport @types/passport-local @types/multer ts-node nodemon eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`
  - Create `tsconfig.json` with content:
    ```json
    {
      "compilerOptions": {
        "target": "ES2022",
        "module": "commonjs",
        "lib": ["ES2022"],
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules"]
    }
    ```
  - Create directory structure:
    ```
    backend/
      src/
        config/
        controllers/
        middleware/
        models/
        routes/
        services/
        utils/
        types/
        index.ts
      tests/
      .env.example
      .env
    ```
  
  **STEP 3: Initialize Frontend Structure**
  - Navigate back to project root
  - Run: `npm create vite@latest frontend -- --template react-ts`
  - Navigate to `frontend/`
  - Run: `npm install` to install base dependencies
  - Install additional dependencies: `npm install react-router-dom @tanstack/react-query zustand socket.io-client tailwindcss @headlessui/react @heroicons/react react-hook-form zod date-fns date-fns-tz react-big-calendar react-hot-toast axios`
  - Run: `npx tailwindcss init -p` to create Tailwind config
  - Update `tailwind.config.js`:
    ```js
    export default {
      content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
      theme: { extend: {} },
      plugins: [],
    }
    ```
  - Create directory structure:
    ```
    frontend/
      src/
        components/
        pages/
        services/
        hooks/
        store/
        utils/
        types/
        App.tsx
        main.tsx
    ```
  
  **STEP 4: Configure Code Quality Tools**
  - In `backend/`, create `.eslintrc.json`:
    ```json
    {
      "parser": "@typescript-eslint/parser",
      "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/explicit-function-return-type": "off"
      }
    }
    ```
  - Create `.prettierrc.json` in both backend and frontend:
    ```json
    {
      "semi": true,
      "trailingComma": "es5",
      "singleQuote": true,
      "printWidth": 80,
      "tabWidth": 2
    }
    ```
  
  **STEP 5: Initialize Git Repository**
  - In project root, run: `git init`
  - Create `.gitignore`:
    ```
    node_modules/
    dist/
    .env
    .DS_Store
    *.log
    .vscode/
    .idea/
    ```
  - Run: `git add .`
  - Run: `git commit -m "Initial project setup"`
  
  **STEP 6: Create Docker Compose Configuration**
  - In project root, create `docker-compose.yml`:
    ```yaml
    version: '3.8'
    services:
      postgres:
        image: postgres:15-alpine
        container_name: campus-postgres
        environment:
          POSTGRES_USER: campus_user
          POSTGRES_PASSWORD: campus_password
          POSTGRES_DB: campus_db
        ports:
          - "5432:5432"
        volumes:
          - postgres_data:/var/lib/postgresql/data
      
      redis:
        image: redis:7-alpine
        container_name: campus-redis
        ports:
          - "6379:6379"
        volumes:
          - redis_data:/data
      
      minio:
        image: minio/minio:latest
        container_name: campus-minio
        command: server /data --console-address ":9001"
        environment:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin123
        ports:
          - "9000:9000"
          - "9001:9001"
        volumes:
          - minio_data:/data
      
      mailpit:
        image: axllent/mailpit:latest
        container_name: campus-mailpit
        ports:
          - "1025:1025"
          - "8025:8025"
    
    volumes:
      postgres_data:
      redis_data:
      minio_data:
    ```
  - Test by running: `docker-compose up -d`
  - Verify all services are running: `docker-compose ps`
  
  **STEP 7: Set Up Environment Variables**
  - In `backend/`, create `.env` file:
    ```env
    NODE_ENV=development
    PORT=3000
    DATABASE_URL="postgresql://campus_user:campus_password@localhost:5432/campus_db"
    REDIS_URL="redis://localhost:6379"
    SESSION_SECRET="your-super-secret-session-key-change-in-production"
    JWT_SECRET="your-super-secret-jwt-key-change-in-production"
    JWT_EXPIRES_IN="8h"
    OIDC_ISSUER_URL="https://your-campus-sso.edu/oidc"
    OIDC_CLIENT_ID="campus-resource-system"
    OIDC_CLIENT_SECRET="your-oidc-client-secret"
    OIDC_CALLBACK_URL="http://localhost:3000/auth/oidc/callback"
    MINIO_ENDPOINT="localhost"
    MINIO_PORT=9000
    MINIO_ACCESS_KEY="minioadmin"
    MINIO_SECRET_KEY="minioadmin123"
    MINIO_BUCKET="campus-resources"
    SMTP_HOST="localhost"
    SMTP_PORT=1025
    SMTP_USER=""
    SMTP_PASSWORD=""
    SMTP_FROM="noreply@campus.edu"
    ```
  - Copy to `.env.example` (remove sensitive values) for team reference
  - In `frontend/`, create `.env`:
    ```env
    VITE_API_URL=http://localhost:3000/api
    VITE_WS_URL=http://localhost:3000
    ```
  
  _Requirements: 25.2_

- [ ] 1.2 Configure Prisma ORM and database schema
  
  **STEP 1: Initialize Prisma**
  - Navigate to `backend/`
  - Run: `npx prisma init` - this creates `prisma/` directory with `schema.prisma`
  - Verify `DATABASE_URL` in `.env` matches your PostgreSQL connection string
  
  **STEP 2: Create Complete Prisma Schema**
  - Open `prisma/schema.prisma`
  - **COPY THE ENTIRE SCHEMA** from design.md (lines 318-641) into this file
  - The schema includes these models (verify all are present):
    * `User` - authentication and user management
    * `Resource` - bookable resources (classrooms, labs, equipment)
    * `ResourceImage` - uploaded images and floor plans
    * `Booking` - resource reservations
    * `BookingModification` - audit trail for booking changes
    * `WaitlistEntry` - queue for fully booked resources
    * `EquipmentCheckout` - equipment lending tracking
    * `IoTSensor` - connected sensor metadata
    * `IoTReading` - time-series sensor data
    * `MaintenanceSchedule` - maintenance windows
    * `Notification` - multi-channel notification queue
    * `AuditLog` - comprehensive action logging
    * `SystemConfig` - configuration key-value store
  - Ensure all enums are defined: `UserRole`, `SSOProvider`, `ResourceType`, `ResourceStatus`, `BookingStatus`, `RecurrencePattern`, `WaitlistStatus`, `NotificationType`, `NotificationChannel`, `NotificationStatus`
  
  **STEP 3: Generate Prisma Client and Run Migration**
  - Run: `npx prisma generate` - creates TypeScript types in `node_modules/@prisma/client`
  - Run: `npx prisma migrate dev --name init` - creates initial migration and applies to database
  - Verify migration success: check `prisma/migrations/` folder contains a timestamped directory
  - Test connection: run `npx prisma studio` and verify you can see all tables in the browser UI at http://localhost:5555
  
  **STEP 4: Create Database Seed Script**
  - Create file `prisma/seed.ts`:
    ```typescript
    import { PrismaClient, UserRole, ResourceType, ResourceStatus, SSOProvider, BookingStatus } from '@prisma/client';
    import bcrypt from 'bcrypt';
    
    const prisma = new PrismaClient();
    
    async function main() {
      console.log('Seeding database...');
      
      // Create Admin User (local auth)
      const adminPassword = await bcrypt.hash('admin123', 10);
      const admin = await prisma.user.create({
        data: {
          email: 'admin@campus.edu',
          name: 'System Administrator',
          role: UserRole.Administrator,
          ssoProvider: SSOProvider.local,
          passwordHash: adminPassword,
          preferences: { notifications: { email: true, sms: false, inApp: true } },
        },
      });
      console.log('Created admin:', admin.email);
      
      // Create Facility Manager (OIDC)
      const facilityManager = await prisma.user.create({
        data: {
          email: 'facility@campus.edu',
          name: 'John Facility',
          role: UserRole.Facility_Manager,
          ssoProvider: SSOProvider.oidc,
          ssoId: 'oidc-facility-001',
          preferences: {},
        },
      });
      
      // Create Faculty Member
      const faculty = await prisma.user.create({
        data: {
          email: 'professor@campus.edu',
          name: 'Dr. Sarah Professor',
          role: UserRole.Faculty,
          ssoProvider: SSOProvider.oidc,
          ssoId: 'oidc-faculty-001',
          preferences: {},
        },
      });
      
      // Create Student
      const student = await prisma.user.create({
        data: {
          email: 'student@campus.edu',
          name: 'Alice Student',
          role: UserRole.Student,
          ssoProvider: SSOProvider.oidc,
          ssoId: 'oidc-student-001',
          preferences: {},
        },
      });
      console.log('Created users: facility manager, faculty, student');
      
      // Create Classrooms
      const classroom1 = await prisma.resource.create({
        data: {
          name: 'Engineering Hall Room 101',
          type: ResourceType.Classroom,
          capacity: 50,
          location: 'Engineering Building, Floor 1',
          amenities: ['Projector', 'Whiteboard', 'AC', 'Wi-Fi'],
          bufferMinutes: 15,
          status: ResourceStatus.Available,
          managedBy: facilityManager.id,
        },
      });
      
      const classroom2 = await prisma.resource.create({
        data: {
          name: 'Science Block Room 205',
          type: ResourceType.Classroom,
          capacity: 30,
          location: 'Science Building, Floor 2',
          amenities: ['Smart Board', 'AC', 'Wi-Fi'],
          bufferMinutes: 10,
          status: ResourceStatus.Available,
          managedBy: facilityManager.id,
        },
      });
      
      // Create Lab
      const lab1 = await prisma.resource.create({
        data: {
          name: 'Computer Lab A',
          type: ResourceType.Lab,
          capacity: 40,
          location: 'IT Building, Floor 3',
          amenities: ['40 Computers', 'Projector', 'AC', 'Printer'],
          bufferMinutes: 30,
          status: ResourceStatus.Available,
          managedBy: facilityManager.id,
        },
      });
      
      // Create Equipment
      const equipment1 = await prisma.resource.create({
        data: {
          name: 'Laptop - Dell XPS 15',
          type: ResourceType.Equipment,
          capacity: 1,
          location: 'Equipment Room, Library',
          amenities: ['16GB RAM', 'Intel i7', 'SSD 512GB'],
          bufferMinutes: 0,
          status: ResourceStatus.Available,
          managedBy: facilityManager.id,
        },
      });
      
      const equipment2 = await prisma.resource.create({
        data: {
          name: 'Projector - Epson EB-X41',
          type: ResourceType.Equipment,
          capacity: 1,
          location: 'Equipment Room, Library',
          amenities: ['HDMI', 'VGA', 'Wireless'],
          bufferMinutes: 0,
          status: ResourceStatus.Available,
          managedBy: facilityManager.id,
        },
      });
      
      console.log('Created resources: 2 classrooms, 1 lab, 2 equipment');
      
      // Create Sample Bookings
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(12, 0, 0, 0);
      
      const booking1 = await prisma.booking.create({
        data: {
          userId: faculty.id,
          resourceId: classroom1.id,
          startTime: tomorrow,
          endTime: tomorrowEnd,
          purpose: 'Advanced Algorithms Lecture',
          status: BookingStatus.Confirmed,
        },
      });
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(14, 0, 0, 0);
      
      const nextWeekEnd = new Date(nextWeek);
      nextWeekEnd.setHours(16, 0, 0, 0);
      
      const booking2 = await prisma.booking.create({
        data: {
          userId: student.id,
          resourceId: lab1.id,
          startTime: nextWeek,
          endTime: nextWeekEnd,
          purpose: 'Group Project Work',
          status: BookingStatus.Confirmed,
        },
      });
      
      console.log('Created 2 sample bookings');
      
      // Create System Configuration
      await prisma.systemConfig.createMany({
        data: [
          {
            key: 'booking_window_faculty',
            value: { days: 90 },
            description: 'Advance booking window for faculty in days',
            updatedBy: admin.id,
          },
          {
            key: 'booking_window_student',
            value: { days: 14 },
            description: 'Advance booking window for students in days',
            updatedBy: admin.id,
          },
          {
            key: 'max_booking_duration_hours',
            value: { hours: 8 },
            description: 'Maximum booking duration in hours',
            updatedBy: admin.id,
          },
          {
            key: 'min_booking_duration_minutes',
            value: { minutes: 30 },
            description: 'Minimum booking duration in minutes',
            updatedBy: admin.id,
          },
          {
            key: 'equipment_checkout_limit_student',
            value: { count: 3 },
            description: 'Maximum simultaneous equipment checkouts for students',
            updatedBy: admin.id,
          },
          {
            key: 'equipment_checkout_limit_faculty',
            value: { count: 5 },
            description: 'Maximum simultaneous equipment checkouts for faculty',
            updatedBy: admin.id,
          },
        ],
      });
      
      console.log('Created system configuration');
      console.log('Seeding completed successfully!');
    }
    
    main()
      .catch((e) => {
        console.error('Seeding failed:', e);
        process.exit(1);
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
    ```
  
  **STEP 5: Configure Seed Script in package.json**
  - Open `backend/package.json`
  - Add to `prisma` section:
    ```json
    "prisma": {
      "seed": "ts-node prisma/seed.ts"
    }
    ```
  - Add scripts:
    ```json
    "scripts": {
      "seed": "npx prisma db seed",
      "db:reset": "npx prisma migrate reset --force"
    }
    ```
  
  **STEP 6: Run Seed and Verify**
  - Run: `npm run seed`
  - Verify seed success in console output
  - Open Prisma Studio: `npx prisma studio`
  - Verify data exists:
    * Users table: 4 users (admin, facility manager, faculty, student)
    * Resources table: 5 resources (2 classrooms, 1 lab, 2 equipment)
    * Bookings table: 2 bookings
    * SystemConfig table: 6 configuration entries
  
  **STEP 7: Test Database Connection Programmatically**
  - Create file `backend/src/config/database.ts`:
    ```typescript
    import { PrismaClient } from '@prisma/client';
    
    const prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    
    export default prisma;
    
    export async function testDatabaseConnection() {
      try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        
        const userCount = await prisma.user.count();
        const resourceCount = await prisma.resource.count();
        console.log(`📊 Found ${userCount} users and ${resourceCount} resources`);
        
        return true;
      } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
      }
    }
    ```
  - Create test file `backend/src/index.ts` (temporary):
    ```typescript
    import { testDatabaseConnection } from './config/database';
    
    testDatabaseConnection().then((connected) => {
      if (connected) {
        console.log('Database ready for development!');
      } else {
        console.error('Fix database connection before proceeding');
        process.exit(1);
      }
    });
    ```
  - Run: `npx ts-node src/index.ts`
  - Verify you see "✅ Database connected successfully" and user/resource counts
  
  _Requirements: 25.3_

- [ ] 1.3 Set up authentication foundation with OIDC and local fallback
  
  **STEP 1: Create Authentication Types**
  - Create file `backend/src/types/auth.types.ts`:
    ```typescript
    import { UserRole } from '@prisma/client';
    
    export interface JWTPayload {
      userId: string;
      email: string;
      role: UserRole;
      iat: number;
      exp: number;
    }
    
    export interface SessionData {
      userId: string;
      role: UserRole;
      email: string;
    }
    
    export interface AuthResult {
      user: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
      };
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }
    ```
  
  **STEP 2: Create JWT Utility Functions**
  - Create file `backend/src/utils/jwt.util.ts`:
    ```typescript
    import jwt from 'jsonwebtoken';
    import { JWTPayload } from '../types/auth.types';
    
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
    
    export function generateAccessToken(userId: string, email: string, role: string): string {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId,
        email,
        role: role as any,
      };
      
      return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
    
    export function generateRefreshToken(userId: string): string {
      return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    }
    
    export function verifyToken(token: string): JWTPayload | null {
      try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
      } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
      }
    }
    ```
  
  **STEP 3: Configure Passport.js with Local Strategy**
  - Create file `backend/src/config/passport.config.ts`:
    ```typescript
    import passport from 'passport';
    import { Strategy as LocalStrategy } from 'passport-local';
    import { Strategy as OIDCStrategy } from 'passport-openidconnect';
    import bcrypt from 'bcrypt';
    import prisma from './database';
    import { SSOProvider, UserRole } from '@prisma/client';
    
    // Local Strategy for Admin Fallback
    passport.use(
      'local',
      new LocalStrategy(
        {
          usernameField: 'email',
          passwordField: 'password',
        },
        async (email, password, done) => {
          try {
            // Find user with local auth provider
            const user = await prisma.user.findFirst({
              where: {
                email: email.toLowerCase(),
                ssoProvider: SSOProvider.local,
              },
            });
            
            if (!user) {
              return done(null, false, { message: 'Invalid credentials' });
            }
            
            if (!user.passwordHash) {
              return done(null, false, { message: 'Invalid authentication method' });
            }
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
            
            if (!isValidPassword) {
              return done(null, false, { message: 'Invalid credentials' });
            }
            
            // Update last login
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLogin: new Date() },
            });
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
    
    // OIDC Strategy for Campus SSO
    const oidcConfig = {
      issuer: process.env.OIDC_ISSUER_URL || 'https://mock-sso.campus.edu',
      authorizationURL: `${process.env.OIDC_ISSUER_URL}/authorize`,
      tokenURL: `${process.env.OIDC_ISSUER_URL}/token`,
      userInfoURL: `${process.env.OIDC_ISSUER_URL}/userinfo`,
      clientID: process.env.OIDC_CLIENT_ID || 'campus-resource-system',
      clientSecret: process.env.OIDC_CLIENT_SECRET || 'mock-secret',
      callbackURL: process.env.OIDC_CALLBACK_URL || 'http://localhost:3000/auth/oidc/callback',
      scope: ['openid', 'profile', 'email'],
    };
    
    passport.use(
      'oidc',
      new OIDCStrategy(
        oidcConfig,
        async (issuer: any, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value || profile.email;
            const ssoId = profile.id;
            const name = profile.displayName || profile.name || email;
            
            // Extract role from OIDC claims (default to Student if not specified)
            let role = UserRole.Student;
            if (profile._json?.role) {
              const claimRole = profile._json.role.toUpperCase();
              if (Object.values(UserRole).includes(claimRole as UserRole)) {
                role = claimRole as UserRole;
              }
            }
            
            // Find or create user
            let user = await prisma.user.findUnique({
              where: { ssoId },
            });
            
            if (!user) {
              user = await prisma.user.create({
                data: {
                  email: email.toLowerCase(),
                  name,
                  role,
                  ssoProvider: SSOProvider.oidc,
                  ssoId,
                  lastLogin: new Date(),
                },
              });
            } else {
              // Update last login
              await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
              });
            }
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
    
    // Serialize/Deserialize for session support
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });
    
    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
    
    export default passport;
    ```
  
  **STEP 4: Set Up Redis Session Store**
  - Create file `backend/src/config/redis.config.ts`:
    ```typescript
    import Redis from 'ioredis';
    import session from 'express-session';
    import connectRedis from 'connect-redis';
    
    const RedisStore = connectRedis(session);
    
    export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });
    
    export const sessionStore = new RedisStore({
      client: redisClient as any,
      ttl: 8 * 60 * 60, // 8 hours in seconds
      prefix: 'sess:',
    });
    
    export const sessionConfig: session.SessionOptions = {
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'fallback-session-secret',
      resave: false,
      saveUninitialized: false,
      name: 'campus.sid',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
        sameSite: 'lax',
      },
    };
    ```
  
  **STEP 5: Create Authentication Middleware**
  - Create file `backend/src/middleware/auth.middleware.ts`:
    ```typescript
    import { Request, Response, NextFunction } from 'express';
    import { UserRole } from '@prisma/client';
    import { verifyToken } from '../utils/jwt.util';
    import prisma from '../config/database';
    
    export interface AuthRequest extends Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
      };
    }
    
    export async function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
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
        
        // Fetch full user details
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, email: true, name: true, role: true },
        });
        
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        
        req.user = user;
        next();
      } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
      }
    }
    
    export function enforceRole(allowedRoles: UserRole[]) {
      return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
          // Log unauthorized attempt (Requirement 1.4)
          prisma.auditLog.create({
            data: {
              userId: req.user.id,
              action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
              entityType: 'ACCESS_CONTROL',
              entityId: req.path,
              changes: {
                requiredRoles: allowedRoles,
                userRole: req.user.role,
              },
              ipAddress: req.ip,
            },
          }).catch(console.error);
          
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
      };
    }
    
    export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // Continue without user
      }
      
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      if (payload) {
        prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, email: true, name: true, role: true },
        }).then(user => {
          if (user) {
            req.user = user;
          }
          next();
        }).catch(() => next());
      } else {
        next();
      }
    }
    ```
  
  **STEP 6: Create Authentication Routes**
  - Create file `backend/src/routes/auth.routes.ts`:
    ```typescript
    import express from 'express';
    import passport from 'passport';
    import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util';
    import { AuthResult } from '../types/auth.types';
    import prisma from '../config/database';
    
    const router = express.Router();
    
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
        
        const result: AuthResult = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken,
          refreshToken,
          expiresIn: 8 * 60 * 60, // 8 hours in seconds
        };
        
        // Log successful authentication
        prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_LOCAL',
            entityType: 'AUTHENTICATION',
            entityId: user.id,
            ipAddress: req.ip,
          },
        }).catch(console.error);
        
        return res.json(result);
      })(req, res, next);
    });
    
    // OIDC Login Initiation
    router.get('/login/oidc', passport.authenticate('oidc'));
    
    // OIDC Callback
    router.get(
      '/oidc/callback',
      passport.authenticate('oidc', { session: false, failureRedirect: '/login?error=oidc_failed' }),
      (req, res) => {
        const user = req.user as any;
        
        const accessToken = generateAccessToken(user.id, user.email, user.role);
        const refreshToken = generateRefreshToken(user.id);
        
        // Log successful authentication
        prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_OIDC',
            entityType: 'AUTHENTICATION',
            entityId: user.id,
            ipAddress: req.ip,
          },
        }).catch(console.error);
        
        // Redirect to frontend with tokens (in production, use secure method)
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendURL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
      }
    );
    
    // Logout
    router.post('/logout', (req, res) => {
      const user = (req as any).user;
      if (user) {
        prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGOUT',
            entityType: 'AUTHENTICATION',
            entityId: user.id,
            ipAddress: req.ip,
          },
        }).catch(console.error);
      }
      
      res.json({ message: 'Logged out successfully' });
    });
    
    // Health Check for OIDC (detect if SSO is available)
    router.get('/health/oidc', async (req, res) => {
      try {
        // In production, ping OIDC discovery endpoint
        const oidcAvailable = process.env.OIDC_ISSUER_URL ? true : false;
        res.json({ available: oidcAvailable, fallbackEnabled: true });
      } catch (error) {
        res.json({ available: false, fallbackEnabled: true });
      }
    });
    
    export default router;
    ```
  
  **STEP 7: Initialize Express Server with Auth**
  - Replace `backend/src/index.ts` with complete server setup:
    ```typescript
    import express from 'express';
    import cors from 'cors';
    import helmet from 'helmet';
    import morgan from 'morgan';
    import session from 'express-session';
    import passport from './config/passport.config';
    import { sessionConfig } from './config/redis.config';
    import { testDatabaseConnection } from './config/database';
    import authRoutes from './routes/auth.routes';
    
    const app = express();
    const PORT = process.env.PORT || 3000;
    
    // Middleware
    app.use(helmet());
    app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(morgan('dev'));
    
    // Session and Passport
    app.use(session(sessionConfig));
    app.use(passport.initialize());
    app.use(passport.session());
    
    // Routes
    app.use('/auth', authRoutes);
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Start server
    async function startServer() {
      const dbConnected = await testDatabaseConnection();
      
      if (!dbConnected) {
        console.error('Failed to connect to database. Exiting...');
        process.exit(1);
      }
      
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📚 Auth endpoints: http://localhost:${PORT}/auth/*`);
      });
    }
    
    startServer();
    ```
  
  **STEP 8: Add npm Scripts for Development**
  - Update `backend/package.json` scripts:
    ```json
    "scripts": {
      "dev": "nodemon --exec ts-node src/index.ts",
      "build": "tsc",
      "start": "node dist/index.js",
      "seed": "npx prisma db seed",
      "db:reset": "npx prisma migrate reset --force",
      "db:studio": "npx prisma studio"
    }
    ```
  
  **STEP 9: Test Authentication Flow**
  - Start the server: `npm run dev`
  - Verify console shows:
    * "✅ Database connected successfully"
    * "✅ Redis connected successfully"
    * "🚀 Server running on http://localhost:3000"
  - Test local login with curl or Postman:
    ```bash
    curl -X POST http://localhost:3000/auth/login/local \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@campus.edu","password":"admin123"}'
    ```
  - Verify response contains:
    * `user` object with id, email, name, role
    * `accessToken` (JWT string)
    * `refreshToken` (JWT string)
    * `expiresIn` (28800 seconds = 8 hours)
  - Copy the accessToken for use in subsequent API requests
  - Test protected endpoint (create a test route to verify JWT works)
  
  _Requirements: 1.1, 1.5, 1.6_


- [ ]* 1.4 Write property tests for authentication
  - **Property 1: OIDC Role Claim Mapping** - Test role extraction from OIDC claims defaults to Student for invalid claims
  - **Property 2: Authorization Decision Consistency** - Test role permissions are enforced consistently and unauthorized attempts are logged
  - **Property 3: Timezone Round-Trip Preservation** - Test UTC storage and IST display preserve absolute time points
  - **Validates: Requirements 1.2, 1.4, 1.7, 1.8**

### 2. Resource Catalog Management

- [ ] 2.1 Implement Resource CRUD APIs
  
  **STEP 1: Create Resource Types and DTOs**
  - Create file `backend/src/types/resource.types.ts`:
    ```typescript
    import { ResourceType, ResourceStatus } from '@prisma/client';
    
    export interface CreateResourceDTO {
      name: string;
      type: ResourceType;
      capacity?: number;
      location: string;
      amenities?: string[];
      bufferMinutes?: number;
      status?: ResourceStatus;
    }
    
    export interface UpdateResourceDTO {
      name?: string;
      type?: ResourceType;
      capacity?: number;
      location?: string;
      amenities?: string[];
      bufferMinutes?: number;
      status?: ResourceStatus;
    }
    
    export interface ResourceFilters {
      type?: ResourceType;
      status?: ResourceStatus;
      minCapacity?: number;
      maxCapacity?: number;
      location?: string;
      amenities?: string[];
      search?: string;
    }
    ```
  
  **STEP 2: Create Resource Service with Business Logic**
  - Create file `backend/src/services/resource.service.ts`:
    ```typescript
    import prisma from '../config/database';
    import { CreateResourceDTO, UpdateResourceDTO, ResourceFilters } from '../types/resource.types';
    import { ResourceStatus, UserRole } from '@prisma/client';
    
    export class ResourceService {
      // Create Resource
      async createResource(data: CreateResourceDTO, managedBy: string) {
        const resource = await prisma.resource.create({
          data: {
            name: data.name,
            type: data.type,
            capacity: data.capacity,
            location: data.location,
            amenities: data.amenities || [],
            bufferMinutes: data.bufferMinutes || 0,
            status: data.status || ResourceStatus.Available,
            managedBy,
          },
          include: {
            manager: {
              select: { id: true, name: true, email: true },
            },
          },
        });
        
        return resource;
      }
      
      // Get Resource by ID
      async getResourceById(id: string) {
        const resource = await prisma.resource.findUnique({
          where: { id, deletedAt: null },
          include: {
            manager: {
              select: { id: true, name: true, email: true },
            },
            images: true,
            sensors: {
              select: { id: true, sensorType: true, isOnline: true },
            },
          },
        });
        
        return resource;
      }
      
      // List Resources with Filters
      async listResources(filters: ResourceFilters, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        
        // Build where clause
        const where: any = {
          deletedAt: null,
        };
        
        if (filters.type) {
          where.type = filters.type;
        }
        
        if (filters.status) {
          where.status = filters.status;
        }
        
        if (filters.minCapacity || filters.maxCapacity) {
          where.capacity = {};
          if (filters.minCapacity) where.capacity.gte = filters.minCapacity;
          if (filters.maxCapacity) where.capacity.lte = filters.maxCapacity;
        }
        
        if (filters.location) {
          where.location = {
            contains: filters.location,
            mode: 'insensitive',
          };
        }
        
        if (filters.amenities && filters.amenities.length > 0) {
          where.amenities = {
            hasEvery: filters.amenities,
          };
        }
        
        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { location: { contains: filters.search, mode: 'insensitive' } },
          ];
        }
        
        const [resources, total] = await Promise.all([
          prisma.resource.findMany({
            where,
            skip,
            take: limit,
            include: {
              manager: {
                select: { id: true, name: true, email: true },
              },
              images: {
                take: 1,
                orderBy: { uploadedAt: 'desc' },
              },
            },
            orderBy: { name: 'asc' },
          }),
          prisma.resource.count({ where }),
        ]);
        
        return {
          resources,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      }
      
      // Update Resource
      async updateResource(id: string, data: UpdateResourceDTO, version: number) {
        // Optimistic locking check
        const existing = await prisma.resource.findUnique({
          where: { id },
          select: { version: true, deletedAt: true },
        });
        
        if (!existing) {
          throw new Error('Resource not found');
        }
        
        if (existing.deletedAt) {
          throw new Error('Cannot update deleted resource');
        }
        
        if (existing.version !== version) {
          throw new Error('Resource was updated by another user. Please refresh and try again.');
        }
        
        const updated = await prisma.resource.update({
          where: { id },
          data: {
            ...data,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
          include: {
            manager: {
              select: { id: true, name: true, email: true },
            },
          },
        });
        
        return updated;
      }
      
      // Soft Delete Resource
      async deleteResource(id: string) {
        const resource = await prisma.resource.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            status: ResourceStatus.Unavailable,
          },
        });
        
        return resource;
      }
      
      // Check User Permission
      canUserModifyResource(userRole: UserRole): boolean {
        return [UserRole.Administrator, UserRole.Facility_Manager].includes(userRole);
      }
    }
    
    export default new ResourceService();
    ```
  
  **STEP 3: Create Resource Controller**
  - Create file `backend/src/controllers/resource.controller.ts`:
    ```typescript
    import { Response } from 'express';
    import { AuthRequest } from '../middleware/auth.middleware';
    import resourceService from '../services/resource.service';
    import prisma from '../config/database';
    
    export class ResourceController {
      // POST /api/resources
      async createResource(req: AuthRequest, res: Response) {
        try {
          const resource = await resourceService.createResource(req.body, req.user!.id);
          
          // Log creation
          await prisma.auditLog.create({
            data: {
              userId: req.user!.id,
              action: 'CREATE_RESOURCE',
              entityType: 'Resource',
              entityId: resource.id,
              changes: { created: resource },
              ipAddress: req.ip,
            },
          });
          
          res.status(201).json(resource);
        } catch (error: any) {
          console.error('Create resource error:', error);
          res.status(400).json({ error: error.message || 'Failed to create resource' });
        }
      }
      
      // GET /api/resources/:id
      async getResource(req: AuthRequest, res: Response) {
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
      
      // GET /api/resources
      async listResources(req: AuthRequest, res: Response) {
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
      
      // PUT /api/resources/:id
      async updateResource(req: AuthRequest, res: Response) {
        try {
          const version = parseInt(req.body.version || '0');
          const { version: _, ...updateData } = req.body;
          
          const resource = await resourceService.updateResource(req.params.id, updateData, version);
          
          // Log update
          await prisma.auditLog.create({
            data: {
              userId: req.user!.id,
              action: 'UPDATE_RESOURCE',
              entityType: 'Resource',
              entityId: resource.id,
              changes: { updated: updateData },
              ipAddress: req.ip,
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
      
      // DELETE /api/resources/:id
      async deleteResource(req: AuthRequest, res: Response) {
        try {
          const resource = await resourceService.deleteResource(req.params.id);
          
          // Log deletion
          await prisma.auditLog.create({
            data: {
              userId: req.user!.id,
              action: 'DELETE_RESOURCE',
              entityType: 'Resource',
              entityId: resource.id,
              changes: { deletedAt: resource.deletedAt },
              ipAddress: req.ip,
            },
          });
          
          res.json({ message: 'Resource deleted successfully', resource });
        } catch (error: any) {
          console.error('Delete resource error:', error);
          res.status(400).json({ error: error.message || 'Failed to delete resource' });
        }
      }
    }
    
    export default new ResourceController();
    ```
  
  **STEP 4: Create Resource Routes**
  - Create file `backend/src/routes/resource.routes.ts`:
    ```typescript
    import express from 'express';
    import { authenticateJWT, enforceRole } from '../middleware/auth.middleware';
    import resourceController from '../controllers/resource.controller';
    import { UserRole } from '@prisma/client';
    
    const router = express.Router();
    
    // Public routes (authentication optional)
    router.get('/', authenticateJWT, resourceController.listResources.bind(resourceController));
    router.get('/:id', authenticateJWT, resourceController.getResource.bind(resourceController));
    
    // Protected routes (Admin and Facility Manager only)
    router.post(
      '/',
      authenticateJWT,
      enforceRole([UserRole.Administrator, UserRole.Facility_Manager]),
      resourceController.createResource.bind(resourceController)
    );
    
    router.put(
      '/:id',
      authenticateJWT,
      enforceRole([UserRole.Administrator, UserRole.Facility_Manager]),
      resourceController.updateResource.bind(resourceController)
    );
    
    router.delete(
      '/:id',
      authenticateJWT,
      enforceRole([UserRole.Administrator, UserRole.Facility_Manager]),
      resourceController.deleteResource.bind(resourceController)
    );
    
    export default router;
    ```
  
  **STEP 5: Register Routes in Main Server**
  - Update `backend/src/index.ts` to add resource routes:
    ```typescript
    // Add after auth routes
    import resourceRoutes from './routes/resource.routes';
    
    // ... existing code ...
    
    // Routes
    app.use('/auth', authRoutes);
    app.use('/api/resources', resourceRoutes); // ADD THIS LINE
    ```
  
  **STEP 6: Test Resource CRUD Operations**
  - Start server: `npm run dev`
  - Get access token from login (use admin@campus.edu)
  - Test CREATE:
    ```bash
    curl -X POST http://localhost:3000/api/resources \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Conference Room A",
        "type": "Meeting_Room",
        "capacity": 20,
        "location": "Admin Building, Floor 3",
        "amenities": ["Video Conference", "Projector", "Whiteboard"],
        "bufferMinutes": 15
      }'
    ```
  - Verify response has status 201 and returns created resource with ID
  - Test LIST:
    ```bash
    curl http://localhost:3000/api/resources \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
    ```
  - Test FILTER by type:
    ```bash
    curl "http://localhost:3000/api/resources?type=Classroom" \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
    ```
  - Test GET by ID:
    ```bash
    curl http://localhost:3000/api/resources/RESOURCE_ID \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
    ```
  - Test UPDATE:
    ```bash
    curl -X PUT http://localhost:3000/api/resources/RESOURCE_ID \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"capacity": 25, "version": 1}'
    ```
  - Test DELETE (soft delete):
    ```bash
    curl -X DELETE http://localhost:3000/api/resources/RESOURCE_ID \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
    ```
  - Verify deleted resource no longer appears in list but exists in database with deletedAt timestamp
  
  _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8_

- [ ] 2.2 Implement file upload for resource images and floor plans
  - Set up multer middleware for multipart form-data handling
  - Configure S3/MinIO client for object storage
  - Implement file validation (max 10MB, PNG/JPG/PDF only)
  - Create POST /api/resources/:id/images endpoint with file size and MIME type validation
  - Generate presigned URLs for file downloads
  - Implement DELETE endpoint for removing resource images
  - _Requirements: 2.5, 2.6_


- [ ]* 2.3 Write property tests for resource management
  - **Property 4: File Upload Validation** - Test files are accepted only if size ≤ 10MB and MIME type is PNG/JPG/PDF
  - **Property 5: Soft Delete Preservation** - Test deleted resources preserve all historical booking records
  - **Property 7: Resource Filtering Accuracy** - Test filtered results match ALL specified criteria
  - **Validates: Requirements 2.5, 2.6, 2.7, 3.5**

### 3. Real-Time Availability Engine

- [ ] 3.1 Implement availability calculation service
  - Create AvailabilityService with methods for single and bulk resource availability queries
  - Implement availability calculation algorithm considering booked slots, maintenance windows, and buffer times
  - Set up Redis caching layer with 60-second TTL for availability data
  - Create GET /api/resources/:id/availability endpoint with date range support
  - Create POST /api/resources/availability/bulk endpoint for multiple resources
  - Implement cache invalidation on booking create/cancel/modify
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

- [ ] 3.2 Set up WebSocket server for real-time updates
  - Install and configure Socket.io server with authentication middleware
  - Implement room-based architecture (resource rooms, user rooms, dashboard room)
  - Create WebSocket event handlers (join_resource, leave_resource, join_dashboard)
  - Implement broadcast functions for availability updates (availability_updated, booking_created, booking_cancelled)
  - Test WebSocket connection with JWT authentication
  - Ensure sub-2-second latency for availability broadcasts
  - _Requirements: 3.2, 3.6_


- [ ]* 3.3 Write property tests for availability engine
  - **Property 6: Availability Calculation Correctness** - Test calculated availability is complement of booked/maintenance slots with buffers
  - **Validates: Requirements 3.3, 3.4**

### 4. Basic Booking Engine

- [ ] 4.1 Implement core booking creation with conflict detection
  
  **STEP 1: Create Booking Types**
  - Create file `backend/src/types/booking.types.ts`:
    ```typescript
    import { BookingStatus, RecurrencePattern } from '@prisma/client';
    
    export interface CreateBookingDTO {
      resourceId: string;
      startTime: Date | string;
      endTime: Date | string;
      purpose: string;
      recurrencePattern?: RecurrencePattern;
      recurrenceEndDate?: Date | string;
    }
    
    export interface TimeSlot {
      startTime: Date;
      endTime: Date;
    }
    
    export interface ConflictCheckResult {
      hasConflict: boolean;
      conflictingBookings?: any[];
      alternatives?: TimeSlot[];
    }
    
    export interface BookingWithDetails {
      id: string;
      user: { id: string; name: string; email: string };
      resource: { id: string; name: string; type: string };
      startTime: Date;
      endTime: Date;
      purpose: string;
      status: BookingStatus;
      createdAt: Date;
    }
    ```
  
  **STEP 2: Create Booking Service with Conflict Detection**
  - Create file `backend/src/services/booking.service.ts`:
    ```typescript
    import prisma from '../config/database';
    import { CreateBookingDTO, ConflictCheckResult, TimeSlot } from '../types/booking.types';
    import { BookingStatus, UserRole } from '@prisma/client';
    
    export class BookingService {
      // Validate booking duration (30 min to 8 hours)
      validateDuration(startTime: Date, endTime: Date): { valid: boolean; error?: string } {
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = durationMs / (1000 * 60);
        
        if (durationMinutes < 30) {
          return { valid: false, error: 'Booking duration must be at least 30 minutes' };
        }
        
        if (durationMinutes > 8 * 60) {
          return { valid: false, error: 'Booking duration cannot exceed 8 hours' };
        }
        
        if (startTime >= endTime) {
          return { valid: false, error: 'End time must be after start time' };
        }
        
        if (startTime < new Date()) {
          return { valid: false, error: 'Cannot book in the past' };
        }
        
        return { valid: true };
      }
      
      // Check for booking conflicts with database-level locking
      async checkConflicts(
        resourceId: string,
        startTime: Date,
        endTime: Date,
        excludeBookingId?: string
      ): Promise<ConflictCheckResult> {
        // Get resource to check buffer time
        const resource = await prisma.resource.findUnique({
          where: { id: resourceId },
          select: { bufferMinutes: true },
        });
        
        if (!resource) {
          throw new Error('Resource not found');
        }
        
        const bufferMs = resource.bufferMinutes * 60 * 1000;
        const startWithBuffer = new Date(startTime.getTime() - bufferMs);
        const endWithBuffer = new Date(endTime.getTime() + bufferMs);
        
        // Use database query to check for overlapping bookings
        // This query checks if any confirmed booking overlaps with the requested time slot
        const conflictingBookings = await prisma.booking.findMany({
          where: {
            resourceId,
            status: BookingStatus.Confirmed,
            id: excludeBookingId ? { not: excludeBookingId } : undefined,
            OR: [
              // Existing booking starts during requested slot
              {
                startTime: {
                  gte: startWithBuffer,
                  lt: endWithBuffer,
                },
              },
              // Existing booking ends during requested slot
              {
                endTime: {
                  gt: startWithBuffer,
                  lte: endWithBuffer,
                },
              },
              // Existing booking completely contains requested slot
              {
                AND: [
                  { startTime: { lte: startWithBuffer } },
                  { endTime: { gte: endWithBuffer } },
                ],
              },
            ],
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });
        
        if (conflictingBookings.length > 0) {
          // Generate alternative time slots
          const alternatives = await this.generateAlternatives(resourceId, startTime, endTime);
          
          return {
            hasConflict: true,
            conflictingBookings,
            alternatives,
          };
        }
        
        return { hasConflict: false };
      }
      
      // Generate alternative time slots when conflict detected
      async generateAlternatives(
        resourceId: string,
        requestedStart: Date,
        requestedEnd: Date,
        limit = 3
      ): Promise<TimeSlot[]> {
        const duration = requestedEnd.getTime() - requestedStart.getTime();
        const alternatives: TimeSlot[] = [];
        
        // Check same day, different times
        const dayStart = new Date(requestedStart);
        dayStart.setHours(8, 0, 0, 0);
        
        const dayEnd = new Date(requestedStart);
        dayEnd.setHours(20, 0, 0, 0);
        
        let checkTime = dayStart;
        
        while (checkTime < dayEnd && alternatives.length < limit) {
          const slotEnd = new Date(checkTime.getTime() + duration);
          
          if (slotEnd <= dayEnd) {
            const conflict = await this.checkConflicts(resourceId, checkTime, slotEnd);
            
            if (!conflict.hasConflict) {
              alternatives.push({
                startTime: new Date(checkTime),
                endTime: new Date(slotEnd),
              });
            }
          }
          
          checkTime = new Date(checkTime.getTime() + 30 * 60 * 1000); // Move forward 30 minutes
        }
        
        return alternatives;
      }
      
      // Create booking with transaction and conflict check
      async createBooking(data: CreateBookingDTO, userId: string, userRole: UserRole) {
        const startTime = new Date(data.startTime);
        const endTime = new Date(data.endTime);
        
        // Validate duration
        const durationCheck = this.validateDuration(startTime, endTime);
        if (!durationCheck.valid) {
          throw new Error(durationCheck.error);
        }
        
        // Use transaction with Serializable isolation for conflict prevention
        const result = await prisma.$transaction(
          async (tx) => {
            // Lock the resource for this transaction
            const resource = await tx.resource.findUnique({
              where: { id: data.resourceId },
              select: { id: true, name: true, type: true, bufferMinutes: true, version: true },
            });
            
            if (!resource) {
              throw new Error('Resource not found');
            }
            
            // Check conflicts within transaction
            const conflictCheck = await this.checkConflicts(
              data.resourceId,
              startTime,
              endTime
            );
            
            if (conflictCheck.hasConflict) {
              throw new Error(
                JSON.stringify({
                  error: 'Booking conflict detected',
                  conflicts: conflictCheck.conflictingBookings,
                  alternatives: conflictCheck.alternatives,
                })
              );
            }
            
            // Create booking
            const booking = await tx.booking.create({
              data: {
                userId,
                resourceId: data.resourceId,
                startTime,
                endTime,
                purpose: data.purpose,
                status: BookingStatus.Confirmed,
                recurrencePattern: data.recurrencePattern || 'None',
              },
              include: {
                user: {
                  select: { id: true, name: true, email: true, role: true },
                },
                resource: {
                  select: { id: true, name: true, type: true, location: true },
                },
              },
            });
            
            return booking;
          },
          {
            isolationLevel: 'Serializable', // Prevents concurrent conflicts
            timeout: 10000, // 10 second timeout
          }
        );
        
        return result;
      }
      
      // Get booking by ID
      async getBookingById(id: string) {
        return prisma.booking.findUnique({
          where: { id },
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
            resource: {
              select: { id: true, name: true, type: true, location: true, amenities: true },
            },
          },
        });
      }
      
      // Get user's bookings
      async getUserBookings(userId: string, includeCompleted = false) {
        const where: any = { userId };
        
        if (!includeCompleted) {
          where.status = { in: [BookingStatus.Confirmed] };
          where.endTime = { gte: new Date() };
        }
        
        return prisma.booking.findMany({
          where,
          include: {
            resource: {
              select: { id: true, name: true, type: true, location: true },
            },
          },
          orderBy: { startTime: 'asc' },
        });
      }
    }
    
    export default new BookingService();
    ```
  
  **STEP 3: Create Booking Controller**
  - Create file `backend/src/controllers/booking.controller.ts`:
    ```typescript
    import { Response } from 'express';
    import { AuthRequest } from '../middleware/auth.middleware';
    import bookingService from '../services/booking.service';
    import prisma from '../config/database';
    
    export class BookingController {
      // POST /api/bookings
      async createBooking(req: AuthRequest, res: Response) {
        try {
          const booking = await bookingService.createBooking(req.body, req.user!.id, req.user!.role);
          
          // Log creation
          await prisma.auditLog.create({
            data: {
              userId: req.user!.id,
              action: 'CREATE_BOOKING',
              entityType: 'Booking',
              entityId: booking.id,
              changes: { created: booking },
              ipAddress: req.ip,
            },
          });
          
          // TODO: Enqueue confirmation notification (will implement in task 5.2)
          
          res.status(201).json(booking);
        } catch (error: any) {
          console.error('Create booking error:', error);
          
          // Handle conflict error
          if (error.message.includes('Booking conflict')) {
            try {
              const conflictData = JSON.parse(error.message);
              return res.status(409).json(conflictData);
            } catch {
              return res.status(409).json({ error: error.message });
            }
          }
          
          res.status(400).json({ error: error.message || 'Failed to create booking' });
        }
      }
      
      // GET /api/bookings/:id
      async getBooking(req: AuthRequest, res: Response) {
        try {
          const booking = await bookingService.getBookingById(req.params.id);
          
          if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
          }
          
          // Check if user can view this booking
          if (booking.userId !== req.user!.id && !['Administrator', 'Facility_Manager'].includes(req.user!.role)) {
            return res.status(403).json({ error: 'Access denied' });
          }
          
          res.json(booking);
        } catch (error: any) {
          console.error('Get booking error:', error);
          res.status(400).json({ error: error.message || 'Failed to fetch booking' });
        }
      }
      
      // GET /api/bookings/my
      async getMyBookings(req: AuthRequest, res: Response) {
        try {
          const includeCompleted = req.query.includeCompleted === 'true';
          const bookings = await bookingService.getUserBookings(req.user!.id, includeCompleted);
          
          res.json(bookings);
        } catch (error: any) {
          console.error('Get my bookings error:', error);
          res.status(400).json({ error: error.message || 'Failed to fetch bookings' });
        }
      }
    }
    
    export default new BookingController();
    ```
  
  **STEP 4: Create Booking Routes**
  - Create file `backend/src/routes/booking.routes.ts`:
    ```typescript
    import express from 'express';
    import { authenticateJWT } from '../middleware/auth.middleware';
    import bookingController from '../controllers/booking.controller';
    
    const router = express.Router();
    
    // All booking routes require authentication
    router.use(authenticateJWT);
    
    router.post('/', bookingController.createBooking.bind(bookingController));
    router.get('/my', bookingController.getMyBookings.bind(bookingController));
    router.get('/:id', bookingController.getBooking.bind(bookingController));
    
    export default router;
    ```
  
  **STEP 5: Register Booking Routes**
  - Update `backend/src/index.ts`:
    ```typescript
    import bookingRoutes from './routes/booking.routes';
    
    // ... existing code ...
    
    app.use('/auth', authRoutes);
    app.use('/api/resources', resourceRoutes);
    app.use('/api/bookings', bookingRoutes); // ADD THIS LINE
    ```
  
  **STEP 6: Test Booking Creation and Conflict Detection**
  - Start server: `npm run dev`
  - Get access token from login
  - Test CREATE booking (should succeed):
    ```bash
    curl -X POST http://localhost:3000/api/bookings \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "resourceId": "RESOURCE_ID_FROM_SEED",
        "startTime": "2024-12-20T10:00:00Z",
        "endTime": "2024-12-20T12:00:00Z",
        "purpose": "Team Meeting"
      }'
    ```
  - Verify response status 201 with booking details
  - Test CONFLICT (try booking same resource/time):
    ```bash
    curl -X POST http://localhost:3000/api/bookings \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "resourceId": "SAME_RESOURCE_ID",
        "startTime": "2024-12-20T11:00:00Z",
        "endTime": "2024-12-20T13:00:00Z",
        "purpose": "Another Meeting"
      }'
    ```
  - Verify response status 409 with conflict details and alternatives array
  - Test DURATION validation (too short):
    ```bash
    curl -X POST http://localhost:3000/api/bookings \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "resourceId": "RESOURCE_ID",
        "startTime": "2024-12-21T10:00:00Z",
        "endTime": "2024-12-21T10:15:00Z",
        "purpose": "Quick Chat"
      }'
    ```
  - Verify error: "Booking duration must be at least 30 minutes"
  - Test GET my bookings:
    ```bash
    curl http://localhost:3000/api/bookings/my \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
    ```
  - Verify returns array of user's bookings
  
  _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 17.1, 17.2, 17.3, 17.6_

- [ ] 4.2 Implement concurrent modification handling
  - Add version tracking to Resource and Booking entities
  - Implement version check middleware for PUT requests
  - Return 409 Conflict when version mismatch detected
  - Display "Resource was updated by another user" message with refresh prompt
  - Test concurrent modification scenarios
  - _Requirements: 17A.1, 17A.2, 17A.3, 17A.4, 17A.5_


- [ ]* 4.3 Write property tests for booking engine
  - **Property 8: Booking Conflict Detection** - Test conflicts detected when time ranges overlap including buffer times
  - **Property 9: Conflict Alternative Generation** - Test alternatives returned for conflicts or indicate none exist
  - **Property 10: Booking Duration Validation** - Test bookings accepted only if duration is 30 min to 8 hours
  - **Property 26: Optimistic Lock Conflict Detection** - Test version mismatch rejected with conflict error
  - **Validates: Requirements 4.2, 4.3, 4.4, 17.3, 17A.2**

### 5. Basic Notification System

- [ ] 5.1 Set up Bull queue and notification infrastructure
  - Install Bull and configure Redis-backed job queue
  - Create notification worker process with job handlers
  - Implement retry logic with exponential backoff (3 attempts max)
  - Set up Dead Letter Queue for failed notifications after max retries
  - Create notification templates for booking confirmation, reminder, cancellation
  - _Requirements: 13.7, 13.8_

- [ ] 5.2 Implement email notification channel
  - Configure email service (SendGrid or SMTP)
  - Create notification service with sendNotification and enqueueNotification methods
  - Implement template rendering engine for email content
  - Send booking confirmation notifications within 5 seconds of creation
  - Update notification status in database (Pending → Sent → Failed → Dead_Letter)
  - _Requirements: 13.1, 13.2, 13.4_


- [ ]* 5.3 Write unit tests for notification retry and DLQ
  - Test retry with exponential backoff (1s, 2s, 4s delays)
  - Test DLQ movement after 3 failed attempts
  - Test notification status transitions
  - _Requirements: 13.7, 13.8_

### 6. User Dashboard

- [ ] 6.1 Implement user dashboard API
  - Create GET /api/dashboard endpoint returning upcoming bookings, recent bookings, statistics
  - Implement GET /api/bookings endpoint with filtering (userId, resourceId, status, date range)
  - Add pagination support for booking lists
  - Calculate aggregate statistics (total bookings, cancellation rate, favorite resources)
  - Implement GET /api/bookings/history endpoint with CSV export option
  - _Requirements: 18.1, 18.2, 18.3, 18.6_

- [ ] 6.2 Build frontend dashboard UI with React
  - Set up React Router with authentication-protected routes
  - Create dashboard layout with navigation and user profile
  - Build upcoming bookings card with status indicators (Confirmed, Completed, Cancelled, No_Show)
  - Add quick action buttons (Modify, Cancel, View Details, Get Directions)
  - Display aggregate statistics with visual indicators
  - Implement booking history table with sorting and filtering
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_


### 7. Basic Frontend - Resource Discovery and Booking

- [ ] 7.1 Build resource search and discovery UI
  - Create resource catalog page with grid/list view toggle
  - Implement search bar with real-time filtering
  - Add filter sidebar (type, capacity, location, amenities, status)
  - Display resource cards with key information (name, type, capacity, location, availability indicator)
  - Implement autocomplete for search after 3 characters
  - Connect to backend /api/resources endpoint with query parameters
  - _Requirements: 3.5, 3.6, 15.1, 15.3, 15.4, 15.5_

- [ ] 7.2 Build booking creation flow
  - Create resource detail page showing availability calendar
  - Integrate react-big-calendar for availability visualization
  - Build booking form with date/time pickers, duration selection, and purpose field
  - Implement real-time availability updates via WebSocket
  - Show conflict errors with alternative suggestions
  - Display success confirmation with booking details
  - Trigger booking confirmation notification
  - _Requirements: 4.1, 4.3, 4.6_

- [ ] 7.3 Integrate WebSocket client for real-time updates
  - Install socket.io-client and create WebSocket service wrapper
  - Implement resource subscription (join/leave resource rooms)
  - Handle availability_updated events and update UI state
  - Show toast notifications for real-time changes
  - Test connection resilience and reconnection
  - _Requirements: 3.2_


### 8. Phase 1 Checkpoint

- [ ] 8.1 End-to-end testing and MVP validation
  - Test complete user flow: login → search resources → view availability → create booking → receive notification → view dashboard
  - Verify real-time availability updates across multiple clients
  - Test conflict detection and alternative suggestions
  - Verify authentication with OIDC and local fallback
  - Ensure all Phase 1 requirements are functional
  - Document any known issues or limitations
  - **Checkpoint: Ensure all tests pass, ask the user if questions arise.**

## Phase 2: Enhanced Features (Hours 16-32)

### 9. Faculty Features and Priority Booking

- [ ] 9.1 Implement recurring booking creation
  - Create POST /api/bookings/recurring endpoint
  - Implement recurrence pattern generation (daily, weekly, custom days)
  - Validate all instances and detect conflicts for each occurrence
  - Create only non-conflicting instances and report skipped dates
  - Link recurring bookings with recurrence_group_id
  - Test recurring booking with various patterns
  - _Requirements: 5.1, 5.8_

- [ ] 9.2 Implement role-based advance booking windows
  - Add system configuration for Faculty window (default 90 days) and Student window (default 14 days)
  - Implement booking window validation in booking creation logic
  - Reject bookings beyond allowed window with clear error message
  - Create PUT /api/admin/config/:key endpoint for administrators to configure windows
  - _Requirements: 5.2, 5.3, 19.2_


- [ ] 9.3 Implement Faculty priority booking with Student displacement
  - Add priority conflict detection logic for Faculty vs Student bookings
  - When Faculty booking conflicts with Student booking, automatically cancel Student booking
  - Move displaced Student to waitlist automatically
  - Send priority displacement notification to Student within 5 seconds
  - Create audit log entry for displacement action
  - Test Faculty priority scenarios
  - _Requirements: 5.4, 5.5, 5.6_

- [ ]* 9.4 Write property tests for Faculty features
  - **Property 11: Recurring Booking Generation** - Test instances generated for all matching dates, skipping only conflicts
  - **Property 12: Role-Based Advance Booking Window** - Test Faculty can book 90 days, Students 14 days (configurable)
  - **Property 13: Faculty Priority Enforcement** - Test Student bookings displaced and moved to waitlist for Faculty conflicts
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6, 5.8, 17.7**

### 10. Booking Modification and Cancellation

- [ ] 10.1 Implement booking modification API
  - Create PUT /api/bookings/:id endpoint with version-based optimistic locking
  - Support modification of startTime, endTime, and purpose fields
  - Validate new time slot is available before applying changes
  - Reject modifications if booking has already started
  - Create BookingModification record for audit trail
  - Send modification notification to user
  - Broadcast availability changes via WebSocket
  - _Requirements: 6.2, 6.6_


- [ ] 10.2 Implement booking cancellation with late detection
  - Create DELETE /api/bookings/:id endpoint with mandatory cancellation reason
  - Calculate if cancellation is within 2 hours of start time and flag as late
  - Update booking status to Cancelled and record cancellation timestamp
  - Immediately invalidate availability cache and broadcast update
  - Trigger waitlist processing for the freed slot
  - Send cancellation confirmation to user
  - _Requirements: 6.1, 6.3, 6.4_

- [ ] 10.3 Implement administrator override capabilities
  - Allow administrators to cancel or modify any booking with mandatory justification
  - Create audit log entry with admin identity and justification
  - Send notification to affected user explaining administrative action
  - _Requirements: 6.5_

- [ ]* 10.4 Write property tests for booking modification
  - **Property 14: Late Cancellation Detection** - Test cancellations within 2 hours of start flagged as late
  - **Property 15: Modification Blocking for Started Bookings** - Test modifications rejected if current time ≥ start time
  - **Validates: Requirements 6.3, 6.6**

### 11. Usage Analytics and Reporting

- [ ] 11.1 Implement utilization analytics engine
  - Create AnalyticsEngine service with utilization rate calculation
  - Calculate daily, weekly, and monthly utilization rates per resource
  - Implement GET /api/admin/analytics/utilization endpoint with date range and grouping options
  - Track peak usage times, popular resources, and underutilized assets
  - Calculate no-show rates and late cancellation statistics per user and resource
  - _Requirements: 12.1, 12.5_


- [ ] 11.2 Implement report generation and export
  - Create analytics visualization data structures (charts, graphs, heat maps)
  - Implement POST /api/admin/reports/generate endpoint with async job processing
  - Generate reports in PDF, CSV, and JSON formats
  - Calculate average booking duration, no-show rates per resource
  - Implement scheduled report generation with email delivery
  - _Requirements: 12.2, 12.3, 12.4, 12.6_

- [ ]* 11.3 Write unit tests for analytics calculations
  - Test utilization rate calculations for various scenarios
  - Test peak usage time identification
  - Test no-show and late cancellation rate calculations
  - _Requirements: 12.1, 12.5_

### 12. Enhanced Notification System

- [ ] 12.1 Implement multi-channel notifications
  - Add SMS notification channel using Twilio or similar service
  - Implement in-app notification delivery via WebSocket
  - Create user notification preferences API (GET/PUT /api/users/me/preferences)
  - Allow users to configure channel preferences per notification type
  - Route notifications through appropriate channels based on user preferences
  - _Requirements: 13.1, 13.5_

- [ ] 12.2 Implement scheduled reminder notifications
  - Create scheduled jobs for 24-hour and 1-hour booking reminders
  - Query upcoming bookings and enqueue reminder notifications
  - Implement notification deduplication to prevent multiple reminders
  - Test reminder delivery timing
  - _Requirements: 13.3_


- [ ] 12.3 Implement priority notifications for system alerts
  - Create system maintenance notification template
  - Implement emergency resource unavailability notifications
  - Send priority notifications to all affected users within 5 seconds
  - Test bulk notification performance
  - _Requirements: 13.6_

### 13. Admin Panel and System Configuration

- [ ] 13.1 Build admin dashboard backend
  - Create GET /api/admin/config endpoint returning all system configuration
  - Implement PUT /api/admin/config/:key for updating configuration values
  - Add validation for configuration changes (no negative durations, no conflicting policies)
  - Store configuration in system_config table with update audit trail
  - Support configurable settings: booking windows, buffer times, maximum durations, checkout limits
  - _Requirements: 19.1, 19.2, 19.7_

- [ ] 13.2 Implement user management APIs
  - Create GET /api/admin/users with search, filtering, and pagination
  - Implement PUT /api/admin/users/:id/role for role assignments
  - Create POST /api/admin/users/:id/suspend for account suspension
  - Add user account reactivation endpoint
  - Track all user management actions in audit logs
  - _Requirements: 19.3_

- [ ] 13.3 Build admin panel UI
  - Create admin dashboard layout with navigation (Users, Resources, Analytics, Configuration, Audit Logs)
  - Build system configuration page with form controls for all settings
  - Create user management page with search, filter, role assignment, and suspension controls
  - Build resource management interface for CRUD operations
  - Add holiday schedule and blackout date configuration
  - _Requirements: 19.1, 19.2, 19.3, 19.5, 19.6_


### 14. Audit Trail and Compliance

- [ ] 14.1 Implement comprehensive audit logging
  - Create AuditLog middleware that intercepts all state-changing operations
  - Log authentication events, booking CRUD, resource CRUD, configuration changes
  - Capture timestamp, user ID, action type, entity type, entity ID, IP address, before/after snapshots
  - Ensure audit log table is append-only (no updates or deletes)
  - _Requirements: 20.1, 20.2, 20.8_

- [ ] 14.2 Implement audit log query and export
  - Create GET /api/admin/audit-logs with filtering by user, action, entity type, date range
  - Add pagination for large result sets
  - Implement POST /api/admin/audit-logs/export for CSV and JSON export
  - Ensure exported files contain all required fields
  - _Requirements: 20.6, 20.7_

- [ ] 14.3 Implement data retention policies
  - Store audit logs for minimum 1 year
  - Retain booking records for 1 year
  - Create scheduled job for archiving old bookings (older than 1 year) to long-term storage
  - Test archival process with old data
  - _Requirements: 20.3, 20.4, 20.5_

- [ ]* 14.4 Write property tests for audit logging
  - **Property 27: Comprehensive Audit Logging** - Test all user actions create audit log entries with required fields
  - **Property 28: Audit Log Export Validity** - Test CSV and JSON exports conform to RFC 4180 and RFC 8259
  - **Validates: Requirements 20.1, 20.2, 20.7**


### 15. Phase 2 Checkpoint

- [ ] 15.1 Integration testing and feature validation
  - Test Faculty recurring bookings with various patterns
  - Verify priority booking displacement and waitlist movement
  - Test booking modification and cancellation flows
  - Verify analytics calculations with sample data
  - Test multi-channel notifications
  - Verify admin panel functionality
  - Validate audit logging for all operations
  - **Checkpoint: Ensure all tests pass, ask the user if questions arise.**

## Phase 3: Advanced Features (Hours 32-44)

### 16. Waitlist Management System

- [ ] 16.1 Implement waitlist entry creation and management
  - Create POST /api/waitlist endpoint for joining waitlist
  - Calculate and assign queue position based on timestamp (FIFO ordering)
  - Implement GET /api/waitlist/me for user's waitlist entries
  - Create DELETE /api/waitlist/:id for self-removal from waitlist
  - Store desired time slot and track waitlist status
  - _Requirements: 7.1, 7.7_

- [ ] 16.2 Implement automatic slot offer on cancellation
  - Detect booking cancellation events and trigger waitlist processing
  - Query waitlist entries for matching resource and time slot, ordered by position
  - Update first waitlist entry to "Notified" status with 15-minute expiration
  - Send notification to waitlisted user within 5 seconds
  - Schedule timeout check job for 15 minutes later
  - _Requirements: 7.3, 7.4_


- [ ] 16.3 Implement waitlist confirmation and timeout handling
  - Create POST /api/waitlist/:id/confirm endpoint to accept offer
  - Create POST /api/waitlist/:id/decline endpoint to reject offer
  - When confirmed, create booking and update waitlist entry to "Confirmed"
  - When declined or timeout expires, update to "Declined"/"Expired" and offer to next in queue
  - Test cascading offers through multiple waitlist entries
  - _Requirements: 7.5, 7.6_

- [ ]* 16.4 Write property tests for waitlist management
  - **Property 16: Waitlist FIFO Ordering** - Test entries ordered by creation timestamp ascending
  - **Property 17: Waitlist Confirmation Timeout** - Test entries expire after 15 minutes without confirmation
  - **Validates: Requirements 7.2, 7.5, 7.6**

### 17. Equipment Check-Out System

- [ ] 17.1 Implement equipment checkout APIs
  - Create POST /api/equipment/checkout with user checkout limit validation
  - Enforce role-based limits: Students max 3, Faculty max 5 concurrent checkouts
  - Record checkout time, expected return time, condition notes
  - Support linking equipment to room bookings (linkedBookingId) with atomic transaction
  - Update equipment availability status
  - _Requirements: 8.1, 8.2, 8.3, 8.7_

- [ ] 17.2 Implement equipment check-in and overdue tracking
  - Create POST /api/equipment/checkin/:checkoutId with condition assessment
  - Mark equipment as available after check-in
  - Implement scheduled job to detect overdue checkouts
  - Send daily overdue notifications to users
  - Escalate to administrators after 3 days of overdue
  - _Requirements: 8.5, 8.6_


- [ ] 17.3 Implement equipment availability and user checkout tracking
  - Create GET /api/equipment/:id/availability showing current checkout status
  - Create GET /api/equipment/checkouts/me for user's active and completed checkouts
  - Display linked room bookings in checkout details
  - _Requirements: 8.4_

- [ ]* 17.4 Write property tests for equipment management
  - **Property 18: Equipment and Room Atomic Linking** - Test equipment checkout and room booking created atomically
  - **Property 19: Equipment Availability Blocking** - Test equipment with active checkout cannot be booked
  - **Property 20: Equipment Checkout Limits** - Test Students limited to 3, Faculty to 5 concurrent checkouts
  - **Validates: Requirements 8.2, 8.4, 8.7**

### 18. Advanced Search and Discovery

- [ ] 18.1 Implement enhanced search capabilities
  - Add full-text search using PostgreSQL tsvector on resource names, descriptions, locations
  - Implement search ranking by relevance and availability
  - Create GET /api/resources/search with query parameter and autocomplete flag
  - Support advanced filtering by capacity range, equipment availability, building location, time availability
  - Return search results within 500ms for 1000 resources
  - _Requirements: 15.1, 15.2, 15.3, 15.5_

- [ ] 18.2 Implement recent searches and favorites
  - Store recent searches per user in Redis with LRU eviction
  - Create GET /api/users/me/recent-searches endpoint
  - Track favorite resources based on booking frequency
  - Display favorites in dashboard
  - _Requirements: 15.6_


### 19. Maintenance Mode and Resource Status

- [ ] 19.1 Implement maintenance scheduling
  - Create MaintenanceSchedule model and endpoints (POST, GET, PUT /api/maintenance)
  - Allow Facility_Managers to set resources to Maintenance status with start/end dates
  - Reject all new bookings for resources in Maintenance status
  - Send notifications to users with existing bookings during maintenance period
  - _Requirements: 16.1, 16.2, 16.3_

- [ ] 19.2 Implement alternative suggestions for maintenance
  - When maintenance is scheduled, identify affected bookings
  - Query for alternative resources with matching criteria (type, capacity, amenities)
  - Send notifications with alternative suggestions to affected users
  - Allow users to easily rebook using suggested alternatives
  - _Requirements: 16.4_

- [ ] 19.3 Implement maintenance completion and logging
  - Create maintenance completion workflow with notes
  - Allow Facility_Managers to return resources to Available status
  - Log maintenance completion details in audit trail
  - _Requirements: 16.5, 16.6_

### 20. Buffer Time and Conflict Resolution

- [ ] 20.1 Implement configurable buffer times
  - Add buffer_minutes field to Resource model (already in schema)
  - Allow administrators and Facility_Managers to configure buffer via admin panel
  - Update conflict detection algorithm to include buffer times
  - Test consecutive bookings separated by buffer duration
  - _Requirements: 17.4, 17.5_


- [ ]* 20.2 Write property test for buffer enforcement
  - **Property 25: Buffer Time Enforcement** - Test consecutive bookings separated by at least buffer_minutes
  - **Validates: Requirements 17.4**

### 21. Phase 3 Checkpoint

- [ ] 21.1 Advanced features validation
  - Test complete waitlist flow with timeout and cascading offers
  - Verify equipment checkout with room linking
  - Test maintenance scheduling with affected user notifications
  - Verify buffer time enforcement in conflict detection
  - Test advanced search with various filters
  - **Checkpoint: Ensure all tests pass, ask the user if questions arise.**

## Phase 4: Integration & Polish (Hours 44-48)

### 22. Calendar Integration

- [ ] 22.1 Implement iCalendar export
  - Create iCalendar generation utility following RFC 5545
  - Generate .ics files with required fields (VEVENT, DTSTART, DTEND, SUMMARY, LOCATION)
  - Include timezone information (UTC with TZID)
  - Create GET /api/bookings/:id/icalendar endpoint for individual booking export
  - Test .ics file validity with calendar applications
  - _Requirements: 10.1, 10.4_

- [ ] 22.2 Implement Google Calendar integration
  - Set up OAuth2 flow for Google Calendar API
  - Create POST /api/integrations/calendar/connect endpoint
  - Implement bidirectional sync: create/update/delete calendar events on booking changes
  - Update connected calendar within 1 minute of booking changes
  - _Requirements: 10.2, 10.3_


- [ ] 22.3 Implement calendar conflict detection with override
  - Check user's connected calendar for conflicts before confirming bookings
  - Display warning when calendar conflicts detected
  - Allow authorized users to override and proceed with booking
  - Implement user preference to enable/disable calendar integration
  - _Requirements: 10.5, 10.6, 10.7, 10.8_

- [ ]* 22.4 Write property tests for calendar integration
  - **Property 23: iCalendar Export Validity** - Test .ics files valid per RFC 5545 with all required fields
  - **Property 24: Calendar Event Data Completeness** - Test events include resource name, location, purpose, times
  - **Validates: Requirements 10.1, 10.4**

### 23. IoT Sensor Integration (Mock Implementation)

- [ ] 23.1 Implement IoT sensor data ingestion
  - Create POST /api/integrations/iot/readings endpoint with API key authentication
  - Support REST API for sensor readings (sensor ID, type, data, timestamp)
  - Store readings in iot_readings table with 90-day retention
  - Support sensor types: occupancy, temperature, humidity, equipment_status
  - Update last_reading and last_communication in iot_sensors table
  - _Requirements: 9.1, 9.4, 9.5_

- [ ] 23.2 Implement IoT-based occupancy detection
  - Create scheduled job to process recent IoT readings
  - Detect unauthorized occupancy: occupancy=true with no confirmed booking
  - Detect no-shows: confirmed booking with occupancy=false for 15 minutes after start
  - Flag unauthorized usage and no-shows in database
  - Send notifications to Facility_Managers for unauthorized occupancy
  - _Requirements: 9.2, 9.3_


- [ ] 23.3 Implement IoT sensor health monitoring with degraded mode
  - Track sensor online status and last communication timestamp
  - Create scheduled job to detect sensors offline for more than 5 minutes
  - Send alerts to Facility_Managers when sensors go offline
  - Implement degraded mode: use booking schedule for occupancy estimation when sensors offline
  - Display "estimated occupancy" warning in UI when in degraded mode
  - _Requirements: 9.6, 9.7_

- [ ]* 23.4 Write property tests for IoT detection
  - **Property 21: IoT Unauthorized Occupancy Detection** - Test occupancy=true with no booking flagged as unauthorized
  - **Property 22: IoT No-Show Detection** - Test occupancy=false for 15 min after start flagged as no-show
  - **Validates: Requirements 9.2, 9.3**

### 24. API Documentation and Rate Limiting

- [ ] 24.1 Implement API rate limiting
  - Install express-rate-limit middleware
  - Configure rate limits: 100 req/min for web users and API clients, 5 req/15min for auth endpoints
  - Implement different limits for IoT endpoints (1000 req/min)
  - Return 429 status with Retry-After header when limit exceeded
  - Store rate limit counters in Redis
  - _Requirements: 23.3, 23.4_

- [ ] 24.2 Generate OpenAPI documentation
  - Install swagger-jsdoc and swagger-ui-express
  - Add JSDoc annotations to all API endpoints
  - Generate OpenAPI 3.0 specification
  - Serve interactive API documentation at /api-docs
  - Include authentication schemes, request/response examples, error codes
  - _Requirements: 23.5, 23.6_


- [ ]* 24.3 Write property test for rate limiting
  - **Property 29: Rate Limit Enforcement** - Test requests exceeding 100/min rejected with 429 until window resets
  - **Validates: Requirements 23.3, 23.4**

### 25. UI/UX Polish and Mobile Responsiveness

- [ ] 25.1 Implement responsive design for mobile devices
  - Ensure all pages render correctly on 320px to 768px width screens
  - Implement touch gestures for calendar navigation
  - Optimize page load times for 4G connections (target < 3 seconds)
  - Test on iOS Safari and Android Chrome
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 25.2 Implement QR code for quick resource access
  - Install QR code generation library
  - Generate QR codes for each resource linking to resource detail page
  - Create QR code scanner component in mobile UI
  - Test QR code scanning flow
  - _Requirements: 14.6_

- [ ] 25.3 Polish UI components and user experience
  - Refine dashboard layout and visual hierarchy
  - Improve loading states and skeleton screens
  - Add smooth transitions and animations
  - Implement toast notifications with React Hot Toast
  - Ensure consistent styling with Tailwind CSS
  - Add proper error states and empty states
  - Test accessibility with keyboard navigation


### 26. Performance Optimization and Caching

- [ ] 26.1 Optimize database queries and indexing
  - Review slow query logs and add missing indexes
  - Implement database connection pooling (min 10, max 50 connections)
  - Test query performance with 1000 resources and 10000 bookings
  - Verify median response time under 200ms for booking operations
  - _Requirements: 21.2, 21.3, 21.5_

- [ ] 26.2 Implement comprehensive caching strategy
  - Cache resource catalogs with 5-minute TTL
  - Cache user bookings with 2-minute TTL
  - Implement cache warming for frequently accessed resources
  - Test cache invalidation on booking create/modify/cancel
  - _Requirements: 21.4_

- [ ] 26.3 Load testing and capacity validation
  - Set up load testing with Artillery or k6
  - Test system with 500 concurrent users
  - Verify no performance degradation under load
  - Monitor system metrics (CPU, memory, database connections)
  - Set up alerting when load exceeds 80% capacity
  - _Requirements: 21.1, 21.6_

### 27. Deployment and Demo Preparation

- [ ] 27.1 Finalize Docker deployment configuration
  - Update Docker Compose with all services (PostgreSQL, Redis, backend, frontend, NGINX)
  - Configure environment variables for production
  - Set up NGINX reverse proxy with SSL termination
  - Create single-command deployment script
  - Test complete deployment from scratch
  - _Requirements: 25.2, 25.5_


- [ ] 27.2 Create comprehensive seed data for demo
  - Create seed script with realistic campus resources (20+ classrooms, 10+ labs, 15+ equipment)
  - Generate sample users across all roles (Students, Faculty, Administrators, Facility_Managers)
  - Create sample bookings covering various scenarios (confirmed, recurring, waitlisted, cancelled)
  - Add sample IoT sensors and readings
  - Include audit log entries for various actions
  - _Requirements: 25.3_

- [ ] 27.3 Create demo scenarios and documentation
  - Write demo script covering all major features
  - Document user flows for each role
  - Create README with architecture overview, setup instructions, and API documentation
  - Record screenshots and demo videos
  - Prepare presentation slides highlighting key features and technical decisions
  - _Requirements: 25.4_

### 28. Final Testing and Bug Fixes

- [ ] 28.1 End-to-end integration testing
  - Test all user flows from login to booking completion
  - Verify real-time updates across multiple browser sessions
  - Test all role-based access controls
  - Verify all notification channels (email, SMS, in-app)
  - Test calendar integration and IoT sensor integration
  - Validate all API endpoints with Postman collection

- [ ] 28.2 Property-based test execution and validation
  - Run all 29 property-based tests
  - Fix any failing properties
  - Achieve target test coverage (70%+ for core booking logic)
  - Document any known limitations or edge cases


- [ ] 28.3 Bug fixing and final polish
  - Address any critical bugs discovered during testing
  - Fix UI/UX issues and improve error messages
  - Ensure graceful error handling and fallback mechanisms
  - Verify all success metrics from requirements
  - Conduct final security review (authentication, authorization, input validation)

### 29. Phase 4 Checkpoint and Launch

- [ ] 29.1 Final validation and demo rehearsal
  - Run complete system health check
  - Test all Phase 1-4 requirements are functional
  - Practice demo presentation with all team members
  - Verify deployment is stable and all services are running
  - Prepare backup plans for demo (offline mode, fallback data)
  - **Checkpoint: System ready for demo. Ensure all critical features work flawlessly.**

## Notes

- **Starred tasks (*)** are optional property-based test tasks. They can be skipped for faster MVP but are highly recommended for production quality.
- Each task explicitly references the requirements it validates for full traceability.
- Property-based tests validate the 29 universal correctness properties defined in the design document.
- Checkpoints ensure incremental validation and provide opportunities to address issues before proceeding.
- The 48-hour timeline is aggressive but achievable with the selected technology stack and phased approach.
- Mock implementations for IoT and calendar integration allow for rapid development while maintaining demo-ready functionality.
- All tasks are designed to be completed by a coding agent with access to the requirements and design documents.


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2"]
    },
    {
      "id": 1,
      "tasks": ["1.3", "2.1", "5.1"]
    },
    {
      "id": 2,
      "tasks": ["1.4", "2.2", "2.3", "3.1", "5.2", "6.1"]
    },
    {
      "id": 3,
      "tasks": ["3.2", "3.3", "4.1", "5.3", "6.2", "7.1"]
    },
    {
      "id": 4,
      "tasks": ["4.2", "4.3", "7.2", "7.3"]
    },
    {
      "id": 5,
      "tasks": ["8.1"]
    },
    {
      "id": 6,
      "tasks": ["9.1", "9.2", "11.1", "12.1", "13.1", "13.2", "14.1"]
    },
    {
      "id": 7,
      "tasks": ["9.3", "9.4", "10.1", "11.2", "11.3", "12.2", "13.3", "14.2"]
    },
    {
      "id": 8,
      "tasks": ["10.2", "10.3", "10.4", "12.3", "14.3", "14.4"]
    },
    {
      "id": 9,
      "tasks": ["15.1"]
    },
    {
      "id": 10,
      "tasks": ["16.1", "17.1", "18.1", "19.1", "20.1"]
    },
    {
      "id": 11,
      "tasks": ["16.2", "16.4", "17.2", "18.2", "19.2", "20.2"]
    },
    {
      "id": 12,
      "tasks": ["16.3", "17.3", "17.4", "19.3"]
    },
    {
      "id": 13,
      "tasks": ["21.1"]
    },
    {
      "id": 14,
      "tasks": ["22.1", "22.2", "23.1", "24.1"]
    },
    {
      "id": 15,
      "tasks": ["22.3", "22.4", "23.2", "23.4", "24.2", "24.3", "25.1"]
    },
    {
      "id": 16,
      "tasks": ["23.3", "25.2", "25.3", "26.1"]
    },
    {
      "id": 17,
      "tasks": ["26.2", "26.3", "27.1"]
    },
    {
      "id": 18,
      "tasks": ["27.2", "27.3", "28.1"]
    },
    {
      "id": 19,
      "tasks": ["28.2", "28.3"]
    },
    {
      "id": 20,
      "tasks": ["29.1"]
    }
  ]
}
```
