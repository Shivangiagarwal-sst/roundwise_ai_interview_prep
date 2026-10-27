import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as ai from '../controllers/aiController.js';
import { RATE_LIMIT, FIELD_LIMITS } from '../config/constants.js';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: RATE_LIMIT.AI.windowMs,
  max: RATE_LIMIT.AI.max,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many AI requests. Please wait a moment.' },
  standardHeaders: true,
});

const reviewSchema = z.object({
  questionId: z.string().min(1),
  language: z.enum(['javascript', 'python', 'java', 'cpp', 'typescript', 'go', 'rust']),
  code: z.string().min(1).max(FIELD_LIMITS.AI_CODE_MAX),
  explanation: z.string().max(FIELD_LIMITS.AI_EXPLANATION_MAX).optional(),
});

router.use(requireAuth);
router.use(aiLimiter);

router.post('/review', validate({ body: reviewSchema }), ai.reviewSolutionController);
router.get('/status', ai.getAiStatus);

export default router;
