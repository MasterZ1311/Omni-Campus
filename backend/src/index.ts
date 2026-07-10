import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger';
import prisma from './config/database';

import passport from './config/passport.config';
import { sessionConfig } from './config/redis.config';
import { testDatabaseConnection } from './config/database';
import { authenticateApiKey } from './middleware/auth.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger';

import authRoutes from './routes/auth.routes';
import resourceRoutes from './routes/resource.routes';
import bookingRoutes from './routes/booking.routes';
import adminRoutes from './routes/admin.routes';
import waitlistRoutes from './routes/waitlist.routes';
import equipmentRoutes from './routes/equipment.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import transportRoutes from './routes/transport.routes';
import staffRoutes from './routes/staff.routes';
import predictiveRoutes from './routes/predictive.routes';
import qrRoutes from './routes/qr.routes';
import conciergeRoutes from './routes/concierge.routes';
import iotRoutes from './routes/iot.routes';
import complaintRoutes from './routes/complaint.routes';
import inventoryRoutes from './routes/inventory.routes';
import notificationRoutes from './routes/notification.routes';

import notificationService from './services/notification.service';
import waitlistService from './services/waitlist.service';
import equipmentService from './services/equipment.service';
import iotService from './services/iot.service';
import { mqttConfig, isMqttEnabled } from './config/mqtt.config';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// Allow any origin for plug-and-play API integrations
app.use(cors({ 
  origin: (origin, callback) => callback(null, true), 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Session and Passport
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Socket server setup
notificationService.setWsServer(io);
iotService.setWsServer(io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`👥 Socket ${socket.id} joined room: ${room}`);
  });
  
  socket.on('leave_room', (room) => {
    socket.leave(room);
    console.log(`👥 Socket ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for authentication endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Swagger UI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter, authenticateApiKey);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/predictive', predictiveRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/concierge', conciergeRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 catch-all for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler — catches unhandled errors in route handlers
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, path: req.path });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// Start background workers
notificationService.startWorker();
waitlistService.startTimeoutCheck();
equipmentService.startOverdueSweep();

async function startServer() {
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    logger.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Conditionally connect MQTT broker for IoT sensor ingestion
  if (isMqttEnabled()) {
    try {
      // Dynamic import so the server starts without mqtt package if not installed
      const mqtt = await import('mqtt');
      const mqttClient = mqtt.connect(mqttConfig.brokerUrl, mqttConfig.options);

      mqttClient.on('connect', () => {
        logger.info(`📡 MQTT connected: ${mqttConfig.brokerUrl}`);
        // Subscribe to all sensor topics
        Object.values(mqttConfig.topics).forEach((topic) => {
          mqttClient.subscribe(topic, (err) => {
            if (err) logger.error(`[MQTT] Subscribe error on ${topic}: ${err.message}`);
            else logger.info(`[MQTT] Subscribed: ${topic}`);
          });
        });
      });

      mqttClient.on('message', (topic: string, payload: Buffer) => {
        // Route GPS messages separately
        if (topic.includes('/vehicles/') && topic.includes('/gps')) {
          const vehicleId = topic.split('/')[2];
          try {
            const data = JSON.parse(payload.toString());
            iotService.handleVehicleGps(vehicleId, data);
          } catch { /* ignore bad payloads */ }
        } else if (topic.includes('/rfid/') && topic.includes('/scan')) {
          const readerId = topic.split('/')[2];
          try {
            const data = JSON.parse(payload.toString());
            iotService.handleRfidScan(readerId, data);
          } catch { /* ignore bad payloads */ }
        } else {
          iotService.handleSensorMessage(topic, payload);
        }
      });

      mqttClient.on('error', (err: Error) => {
        logger.error(`[MQTT] Connection error: ${err.message}`);
      });
    } catch (err) {
      logger.warn('[MQTT] Package not available — skipping MQTT connection.');
    }
  } else {
    logger.info('📡 MQTT disabled (no MQTT_BROKER_URL set). Set env var to enable IoT sensors.');
  }
  
  server.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    io.close();
    logger.info('WebSocket server closed.');
    await prisma.$disconnect();
    logger.info('Database disconnected.');
    process.exit(0);
  });
  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any) => {
  logger.error(`Unhandled Rejection: ${reason?.message || reason}`);
});

startServer();
