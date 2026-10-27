import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Question } from '../src/models/Question.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await connectDatabase();

  const windows = ['all', 'thirty-days', 'three-months', 'six-months'];

  console.log('=== RECENCY COUNTS IN DATABASE ===');

  // Global counts
  const totalGlobal = await Question.countDocuments({});
  console.log(`Global - Any Window (Total): ${totalGlobal}`);
  for (const w of ['thirty-days', 'three-months', 'six-months']) {
    const count = await Question.countDocuments({ 'companies.recency': w });
    console.log(`Global - ${w}: ${count}`);
  }

  // Amazon
  console.log('\n--- Amazon ---');
  const amazonTotal = await Question.countDocuments({ companySlugs: 'amazon' });
  console.log(`Amazon - Any Window (Total): ${amazonTotal}`);
  for (const w of ['thirty-days', 'three-months', 'six-months']) {
    const count = await Question.countDocuments({
      companies: { $elemMatch: { slug: 'amazon', recency: w } }
    });
    console.log(`Amazon - ${w}: ${count}`);
  }

  // Google
  console.log('\n--- Google ---');
  const googleTotal = await Question.countDocuments({ companySlugs: 'google' });
  console.log(`Google - Any Window (Total): ${googleTotal}`);
  for (const w of ['thirty-days', 'three-months', 'six-months']) {
    const count = await Question.countDocuments({
      companies: { $elemMatch: { slug: 'google', recency: w } }
    });
    console.log(`Google - ${w}: ${count}`);
  }

  // Also check CSV files directly for Amazon and Google
  console.log('\n=== CSV LINE COUNTS (excluding header) ===');
  for (const comp of ['amazon', 'google']) {
    console.log(`\nCompany: ${comp}`);
    const dir = path.resolve(__dirname, `../data/companies/${comp}`);
    for (const f of ['thirty-days.csv', 'three-months.csv', 'six-months.csv', 'all.csv']) {
      const p = path.join(dir, f);
      if (fs.existsSync(p)) {
        const lines = fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean);
        console.log(`  ${f}: ${lines.length - 1} rows`);
      } else {
        console.log(`  ${f}: NOT FOUND`);
      }
    }
  }

  await disconnectDatabase();
}

main().catch(console.error);
