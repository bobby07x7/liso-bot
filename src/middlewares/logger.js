const { query } = require('../db');

async function logAction(bot, actorId, action, details = {}, errorCode = null) {
  try {
    await query(
      'INSERT INTO audit_log (actor_id, action, details, error_code) VALUES ($1, $2, $3, $4)',
      [actorId, action, JSON.stringify(details), errorCode]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }

  const logChannel = process.env.LOG_CHANNEL_ID;
  if (logChannel && bot) {
    const tag = errorCode ? `⚠️ [${errorCode}]` : '📝';
    bot.telegram
      .sendMessage(logChannel, `${tag} ${action} — actor:${actorId}\n${JSON.stringify(details)}`)
      .catch(() => {});
  }
}

module.exports = { logAction };
