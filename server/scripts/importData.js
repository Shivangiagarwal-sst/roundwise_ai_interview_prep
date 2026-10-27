/**
 * Data importer: reads CSV files from server/data/companies/ into MongoDB.
 * Idempotent: uses bulkWrite with upserts. Never touches user collections.
 * Run: npm run import:data
 */

import { createReadStream, existsSync } from 'fs';
import { readdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPANIES_DIR = path.resolve(__dirname, '../data/companies');
const SUMMARY_PATH = path.resolve(__dirname, '../data/import-summary.json');
const RECENCY_FILES = [
  'thirty-days',
  'three-months',
  'six-months',
  'more-than-six-months',
  'all',
];

/**
 * Parse a single CSV file and return rows.
 * Expected header: ID,URL,Title,Difficulty,Acceptance %,Frequency %
 * @param {string} filePath
 * @returns {Promise<Array>}
 */
async function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          trim: true,
          skip_empty_lines: true,
          relax_column_count: true,
        })
      )
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', () => resolve(rows));
  });
}

/**
 * Parse acceptance or frequency percentage string to a number 0–100.
 * Handles "57.8%", "57.8", ".578", "0" gracefully.
 */
function parsePct(str) {
  if (!str) return 0;
  const clean = String(str).replace('%', '').trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  // If value looks like a decimal (0.578), convert to percentage
  return num <= 1 ? Math.round(num * 100 * 10) / 10 : Math.round(num * 10) / 10;
}

/**
 * Normalize a company directory name into a display name.
 */
function slugToName(slug) {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Main import function.
 * @param {{ silent?: boolean }} options
 */
export async function runImport({ silent = false } = {}) {
  const { Question } = await import('../src/models/Question.js');
  const { Company } = await import('../src/models/Company.js');

  const log = silent ? () => {} : console.log;
  const warn = silent ? () => {} : console.warn;

  log('\n📥 Roundwise Data Importer\n');

  const companySlugs = await readdir(COMPANIES_DIR);
  const validSlugs = (
    await Promise.all(
      companySlugs.map(async (slug) => {
        const s = await stat(path.join(COMPANIES_DIR, slug));
        return s.isDirectory() ? slug : null;
      })
    )
  ).filter(Boolean);

  log(`Found ${validSlugs.length} company directories`);

  // questionId (leetcodeId) -> accumulated data
  const questionMap = new Map();
  // slug -> {questionCount, freshCount, difficultyBreakdown}
  const companyStats = new Map();

  let totalRows = 0;
  let skippedRows = 0;

  for (const slug of validSlugs) {
    const companyDir = path.join(COMPANIES_DIR, slug);
    const stats = {
      slug,
      name: slugToName(slug),
      questionCount: 0,
      freshCount: 0,
      difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
      questionIdsInAll: new Set(),
    };
    companyStats.set(slug, stats);

    for (const recencyKey of RECENCY_FILES) {
      const csvPath = path.join(companyDir, `${recencyKey}.csv`);
      if (!existsSync(csvPath)) continue;

      let rows;
      try {
        rows = await parseCsv(csvPath);
      } catch {
        continue;
      }

      for (const row of rows) {
        const id = parseInt(row['ID'] || row['Id'] || row['id'], 10);
        if (!id || isNaN(id)) {
          skippedRows++;
          continue;
        }

        const url = (row['URL'] || row['Url'] || row['url'] || '').trim();
        const title = (row['Title'] || row['title'] || '').trim();
        const difficulty = (row['Difficulty'] || row['difficulty'] || 'Medium').trim();
        const acceptance = parsePct(row['Acceptance %'] || row['Acceptance'] || '0');
        const frequency = parsePct(row['Frequency %'] || row['Frequency'] || '0');

        if (!title || !url) {
          skippedRows++;
          continue;
        }

        // Build question data
        if (!questionMap.has(id)) {
          questionMap.set(id, {
            leetcodeId: id,
            title,
            url,
            difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
            acceptanceRate: acceptance,
            companies: new Map(),
          });
        }

        const q = questionMap.get(id);

        // Track company entry
        if (!q.companies.has(slug)) {
          q.companies.set(slug, {
            slug,
            name: stats.name,
            frequency,
            recency: [],
          });
        }
        const entry = q.companies.get(slug);
        if (!entry.recency.includes(recencyKey)) {
          entry.recency.push(recencyKey);
        }
        // Use highest frequency seen across windows
        entry.frequency = Math.max(entry.frequency, frequency);

        // Company stats
        if (recencyKey === 'all') {
          if (!stats.questionIdsInAll.has(id)) {
            stats.questionIdsInAll.add(id);
            stats.questionCount++;
            const diff = q.difficulty.toLowerCase();
            if (stats.difficultyBreakdown[diff] !== undefined) {
              stats.difficultyBreakdown[diff]++;
            }
          }
        }
        if (recencyKey === 'thirty-days') {
          if (!stats.freshSet) stats.freshSet = new Set();
          if (!stats.freshSet.has(id)) {
            stats.freshSet.add(id);
            stats.freshCount++;
          }
        }

        totalRows++;
      }
    }
  }

  log(`Processed ${totalRows} rows (${skippedRows} skipped)`);
  log(`Total unique questions: ${questionMap.size}`);

  // Bulk upsert questions
  const questionOps = [];
  for (const [, q] of questionMap) {
    const companiesArr = [...q.companies.values()];
    const companySlugsArr = companiesArr.map((c) => c.slug);
    const maxFrequency = Math.max(...companiesArr.map((c) => c.frequency), 0);

    questionOps.push({
      updateOne: {
        filter: { leetcodeId: q.leetcodeId },
        update: {
          $set: {
            leetcodeId: q.leetcodeId,
            title: q.title,
            url: q.url,
            difficulty: q.difficulty,
            acceptanceRate: q.acceptanceRate,
            companies: companiesArr,
            companySlugs: companySlugsArr,
            maxFrequency,
          },
        },
        upsert: true,
      },
    });
  }

  // Process in batches to avoid memory issues
  const BATCH = 500;
  let questionUpserted = 0;
  for (let i = 0; i < questionOps.length; i += BATCH) {
    const result = await Question.bulkWrite(questionOps.slice(i, i + BATCH), { ordered: false });
    questionUpserted += result.upsertedCount + result.modifiedCount;
  }
  log(`Questions upserted: ${questionUpserted}`);

  // Bulk upsert companies
  const companyOps = [];
  for (const [slug, stats] of companyStats) {
    companyOps.push({
      updateOne: {
        filter: { slug },
        update: {
          $set: {
            slug,
            name: stats.name,
            questionCount: stats.questionCount,
            freshCount: stats.freshCount,
            difficultyBreakdown: stats.difficultyBreakdown,
          },
        },
        upsert: true,
      },
    });
  }

  const companyResult = await Company.bulkWrite(companyOps, { ordered: false });
  const companyUpserted = companyResult.upsertedCount + companyResult.modifiedCount;
  log(`Companies upserted: ${companyUpserted}`);

  const summary = {
    importedAt: new Date().toISOString(),
    companiesCount: validSlugs.length,
    questionsCount: questionMap.size,
    totalRows,
    skippedRows,
    minQuestions: Math.min(...[...companyStats.values()].map((s) => s.questionCount).filter((n) => n > 0)),
    maxQuestions: Math.max(...[...companyStats.values()].map((s) => s.questionCount)),
  };

  await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2));
  log(`\n✅ Import complete. Summary written to server/data/import-summary.json\n`);

  return summary;
}

// Run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { env } = await import('../src/config/env.js');
  const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');

  try {
    await connectDatabase();
    await runImport({ silent: false });
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    console.error('Import failed:', err.message);
    process.exit(1);
  }
}
