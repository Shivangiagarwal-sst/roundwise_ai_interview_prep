import mongoose from 'mongoose';

const companyEntrySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    frequency: { type: Number, default: 0 },   // 0–100
    recency: {
      type: [String],
      enum: ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all'],
      default: [],
    },
  },
  { _id: false }
);

const questionInsightsSchema = new mongoose.Schema(
  {
    hints: [String],
    pitfalls: [String],
    complexity: String,
    generatedAt: Date,
    model: String,
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    leetcodeId: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
    acceptanceRate: {
      type: Number, // 0–100
      default: 0,
    },
    companies: [companyEntrySchema],
    companySlugs: {
      type: [String],
      index: true,
    },
    maxFrequency: {
      type: Number,
      default: 0,
    },
    topics: {
      type: [String],
      default: [],
    },
    insights: questionInsightsSchema,
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ difficulty: 1 });
questionSchema.index({ maxFrequency: -1 });
questionSchema.index({ title: 'text' });
questionSchema.index({ companySlugs: 1, difficulty: 1, maxFrequency: -1 });

export const Question = mongoose.model('Question', questionSchema);
