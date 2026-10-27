import pino from 'pino';
import { isDev } from './env.js';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, ignore: 'pid,hostname' },
      }
    : undefined,
});
