/**
 * Authentication middleware.
 * Verifies the httpOnly JWT cookie.
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { createError } from './error.js';

/**
 * Require a valid auth cookie. Attaches req.user.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = req.cookies?.token || bearerToken;
    if (!token) {
      return next(createError(401, 'Authentication required', 'UNAUTHORIZED'));
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(createError(401, 'Session expired, please log in again', 'TOKEN_EXPIRED'));
      }
      return next(createError(401, 'Invalid authentication token', 'INVALID_TOKEN'));
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return next(createError(401, 'User no longer exists', 'USER_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verify Origin header on non-GET requests to prevent CSRF.
 * Only enforced in production where we have a known CLIENT_URL.
 */
export function verifyOrigin(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const origin = req.get('Origin')?.replace(/\/$/, '');
  if (!origin) {
    // No origin header — allow (server-to-server or same-origin form POST)
    return next();
  }

  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.includes(origin) && !allowedOrigins.includes('*')) {
    return next(createError(403, 'Origin not allowed', 'ORIGIN_FORBIDDEN'));
  }

  next();
}

/**
 * Parse CLIENT_URL from env into a list of allowed origins.
 * In dev, localhost variants are always allowed.
 */
export function getAllowedOrigins() {
  const urls = (env.CLIENT_URL || '')
    .split(',')
    .map((u) => u.trim().replace(/\/$/, ''))
    .filter(Boolean);

  urls.push(`http://localhost:${env.PORT}`, `http://127.0.0.1:${env.PORT}`);

  if (env.NODE_ENV === 'development') {
    urls.push('http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173');
  }

  return [...new Set(urls)];
}
