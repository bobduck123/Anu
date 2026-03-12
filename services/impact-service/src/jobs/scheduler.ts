import cron from 'node-cron';
import logger from '../utils/logger';
import { runDailyReconciliation } from './dailyReconciliation';
import { runWeeklyDigest } from './weeklyDigest';

/**
 * Initialize all scheduled jobs
 * Call this once at server startup
 */
export const initializeJobs = (): void => {
  logger.info('Initializing scheduled jobs');

  // Daily reconciliation at 02:00 UTC
  const dailyTask = cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Running daily reconciliation job');
      await runDailyReconciliation();
      logger.info('Daily reconciliation completed');
    } catch (err) {
      logger.error({ error: err }, 'Daily reconciliation failed');
    }
  });

  // Weekly digest at 08:00 UTC on Mondays
  const weeklyTask = cron.schedule('0 8 * * 1', async () => {
    try {
      logger.info('Running weekly digest job');
      await runWeeklyDigest();
      logger.info('Weekly digest completed');
    } catch (err) {
      logger.error({ error: err }, 'Weekly digest failed');
    }
  });

  logger.info('✓ Scheduled jobs initialized');

  // Return tasks for graceful shutdown if needed
  return;
};

export default initializeJobs;
