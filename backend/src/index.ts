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

import notificationService from './services/notification.service';
import waitlistService from './services/waitlist.service';
import equipmentService from './services/equipment.service';

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
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
