/**
 * Plan Generator Service
 * Pure deterministic scoring — no LLM involved.
 * All weights and tables come from config/constants.js.
 * @module services/planGenerator
 */

import { PLAN } from '../config/constants.js';

/**
 * @typedef {Object} CompanyQuestionData
 * @property {string} slug
 * @property {string} name
 * @property {number} frequency - 0 to 100
 * @property {string[]} recency - tags present in the company's data
 */

/**
 * @typedef {Object} QuestionCandidate
 * @property {string} id - MongoDB ObjectId as string
 * @property {number} leetcodeId
 * @property {string} title
 * @property {string} difficulty - 'Easy' | 'Medium' | 'Hard'
 * @property {number} acceptanceRate
 * @property {CompanyQuestionData[]} companies - entries for target companies only
 */

/**
 * Get the weight for a recency tag.
 * Uses the "best" (highest weight) tag the question has.
 * @param {string[]} recencyTags
 * @returns {number}
 */
export function getRecencyWeight(recencyTags) {
  if (!recencyTags || recencyTags.length === 0) return PLAN.RECENCY_WEIGHTS['all'];
  return Math.max(
    ...recencyTags.map((tag) => PLAN.RECENCY_WEIGHTS[tag] ?? PLAN.RECENCY_WEIGHTS['all'])
  );
}

/**
 * Compute per-company score for a single question + company entry.
 * frequencyNormalized = frequency / maxFrequencyInCompany (0..1)
 * score = frequencyNormalized * W_FREQ + recencyWeight * W_RECENCY
 * @param {number} frequency
 * @param {number} maxFrequencyInCompany
 * @param {string[]} recencyTags
 * @returns {number}
 */
export function computePerCompanyScore(frequency, maxFrequencyInCompany, recencyTags) {
  const freqNorm = maxFrequencyInCompany > 0 ? frequency / maxFrequencyInCompany : 0;
  const recencyWeight = getRecencyWeight(recencyTags);
  return freqNorm * PLAN.W_FREQ + recencyWeight * PLAN.W_RECENCY;
}

/**
 * Score all candidates against the selected companies.
 * Returns scored questions with overlap count.
 *
 * @param {QuestionCandidate[]} candidates
 * @param {string[]} targetSlugs
 * @param {Map<string, number>} maxFreqByCompany - slug -> max frequency in that company
 * @returns {Array<{question: QuestionCandidate, score: number, overlapCount: number}>}
 */
export function scoreCandidates(candidates, targetSlugs, maxFreqByCompany) {
  const targetSet = new Set(targetSlugs);

  return candidates.map((q) => {
    let combinedScore = 0;
    let overlapCount = 0;

    for (const company of q.companies) {
      if (!targetSet.has(company.slug)) continue;
      overlapCount++;
      const maxFreq = maxFreqByCompany.get(company.slug) ?? 100;
      combinedScore += computePerCompanyScore(company.frequency, maxFreq, company.recency);
    }

    return { question: q, score: combinedScore, overlapCount };
  });
}

/**
 * Build the per-company max-frequency map from candidates.
 * @param {QuestionCandidate[]} candidates
 * @param {string[]} targetSlugs
 * @returns {Map<string, number>}
 */
export function buildMaxFreqMap(candidates, targetSlugs) {
  const map = new Map();
  for (const slug of targetSlugs) {
    let max = 0;
    for (const q of candidates) {
      for (const c of q.companies) {
        if (c.slug === slug && c.frequency > max) max = c.frequency;
      }
    }
    map.set(slug, max);
  }
  return map;
}

/**
 * Filter candidates by recency focus, falling back to all if too few.
 * @param {QuestionCandidate[]} candidates
 * @param {string|null} focusRecency
 * @returns {{ filtered: QuestionCandidate[], usedFallback: boolean }}
 */
export function applyRecencyFilter(candidates, focusRecency) {
  if (!focusRecency || focusRecency === 'all') {
    return { filtered: candidates, usedFallback: false };
  }

  // Recency hierarchy: more-specific means higher priority
  const hierarchy = ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all'];
  const focusIdx = hierarchy.indexOf(focusRecency);

  const filtered = candidates.filter((q) =>
    q.companies.some((c) =>
      c.recency.some((tag) => hierarchy.indexOf(tag) <= focusIdx)
    )
  );

  if (filtered.length >= PLAN.MIN_RECENCY_CANDIDATES) {
    return { filtered, usedFallback: false };
  }

  return { filtered: candidates, usedFallback: true };
}

/**
 * Sort scored candidates with ramp-up ordering:
 * - Easier questions and higher-scored ones come first
 * - Harder questions come later
 * - At most one Hard per day (enforced in buildDays)
 * - Ties broken by leetcodeId (deterministic)
 *
 * Difficulty order: Easy < Medium < Hard
 * @param {Array<{question: QuestionCandidate, score: number, overlapCount: number}>} scored
 * @returns {Array}
 */
export function sortWithRampUp(scored) {
  const diffOrder = { Easy: 0, Medium: 1, Hard: 2 };
  return [...scored].sort((a, b) => {
    const diffA = diffOrder[a.question.difficulty] ?? 1;
    const diffB = diffOrder[b.question.difficulty] ?? 1;
    if (diffA !== diffB) return diffA - diffB;
    if (b.score !== a.score) return b.score - a.score;
    return a.question.leetcodeId - b.question.leetcodeId;
  });
}

/**
 * Select questions honoring difficulty mix buckets.
 * If a bucket runs out, fills from adjacent bucket and records a warning.
 *
 * @param {Array<{question: QuestionCandidate, score: number, overlapCount: number}>} sorted
 * @param {number} totalNeeded
 * @param {{ easy: number, medium: number, hard: number }} mix - percentages summing to 100
 * @returns {{ selected: Array, warnings: string[] }}
 */
export function selectByDifficultyMix(sorted, totalNeeded, mix) {
  const targets = {
    Easy: Math.round((mix.easy / 100) * totalNeeded),
    Medium: Math.round((mix.medium / 100) * totalNeeded),
    Hard: Math.round((mix.hard / 100) * totalNeeded),
  };

  // Adjust rounding error
  const total = targets.Easy + targets.Medium + targets.Hard;
  if (total < totalNeeded) targets.Medium += totalNeeded - total;
  if (total > totalNeeded) targets.Medium -= total - totalNeeded;

  const buckets = { Easy: [], Medium: [], Hard: [] };
  for (const item of sorted) {
    const diff = item.question.difficulty;
    if (buckets[diff]) buckets[diff].push(item);
  }

  const warnings = [];
  const selected = [];
  const fallbackOrder = ['Medium', 'Easy', 'Hard'];

  for (const [diff, count] of Object.entries(targets)) {
    let needed = count;
    const taken = buckets[diff].splice(0, needed);
    selected.push(...taken);
    needed -= taken.length;

    if (needed > 0) {
      warnings.push(`Not enough ${diff} questions; filled ${needed} from other difficulties.`);
      for (const fallback of fallbackOrder) {
        if (fallback === diff || needed <= 0) continue;
        const fill = buckets[fallback].splice(0, needed);
        selected.push(...fill);
        needed -= fill.length;
      }
    }
  }

  return { selected: selected.slice(0, totalNeeded), warnings };
}

/**
 * Arrange selected questions into days with ramp-up + at-most-one-hard-per-day rule.
 * @param {Array<{question: QuestionCandidate, score: number}>} selected
 * @param {number} totalDays
 * @param {number} questionsPerDay
 * @returns {Array<{dayNumber: number, questionIds: string[]}>}
 */
export function buildDays(selected, totalDays, questionsPerDay) {
  // Re-sort with ramp-up
  const sorted = sortWithRampUp(selected);

  const days = [];
  let idx = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dayItems = [];
    let hardsThisDay = 0;
    const remaining = sorted.slice(idx);

    // First pass: fill non-hard slots
    const deferred = [];
    for (const item of remaining) {
      if (dayItems.length >= questionsPerDay) break;
      if (item.question.difficulty === 'Hard') {
        if (hardsThisDay < 1) {
          dayItems.push(item);
          hardsThisDay++;
        } else {
          deferred.push(item);
        }
      } else {
        dayItems.push(item);
      }
    }

    // If we still need more questions, pull from deferred
    if (dayItems.length < questionsPerDay && deferred.length > 0) {
      const need = questionsPerDay - dayItems.length;
      dayItems.push(...deferred.slice(0, need));
    }

    const dayIds = dayItems.map((it) => it.question.id);
    days.push({ dayNumber: day, questionIds: dayIds });

    // Advance index by the number of items we just used
    idx += dayItems.length;
    if (idx >= sorted.length) break;
  }

  return days;
}

/**
 * Compute plan summary statistics.
 * @param {Array} selected
 * @param {string[]} targetSlugs
 * @returns {Object}
 */
export function computeSummary(selected, targetSlugs, warnings) {
  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  let overlapQuestions = 0;
  let last30Count = 0;
  let last90Count = 0;

  for (const item of selected) {
    const diff = item.question.difficulty.toLowerCase();
    byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;

    if (item.overlapCount > 1) overlapQuestions++;

    const targetCompanies = item.question.companies.filter((c) =>
      targetSlugs.includes(c.slug)
    );

    const hasThirtyDays = targetCompanies.some((c) => c.recency.includes('thirty-days'));
    const hasThreeMonths = targetCompanies.some(
      (c) => c.recency.includes('thirty-days') || c.recency.includes('three-months')
    );

    if (hasThirtyDays) last30Count++;
    if (hasThreeMonths) last90Count++;
  }

  const total = selected.length;

  return {
    totalQuestions: total,
    byDifficulty,
    overlapQuestions,
    percentLast30Days: total > 0 ? Math.round((last30Count / total) * 100) : 0,
    percentLast90Days: total > 0 ? Math.round((last90Count / total) * 100) : 0,
    warnings,
  };
}

/**
 * Main plan generation function.
 * Pure function: takes candidates, config, returns plan data.
 *
 * @param {QuestionCandidate[]} candidates - questions belonging to any target company
 * @param {string[]} targetSlugs
 * @param {Object} options
 * @param {number} options.totalDays
 * @param {number} options.questionsPerDay
 * @param {{ easy: number, medium: number, hard: number }} options.difficultyMix
 * @param {string|null} options.focusRecency
 * @param {boolean} [options.includeSolved=false]
 * @param {Set<string>} [options.solvedIds] - question ObjectId strings already solved
 * @returns {{ days: Array, summary: Object }}
 */
export function generatePlan(candidates, targetSlugs, options) {
  const {
    totalDays,
    questionsPerDay,
    difficultyMix = PLAN.DEFAULT_DIFFICULTY_MIX,
    focusRecency = null,
    includeSolved = false,
    solvedIds = new Set(),
  } = options;

  // 1. Exclude solved unless opted in
  let pool = includeSolved
    ? candidates
    : candidates.filter((q) => !solvedIds.has(q.id));

  // 2. Apply recency filter
  const { filtered, usedFallback } = applyRecencyFilter(pool, focusRecency);
  pool = filtered;

  // 3. Build max-frequency map
  const maxFreqMap = buildMaxFreqMap(pool, targetSlugs);

  // 4. Score all candidates
  const scored = scoreCandidates(pool, targetSlugs, maxFreqMap);

  // 5. Sort with ramp-up
  const sorted = sortWithRampUp(scored);

  // 6. Select by difficulty mix
  const totalNeeded = totalDays * questionsPerDay;
  const { selected, warnings } = selectByDifficultyMix(sorted, totalNeeded, difficultyMix);

  if (usedFallback) {
    warnings.unshift(
      `Not enough questions for the "${focusRecency}" recency window; showing questions from all time windows.`
    );
  }

  // 7. Build days
  const days = buildDays(selected, totalDays, questionsPerDay);

  // 8. Compute summary
  const summary = computeSummary(selected, targetSlugs, warnings);

  return { days, summary };
}
