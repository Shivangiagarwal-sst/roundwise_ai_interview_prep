/**
 * One-time cleanup for legacy/demo revision schedules on a single account.
 * This does NOT delete users, questions, solved status, bookmarks, notes, or plans.
 * It clears only reviewed revision schedules (stage > 0) for the specified account.
 *
 * Usage:
 *   node scripts/clearLegacyRevisionSchedules.js user@example.com --dry-run
 *   node scripts/clearLegacyRevisionSchedules.js user@example.com --confirm
 */
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { UserQuestionProgress } from '../src/models/UserQuestionProgress.js';

const email = String(process.argv[2] || '').trim().toLowerCase();
const confirm = process.argv.includes('--confirm');

async function main() {
  if (!email || !email.includes('@')) {
    console.error('Usage: node scripts/clearLegacyRevisionSchedules.js your-login-email --dry-run|--confirm');
    process.exitCode = 1;
    return;
  }

  await connectDatabase();
  try {
    const user = await User.findOne({ email }).select('_id email name isDemo').lean();
    if (!user) {
      console.error('No account found for that email. No data was changed.');
      process.exitCode = 1;
      return;
    }

    const filter = {
      user: user._id,
      status: 'solved',
      'revision.stage': { $gt: 0 },
      'revision.lastReviewedAt': { $ne: null },
      'revision.nextReviewAt': { $ne: null },
    };
    const candidates = await UserQuestionProgress.find(filter)
      .populate('question', 'leetcodeId title')
      .select('question revision.stage revision.lastReviewedAt revision.nextReviewAt')
      .lean();

    console.log(`Account: ${user.name || '(unnamed)'} <${user.email}>${user.isDemo ? ' [demo account]' : ''}`);
    console.log(`Reviewed revision schedules matching the legacy cleanup: ${candidates.length}`);
    for (const item of candidates) {
      console.log(`- #${item.question?.leetcodeId ?? '?'} ${item.question?.title ?? '(question missing)'} | stage ${item.revision?.stage}`);
    }

    if (!confirm) {
      console.log('\nDRY RUN ONLY. Nothing was changed. Review the list above.');
      console.log('To clear only these schedules while preserving solved status and all other data, rerun with --confirm.');
      return;
    }

    if (candidates.length === 0) {
      console.log('No matching schedules found. Nothing was changed.');
      return;
    }

    const result = await UserQuestionProgress.updateMany(filter, {
      $set: { 'revision.stage': 0, 'revision.nextReviewAt': null, 'revision.lastReviewedAt': null },
    });
    console.log(`Cleared ${result.modifiedCount} revision schedules. Solved status, bookmarks, notes, plans, and question data were preserved.`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch(async (error) => {
  console.error('Cleanup failed. No success is claimed:', error.message);
  try { await disconnectDatabase(); } catch { /* no-op */ }
  process.exitCode = 1;
});
