/**
 * Progress controller — status, bookmarks, notes, solutions.
 */

import { UserQuestionProgress } from '../models/UserQuestionProgress.js';
import { Question } from '../models/Question.js';
import { scheduleInitialReview, scheduleNextReview } from '../services/revisionScheduler.js';
import { createError } from '../middleware/error.js';

/**
 * Get or create a progress record for the current user + question.
 */
async function getOrCreateProgress(userId, questionId) {
  let progress = await UserQuestionProgress.findOne({ user: userId, question: questionId });
  if (!progress) {
    // Verify question exists
    const question = await Question.findById(questionId);
    if (!question) throw createError(404, 'Question not found', 'QUESTION_NOT_FOUND');
    progress = await UserQuestionProgress.create({ user: userId, question: questionId });
  }
  return progress;
}

export async function updateStatus(req, res, next) {
  try {
    const { questionId } = req.params;
    const { solved, status: rawStatus } = req.body;

    const isSolved = solved !== undefined ? Boolean(solved) : rawStatus === 'solved';
    const finalStatus = isSolved ? 'solved' : 'unattempted';

    const progress = await getOrCreateProgress(req.user._id, questionId);
    const now = new Date();

    progress.status = finalStatus;

    if (isSolved) {
      if (!progress.solvedAt) {
        progress.solvedAt = now;
      }
      if (!progress.attemptedAt) {
        progress.attemptedAt = progress.solvedAt;
      }
      // Schedule initial spaced repetition review
      const { stage, nextReviewAt } = scheduleInitialReview(progress.solvedAt);
      progress.revision = { stage, nextReviewAt, lastReviewedAt: null };
    } else {
      // Unticking clears solvedAt and removes from revision queue
      progress.solvedAt = null;
      progress.revision = { stage: 0, nextReviewAt: null, lastReviewedAt: null };
    }

    await progress.save();

    const data = progress.toObject ? progress.toObject() : { ...progress };
    data.solved = isSolved;

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function toggleBookmark(req, res, next) {
  try {
    const { questionId } = req.params;
    const progress = await getOrCreateProgress(req.user._id, questionId);

    progress.isBookmarked = !progress.isBookmarked;
    await progress.save();

    res.json({ success: true, isBookmarked: progress.isBookmarked });
  } catch (err) {
    next(err);
  }
}

export async function updateNotes(req, res, next) {
  try {
    const { questionId } = req.params;
    const { notes } = req.body;

    const progress = await getOrCreateProgress(req.user._id, questionId);
    progress.notes = notes;
    await progress.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function saveSolution(req, res, next) {
  try {
    const { questionId } = req.params;
    const { language, code } = req.body;

    const progress = await getOrCreateProgress(req.user._id, questionId);
    progress.solution = { language, code, savedAt: new Date() };
    await progress.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getUserStats(req, res, next) {
  try {
    const userId = req.user._id;

    // Aggregate stats
    const [statusCounts, bookmarkCount, recentActivity] = await Promise.all([
      UserQuestionProgress.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      UserQuestionProgress.countDocuments({ user: userId, isBookmarked: true }),
      // Last 84 days activity (solved or attempted)
      UserQuestionProgress.aggregate([
        {
          $match: {
            user: userId,
            $or: [
              { solvedAt: { $gte: new Date(Date.now() - 84 * 24 * 60 * 60 * 1000) } },
              { attemptedAt: { $gte: new Date(Date.now() - 84 * 24 * 60 * 60 * 1000) } },
            ],
          },
        },
        {
          $project: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $ifNull: ['$solvedAt', '$attemptedAt'] },
              },
            },
          },
        },
        { $group: { _id: '$date', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const byStatus = { unattempted: 0, attempted: 0, solved: 0 };
    for (const { _id, count } of statusCounts) {
      byStatus[_id] = count;
    }

    // Compute streak
    const streak = computeStreak(recentActivity);

    // Solved by difficulty
    const solvedByDifficulty = await UserQuestionProgress.aggregate([
      { $match: { user: userId, status: 'solved' } },
      {
        $lookup: {
          from: 'questions',
          localField: 'question',
          foreignField: '_id',
          as: 'q',
        },
      },
      { $unwind: '$q' },
      { $group: { _id: '$q.difficulty', count: { $sum: 1 } } },
    ]);

    const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
    for (const { _id, count } of solvedByDifficulty) {
      byDifficulty[_id] = count;
    }

    const solvedCount = byStatus.solved || 0;
    const attemptedCount = 0; // Existing attempted data counts as not completed

    const byDifficultyFormatted = {
      Easy: byDifficulty.Easy || 0,
      Medium: byDifficulty.Medium || 0,
      Hard: byDifficulty.Hard || 0,
      easy: byDifficulty.Easy || 0,
      medium: byDifficulty.Medium || 0,
      hard: byDifficulty.Hard || 0,
    };

    res.json({
      success: true,
      data: {
        solvedCount,
        completedCount: solvedCount,
        attemptedCount,
        byStatus,
        byDifficulty: byDifficultyFormatted,
        bookmarkCount,
        streak,
        activity: recentActivity.map((a) => ({ date: a._id, count: a.count })),
      },
    });
  } catch (err) {
    next(err);
  }
}

function computeStreak(activity) {
  if (!activity.length) return 0;
  const dates = new Set(activity.map((a) => a._id));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) {
      break; // streak broken
    }
  }

  return streak;
}

export async function reviewQuestion(req, res, next) {
  try {
    const { questionId } = req.params;
    const { result } = req.body;

    const progress = await UserQuestionProgress.findOne({
      user: req.user._id,
      question: questionId,
    });

    if (!progress) {
      return next(createError(404, 'Progress not found', 'NOT_FOUND'));
    }

    if (progress.status !== 'solved') {
      return next(createError(400, 'Question must be solved before reviewing', 'NOT_SOLVED'));
    }

    const currentStage = progress.revision?.stage ?? 0;
    const { nextStage, nextReviewAt } = scheduleNextReview(currentStage, result);

    progress.revision = {
      stage: nextStage,
      nextReviewAt,
      lastReviewedAt: new Date(),
    };

    await progress.save();

    res.json({
      success: true,
      data: {
        stage: nextStage,
        nextReviewAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getDueRevisions(req, res, next) {
  try {
    const revisions = await UserQuestionProgress.find({
      user: req.user._id,
      status: 'solved',
      'revision.nextReviewAt': { $ne: null },
    })
      .populate('question', 'leetcodeId title difficulty url acceptanceRate')
      .sort({ 'revision.nextReviewAt': 1 })
      .lean();

    const formatted = revisions.map((d) => ({
      ...d,
      stage: d.revision?.stage ?? 0,
      nextReviewAt: d.revision?.nextReviewAt,
      lastReviewedAt: d.revision?.lastReviewedAt,
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
}
