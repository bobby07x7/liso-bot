const { query } = require('../db');

// Attaches ctx.player (creates a new player row on first contact)
async function ensurePlayer(ctx, next) {
  if (!ctx.from) return next();
  const telegramId = ctx.from.id;

  let res = await query('SELECT * FROM players WHERE telegram_id = $1', [telegramId]);

  if (res.rows.length === 0) {
    const traits = rollStartingTraits();
    res = await query(
      `INSERT INTO players (telegram_id, username, name, traits)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [telegramId, ctx.from.username || null, ctx.from.first_name || 'Survivor', JSON.stringify(traits)]
    );
  }

  const player = res.rows[0];
  if (player.banned) {
    return ctx.reply('🚫 You are banned from LISO.');
  }

  ctx.player = player;
  return next();
}

function rollStartingTraits() {
  const pool = [
    'Strong Arms', 'Fast Learner', 'Lucky', 'Cold Resistant',
    'Heat Resistant', 'Animal Whisperer', 'Night Vision'
  ];
  const shuffled = pool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
}

function ownerOnly(ctx, next) {
  const ownerId = Number(process.env.OWNER_ID);
  if (ctx.from && ctx.from.id === ownerId) return next();
  return ctx.reply('⛔ Owner-only command.');
}

module.exports = { ensurePlayer, ownerOnly };
