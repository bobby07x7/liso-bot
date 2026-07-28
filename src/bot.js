require('dotenv').config();
const { Telegraf } = require('telegraf');
const { ensurePlayer } = require('./middlewares/auth');

const { registerStart } = require('./commands/start');
const { registerProfile } = require('./commands/profile');
const { registerInventory } = require('./commands/inventory');
const { registerExplore } = require('./commands/explore');
const { registerMarket } = require('./commands/market');
const { registerAdmin } = require('./commands/admin');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Attach ctx.player to every update before any command runs
bot.use(ensurePlayer);

registerStart(bot);
registerProfile(bot);
registerInventory(bot);
registerExplore(bot);
registerMarket(bot);
registerAdmin(bot);

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

bot.launch().then(() => console.log('LISO bot is running.'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
