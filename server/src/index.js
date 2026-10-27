/**
 * Roundwise server entry point.
 * Validates env → connects DB → starts HTTP server.
 */

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './app.js';

async function main() {
  try {
    // Connect to database
    await connectDatabase();

    // Check if data needs to be imported (non-blocking)
    (async () => {
      try {
        const { Question } = await import('./models/Question.js');
        const count = await Question.estimatedDocumentCount();
        if (count === 0) {
          logger.info('Question collection is empty. Starting background data import...');
          const { runImport } = await import('../scripts/importData.js');
          await runImport({ silent: false });
          logger.info('Background data import complete.');
        }
      } catch (err) {
        logger.warn({ err }, 'Background import check failed — run `npm run import:data` manually.');
      }
    })();

    // Create and start app
    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`Roundwise server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        const { disconnectDatabase } = await import('./config/database.js');
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error({ err }, 'Fatal: Failed to start server');
    process.exit(1);
  }
}

main();
