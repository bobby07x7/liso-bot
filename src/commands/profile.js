const { styleText } = require('../utils/fontStyles');
const { backRow } = require('../utils/keyboards');
const { sendImageMessage } = require('../utils/images');
const { Markup } = require('telegraf');

function bar(percent, size = 10) {
  const filled = Math.round((percent / 100) * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

async function showProfile(ctx) {
  const p = ctx.player;
  const reputation = JSON.parse(p.reputation || '{}');
  const titles = JSON.parse(p.titles || '[]');

  const caption =
    `${styleText(p.name, 'boldSans')}\n` +
    `${styleText(titles[0] || 'No title yet', 'italicSans')}\n\n` +
    `❤️ Health: ${bar(p.health)} ${p.health}%\n` +
    `⚡ Energy: ${bar(p.energy)} ${p.energy}%\n` +
    `💰 Gold: ${p.gold}\n\n` +
    `📊 Reputation: Kind (${reputation.kindness || 0})\n` +
    `🎯 Level ${p.level} • XP ${p.xp}`;

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('🎖️ Titles', 'profile:titles'), Markup.button.callback('📜 History', 'profile:history')],
    backRow()
  ]);

  await sendImageMessage(ctx, 'profile_banner', caption, kb);
}

function registerProfile(bot) {
  bot.command('profile', showProfile);
  bot.action('menu:profile', async (ctx) => {
    await ctx.answerCbQuery();
    await showProfile(ctx);
  });
}

module.exports = { registerProfile };
