import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import * as companies from '../controllers/companyController.js';
import { PAGINATION } from '../config/constants.js';

const router = Router();

const listSchema = z.object({
  search: z.string().max(200).optional().default(''),
  sort: z.enum(['questions', 'name', 'fresh']).optional().default('questions'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
});

router.get('/', validate({ query: listSchema }), companies.listCompanies);
router.get('/:slug', companies.getCompany);

export default router;
