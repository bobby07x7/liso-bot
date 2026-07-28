const cron = require('node-cron');
const { runWorldTick } = require('./worldTick');

// Default: every 10 minutes. Change the cron expression to tune tick speed.
// Examples: '*/5 * * * *' = every 5 min, '0 * * * *' = every hour.
const TICK_SCHEDULE = process.env.WORLD_TICK_CRON || '*/10 * * * *';

function startWorldEngine(bot) {
  cron.schedule(TICK_SCHEDULE, async () => {
    try {
      await runWorldTick(bot);
      console.log(`[world-tick] completed at ${new Date().toISOString()}`);
    } catch (err) {
      console.error('[world-tick] failed:', err);
    }
  });
  console.log(`World tick engine scheduled: ${TICK_SCHEDULE}`);
}

module.exports = { startWorldEngine };
