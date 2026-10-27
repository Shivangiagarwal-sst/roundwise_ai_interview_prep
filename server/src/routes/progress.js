import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as progress from '../controllers/progressController.js';
import { FIELD_LIMITS } from '../config/constants.js';

const router = Router();

const statusSchema = z.object({
  solved: z.boolean().optional(),
  status: z.enum(['unattempted', 'attempted', 'solved']).optional(),
}).refine((data) => data.solved !== undefined || data.status !== undefined, {
  message: 'Either "solved" (boolean) or "status" must be provided',
});

const notesSchema = z.object({
  notes: z.string().max(FIELD_LIMITS.NOTES_MAX),
});

const solutionSchema = z.object({
  language: z.enum(['javascript', 'python', 'java', 'cpp', 'typescript', 'go', 'rust']),
  code: z.string().max(FIELD_LIMITS.SOLUTION_CODE_MAX),
});

const reviewSchema = z.object({
  result: z.enum(['forgot', 'hard', 'good', 'easy']),
});

// All progress routes require auth
router.use(requireAuth);

router.put('/questions/:questionId/status', validate({ body: statusSchema }), progress.updateStatus);
router.put('/questions/:questionId/bookmark', progress.toggleBookmark);
router.put('/questions/:questionId/notes', validate({ body: notesSchema }), progress.updateNotes);
router.put('/questions/:questionId/solution', validate({ body: solutionSchema }), progress.saveSolution);
router.post('/questions/:questionId/review', validate({ body: reviewSchema }), progress.reviewQuestion);
router.get('/stats', progress.getUserStats);
router.get('/revisions/due', progress.getDueRevisions);

export default router;
