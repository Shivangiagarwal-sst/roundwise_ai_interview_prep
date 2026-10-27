import mongoose from 'mongoose';
import { FIELD_LIMITS } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: FIELD_LIMITS.NAME_MAX,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: FIELD_LIMITS.EMAIL_MAX,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    targetRole: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    targetCompanies: {
      type: [String],
      default: [],
    },
    interviewDate: {
      type: Date,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    aiUsage: {
      date: { type: String }, // YYYY-MM-DD
      count: { type: Number, default: 0 },
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);
