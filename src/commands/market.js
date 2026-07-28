const { query } = require('../db');
const { marketCategoryRow, itemBuyButton } = require('../utils/keyboards');
const { sendImageMessage } = require('../utils/images');
const { logAction } = require('../middlewares/logger');

async function showMarket(ctx) {
  const caption = '🏪 Market\n\nPick a category to browse items.';
  await sendImageMessage(ctx, 'market_banner', caption, marketCategoryRow());
}

async function showCategory(ctx, category) {
  const res = await query('SELECT * FROM items WHERE category = $1 ORDER BY price ASC', [category]);
  if (res.rows.length === 0) return ctx.reply('No items in this category yet.');

  for (const item of res.rows) {
    await ctx.reply(`${item.emoji} ${item.name} — 💰 ${item.price}`, itemBuyButton(item.key));
  }
}

async function buyItem(ctx, bot, itemKey) {
  const itemRes = await query('SELECT * FROM items WHERE key = $1', [itemKey]);
  if (itemRes.rows.length === 0) return ctx.answerCbQuery('Item not found.');
  const item = itemRes.rows[0];
  const p = ctx.player;

  if (p.gold < item.price) {
    await ctx.answerCbQuery('Not enough gold!');
    return ctx.reply(`❌ You need ${item.price} gold but only have ${p.gold}.`);
  }

  await query('UPDATE players SET gold = gold - $1 WHERE id = $2', [item.price, p.id]);
  await query(
    `INSERT INTO inventory (player_id, item_key, qty) VALUES ($1, $2, 1)
     ON CONFLICT (player_id, item_key) DO UPDATE SET qty = inventory.qty + 1`,
    [p.id, itemKey]
  );

  await logAction(bot, ctx.from.id, 'purchase', { item: itemKey, price: item.price });
  await ctx.answerCbQuery('Purchased!');
  await ctx.reply(`✅ Bought ${item.emoji} ${item.name} for ${item.price} gold.`);
}

function registerMarket(bot) {
  bot.command('market', showMarket);
  bot.action('menu:market', async (ctx) => {
    await ctx.answerCbQuery();
    await showMarket(ctx);
  });
  bot.action(/^market:cat:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showCategory(ctx, ctx.match[1]);
  });
  bot.action(/^market:buy:(.+)$/, (ctx) => buyItem(ctx, bot, ctx.match[1]));
}

module.exports = { registerMarket };
