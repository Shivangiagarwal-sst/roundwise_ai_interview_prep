import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    questionCount: {
      type: Number,
      default: 0,
    },
    freshCount: {
      type: Number,
      default: 0, // questions with thirty-days recency tag
    },
    difficultyBreakdown: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

companySchema.index({ name: 'text' });

export const Company = mongoose.model('Company', companySchema);
