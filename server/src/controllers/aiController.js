/**
 * AI controller — solution review with quota management.
 */

import { UserQuestionProgress } from '../models/UserQuestionProgress.js';
import { Question } from '../models/Question.js';
import { User } from '../models/User.js';
import { reviewSolution, isAiConfigured } from '../services/aiService.js';
import { AI } from '../config/constants.js';
import { createError } from '../middleware/error.js';

/**
 * Check and increment AI quota for today.
 * @returns {number} remaining uses after increment
 */
async function checkAndIncrementQuota(user) {
  const today = new Date().toISOString().split('T')[0];

  // Reset if new day
  if (!user.aiUsage || user.aiUsage.date !== today) {
    user.aiUsage = { date: today, count: 0 };
  }

  if (user.aiUsage.count >= AI.DAILY_QUOTA) {
    const err = new Error(`Daily AI quota of ${AI.DAILY_QUOTA} requests exceeded. Resets at midnight.`);
    err.status = 429;
    err.code = 'AI_QUOTA_EXCEEDED';
    err.expose = true;
    throw err;
  }

  user.aiUsage.count++;
  await user.save();

  return AI.DAILY_QUOTA - user.aiUsage.count;
}

export async function reviewSolutionController(req, res, next) {
  try {
    if (!isAiConfigured()) {
      return next(createError(503, 'AI features are not configured on this server.', 'AI_UNAVAILABLE'));
    }

    const { questionId, language, code, explanation } = req.body;

    // Fetch question
    const question = await Question.findById(questionId).lean();
    if (!question) {
      return next(createError(404, 'Question not found', 'QUESTION_NOT_FOUND'));
    }

    // Check quota (mutates user.aiUsage)
    const user = await User.findById(req.user._id);
    const remaining = await checkAndIncrementQuota(user);

    // Get AI review
    let review;
    try {
      review = await reviewSolution({
        questionTitle: question.title,
        questionUrl: question.url,
        language,
        code,
        explanation,
      });
    } catch (err) {
      // Decrement quota on AI failure
      user.aiUsage.count = Math.max(0, user.aiUsage.count - 1);
      await user.save();

      if (err.code === 'AI_UNAVAILABLE') {
        return next(createError(503, err.message, 'AI_UNAVAILABLE'));
      }
      throw err;
    }

    // Save to progress record
    await UserQuestionProgress.findOneAndUpdate(
      { user: req.user._id, question: questionId },
      { $set: { aiReview: review } },
      { upsert: true }
    );

    res.json({
      success: true,
      data: review,
      quotaRemaining: remaining,
      disclaimer: 'AI review checks reasoning; it does not run your code.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getAiStatus(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const user = await User.findById(req.user._id).lean();
    const usedToday = user.aiUsage?.date === today ? user.aiUsage.count : 0;

    res.json({
      success: true,
      data: {
        configured: isAiConfigured(),
        dailyQuota: AI.DAILY_QUOTA,
        usedToday,
        remaining: Math.max(0, AI.DAILY_QUOTA - usedToday),
      },
    });
  } catch (err) {
    next(err);
  }
}
