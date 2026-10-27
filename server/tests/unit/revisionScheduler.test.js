import {
  computeNextReview,
  scheduleNextReview,
  scheduleInitialReview,
  ReviewResult,
} from '../../src/services/revisionScheduler.js';
import { REVISION } from '../../src/config/constants.js';

describe('Revision Scheduler — Spaced Repetition (SM-2)', () => {
  describe('Initial solve scheduling', () => {
    it('schedules stage 0 review with initial interval', () => {
      const fixedDate = new Date('2026-10-01T12:00:00Z');
      const { stage, nextReviewAt } = scheduleInitialReview(fixedDate);

      expect(stage).toBe(0);
      expect(nextReviewAt.getDate()).toBe(fixedDate.getDate() + REVISION.STAGES[0]);
    });
  });

  describe('Rating results and stage progressions', () => {
    it('resets to stage 0 when result is FORGOT', () => {
      const { nextStage, daysUntilNext } = computeNextReview(3, ReviewResult.FORGOT);
      expect(nextStage).toBe(0);
      expect(daysUntilNext).toBe(REVISION.STAGES[0]);
    });

    it('repeats current stage when result is HARD', () => {
      const { nextStage, daysUntilNext } = computeNextReview(2, ReviewResult.HARD);
      expect(nextStage).toBe(2);
      expect(daysUntilNext).toBe(REVISION.STAGES[2]);
    });

    it('increments stage by 1 when result is GOOD', () => {
      const { nextStage, daysUntilNext } = computeNextReview(1, ReviewResult.GOOD);
      expect(nextStage).toBe(2);
      expect(daysUntilNext).toBe(REVISION.STAGES[2]);
    });

    it('increments stage by 2 when result is EASY', () => {
      const { nextStage, daysUntilNext } = computeNextReview(1, ReviewResult.EASY);
      expect(nextStage).toBe(3);
      expect(daysUntilNext).toBe(REVISION.STAGES[3]);
    });

    it('clamps to MAX_STAGE without overflowing', () => {
      const { nextStage } = computeNextReview(REVISION.MAX_STAGE, ReviewResult.EASY);
      expect(nextStage).toBe(REVISION.MAX_STAGE);
    });
  });
});
