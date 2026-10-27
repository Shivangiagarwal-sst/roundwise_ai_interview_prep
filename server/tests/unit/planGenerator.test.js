import {
  getRecencyWeight,
  computePerCompanyScore,
  scoreCandidates,
  sortWithRampUp,
  selectByDifficultyMix,
  buildDays,
  applyRecencyFilter,
} from '../../src/services/planGenerator.js';
import { PLAN } from '../../src/config/constants.js';

describe('Plan Generator — Deterministic Scoring Engine', () => {
  describe('Recency Weights', () => {
    it('gives highest weight to thirty-days recency tag', () => {
      const weight30 = getRecencyWeight(['thirty-days']);
      const weightAll = getRecencyWeight(['all']);
      const weightNone = getRecencyWeight([]);

      expect(weight30).toBe(PLAN.RECENCY_WEIGHTS['thirty-days']);
      expect(weight30).toBeGreaterThan(weightAll);
      expect(weightNone).toBe(PLAN.RECENCY_WEIGHTS['all']);
    });

    it('picks the maximum weight when multiple tags are present', () => {
      const weight = getRecencyWeight(['all', 'six-months', 'thirty-days']);
      expect(weight).toBe(PLAN.RECENCY_WEIGHTS['thirty-days']);
    });
  });

  describe('Multi-Company Overlap Boost', () => {
    it('scores questions higher when asked by multiple target companies', () => {
      const targetSlugs = ['google', 'amazon', 'microsoft'];
      const maxFreqMap = new Map([
        ['google', 100],
        ['amazon', 100],
        ['microsoft', 100],
      ]);

      const singleCompanyQ = {
        id: 'q1',
        leetcodeId: 1,
        title: 'Single Company Question',
        difficulty: 'Medium',
        acceptanceRate: 50,
        companies: [{ slug: 'google', name: 'Google', frequency: 70, recency: ['three-months'] }],
      };

      const multiCompanyQ = {
        id: 'q2',
        leetcodeId: 2,
        title: 'Triple Company Overlap Question',
        difficulty: 'Medium',
        acceptanceRate: 50,
        companies: [
          { slug: 'google', name: 'Google', frequency: 70, recency: ['three-months'] },
          { slug: 'amazon', name: 'Amazon', frequency: 70, recency: ['three-months'] },
          { slug: 'microsoft', name: 'Microsoft', frequency: 70, recency: ['three-months'] },
        ],
      };

      const scored = scoreCandidates([singleCompanyQ, multiCompanyQ], targetSlugs, maxFreqMap);
      const singleScore = scored.find((s) => s.question.id === 'q1');
      const multiScore = scored.find((s) => s.question.id === 'q2');

      expect(multiScore.overlapCount).toBe(3);
      expect(singleScore.overlapCount).toBe(1);
      expect(multiScore.score).toBeGreaterThan(singleScore.score * 2.5);
    });
  });

  describe('Ramp-Up Sorting & Difficulty Balancing', () => {
    it('sorts Easy before Medium before Hard', () => {
      const candidates = [
        { question: { id: 'h1', leetcodeId: 10, difficulty: 'Hard' }, score: 99, overlapCount: 1 },
        { question: { id: 'e1', leetcodeId: 20, difficulty: 'Easy' }, score: 50, overlapCount: 1 },
        { question: { id: 'm1', leetcodeId: 30, difficulty: 'Medium' }, score: 80, overlapCount: 1 },
      ];

      const sorted = sortWithRampUp(candidates);
      expect(sorted[0].question.difficulty).toBe('Easy');
      expect(sorted[1].question.difficulty).toBe('Medium');
      expect(sorted[2].question.difficulty).toBe('Hard');
    });

    it('breaks ties deterministically by leetcodeId', () => {
      const candidates = [
        { question: { id: 'm2', leetcodeId: 200, difficulty: 'Medium' }, score: 50, overlapCount: 1 },
        { question: { id: 'm1', leetcodeId: 15, difficulty: 'Medium' }, score: 50, overlapCount: 1 },
      ];

      const sorted = sortWithRampUp(candidates);
      expect(sorted[0].question.leetcodeId).toBe(15);
      expect(sorted[1].question.leetcodeId).toBe(200);
    });

    it('selects correct target proportions according to difficultyMix', () => {
      const items = [];
      for (let i = 1; i <= 20; i++) {
        items.push({ question: { id: `e${i}`, leetcodeId: i, difficulty: 'Easy' }, score: 50 });
        items.push({ question: { id: `m${i}`, leetcodeId: 100 + i, difficulty: 'Medium' }, score: 50 });
        items.push({ question: { id: `h${i}`, leetcodeId: 200 + i, difficulty: 'Hard' }, score: 50 });
      }

      const totalNeeded = 10;
      const mix = { easy: 20, medium: 60, hard: 20 };
      const { selected, warnings } = selectByDifficultyMix(items, totalNeeded, mix);

      expect(selected.length).toBe(10);
      expect(warnings.length).toBe(0);

      const counts = { Easy: 0, Medium: 0, Hard: 0 };
      selected.forEach((s) => counts[s.question.difficulty]++);

      expect(counts.Easy).toBe(2);
      expect(counts.Medium).toBe(6);
      expect(counts.Hard).toBe(2);
    });

    it('falls back to other difficulties when pool has a deficit and generates warning', () => {
      // Pool with NO Hard questions
      const items = [];
      for (let i = 1; i <= 10; i++) {
        items.push({ question: { id: `e${i}`, leetcodeId: i, difficulty: 'Easy' }, score: 50 });
        items.push({ question: { id: `m${i}`, leetcodeId: 100 + i, difficulty: 'Medium' }, score: 50 });
      }

      const totalNeeded = 10;
      const mix = { easy: 20, medium: 60, hard: 20 };
      const { selected, warnings } = selectByDifficultyMix(items, totalNeeded, mix);

      expect(selected.length).toBe(10);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Hard');
    });
  });

  describe('Day-by-Day Schedule Builder', () => {
    it('enforces at most one Hard question per day where possible', () => {
      const selected = [
        { question: { id: 'e1', leetcodeId: 1, difficulty: 'Easy' }, score: 50 },
        { question: { id: 'e2', leetcodeId: 2, difficulty: 'Easy' }, score: 50 },
        { question: { id: 'm1', leetcodeId: 3, difficulty: 'Medium' }, score: 50 },
        { question: { id: 'm2', leetcodeId: 4, difficulty: 'Medium' }, score: 50 },
        { question: { id: 'h1', leetcodeId: 5, difficulty: 'Hard' }, score: 50 },
        { question: { id: 'h2', leetcodeId: 6, difficulty: 'Hard' }, score: 50 },
      ];

      const days = buildDays(selected, 2, 3);
      expect(days.length).toBe(2);
      expect(days[0].questionIds.length).toBe(3);
      expect(days[1].questionIds.length).toBe(3);
    });
  });
});
