const { query } = require('../db');
const { explorePad } = require('../utils/keyboards');
const { sendImageMessage } = require('../utils/images');
const { logAction } = require('../middlewares/logger');

const TERRAINS = ['plains', 'forest', 'mountain', 'river', 'ruins'];

async function showLocation(ctx) {
  const p = ctx.player;
  const caption = `📍 Location (${p.pos_x}, ${p.pos_y})\n\nUse the arrows to move, or tap 📍 to search here.`;
  await sendImageMessage(ctx, 'explore_banner', caption, explorePad());
}

async function move(ctx, dx, dy) {
  const p = ctx.player;
  const newX = p.pos_x + dx;
  const newY = p.pos_y + dy;
  await query('UPDATE players SET pos_x = $1, pos_y = $2 WHERE id = $3', [newX, newY, p.id]);
  ctx.player.pos_x = newX;
  ctx.player.pos_y = newY;
  await ctx.answerCbQuery(`Moved to (${newX}, ${newY})`);
  await showLocation(ctx);
}

async function exploreHere(ctx, bot) {
  const p = ctx.player;
  const existing = await query('SELECT * FROM world_tiles WHERE x = $1 AND y = $2', [p.pos_x, p.pos_y]);

  if (existing.rows.length > 0) {
    await ctx.answerCbQuery();
    return ctx.reply(`This tile is already known: ${existing.rows[0].terrain}${existing.rows[0].discovered_name ? ` — named "${existing.rows[0].discovered_name}"` : ''}`);
  }

  const terrain = TERRAINS[Math.floor(Math.random() * TERRAINS.length)];
  const discoveredName = `${ctx.from.first_name}'s ${terrain}`;
  await query(
    'INSERT INTO world_tiles (x, y, terrain, discovered_by, discovered_name) VALUES ($1, $2, $3, $4, $5)',
    [p.pos_x, p.pos_y, terrain, p.id, discoveredName]
  );
  await query('UPDATE players SET xp = xp + 10 WHERE id = $1', [p.id]);

  await logAction(bot, ctx.from.id, 'discover_tile', { x: p.pos_x, y: p.pos_y, terrain });
  await ctx.answerCbQuery('New discovery! +10 XP');
  await ctx.reply(`🗺️ You discovered a new ${terrain}!\nIt has been named: "${discoveredName}"\n+10 XP`);
}

function registerExplore(bot) {
  bot.command('explore', showLocation);
  bot.action('menu:explore', async (ctx) => {
    await ctx.answerCbQuery();
    await showLocation(ctx);
  });
  bot.action('move:up', (ctx) => move(ctx, 0, -1));
  bot.action('move:down', (ctx) => move(ctx, 0, 1));
  bot.action('move:left', (ctx) => move(ctx, -1, 0));
  bot.action('move:right', (ctx) => move(ctx, 1, 0));
  bot.action('explore:here', (ctx) => exploreHere(ctx, bot));
}

module.exports = { registerExplore };
