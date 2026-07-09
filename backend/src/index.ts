import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';

import passport from './config/passport.config';
import { sessionConfig } from './config/redis.config';
import { testDatabaseConnection } from './config/database';

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
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
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

// Routes
app.use('/auth', authRoutes);
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start background workers
notificationService.startWorker();
waitlistService.startTimeoutCheck();
equipmentService.startOverdueSweep();

async function startServer() {
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Conditionally connect MQTT broker for IoT sensor ingestion
  if (isMqttEnabled()) {
    try {
      // Dynamic import so the server starts without mqtt package if not installed
      const mqtt = await import('mqtt');
      const mqttClient = mqtt.connect(mqttConfig.brokerUrl, mqttConfig.options);

      mqttClient.on('connect', () => {
        console.log(`📡 MQTT connected: ${mqttConfig.brokerUrl}`);
        // Subscribe to all sensor topics
        Object.values(mqttConfig.topics).forEach((topic) => {
          mqttClient.subscribe(topic, (err) => {
            if (err) console.error(`[MQTT] Subscribe error on ${topic}:`, err);
            else console.log(`[MQTT] Subscribed: ${topic}`);
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
        console.error('[MQTT] Connection error:', err.message);
      });
    } catch (err) {
      console.warn('[MQTT] Package not available — skipping MQTT connection. Install: npm install mqtt');
    }
  } else {
    console.log('📡 MQTT disabled (no MQTT_BROKER_URL set). Set env var to enable IoT sensors.');
  }
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
