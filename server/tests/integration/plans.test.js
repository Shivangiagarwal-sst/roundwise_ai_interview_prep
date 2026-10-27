import request from 'supertest';
import { setupTestDb, teardownTestDb, clearTestDb } from '../setup.js';
import { createApp } from '../../src/app.js';
import { Question } from '../../src/models/Question.js';
import { Company } from '../../src/models/Company.js';

describe('Plans Integration Tests', () => {
  let app;
  let authCookie;

  beforeAll(async () => {
    await setupTestDb();
    app = createApp();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Register user
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Plan Tester', email: 'plan@tester.dev', password: 'password123' });
    authCookie = res.headers['set-cookie'];

    // Seed companies
    await Company.create([
      { slug: 'google', name: 'Google', questionCount: 2, freshCount: 1, difficultyBreakdown: { easy: 1, medium: 1, hard: 0 } },
      { slug: 'amazon', name: 'Amazon', questionCount: 2, freshCount: 0, difficultyBreakdown: { easy: 1, medium: 1, hard: 0 } },
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
          { slug: 'google', name: 'Google', frequency: 95, recency: ['thirty-days', 'all'] },
          { slug: 'amazon', name: 'Amazon', frequency: 80, recency: ['all'] },
        ],
      },
      {
        leetcodeId: 2,
        title: 'Add Two Numbers',
        url: 'https://leetcode.com/problems/add-two-numbers',
        difficulty: 'Medium',
        acceptanceRate: 40,
        companySlugs: ['google'],
        companies: [{ slug: 'google', name: 'Google', frequency: 70, recency: ['all'] }],
      },
      {
        leetcodeId: 3,
        title: 'LRU Cache',
        url: 'https://leetcode.com/problems/lru-cache',
        difficulty: 'Medium',
        acceptanceRate: 45,
        companySlugs: ['amazon'],
        companies: [{ slug: 'amazon', name: 'Amazon', frequency: 75, recency: ['all'] }],
      },
    ]);
  });

  it('creates an authenticated study plan and returns populated days', async () => {
    const res = await request(app)
      .post('/api/plans')
      .set('Cookie', authCookie)
      .send({
        companySlugs: ['google', 'amazon'],
        totalDays: 3,
        questionsPerDay: 1,
        difficultyMix: { easy: 30, medium: 70, hard: 0 },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companySlugs).toEqual(['google', 'amazon']);
    expect(res.body.data.days.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.days[0].questions.length).toBe(1);
    expect(res.body.data.days[0].questions[0].title).toBeDefined();
  });

  it('lists the authenticated user plans', async () => {
    // Create one plan
    await request(app)
      .post('/api/plans')
      .set('Cookie', authCookie)
      .send({
        companySlugs: ['google'],
        totalDays: 3,
        questionsPerDay: 1,
      });

    const res = await request(app)
      .get('/api/plans')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('deletes an existing plan with 200', async () => {
    const createRes = await request(app)
      .post('/api/plans')
      .set('Cookie', authCookie)
      .send({
        companySlugs: ['google'],
        totalDays: 3,
        questionsPerDay: 1,
      });

    const planId = createRes.body.data._id;

    const delRes = await request(app)
      .delete(`/api/plans/${planId}`)
      .set('Cookie', authCookie);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Verify it is gone
    const getRes = await request(app)
      .get(`/api/plans/${planId}`)
      .set('Cookie', authCookie);

    expect(getRes.status).toBe(404);
  });
});
