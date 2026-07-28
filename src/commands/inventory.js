const { query } = require('../db');
const { backRow } = require('../utils/keyboards');
const { Markup } = require('telegraf');

async function showInventory(ctx) {
  const res = await query(
    `SELECT i.item_key, i.qty, it.name, it.emoji
     FROM inventory i JOIN items it ON it.key = i.item_key
     WHERE i.player_id = $1 ORDER BY i.qty DESC`,
    [ctx.player.id]
  );

  if (res.rows.length === 0) {
    return ctx.reply('🎒 Your inventory is empty. Go explore and gather resources!', Markup.inlineKeyboard([backRow()]));
  }

  const lines = res.rows.map((r) => `${r.emoji} ${r.name} x${r.qty}`).join('\n');
  await ctx.reply(`🎒 Inventory\n\n${lines}`, Markup.inlineKeyboard([backRow()]));
}

function registerInventory(bot) {
  bot.command('inventory', showInventory);
  bot.action('menu:inventory', async (ctx) => {
    await ctx.answerCbQuery();
    await showInventory(ctx);
  });
}

module.exports = { registerInventory };
