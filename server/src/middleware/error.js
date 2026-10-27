/**
 * Central error middleware.
 * Returns { success: false, code, message, details? }
 * Never leaks stack traces in production.
 */

import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

export function errorMiddleware(err, req, res, _next) {
  // Log the error
  if (err.status >= 500 || !err.status) {
    logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
  } else {
    logger.warn({ err: { message: err.message, code: err.code }, url: req.url }, 'Request error');
  }

  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.expose !== false && status < 500
    ? err.message
    : 'An unexpected error occurred. Please try again.';

  const response = {
    success: false,
    code,
    message,
  };

  if (err.details && status < 500) {
    response.details = err.details;
  }

  // Never expose stack traces in production
  if (!isProd && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

/**
 * 404 handler — must be registered after all routes.
 */
export function notFoundMiddleware(req, res) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Helper to create HTTP errors with a code.
 * @param {number} status
 * @param {string} message
 * @param {string} [code]
 * @param {*} [details]
 */
export function createError(status, message, code, details) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  err.code = code || `HTTP_${status}`;
  if (details) err.details = details;
  return err;
}
