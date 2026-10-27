/**
 * Roundwise Express application.
 * Configures middleware, routes, and error handling.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env, isProd } from './config/env.js';
import { logger } from './config/logger.js';
import { getAllowedOrigins } from './middleware/auth.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.js';
import { RATE_LIMIT, BODY_LIMIT } from './config/constants.js';

// Routes
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/companies.js';
import questionRoutes from './routes/questions.js';
import progressRoutes from './routes/progress.js';
import planRoutes from './routes/plans.js';
import aiRoutes from './routes/ai.js';
import publicRoutes from './routes/public.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Trust proxy (Render sets this)
  app.set('trust proxy', 1);

  // HTTP request logging
  if (!env.NODE_ENV === 'test') {
    app.use(pinoHttp({ logger }));
  }

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
              objectSrc: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS — strict allowlist
  const allowedOrigins = getAllowedOrigins();
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, server-to-server)
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        if (
          allowedOrigins.includes(normalized) ||
          allowedOrigins.includes('*') ||
          /\.vercel\.app$/.test(normalized) ||
          /\.onrender\.com$/.test(normalized) ||
          /^https?:\/\/localhost(:\d+)?$/.test(normalized) ||
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalized)
        ) {
          return callback(null, true);
        }
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
  app.use(cookieParser());

  // General rate limit
  app.use(
    '/api',
    rateLimit({
      windowMs: RATE_LIMIT.GENERAL.windowMs,
      max: RATE_LIMIT.GENERAL.max,
      message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Health check
  app.get('/api/health', async (req, res) => {
    const { getDbStatus } = await import('./config/database.js');
    const { Question } = await import('./models/Question.js');
    const { Company } = await import('./models/Company.js');
    const { isAiConfigured } = await import('./services/aiService.js');
    const sourceData = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../data/SOURCE.json'), 'utf8')
    );

    let questionCount = 0;
    let companyCount = 0;
    let dbConnected = false;

    try {
      const dbStatus = getDbStatus();
      dbConnected = dbStatus.connected;
      if (dbConnected) {
        [questionCount, companyCount] = await Promise.all([
          Question.estimatedDocumentCount(),
          Company.estimatedDocumentCount(),
        ]);
      }
    } catch { /* ignore */ }

    res.json({
      status: 'ok',
      version: '1.0.0',
      dbConnected,
      questionCount,
      companyCount,
      geminiConfigured: isAiConfigured(),
      model: env.GEMINI_MODEL,
      snapshotDate: sourceData.snapshotDate || sourceData.default?.snapshotDate || '2026-08-16',
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/public', publicRoutes);

  // Serve static client whenever build exists
  const candidateDistPaths = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
  ];
  const clientDist = candidateDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

  if (clientDist) {
    logger.info(`Serving static client from: ${clientDist}`);
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    logger.warn('Client build not found. Only API routes will be available.');
  }

  // 404 and error handling (must be last)
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
