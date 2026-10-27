/**
 * Question controller with full filtering, search, recency counts, and pagination.
 */

import { Question } from '../models/Question.js';
import { UserQuestionProgress } from '../models/UserQuestionProgress.js';
import { PAGINATION, FIELD_LIMITS, RECENCY_WINDOWS } from '../config/constants.js';
import { createError } from '../middleware/error.js';

export async function listQuestions(req, res, next) {
  try {
    const {
      search = '',
      company = '',
      difficulty = '',
      recency = '',
      topic = '',
      sort = 'frequency',
      order = 'desc',
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      bookmarked,
      status,
    } = req.query;

    const filter = {};

    // Search: numeric ID or text search
    if (search) {
      const safeSearch = search.slice(0, FIELD_LIMITS.SEARCH_QUERY_MAX);
      const numId = parseInt(safeSearch, 10);
      if (!isNaN(numId) && String(numId) === safeSearch.trim()) {
        filter.leetcodeId = numId;
      } else {
        filter.$text = { $search: safeSearch };
      }
    }

    const companyList = company
      ? company.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    if (difficulty) {
      const diffs = difficulty.split(',').map((d) => d.trim()).filter(Boolean);
      filter.difficulty = { $in: diffs };
    }

    if (topic) {
      filter.topics = { $in: topic.split(',').map((t) => t.trim()) };
    }

    // Filter by user progress: status and bookmarked
    if (status || bookmarked !== undefined) {
      if (!req.user) {
        if (status === 'completed' || status === 'solved' || bookmarked === true || bookmarked === 'true') {
          // Unauthenticated user has no completed/bookmarked items
          filter._id = { $in: [] };
        }
      } else {
        if (bookmarked === true || bookmarked === 'true') {
          const bmDocs = await UserQuestionProgress.find({
            user: req.user._id,
            isBookmarked: true,
          }).select('question').lean();
          const bmIds = bmDocs.map((p) => p.question);
          filter._id = { $in: bmIds };
        }

        if (status === 'completed' || status === 'solved') {
          const solvedDocs = await UserQuestionProgress.find({
            user: req.user._id,
            status: 'solved',
          }).select('question').lean();
          const solvedIds = solvedDocs.map((p) => p.question);
          if (filter._id) {
            const existingIds = new Set(filter._id.$in.map((id) => id.toString()));
            filter._id = { $in: solvedIds.filter((id) => existingIds.has(id.toString())) };
          } else {
            filter._id = { $in: solvedIds };
          }
        } else if (status === 'not_completed' || status === 'uncompleted' || status === 'unattempted') {
          const solvedDocs = await UserQuestionProgress.find({
            user: req.user._id,
            status: 'solved',
          }).select('question').lean();
          const solvedIds = solvedDocs.map((p) => p.question);
          filter.$and = filter.$and || [];
          filter.$and.push({ _id: { $nin: solvedIds } });
        }
      }
    }

    // Build baseFilter without recency for computing recency tab counts
    const baseFilter = { ...filter };
    if (companyList.length > 0) {
      baseFilter.companySlugs = { $in: companyList };
    }

    // Apply recency filter
    const validWindows = recency
      ? recency.split(',').filter((r) => RECENCY_WINDOWS.includes(r) && r !== 'all')
      : [];

    if (companyList.length > 0 && validWindows.length > 0) {
      filter.companies = {
        $elemMatch: {
          slug: { $in: companyList },
          recency: { $in: validWindows },
        },
      };
    } else if (companyList.length > 0) {
      filter.companySlugs = { $in: companyList };
    } else if (validWindows.length > 0) {
      filter['companies.recency'] = { $in: validWindows };
    }

    const sortMap = {
      frequency: 'maxFrequency',
      acceptance: 'acceptanceRate',
      difficulty: 'difficulty',
      id: 'leetcodeId',
    };
    const sortField = sortMap[sort] || 'maxFrequency';
    const sortDir = order === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [questions, total, countAll, count30, count90, count180] = await Promise.all([
      Question.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Question.countDocuments(filter),
      // Recency tab counts based on current search & company
      Question.countDocuments(baseFilter),
      companyList.length > 0
        ? Question.countDocuments({
            ...baseFilter,
            companies: { $elemMatch: { slug: { $in: companyList }, recency: 'thirty-days' } },
          })
        : Question.countDocuments({ ...baseFilter, 'companies.recency': 'thirty-days' }),
      companyList.length > 0
        ? Question.countDocuments({
            ...baseFilter,
            companies: { $elemMatch: { slug: { $in: companyList }, recency: 'three-months' } },
          })
        : Question.countDocuments({ ...baseFilter, 'companies.recency': 'three-months' }),
      companyList.length > 0
        ? Question.countDocuments({
            ...baseFilter,
            companies: { $elemMatch: { slug: { $in: companyList }, recency: 'six-months' } },
          })
        : Question.countDocuments({ ...baseFilter, 'companies.recency': 'six-months' }),
    ]);

    // Attach user progress if authenticated
    const progressMap = {};
    if (req.user) {
      const qIds = questions.map((q) => q._id);
      const progresses = await UserQuestionProgress.find({
        user: req.user._id,
        question: { $in: qIds },
      }).select('question status isBookmarked').lean();

      for (const p of progresses) {
        progressMap[p.question.toString()] = {
          status: p.status,
          solved: p.status === 'solved',
          isBookmarked: Boolean(p.isBookmarked),
        };
      }
    }

    const primaryCompanySlug = companyList.length === 1 ? companyList[0] : null;

    const enriched = questions.map((q) => {
      const userProg = progressMap[q._id.toString()] || null;
      const isSolved = userProg ? userProg.solved : false;
      const isBookmarked = userProg ? userProg.isBookmarked : false;

      let companyFrequency = null;
      if (primaryCompanySlug) {
        const found = q.companies?.find((c) => c.slug === primaryCompanySlug);
        companyFrequency = found ? found.frequency : 0;
      }

      return {
        ...q,
        userProgress: userProg,
        userStatus: isSolved ? 'solved' : 'unattempted',
        solved: isSolved,
        isBookmarked,
        companyFrequency,
        askedByCount: q.companies?.length || q.companySlugs?.length || 0,
      };
    });

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      recencyCounts: {
        all: countAll,
        'thirty-days': count30,
        'three-months': count90,
        'six-months': count180,
      },
      snapshotDate: '2026-08-16',
    });
  } catch (err) {
    next(err);
  }
}

export async function getQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const question = await Question.findById(id).lean();

    if (!question) {
      return next(createError(404, 'Question not found', 'QUESTION_NOT_FOUND'));
    }

    let userProgress = null;
    if (req.user) {
      userProgress = await UserQuestionProgress.findOne({
        user: req.user._id,
        question: question._id,
      }).lean();
    }

    const isSolved = userProgress?.status === 'solved';
    const isBookmarked = Boolean(userProgress?.isBookmarked);

    res.json({
      success: true,
      data: {
        ...question,
        userProgress: userProgress
          ? {
              ...userProgress,
              solved: isSolved,
              isBookmarked,
            }
          : null,
        userStatus: isSolved ? 'solved' : 'unattempted',
        solved: isSolved,
        isBookmarked,
      },
    });
  } catch (err) {
    next(err);
  }
}
