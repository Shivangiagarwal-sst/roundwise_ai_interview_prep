/**
 * Zod validation middleware factory.
 * Validates req.body, req.query, req.params with a Zod schema.
 */

import { createError } from './error.js';

/**
 * @param {{ body?: z.ZodSchema, query?: z.ZodSchema, params?: z.ZodSchema }} schemas
 */
export function validate(schemas) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        errors.push(
          ...result.error.errors.map((e) => ({
            field: `${source}.${e.path.join('.')}`,
            message: e.message,
          }))
        );
      } else {
        req[source] = result.data; // replace with coerced/defaulted values
      }
    }

    if (errors.length > 0) {
      return next(
        createError(400, 'Validation failed', 'VALIDATION_ERROR', errors)
      );
    }

    next();
  };
}
