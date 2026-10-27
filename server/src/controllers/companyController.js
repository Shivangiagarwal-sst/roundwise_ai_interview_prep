/**
 * Company controller
 */

import { Company } from '../models/Company.js';
import { Question } from '../models/Question.js';
import { PAGINATION, RECENCY_WINDOWS } from '../config/constants.js';
import { createError } from '../middleware/error.js';

export async function listCompanies(req, res, next) {
  try {
    const {
      search = '',
      sort = 'questions',
      order = 'desc',
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
    } = req.query;

    const query = {};
    if (search) {
      query.name = { $regex: escapeRegex(search), $options: 'i' };
    }

    const sortMap = {
      questions: 'questionCount',
      name: 'name',
      fresh: 'freshCount',
    };
    const sortField = sortMap[sort] || 'questionCount';
    const sortDir = order === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: companies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCompany(req, res, next) {
  try {
    const { slug } = req.params;
    const company = await Company.findOne({ slug }).lean();

    if (!company) {
      return next(createError(404, `Company "${slug}" not found`, 'COMPANY_NOT_FOUND'));
    }

    // Recency window counts
    const recencyCounts = {};
    for (const window of RECENCY_WINDOWS) {
      recencyCounts[window] = await Question.countDocuments({
        companySlugs: slug,
        'companies': { $elemMatch: { slug, recency: window } },
      });
    }

    res.json({
      success: true,
      data: { ...company, recencyCounts },
    });
  } catch (err) {
    next(err);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
