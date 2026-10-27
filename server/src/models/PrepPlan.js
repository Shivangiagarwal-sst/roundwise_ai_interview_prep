import mongoose from 'mongoose';
import { PLAN } from '../config/constants.js';

const daySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  },
  { _id: false }
);

const prepPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companySlugs: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => v.length >= PLAN.MIN_COMPANIES && v.length <= PLAN.MAX_COMPANIES,
        message: `Must have between ${PLAN.MIN_COMPANIES} and ${PLAN.MAX_COMPANIES} companies`,
      },
    },
    companyNames: [String],
    totalDays: {
      type: Number,
      required: true,
      min: PLAN.MIN_DAYS,
      max: PLAN.MAX_DAYS,
    },
    questionsPerDay: {
      type: Number,
      required: true,
      min: PLAN.MIN_PER_DAY,
      max: PLAN.MAX_PER_DAY,
    },
    difficultyMix: {
      easy: { type: Number, default: 20 },
      medium: { type: Number, default: 60 },
      hard: { type: Number, default: 20 },
    },
    focusRecency: {
      type: String,
      enum: ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all', null],
      default: null,
    },
    startDate: {
      type: Date,
      default: () => new Date(),
    },
    days: [daySchema],
    summary: {
      totalQuestions: Number,
      byDifficulty: {
        easy: Number,
        medium: Number,
        hard: Number,
      },
      overlapQuestions: Number,
      percentLast30Days: Number,
      percentLast90Days: Number,
      recencyFallback: Boolean,
      difficultyFallback: Boolean,
      warnings: [String],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

prepPlanSchema.index({ user: 1, status: 1 });
prepPlanSchema.index({ user: 1, createdAt: -1 });

export const PrepPlan = mongoose.model('PrepPlan', prepPlanSchema);
