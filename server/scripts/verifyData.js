/**
 * Verify data integrity after import.
 * Exits non-zero if counts fall below minimums from import-summary.json.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUMMARY_PATH = path.resolve(__dirname, '../data/import-summary.json');

async function main() {
  const { env } = await import('../src/config/env.js');
  const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
  const { Question } = await import('../src/models/Question.js');
  const { Company } = await import('../src/models/Company.js');

  let summary;
  try {
    const raw = await readFile(SUMMARY_PATH, 'utf8');
    summary = JSON.parse(raw);
  } catch {
    console.error('❌ import-summary.json not found. Run `npm run import:data` first.');
    process.exit(1);
  }

  await connectDatabase();

  const [questionCount, companyCount] = await Promise.all([
    Question.countDocuments(),
    Company.countDocuments(),
  ]);

  const MIN_QUESTION_RATIO = 0.9; // at least 90% of imported questions should be in DB
  const minExpected = Math.floor(summary.questionsCount * MIN_QUESTION_RATIO);
  const minCompanies = Math.floor(summary.companiesCount * 0.9);

  let passed = true;

  if (questionCount < minExpected) {
    console.error(`❌ Questions: expected >= ${minExpected}, found ${questionCount}`);
    passed = false;
  } else {
    console.log(`✅ Questions: ${questionCount} (expected >= ${minExpected})`);
  }

  if (companyCount < minCompanies) {
    console.error(`❌ Companies: expected >= ${minCompanies}, found ${companyCount}`);
    passed = false;
  } else {
    console.log(`✅ Companies: ${companyCount} (expected >= ${minCompanies})`);
  }

  await disconnectDatabase();

  if (!passed) {
    console.error('\n❌ Data verification failed. Run `npm run import:data` to fix.');
    process.exit(1);
  }

  console.log('\n✅ Data verification passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification error:', err.message);
  process.exit(1);
});
