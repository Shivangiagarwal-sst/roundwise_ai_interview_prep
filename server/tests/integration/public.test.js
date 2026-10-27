import request from 'supertest';
import { setupTestDb, teardownTestDb, clearTestDb } from '../setup.js';
import { createApp } from '../../src/app.js';
import { Question } from '../../src/models/Question.js';
import { Company } from '../../src/models/Company.js';

describe('Public Endpoints Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await setupTestDb();
    app = createApp();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  it('GET /api/public/stats returns real counts from database', async () => {
    await Company.create({
      slug: 'google',
      name: 'Google',
      questionCount: 1,
      freshCount: 0,
      difficultyBreakdown: { easy: 1, medium: 0, hard: 0 },
    });

    await Question.create({
      leetcodeId: 1,
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum',
      difficulty: 'Easy',
      acceptanceRate: 50.5,
      companySlugs: ['google'],
      companies: [{ slug: 'google', name: 'Google', frequency: 90, recency: ['thirty-days'] }],
    });

    const res = await request(app).get('/api/public/stats');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.questionCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.companyCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.snapshotDate).toBeDefined();
  });

  it('GET /api/public/config returns environment flags', async () => {
    const res = await request(app).get('/api/public/config');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.demoEnabled).toBe('boolean');
    expect(typeof res.body.data.aiEnabled).toBe('boolean');
  });

  it('GET /api/public/plan-preview returns deterministic schedule without auth', async () => {
    // Seed companies
    await Company.create([
      { slug: 'google', name: 'Google', questionCount: 2, freshCount: 0, difficultyBreakdown: { easy: 1, medium: 1, hard: 0 } },
      { slug: 'amazon', name: 'Amazon', questionCount: 1, freshCount: 0, difficultyBreakdown: { easy: 1, medium: 0, hard: 0 } },
    ]);

    // Seed questions
    await Question.create([
      {
        leetcodeId: 1,
        title: 'Two Sum',
        url: 'https://leetcode.com/problems/two-sum',
        difficulty: 'Easy',
        acceptanceRate: 50,
        companySlugs: ['google', 'amazon'],
        companies: [
          { slug: 'google', name: 'Google', frequency: 80, recency: ['all'] },
          { slug: 'amazon', name: 'Amazon', frequency: 70, recency: ['all'] },
        ],
      },
      {
        leetcodeId: 2,
        title: 'Add Two Numbers',
        url: 'https://leetcode.com/problems/add-two-numbers',
        difficulty: 'Medium',
        acceptanceRate: 40,
        companySlugs: ['google'],
        companies: [{ slug: 'google', name: 'Google', frequency: 60, recency: ['all'] }],
      },
    ]);

    const res = await request(app).get('/api/public/plan-preview?companySlugs=google,amazon&totalDays=3&questionsPerDay=1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.days.length).toBeGreaterThan(0);
    expect(res.body.data.summary.totalQuestions).toBeGreaterThan(0);
  });
});
