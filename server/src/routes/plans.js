import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as plans from '../controllers/planController.js';
import { PLAN } from '../config/constants.js';

const router = Router();

const createPlanSchema = z.object({
  companySlugs: z.array(z.string()).min(PLAN.MIN_COMPANIES).max(PLAN.MAX_COMPANIES),
  totalDays: z.coerce.number().int().min(PLAN.MIN_DAYS).max(PLAN.MAX_DAYS),
  questionsPerDay: z.coerce.number().int().min(PLAN.MIN_PER_DAY).max(PLAN.MAX_PER_DAY),
  difficultyMix: z.object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100),
  }).optional(),
  focusRecency: z.enum(['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all']).nullable().optional(),
  includeSolved: z.boolean().optional().default(false),
});

router.use(requireAuth);

router.post('/', validate({ body: createPlanSchema }), plans.createPlan);
router.get('/', plans.listPlans);
router.get('/:id', plans.getPlan);
router.delete('/:id', plans.deletePlan);

export default router;
