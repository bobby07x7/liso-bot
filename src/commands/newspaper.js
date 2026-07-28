const { query } = require('../db');
const { styleText } = require('../utils/fontStyles');
const { backRow } = require('../utils/keyboards');
const { Markup } = require('telegraf');

async function showNewspaper(ctx) {
  const res = await query('SELECT * FROM world_tick_log ORDER BY id DESC LIMIT 3');
  if (res.rows.length === 0) {
    return ctx.reply('📰 No news yet. The world is just waking up.', Markup.inlineKeyboard([backRow()]));
  }

  let text = `${styleText('LISO Daily', 'boldSans')}\n\n`;

  for (const log of res.rows) {
    const summary = log.summary;
    text += `🗓️ Tick #${log.tick_number}\n`;

    if (summary.marketEvents && summary.marketEvents.length > 0) {
      for (const e of summary.marketEvents) {
        const arrow = e.to > e.from ? '📈' : '📉';
        text += `  ${arrow} ${e.item}: ${e.from} → ${e.to} gold\n`;
      }
    }
    if (summary.villageEvents && summary.villageEvents.length > 0) {
      for (const e of summary.villageEvents) {
        if (e.event === 'famine') text += `  🌾 Famine in ${e.village}\n`;
        if (e.event === 'collapsed') text += `  💀 ${e.village} collapsed\n`;
      }
    }
    if ((!summary.marketEvents || summary.marketEvents.length === 0) && (!summary.villageEvents || summary.villageEvents.length === 0)) {
      text += `  Quiet day. Nothing major happened.\n`;
    }
    text += '\n';
  }

  await ctx.reply(text, Markup.inlineKeyboard([backRow()]));
}

function registerNewspaper(bot) {
  bot.command('newspaper', showNewspaper);
  bot.action('menu:newspaper', async (ctx) => {
    await ctx.answerCbQuery();
    await showNewspaper(ctx);
  });
}

module.exports = { registerNewspaper };
