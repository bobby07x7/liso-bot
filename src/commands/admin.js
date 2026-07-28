const { query } = require('../db');
const { ownerOnly } = require('../middlewares/auth');
const { logAction } = require('../middlewares/logger');

function registerAdmin(bot) {
  bot.command('admin', ownerOnly, async (ctx) => {
    await ctx.reply(
      '👑 Admin panel\n\n' +
      '/broadcast <text> — message all players\n' +
      '/eco give <telegram_id> <amount>\n' +
      '/eco take <telegram_id> <amount>\n' +
      '/ban <telegram_id>\n' +
      '/unban <telegram_id>\n' +
      '/serverstats'
    );
  });

  bot.command('broadcast', ownerOnly, async (ctx) => {
    const text = ctx.message.text.replace('/broadcast', '').trim();
    if (!text) return ctx.reply('Usage: /broadcast <message>');

    const players = await query('SELECT telegram_id FROM players WHERE banned = FALSE');
    let sent = 0;
    for (const row of players.rows) {
      try {
        await bot.telegram.sendMessage(row.telegram_id, `📢 ${text}`);
        sent++;
      } catch (err) {
        // player may have blocked the bot - skip
      }
    }
    await logAction(bot, ctx.from.id, 'broadcast', { text, sent });
    await ctx.reply(`Broadcast sent to ${sent} players.`);
  });

  bot.command('eco', ownerOnly, async (ctx) => {
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const [, action, targetId, amountStr] = parts;
    const amount = Number(amountStr);

    if (!['give', 'take'].includes(action) || !targetId || !amount) {
      return ctx.reply('Usage: /eco give|take <telegram_id> <amount>');
    }

    const delta = action === 'give' ? amount : -amount;
    const res = await query(
      'UPDATE players SET gold = GREATEST(gold + $1, 0) WHERE telegram_id = $2 RETURNING gold',
      [delta, targetId]
    );

    if (res.rows.length === 0) return ctx.reply('Player not found.');
    await logAction(bot, ctx.from.id, 'eco_adjust', { targetId, action, amount });
    await ctx.reply(`Done. Player's new balance: ${res.rows[0].gold} gold.`);
  });

  bot.command('ban', ownerOnly, async (ctx) => {
    const targetId = ctx.message.text.split(' ')[1];
    if (!targetId) return ctx.reply('Usage: /ban <telegram_id>');
    await query('UPDATE players SET banned = TRUE WHERE telegram_id = $1', [targetId]);
    await logAction(bot, ctx.from.id, 'ban_player', { targetId }, 'MOD_ACTION');
    await ctx.reply(`Player ${targetId} banned.`);
  });

  bot.command('unban', ownerOnly, async (ctx) => {
    const targetId = ctx.message.text.split(' ')[1];
    if (!targetId) return ctx.reply('Usage: /unban <telegram_id>');
    await query('UPDATE players SET banned = FALSE WHERE telegram_id = $1', [targetId]);
    await logAction(bot, ctx.from.id, 'unban_player', { targetId });
    await ctx.reply(`Player ${targetId} unbanned.`);
  });

  bot.command('serverstats', ownerOnly, async (ctx) => {
    const totalRes = await query('SELECT COUNT(*) FROM players');
    const goldRes = await query('SELECT SUM(gold) FROM players');
    const tilesRes = await query('SELECT COUNT(*) FROM world_tiles');
    await ctx.reply(
      `📊 Server stats\n\n` +
      `Players: ${totalRes.rows[0].count}\n` +
      `Total gold in economy: ${goldRes.rows[0].sum || 0}\n` +
      `Tiles discovered: ${tilesRes.rows[0].count}`
    );
  });
}

module.exports = { registerAdmin };
