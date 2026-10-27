import request from 'supertest';
import { setupTestDb, teardownTestDb } from '../setup.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Question } from '../../src/models/Question.js';
import { Company } from '../../src/models/Company.js';
import { PrepPlan } from '../../src/models/PrepPlan.js';
import { UserQuestionProgress } from '../../src/models/UserQuestionProgress.js';

let app;
let authCookieUser1;
let authCookieUser2;
let user1Id;
let user2Id;
let testQuestion1;
let testQuestion2;
let testPlan;

beforeAll(async () => {
  await setupTestDb();
  app = createApp();

  // Clean test DB
  await User.deleteMany({});
  await Question.deleteMany({});
  await Company.deleteMany({});
  await PrepPlan.deleteMany({});
  await UserQuestionProgress.deleteMany({});

  // Seed company
  await Company.create({
    slug: 'google',
    name: 'Google',
    questionCount: 2,
    freshCount: 1,
    difficultyBreakdown: { easy: 1, medium: 1, hard: 0 },
  });

  // Seed questions
  testQuestion1 = await Question.create({
    leetcodeId: 1,
    title: 'Two Sum',
    url: 'https://leetcode.com/problems/two-sum',
    difficulty: 'Easy',
    acceptanceRate: 51.5,
    companies: [{ slug: 'google', name: 'Google', frequency: 100, recency: ['thirty-days', 'all'] }],
    companySlugs: ['google'],
    maxFrequency: 100,
  });

  testQuestion2 = await Question.create({
    leetcodeId: 2,
    title: 'Add Two Numbers',
    url: 'https://leetcode.com/problems/add-two-numbers',
    difficulty: 'Medium',
    acceptanceRate: 42.0,
    companies: [{ slug: 'google', name: 'Google', frequency: 80, recency: ['three-months', 'all'] }],
    companySlugs: ['google'],
    maxFrequency: 80,
  });

  // Register User 1
  const regRes1 = await request(app)
    .post('/api/auth/register')
    .send({ name: 'User One', email: 'user1@example.com', password: 'Password123!' });
  authCookieUser1 = regRes1.headers['set-cookie'][0].split(';')[0];
  user1Id = regRes1.body.user._id;

  // Register User 2
  const regRes2 = await request(app)
    .post('/api/auth/register')
    .send({ name: 'User Two', email: 'user2@example.com', password: 'Password123!' });
  authCookieUser2 = regRes2.headers['set-cookie'][0].split(';')[0];
  user2Id = regRes2.body.user._id;

  // Create plan for User 1
  const planRes = await request(app)
    .post('/api/plans')
    .set('Cookie', authCookieUser1)
    .send({
      companySlugs: ['google'],
      totalDays: 3,
      questionsPerDay: 1,
    });
  testPlan = planRes.body.data;
});

afterAll(async () => {
  await teardownTestDb();
});

describe('Progress Persistence and Status Checkmark API', () => {
  it('ticking completed sets solvedAt, status=solved, schedules revision, and returns solved: true', async () => {
    const res = await request(app)
      .put(`/api/progress/questions/${testQuestion1._id}/status`)
      .set('Cookie', authCookieUser1)
      .send({ solved: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.solved).toBe(true);
    expect(res.body.data.status).toBe('solved');
    expect(res.body.data.solvedAt).toBeDefined();
    expect(res.body.data.revision?.nextReviewAt).toBeDefined();

    // Verify in DB
    const progressInDb = await UserQuestionProgress.findOne({
      user: user1Id,
      question: testQuestion1._id,
    });
    expect(progressInDb.status).toBe('solved');
    expect(progressInDb.solvedAt).not.toBeNull();
    expect(progressInDb.revision.nextReviewAt).not.toBeNull();
  });

  it('GET /api/plans/:id merges user progress with solved=true and correct plan.solvedCount', async () => {
    const res = await request(app)
      .get(`/api/plans/${testPlan._id}`)
      .set('Cookie', authCookieUser1);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.solvedCount).toBeGreaterThanOrEqual(1);

    // Find Two Sum in plan days
    const allQuestions = res.body.data.days.flatMap((d) => d.questions);
    const twoSum = allQuestions.find((q) => q.leetcodeId === 1);
    expect(twoSum).toBeDefined();
    expect(twoSum.solved).toBe(true);
    expect(twoSum.userStatus).toBe('solved');
  });

  it('GET /api/questions returns solved=true and userStatus=solved for User 1', async () => {
    const res = await request(app)
      .get('/api/questions')
      .set('Cookie', authCookieUser1);

    expect(res.status).toBe(200);
    const twoSum = res.body.data.find((q) => q.leetcodeId === 1);
    expect(twoSum.solved).toBe(true);
    expect(twoSum.userStatus).toBe('solved');

    const addTwo = res.body.data.find((q) => q.leetcodeId === 2);
    expect(addTwo.solved).toBe(false);
  });

  it('filters questions with status=completed and status=not_completed', async () => {
    // Completed filter
    const compRes = await request(app)
      .get('/api/questions?status=completed')
      .set('Cookie', authCookieUser1);

    expect(compRes.status).toBe(200);
    expect(compRes.body.data.length).toBe(1);
    expect(compRes.body.data[0].leetcodeId).toBe(1);

    // Not completed filter
    const notCompRes = await request(app)
      .get('/api/questions?status=not_completed')
      .set('Cookie', authCookieUser1);

    expect(notCompRes.status).toBe(200);
    expect(notCompRes.body.data.length).toBe(1);
    expect(notCompRes.body.data[0].leetcodeId).toBe(2);
  });

  it('GET /api/progress/stats returns accurate solvedCount and byDifficulty', async () => {
    const res = await request(app)
      .get('/api/progress/stats')
      .set('Cookie', authCookieUser1);

    expect(res.status).toBe(200);
    expect(res.body.data.solvedCount).toBe(1);
    expect(res.body.data.completedCount).toBe(1);
    expect(res.body.data.byDifficulty.easy).toBe(1);
  });

  it('GET /api/progress/revisions/due returns scheduled revision item', async () => {
    const res = await request(app)
      .get('/api/progress/revisions/due')
      .set('Cookie', authCookieUser1);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].question.leetcodeId).toBe(1);
    expect(res.body.data[0].nextReviewAt).toBeDefined();
  });

  it('unticking completed clears solvedAt, clears revision schedule, and removes from revision queue', async () => {
    const untickRes = await request(app)
      .put(`/api/progress/questions/${testQuestion1._id}/status`)
      .set('Cookie', authCookieUser1)
      .send({ solved: false });

    expect(untickRes.status).toBe(200);
    expect(untickRes.body.data.solved).toBe(false);
    expect(untickRes.body.data.status).toBe('unattempted');

    // DB check
    const progressInDb = await UserQuestionProgress.findOne({
      user: user1Id,
      question: testQuestion1._id,
    });
    expect(progressInDb.solvedAt).toBeNull();
    expect(progressInDb.revision.nextReviewAt).toBeNull();

    // Verify removed from revision queue
    const revRes = await request(app)
      .get('/api/progress/revisions/due')
      .set('Cookie', authCookieUser1);

    expect(revRes.body.data.length).toBe(0);
  });

  it('re-ticking completed restores solvedAt and revision schedule', async () => {
    const retickRes = await request(app)
      .put(`/api/progress/questions/${testQuestion1._id}/status`)
      .set('Cookie', authCookieUser1)
      .send({ solved: true });

    expect(retickRes.status).toBe(200);
    expect(retickRes.body.data.solved).toBe(true);

    const revRes = await request(app)
      .get('/api/progress/revisions/due')
      .set('Cookie', authCookieUser1);

    expect(revRes.body.data.length).toBe(1);
  });

  it('user isolation: User 2 cannot see User 1 progress or completed status', async () => {
    const resUser2 = await request(app)
      .get('/api/questions')
      .set('Cookie', authCookieUser2);

    expect(resUser2.status).toBe(200);
    const twoSumForUser2 = resUser2.body.data.find((q) => q.leetcodeId === 1);
    expect(twoSumForUser2.solved).toBe(false);
    expect(twoSumForUser2.userStatus).toBe('unattempted');

    // User 2 filtering by completed should see 0
    const compResUser2 = await request(app)
      .get('/api/questions?status=completed')
      .set('Cookie', authCookieUser2);

    expect(compResUser2.body.data.length).toBe(0);

    // User 2 revision queue should be empty
    const revResUser2 = await request(app)
      .get('/api/progress/revisions/due')
      .set('Cookie', authCookieUser2);

    expect(revResUser2.body.data.length).toBe(0);
  });
});
