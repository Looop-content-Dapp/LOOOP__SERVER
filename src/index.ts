import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session'

import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { logger } from '@/utils/logger';
import { cronSchedulerService } from '@/services/cronScheduler.service';

// Import routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/user';
import musicRoutes from '@/routes/music';
import artistRoutes from '@/routes/artist';
import communityRoutes from '@/routes/community';
import nftRoutes from '@/routes/nft';
import socialRoutes from '@/routes/social';
import adminRoutes from '@/routes/admin';
import nftSubscriptionRoutes from '@/routes/nft-subscription.routes';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(session({
  secret: process.env.JWT_SECRET || "UztsXXhLANMrecp5KsKPD1g2vfE98Bzb",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true if you're using HTTPS
  },
}));

app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Routes

app.use('/api/v1/auth', authRoutes); // Custom auth routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/music', musicRoutes);
app.use('/api/v1/artists', artistRoutes);
app.use('/api/v1/communities', communityRoutes);
app.use('/api/v1/nfts', nftRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/admin', adminRoutes); // Admin routes
app.use('/api/v1/nft-subscriptions', nftSubscriptionRoutes); // NFT subscription routes

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling
app.use(errorHandler);

// Socket.IO for real-time features
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Start server
const startServer = async () => {
  try {
    // await connectDatabase(); // Temporarily disabled

    // Initialize cron jobs for NFT subscription management
    cronSchedulerService.initializeCronJobs();
    logger.info('⏰ NFT subscription cron jobs initialized');

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
      logger.info('🎵 NFT-based community subscription system ready!');

    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };
