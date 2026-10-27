/**
 * Plan controller — create, list, get, delete.
 */

import { PrepPlan } from '../models/PrepPlan.js';
import { Question } from '../models/Question.js';
import { Company } from '../models/Company.js';
import { UserQuestionProgress } from '../models/UserQuestionProgress.js';
import { generatePlan } from '../services/planGenerator.js';
import { PLAN } from '../config/constants.js';
import { createError } from '../middleware/error.js';

/**
 * Fetch question candidates for selected companies.
 */
async function fetchCandidates(companySlugs, _solvedIds, _includeSolved) {
  const query = { companySlugs: { $in: companySlugs } };
  const questions = await Question.find(query)
    .select('leetcodeId title url difficulty acceptanceRate companies companySlugs')
    .lean();

  return questions.map((q) => ({
    id: q._id.toString(),
    leetcodeId: q.leetcodeId,
    title: q.title,
    url: q.url,
    difficulty: q.difficulty,
    acceptanceRate: q.acceptanceRate,
    companies: q.companies.filter((c) => companySlugs.includes(c.slug)),
  }));
}

export async function createPlan(req, res, next) {
  try {
    const userId = req.user._id;

    // Check active plan limit
    const activeCount = await PrepPlan.countDocuments({ user: userId, status: 'active' });
    if (activeCount >= PLAN.MAX_ACTIVE_PLANS) {
      return next(
        createError(
          409,
          `You already have ${PLAN.MAX_ACTIVE_PLANS} active plans. Archive or delete one first.`,
          'PLAN_LIMIT_EXCEEDED'
        )
      );
    }

    const {
      companySlugs,
      totalDays,
      questionsPerDay,
      difficultyMix,
      focusRecency,
      includeSolved = false,
    } = req.body;

    // Verify companies exist
    const companies = await Company.find({ slug: { $in: companySlugs } }).lean();
    if (companies.length !== companySlugs.length) {
      const found = companies.map((c) => c.slug);
      const missing = companySlugs.filter((s) => !found.includes(s));
      return next(createError(400, `Companies not found: ${missing.join(', ')}`, 'INVALID_COMPANY'));
    }

    // Fetch solved IDs
    const solvedProgress = await UserQuestionProgress.find({
      user: userId,
      status: 'solved',
    }).select('question').lean();
    const solvedIds = new Set(solvedProgress.map((p) => p.question.toString()));

    // Fetch candidates
    const candidates = await fetchCandidates(companySlugs, solvedIds, includeSolved);

    if (candidates.length === 0) {
      return next(createError(400, 'No questions found for the selected companies.', 'NO_CANDIDATES'));
    }

    // Generate plan
    const { days, summary } = generatePlan(candidates, companySlugs, {
      totalDays,
      questionsPerDay,
      difficultyMix: difficultyMix || PLAN.DEFAULT_DIFFICULTY_MIX,
      focusRecency,
      includeSolved,
      solvedIds,
    });

    // Save to DB
    const plan = await PrepPlan.create({
      user: userId,
      companySlugs,
      companyNames: companies.map((c) => c.name),
      totalDays,
      questionsPerDay,
      difficultyMix: difficultyMix || PLAN.DEFAULT_DIFFICULTY_MIX,
      focusRecency,
      startDate: new Date(),
      days: days.map((d) => ({
        dayNumber: d.dayNumber,
        questionIds: d.questionIds,
      })),
      summary,
    });

    // Populate question objects for returned response
    const allQIds = plan.days.flatMap((d) => d.questionIds);
    const populatedQuestions = await Question.find({ _id: { $in: allQIds } })
      .select('leetcodeId title url difficulty acceptanceRate companySlugs')
      .lean();
    const qMap = Object.fromEntries(populatedQuestions.map((q) => [q._id.toString(), q]));

    const responsePlan = plan.toObject();
    responsePlan.days = responsePlan.days.map((d) => ({
      ...d,
      questions: d.questionIds.map((id) => qMap[id.toString()]).filter(Boolean),
    }));

    res.status(201).json({ success: true, data: responsePlan });
  } catch (err) {
    next(err);
  }
}

export async function listPlans(req, res, next) {
  try {
    const plans = await PrepPlan.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    // Attach completion progress for each plan
    const enriched = await Promise.all(
      plans.map(async (plan) => {
        const allQIds = plan.days.flatMap((d) => d.questionIds);
        const solvedCount = await UserQuestionProgress.countDocuments({
          user: req.user._id,
          question: { $in: allQIds },
          status: 'solved',
        });
        return { ...plan, solvedCount, totalQuestions: allQIds.length };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getPlan(req, res, next) {
  try {
    const plan = await PrepPlan.findById(req.params.id).lean();

    if (!plan) return next(createError(404, 'Plan not found', 'NOT_FOUND'));
    if (plan.user.toString() !== req.user._id.toString()) {
      return next(createError(404, 'Plan not found', 'NOT_FOUND'));
    }

    // Enrich with question data and user status
    const allQIds = plan.days.flatMap((d) => d.questionIds);

    const [questions, progresses] = await Promise.all([
      Question.find({ _id: { $in: allQIds } })
        .select('leetcodeId title url difficulty acceptanceRate companies companySlugs')
        .lean(),
      UserQuestionProgress.find({
        user: req.user._id,
        question: { $in: allQIds },
      }).select('question status isBookmarked').lean(),
    ]);

    const qMap = Object.fromEntries(questions.map((q) => [q._id.toString(), q]));
    const progressMap = Object.fromEntries(
      progresses.map((p) => [p.question.toString(), p])
    );

    const enrichedDays = plan.days.map((day) => {
      const dayQuestions = day.questionIds.map((qid) => {
        const q = qMap[qid.toString()];
        const p = progressMap[qid.toString()];
        if (!q) return null;
        const isSolved = p ? p.status === 'solved' : false;
        return {
          ...q,
          userProgress: p ? { status: p.status, solved: isSolved, isBookmarked: p.isBookmarked } : null,
          userStatus: isSolved ? 'solved' : 'unattempted',
          solved: isSolved,
          isBookmarked: p ? Boolean(p.isBookmarked) : false,
          overlapCount: q.companySlugs.filter((s) => plan.companySlugs.includes(s)).length,
        };
      }).filter(Boolean);

      const solved = dayQuestions.filter((q) => q.solved).length;

      return {
        dayNumber: day.dayNumber,
        questions: dayQuestions,
        solved,
        total: dayQuestions.length,
        complete: solved === dayQuestions.length && dayQuestions.length > 0,
      };
    });

    const solvedCount = enrichedDays.reduce((acc, d) => acc + d.solved, 0);

    res.json({ success: true, data: { ...plan, days: enrichedDays, solvedCount } });
  } catch (err) {
    next(err);
  }
}

export async function deletePlan(req, res, next) {
  try {
    const plan = await PrepPlan.findById(req.params.id);
    if (!plan) return next(createError(404, 'Plan not found', 'NOT_FOUND'));
    if (plan.user.toString() !== req.user._id.toString()) {
      return next(createError(404, 'Plan not found', 'NOT_FOUND'));
    }

    await PrepPlan.deleteOne({ _id: plan._id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function publicPlanPreview(req, res, next) {
  try {
    const rawCompanies = req.query.companies || req.query.companySlugs;
    const rawDays = req.query.days || req.query.totalDays;
    const rawPerDay = req.query.perDay || req.query.questionsPerDay;

    if (!rawCompanies) {
      return next(createError(400, '"companies" or "companySlugs" query param is required', 'VALIDATION_ERROR'));
    }

    const companySlugs = rawCompanies.split(',').map((s) => s.trim()).filter(Boolean);
    if (companySlugs.length < 1 || companySlugs.length > PLAN.MAX_COMPANIES) {
      return next(
        createError(400, `Select 1–${PLAN.MAX_COMPANIES} companies`, 'VALIDATION_ERROR')
      );
    }

    const totalDays = Math.min(
      Math.max(parseInt(rawDays) || PLAN.DEFAULT_TOTAL_DAYS, PLAN.MIN_DAYS),
      PLAN.MAX_DAYS
    );
    const questionsPerDay = Math.min(
      Math.max(parseInt(rawPerDay) || PLAN.DEFAULT_QUESTIONS_PER_DAY, PLAN.MIN_PER_DAY),
      PLAN.MAX_PER_DAY
    );

    const dbCompanies = await Company.find({ slug: { $in: companySlugs } }).lean();
    if (dbCompanies.length === 0) {
      return next(createError(400, 'No valid companies found', 'INVALID_COMPANY'));
    }

    const validSlugs = dbCompanies.map((c) => c.slug);
    const candidates = await fetchCandidates(validSlugs, new Set(), true);

    const { days: planDays, summary } = generatePlan(candidates, validSlugs, {
      totalDays,
      questionsPerDay,
      difficultyMix: PLAN.DEFAULT_DIFFICULTY_MIX,
    });

    // Enrich with question data (public — no user progress)
    const allQIds = planDays.flatMap((d) => d.questionIds);
    const questions = await Question.find({ _id: { $in: allQIds } })
      .select('leetcodeId title url difficulty acceptanceRate companySlugs')
      .lean();
    const qMap = Object.fromEntries(questions.map((q) => [q._id.toString(), q]));

    const enrichedDays = planDays.map((d) => ({
      dayNumber: d.dayNumber,
      questions: d.questionIds.map((id) => qMap[id.toString()]).filter(Boolean),
    }));

    res.json({
      success: true,
      data: {
        companies: dbCompanies.map((c) => ({ slug: c.slug, name: c.name })),
        totalDays,
        questionsPerDay,
        days: enrichedDays,
        summary,
      },
    });
  } catch (err) {
    next(err);
  }
}
