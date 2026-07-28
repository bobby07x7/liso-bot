const { styleText } = require('../utils/fontStyles');
const { mainMenu } = require('../utils/keyboards');
const { sendImageMessage } = require('../utils/images');

function registerStart(bot) {
  bot.start(async (ctx) => {
    const p = ctx.player;
    const caption =
      `${styleText('LISO — Lost Island Survival', 'boldSans')}\n\n` +
      `${styleText('A living world that never stops', 'italicSans')}\n\n` +
      `👤 ${p.name}\n💰 Gold: ${p.gold}\n🧬 Traits: ${JSON.parse(p.traits || '[]').join(', ')}\n\n` +
      `Choose an option below 👇`;

    await sendImageMessage(ctx, 'welcome_banner', caption);
    await ctx.reply('Menu:', mainMenu());
  });

  bot.action('menu:main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Main menu', mainMenu()).catch(() => ctx.reply('Main menu', mainMenu()));
  });
}

module.exports = { registerStart };
