/**
 * Revision scheduler service.
 * Implements spaced-repetition based on SM-2-like stages.
 * @module services/revisionScheduler
 */

import { REVISION } from '../config/constants.js';

/**
 * Result enum for review outcomes.
 */
export const ReviewResult = {
  FORGOT: 'forgot',
  HARD: 'hard',
  GOOD: 'good',
  EASY: 'easy',
};

/**
 * Schedule the next review given current stage and review result.
 *
 * @param {number} currentStage - 0-indexed (0 = just solved)
 * @param {ReviewResult} result
 * @returns {{ nextStage: number, daysUntilNext: number }}
 */
export function computeNextReview(currentStage, result) {
  let nextStage;

  switch (result) {
    case ReviewResult.FORGOT:
      nextStage = 0; // reset to start
      break;
    case ReviewResult.HARD:
      nextStage = Math.max(0, currentStage); // repeat same stage
      break;
    case ReviewResult.GOOD:
      nextStage = Math.min(currentStage + 1, REVISION.MAX_STAGE);
      break;
    case ReviewResult.EASY:
      nextStage = Math.min(currentStage + 2, REVISION.MAX_STAGE);
      break;
    default:
      nextStage = Math.min(currentStage + 1, REVISION.MAX_STAGE);
  }

  const daysUntilNext = REVISION.STAGES[nextStage] ?? REVISION.STAGES[REVISION.MAX_STAGE];

  return { nextStage, daysUntilNext };
}

/**
 * Get the next review date from a review result.
 * @param {number} currentStage
 * @param {ReviewResult} result
 * @param {Date} [now]
 * @returns {{ nextStage: number, nextReviewAt: Date }}
 */
export function scheduleNextReview(currentStage, result, now = new Date()) {
  const { nextStage, daysUntilNext } = computeNextReview(currentStage, result);
  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + daysUntilNext);
  nextReviewAt.setHours(0, 0, 0, 0); // normalize to start of day

  return { nextStage, nextReviewAt };
}

/**
 * Schedule the initial review when a question is first solved (stage 0).
 * @param {Date} [now]
 * @returns {{ stage: number, nextReviewAt: Date }}
 */
export function scheduleInitialReview(now = new Date()) {
  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + REVISION.STAGES[0]);
  nextReviewAt.setHours(0, 0, 0, 0);

  return { stage: 0, nextReviewAt };
}
