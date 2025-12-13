/**
 * SCHEDULER.JS - NOT USED IN PRODUCTION
 *
 * This file is kept for local development testing only.
 *
 * IMPORTANT: On Vercel (serverless), node-cron does NOT work because:
 * - Serverless functions only run when invoked
 * - No long-running processes are maintained
 * - Cron jobs require persistent processes
 *
 * PRODUCTION SCHEDULING:
 * - Use external cron service (cron-job.org, UptimeRobot, etc.)
 * - Or use Vercel Cron (requires Pro plan)
 * - Or use GitHub Actions (can be disabled after 60 days inactivity)
 *
 * See RECURRING_TRANSACTIONS_SETUP.md for setup instructions.
 */

const cron = require('node-cron');
const axios = require('axios');

// For local development only - process recurring transactions daily
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[DEV] Processing recurring transactions');
    const baseUrl = 'http://localhost:5000';
    const response = await axios.post(`${baseUrl}/api/automation/process-recurring`);
    const { processed, errors } = response.data;
    console.log(`[DEV] Processed ${processed} recurring transactions with ${errors} errors`);
  } catch (error) {
    console.error('[DEV] Error processing recurring transactions:', error.message);
  }
});

// Export a function that logs a warning when called
module.exports = {
  startScheduler: () => {
    if (process.env.NODE_ENV === 'production') {
      console.warn('WARNING: scheduler.js does not work on Vercel serverless. Use external cron service instead.');
      console.warn('See RECURRING_TRANSACTIONS_SETUP.md for setup instructions.');
    } else {
      console.log('[DEV] Local scheduler started - recurring transactions will process daily at midnight');
    }
  }
};