/**
 * Seed the demo user with solved questions, a plan, and a revision due.
 * Run: npm run seed:demo
 * Requires DEMO_EMAIL and DEMO_PASSWORD in env.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const { env } = await import('../src/config/env.js');
  const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
  const { User } = await import('../src/models/User.js');
  const { Question } = await import('../src/models/Question.js');
  const { Company } = await import('../src/models/Company.js');
  const { UserQuestionProgress } = await import('../src/models/UserQuestionProgress.js');
  const { PrepPlan } = await import('../src/models/PrepPlan.js');
  const { BCRYPT_ROUNDS } = await import('../src/config/constants.js');

  if (!env.DEMO_EMAIL || !env.DEMO_PASSWORD) {
    console.error('❌ DEMO_EMAIL and DEMO_PASSWORD must be set in env');
    process.exit(1);
  }

  await connectDatabase();

  // Create or reset demo user
  let user = await User.findOne({ email: env.DEMO_EMAIL.toLowerCase() });
  if (user && !user.isDemo) {
    console.error('❌ An account with DEMO_EMAIL exists but is not a demo account. Aborting.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(env.DEMO_PASSWORD, BCRYPT_ROUNDS);

  if (!user) {
    user = await User.create({
      name: 'Demo User',
      email: env.DEMO_EMAIL.toLowerCase(),
      passwordHash,
      isDemo: true,
      onboardingCompleted: true,
      targetRole: 'Software Engineer',
      targetCompanies: ['google', 'amazon', 'microsoft'],
      interviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });
    console.log('✅ Demo user created');
  } else {
    user.passwordHash = passwordHash;
    user.targetCompanies = ['google', 'amazon', 'microsoft'];
    user.onboardingCompleted = true;
    await user.save();
    console.log('✅ Demo user updated');
  }

  // Clear existing progress
  await UserQuestionProgress.deleteMany({ user: user._id });
  await PrepPlan.deleteMany({ user: user._id });

  // Find some questions from target companies
  const googleQuestions = await Question.find({ companySlugs: 'google' }).limit(30).lean();
  const amazonQuestions = await Question.find({ companySlugs: 'amazon' }).limit(20).lean();
  const allQuestions = [...new Map([...googleQuestions, ...amazonQuestions].map((q) => [q._id.toString(), q])).values()];

  if (allQuestions.length === 0) {
    console.warn('⚠️  No questions found. Run `npm run import:data` first.');
    await disconnectDatabase();
    process.exit(0);
  }

  // Mark some as solved, some as attempted, some as bookmarked
  const solved = allQuestions.slice(0, 12);
  const attempted = allQuestions.slice(12, 18);
  const bookmarked = allQuestions.slice(18, 22);

  const now = new Date();
  const progressDocs = [];

  for (let i = 0; i < solved.length; i++) {
    const q = solved[i];
    const solvedAt = new Date(now - i * 2 * 24 * 60 * 60 * 1000); // stagger over last 24 days
    progressDocs.push({
      user: user._id,
      question: q._id,
      status: 'solved',
      isBookmarked: i < 3,
      solvedAt,
      attemptedAt: new Date(solvedAt - 60 * 60 * 1000),
      notes: i < 5 ? `Notes for ${q.title}: great problem for understanding the pattern.` : '',
      // Do not manufacture a queue of future revisions for demo data.
      // Revision schedules are created by real solve/review actions.
      revision: { stage: 0, nextReviewAt: null, lastReviewedAt: null },
    });
  }

  for (const q of attempted) {
    progressDocs.push({
      user: user._id,
      question: q._id,
      status: 'attempted',
      isBookmarked: false,
      attemptedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
    });
  }

  for (const q of bookmarked) {
    progressDocs.push({
      user: user._id,
      question: q._id,
      status: 'unattempted',
      isBookmarked: true,
    });
  }

  await UserQuestionProgress.insertMany(progressDocs);
  console.log(`✅ Created ${progressDocs.length} progress records`);

  // Create a demo plan
  const planQuestions = allQuestions.slice(0, 21); // 7 days x 3 per day
  const days = [];
  for (let d = 1; d <= 7; d++) {
    days.push({
      dayNumber: d,
      questionIds: planQuestions.slice((d - 1) * 3, d * 3).map((q) => q._id),
    });
  }

  // Find company names
  const companies = await Company.find({ slug: { $in: ['google', 'amazon', 'microsoft'] } }).lean();
  const companyNames = ['google', 'amazon', 'microsoft'].map(
    (slug) => companies.find((c) => c.slug === slug)?.name || slug
  );

  await PrepPlan.create({
    user: user._id,
    companySlugs: ['google', 'amazon', 'microsoft'],
    companyNames,
    totalDays: 7,
    questionsPerDay: 3,
    difficultyMix: { easy: 20, medium: 60, hard: 20 },
    startDate: new Date(now - 3 * 24 * 60 * 60 * 1000),
    days,
    summary: {
      totalQuestions: 21,
      byDifficulty: { easy: 4, medium: 13, hard: 4 },
      overlapQuestions: 5,
      percentLast30Days: 60,
      percentLast90Days: 80,
      warnings: [],
    },
  });

  console.log('✅ Demo plan created');
  console.log(`\n🎉 Demo account ready: ${env.DEMO_EMAIL}`);
  console.log('   (Password is set from DEMO_PASSWORD env var)\n');

  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
