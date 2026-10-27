/**
 * Public routes — no auth required, rate limited, never expose user data.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Question } from '../models/Question.js';
import { Company } from '../models/Company.js';
import { env } from '../config/env.js';
import { RATE_LIMIT } from '../config/constants.js';
import { publicPlanPreview } from '../controllers/planController.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../data/SOURCE.json'), 'utf8')
);

const router = Router();

const publicLimiter = rateLimit({
  windowMs: RATE_LIMIT.PUBLIC.windowMs,
  max: RATE_LIMIT.PUBLIC.max,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
});

router.use(publicLimiter);

// Real counts for landing page
router.get('/stats', async (req, res, next) => {
  try {
    const [questionCount, companyCount] = await Promise.all([
      Question.estimatedDocumentCount(),
      Company.estimatedDocumentCount(),
    ]);

    res.json({
      success: true,
      data: {
        questionCount,
        companyCount,
        snapshotDate: sourceData.snapshotDate,
        commit: sourceData.commit,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Client config — tells the client which features are enabled
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      demoEnabled: Boolean(env.DEMO_EMAIL && env.DEMO_PASSWORD),
      aiEnabled: Boolean(env.GEMINI_API_KEY),
    },
  });
});

// Public plan preview — same generator, no save, no auth
router.get('/plan-preview', publicPlanPreview);

export default router;
