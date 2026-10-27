import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/authOptional.js';
import * as questions from '../controllers/questionController.js';
import { PAGINATION } from '../config/constants.js';

const router = Router();

const listSchema = z.object({
  search: z.string().max(200).optional().default(''),
  company: z.string().max(500).optional().default(''),
  difficulty: z.string().optional().default(''),
  recency: z.string().optional().default(''),
  topic: z.string().optional().default(''),
  sort: z.enum(['frequency', 'acceptance', 'difficulty', 'id']).optional().default('frequency'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  bookmarked: z.coerce.boolean().optional(),
  status: z.string().optional(),
});

router.get('/', optionalAuth, validate({ query: listSchema }), questions.listQuestions);
router.get('/:id', optionalAuth, questions.getQuestion);

export default router;
