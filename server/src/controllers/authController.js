/**
 * Auth controller — thin layer that delegates to service logic.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env, isDev } from '../config/env.js';
import { BCRYPT_ROUNDS, JWT_EXPIRY, COOKIE_MAX_AGE_MS } from '../config/constants.js';
import { createError } from '../middleware/error.js';

/**
 * Sign a JWT and set it as an httpOnly cookie.
 * @param {Object} user
 * @param {Object} res
 */
function issueToken(user, res) {
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });

  const isCrossSite = process.env.CROSS_SITE_COOKIES === 'true';
  res.cookie('token', token, {
    httpOnly: true,
    secure: !isDev || isCrossSite,
    sameSite: isCrossSite ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });

  return token;
}

/**
 * Sanitize user for response — strip passwordHash.
 */
function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  return obj;
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return next(createError(409, 'An account with this email already exists.', 'EMAIL_EXISTS'));
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ name, email, passwordHash });

    const token = issueToken(user, res);
    const sanitized = sanitizeUser(user);
    res.status(201).json({ success: true, token, user: sanitized, data: sanitized });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return next(createError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS'));
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return next(createError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS'));
    }

    const token = issueToken(user, res);
    const sanitized = sanitizeUser(user);
    res.json({ success: true, token, user: sanitized, data: sanitized });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const isCrossSite = process.env.CROSS_SITE_COOKIES === 'true';
    res.clearCookie('token', {
      httpOnly: true,
      secure: !isDev || isCrossSite,
      sameSite: isCrossSite ? 'none' : 'lax',
      path: '/',
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const sanitized = sanitizeUser(req.user);
    res.json({ success: true, user: sanitized, data: sanitized });
  } catch (err) {
    next(err);
  }
}

export async function demoLogin(req, res, next) {
  try {
    if (!env.DEMO_EMAIL || !env.DEMO_PASSWORD) {
      return next(createError(503, 'Demo account is not configured.', 'DEMO_UNAVAILABLE'));
    }

    const user = await User.findOne({ email: env.DEMO_EMAIL.toLowerCase(), isDemo: true });
    if (!user) {
      return next(createError(404, 'Demo account not found. Run `npm run seed:demo` first.', 'DEMO_NOT_FOUND'));
    }

    const token = issueToken(user, res);
    const sanitized = sanitizeUser(user);
    res.json({ success: true, token, user: sanitized, data: sanitized });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { targetRole, targetCompanies, interviewDate, name } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (targetRole !== undefined) updates.targetRole = targetRole;
    if (targetCompanies !== undefined) updates.targetCompanies = targetCompanies;
    if (interviewDate !== undefined) updates.interviewDate = interviewDate || null;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function completeOnboarding(req, res, next) {
  try {
    const { targetRole, targetCompanies, interviewDate } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          targetRole,
          targetCompanies,
          interviewDate: interviewDate || null,
          onboardingCompleted: true,
        },
      },
      { new: true }
    );

    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}
