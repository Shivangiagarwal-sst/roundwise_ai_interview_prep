/**
 * Tunable application constants.
 * No magic numbers anywhere else in the codebase — all come from here.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────
export const BCRYPT_ROUNDS = 10;
export const JWT_EXPIRY = '7d';
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Rate limits (requests per window) ────────────────────────────────────────
export const RATE_LIMIT = {
  GENERAL: { windowMs: 15 * 60 * 1000, max: 200 },      // 15 min window
  AUTH: { windowMs: 15 * 60 * 1000, max: 20 },           // strict for login/register
  AI: { windowMs: 60 * 1000, max: 10 },                  // per minute for AI
  PUBLIC: { windowMs: 60 * 1000, max: 30 },              // public endpoints
  DEMO: { windowMs: 5 * 60 * 1000, max: 5 },             // demo login
};

// ─── Pagination ───────────────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// ─── Field length limits ──────────────────────────────────────────────────────
export const FIELD_LIMITS = {
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  NOTES_MAX: 10_000,
  SOLUTION_CODE_MAX: 50_000,
  AI_EXPLANATION_MAX: 2000,
  AI_CODE_MAX: 20_000,
  SEARCH_QUERY_MAX: 200,
  COMPANY_MONIKER_MAX: 50,
};

// ─── Plan generator ───────────────────────────────────────────────────────────
export const PLAN = {
  MAX_ACTIVE_PLANS: 3,
  MIN_COMPANIES: 1,
  MAX_COMPANIES: 5,
  MIN_DAYS: 3,
  MAX_DAYS: 90,
  MIN_PER_DAY: 1,
  MAX_PER_DAY: 10,
  DEFAULT_QUESTIONS_PER_DAY: 3,
  DEFAULT_TOTAL_DAYS: 30,
  // Scoring weights
  W_FREQ: 0.6,
  W_RECENCY: 0.4,
  // Recency tag weights
  RECENCY_WEIGHTS: {
    'thirty-days': 1.0,
    'three-months': 0.75,
    'six-months': 0.5,
    'more-than-six-months': 0.25,
    all: 0.15,
  },
  // Default difficulty mix (percentages, must sum to 100)
  DEFAULT_DIFFICULTY_MIX: { easy: 20, medium: 60, hard: 20 },
  // Minimum candidates for recency focus before falling back
  MIN_RECENCY_CANDIDATES: 5,
};

// ─── Spaced repetition intervals (days) ────────────────────────────────────────
export const REVISION = {
  STAGES: [1, 3, 7, 16, 35], // days until next review per stage
  MAX_STAGE: 4,               // 0-indexed
};

// ─── AI ────────────────────────────────────────────────────────────────────────
export const AI = {
  DAILY_QUOTA: 30,
  REQUEST_TIMEOUT_MS: 30_000,
  MAX_RETRIES: 1,
};

// ─── Body limits ──────────────────────────────────────────────────────────────
export const BODY_LIMIT = '100kb';

// ─── Question search ──────────────────────────────────────────────────────────
export const RECENCY_WINDOWS = ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all'];
export const DIFFICULTY_VALUES = ['Easy', 'Medium', 'Hard'];
export const SORT_FIELDS = {
  QUESTIONS: ['frequency', 'acceptance', 'difficulty', 'id'],
  COMPANIES: ['questions', 'name', 'fresh'],
};
