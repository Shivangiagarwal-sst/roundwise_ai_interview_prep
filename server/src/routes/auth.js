import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import { RATE_LIMIT, FIELD_LIMITS } from '../config/constants.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH.windowMs,
  max: RATE_LIMIT.AUTH.max,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const demoLimiter = rateLimit({
  windowMs: RATE_LIMIT.DEMO.windowMs,
  max: RATE_LIMIT.DEMO.max,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many demo login attempts. Please wait.' },
});

const registerSchema = z.object({
  name: z.string().min(1).max(FIELD_LIMITS.NAME_MAX).trim(),
  email: z.string().email().max(FIELD_LIMITS.EMAIL_MAX).toLowerCase().trim(),
  password: z.string().min(FIELD_LIMITS.PASSWORD_MIN).max(FIELD_LIMITS.PASSWORD_MAX),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

const onboardingSchema = z.object({
  targetRole: z.string().max(100).optional(),
  targetCompanies: z.array(z.string()).min(1).max(5),
  interviewDate: z.string().datetime({ offset: true }).optional().nullable(),
});

const profileSchema = z.object({
  name: z.string().min(1).max(FIELD_LIMITS.NAME_MAX).optional(),
  targetRole: z.string().max(100).optional(),
  targetCompanies: z.array(z.string()).max(5).optional(),
  interviewDate: z.string().optional().nullable(),
});

router.post('/register', authLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), auth.login);
router.post('/logout', requireAuth, auth.logout);
router.get('/me', requireAuth, auth.getMe);
router.post('/demo', demoLimiter, auth.demoLogin);
router.put('/profile', requireAuth, validate({ body: profileSchema }), auth.updateProfile);
router.post('/onboarding', requireAuth, validate({ body: onboardingSchema }), auth.completeOnboarding);

export default router;
