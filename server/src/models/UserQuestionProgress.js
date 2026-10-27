import mongoose from 'mongoose';
import { FIELD_LIMITS } from '../config/constants.js';

const solutionSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      enum: ['javascript', 'python', 'java', 'cpp', 'typescript', 'go', 'rust'],
    },
    code: {
      type: String,
      maxlength: FIELD_LIMITS.SOLUTION_CODE_MAX,
    },
    savedAt: Date,
  },
  { _id: false }
);

const codeFindingSchema = new mongoose.Schema({
  severity: { type: String, enum: ['critical', 'major', 'minor', 'info'] },
  location: String,
  issue: String,
  explanation: String,
  suggestedFix: String,
}, { _id: false });

const aiReviewSchema = new mongoose.Schema(
  {
    assessment: String,
    approach: String,
    implementationStatus: { type: String, enum: ['solution', 'partial', 'boilerplate', 'empty'] },
    codeFindings: [codeFindingSchema],
    timeComplexity: String,
    spaceComplexity: String,
    strengths: [String],
    gaps: [String],
    edgeCases: [String],
    improvements: [String],
    tags: [String],
    correctnessConfidence: { type: Number, min: 0, max: 100 },
    generatedAt: Date,
    model: String,
  },
  { _id: false }
);

const revisionSchema = new mongoose.Schema(
  {
    stage: { type: Number, default: 0, min: 0, max: 4 },
    nextReviewAt: Date,
    lastReviewedAt: Date,
  },
  { _id: false }
);

const userQuestionProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    status: {
      type: String,
      enum: ['unattempted', 'attempted', 'solved'],
      default: 'unattempted',
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      maxlength: FIELD_LIMITS.NOTES_MAX,
      default: '',
    },
    solution: solutionSchema,
    aiReview: aiReviewSchema,
    attemptedAt: Date,
    solvedAt: Date,
    revision: revisionSchema,
  },
  {
    timestamps: true,
  }
);

userQuestionProgressSchema.index({ user: 1, question: 1 }, { unique: true });
userQuestionProgressSchema.index({ user: 1, status: 1 });
userQuestionProgressSchema.index({ user: 1, isBookmarked: 1 });
userQuestionProgressSchema.index({ user: 1, 'revision.nextReviewAt': 1 });
userQuestionProgressSchema.index({ user: 1, solvedAt: 1 });

export const UserQuestionProgress = mongoose.model('UserQuestionProgress', userQuestionProgressSchema);
