/**
 * Server environment configuration.
 * Validated with Zod at startup — the app refuses to start if required vars are missing.
 * All configuration comes from here; never read process.env directly elsewhere.
 */

import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-load .env file if present
if (typeof process.loadEnvFile === 'function') {
  const candidateEnvFiles = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), 'server/.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const envPath of candidateEnvFiles) {
    if (fs.existsSync(envPath)) {
      try {
        process.loadEnvFile(envPath);
        break;
      } catch {
        // continue
      }
    }
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default(
    process.env.NODE_ENV === 'test' ? 'mongodb://localhost:27017/roundwise_test' : undefined
  ),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default(
    process.env.NODE_ENV === 'test' ? 'test-jwt-secret-minimum-32-chars-long-for-security' : undefined
  ),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  GEMINI_API_KEY: z
    .string()
    .transform((val) => val.trim().replace(/^["']|["']$/g, '').trim())
    .optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  DEMO_EMAIL: z.string().email().optional(),
  DEMO_PASSWORD: z.string().min(8).optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    console.error('\n╔════════════════════════════════════════════════╗');
    console.error('║  Roundwise: Invalid environment configuration  ║');
    console.error('╚════════════════════════════════════════════════╝');
    console.error('\nMissing or invalid environment variables:\n');
    console.error(errors);
    console.error('\nCopy server/.env.example → server/.env and fill in your values.');
    console.error('See README.md → "Environment Variables" for details.\n');
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
