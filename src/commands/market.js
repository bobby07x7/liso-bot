const { query } = require('../db');
const { marketCategoryRow, itemBuyButton } = require('../utils/keyboards');
const { sendImageMessage } = require('../utils/images');
const { logAction } = require('../middlewares/logger');

async function showMarket(ctx) {
  const caption = '🏪 Market\n\nPrices shift with supply and demand — buy heavy and watch it climb.';
  await sendImageMessage(ctx, 'market_banner', caption, marketCategoryRow());
}

async function showCategory(ctx, category) {
  const res = await query(
    `SELECT i.key, i.name, i.emoji, ms.current_price, ms.base_price
     FROM items i JOIN market_state ms ON ms.item_key = i.key
     WHERE i.category = $1 ORDER BY ms.current_price ASC`,
    [category]
  );
  if (res.rows.length === 0) return ctx.reply('No items in this category yet.');

  for (const item of res.rows) {
    const trend = item.current_price > item.base_price ? '📈' : item.current_price < item.base_price ? '📉' : '➖';
    await ctx.reply(
      `${item.emoji} ${item.name} — 💰 ${item.current_price} ${trend}`,
      itemBuyButton(item.key)
    );
  }
}

async function buyItem(ctx, bot, itemKey) {
  const res = await query(
    `SELECT i.*, ms.current_price, ms.supply, ms.demand_pressure
     FROM items i JOIN market_state ms ON ms.item_key = i.key WHERE i.key = $1`,
    [itemKey]
  );
  if (res.rows.length === 0) return ctx.answerCbQuery('Item not found.');
  const item = res.rows[0];
  const p = ctx.player;

  if (p.gold < item.current_price) {
    await ctx.answerCbQuery('Not enough gold!');
    return ctx.reply(`❌ You need ${item.current_price} gold but only have ${p.gold}.`);
  }

  await query('UPDATE players SET gold = gold - $1 WHERE id = $2', [item.current_price, p.id]);
  await query(
    `INSERT INTO inventory (player_id, item_key, qty) VALUES ($1, $2, 1)
     ON CONFLICT (player_id, item_key) DO UPDATE SET qty = inventory.qty + 1`,
    [p.id, itemKey]
  );

  await query(
    `UPDATE market_state SET supply = GREATEST(supply - 3, 10), demand_pressure = demand_pressure + 4
     WHERE item_key = $1`,
    [itemKey]
  );
  await query(
    `INSERT INTO market_transactions (item_key, player_id, type, qty, price_each) VALUES ($1, $2, 'buy', 1, $3)`,
    [itemKey, p.id, item.current_price]
  );

  await logAction(bot, ctx.from.id, 'purchase', { item: itemKey, price: item.current_price });
  await ctx.answerCbQuery('Purchased!');
  await ctx.reply(`✅ Bought ${item.emoji} ${item.name} for ${item.current_price} gold.`);
}

async function sellItem(ctx, bot, itemKey) {
  const invRes = await query('SELECT * FROM inventory WHERE player_id = $1 AND item_key = $2', [ctx.player.id, itemKey]);
  if (invRes.rows.length === 0 || invRes.rows[0].qty < 1) {
    await ctx.answerCbQuery("You don't have this item.");
    return;
  }

  const stateRes = await query('SELECT * FROM market_state WHERE item_key = $1', [itemKey]);
  const state = stateRes.rows[0];
  const sellPrice = Math.round(state.current_price * 0.7);

  await query('UPDATE players SET gold = gold + $1 WHERE id = $2', [sellPrice, ctx.player.id]);
  await query('UPDATE inventory SET qty = qty - 1 WHERE player_id = $1 AND item_key = $2', [ctx.player.id, itemKey]);
  await query('DELETE FROM inventory WHERE player_id = $1 AND item_key = $2 AND qty <= 0', [ctx.player.id, itemKey]);

  await query(
    `UPDATE market_state SET supply = supply + 3, demand_pressure = demand_pressure - 2 WHERE item_key = $1`,
    [itemKey]
  );
  await query(
    `INSERT INTO market_transactions (item_key, player_id, type, qty, price_each) VALUES ($1, $2, 'sell', 1, $3)`,
    [itemKey, ctx.player.id, sellPrice]
  );

  await logAction(bot, ctx.from.id, 'sell', { item: itemKey, price: sellPrice });
  await ctx.answerCbQuery('Sold!');
  await ctx.reply(`💰 Sold for ${sellPrice} gold.`);
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
  bot.action(/^market:sell:(.+)$/, (ctx) => sellItem(ctx, bot, ctx.match[1]));
}

module.exports = { registerMarket };
