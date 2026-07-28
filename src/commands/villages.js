const { query } = require('../db');
const { Markup } = require('telegraf');
const { backRow } = require('../utils/keyboards');
const { logAction } = require('../middlewares/logger');

const STATUS_EMOJI = { stable: '🟡', thriving: '🟢', starving: '🔴', collapsed: '⚫' };

async function showVillageList(ctx) {
  const res = await query('SELECT * FROM npc_villages ORDER BY population DESC');
  if (res.rows.length === 0) return ctx.reply('No villages discovered yet.');

  const buttons = res.rows.map((v) => [
    Markup.button.callback(`${STATUS_EMOJI[v.status] || '⚪'} ${v.name} (pop ${v.population})`, `village:view:${v.id}`)
  ]);
  buttons.push(backRow());

  await ctx.reply('🏘️ Nearby villages', Markup.inlineKeyboard(buttons));
}

async function showVillage(ctx, villageId) {
  const res = await query('SELECT * FROM npc_villages WHERE id = $1', [villageId]);
  if (res.rows.length === 0) return ctx.answerCbQuery('Village not found.');
  const v = res.rows[0];

  const text =
    `${STATUS_EMOJI[v.status] || '⚪'} ${v.name}\n\n` +
    `📍 Location: (${v.x}, ${v.y})\n` +
    `👥 Population: ${v.population}\n` +
    `🌾 Food: ${v.food}\n` +
    `⚔️ Army: ${v.army}\n` +
    `💰 Gold: ${v.gold}\n` +
    `📊 Status: ${v.status}`;

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('🎁 Donate food', `village:donate:${v.id}`), Markup.button.callback('⚔️ Raid', `village:raid:${v.id}`)],
    backRow('village:list')
  ]);

  await ctx.answerCbQuery();
  await ctx.reply(text, kb);
}

async function donateFood(ctx, bot, villageId) {
  const DONATE_AMOUNT = 20;
  const invRes = await query(
    `SELECT * FROM inventory WHERE player_id = $1 AND item_key = 'wood' AND qty >= 5`,
    [ctx.player.id]
  );
  // Simple version: donating costs 5 wood from inventory, boosts village food
  if (invRes.rows.length === 0) {
    await ctx.answerCbQuery('You need 5 wood to donate.');
    return ctx.reply('❌ You need at least 5 wood in your inventory to donate.');
  }

  await query(`UPDATE inventory SET qty = qty - 5 WHERE player_id = $1 AND item_key = 'wood'`, [ctx.player.id]);
  await query('UPDATE npc_villages SET food = food + $1 WHERE id = $2', [DONATE_AMOUNT, villageId]);
  await query(
    `UPDATE players SET reputation = jsonb_set(reputation, '{kindness}', ((reputation->>'kindness')::int + 5)::text::jsonb)
     WHERE id = $1`,
    [ctx.player.id]
  );

  await logAction(bot, ctx.from.id, 'donate_village', { villageId, amount: DONATE_AMOUNT });
  await ctx.answerCbQuery('Donated!');
  await ctx.reply(`🎁 Donated 5 wood → village food +${DONATE_AMOUNT}. Reputation +5 kindness.`);
}

async function raidVillage(ctx, bot, villageId) {
  const vRes = await query('SELECT * FROM npc_villages WHERE id = $1', [villageId]);
  const v = vRes.rows[0];
  if (!v || v.population <= 0) return ctx.answerCbQuery('Nothing left to raid.');

  const playerPower = 10; // placeholder until combat/gear system exists
  const success = playerPower > v.army * 0.5;

  if (success) {
    const loot = Math.min(v.gold, Math.round(50 + Math.random() * 100));
    await query('UPDATE npc_villages SET gold = gold - $1, population = GREATEST(population - 5, 0) WHERE id = $2', [loot, villageId]);
    await query('UPDATE players SET gold = gold + $1 WHERE id = $2', [loot, ctx.player.id]);
    await query(
      `UPDATE players SET reputation = jsonb_set(reputation, '{bandit}', ((reputation->>'bandit')::int + 10)::text::jsonb)
       WHERE id = $1`,
      [ctx.player.id]
    );
    await logAction(bot, ctx.from.id, 'raid_village', { villageId, loot, result: 'success' });
    await ctx.answerCbQuery('Raid successful!');
    await ctx.reply(`⚔️ Raid successful! You looted ${loot} gold. Reputation +10 bandit.`);
  } else {
    await query('UPDATE players SET health = GREATEST(health - 15, 1) WHERE id = $1', [ctx.player.id]);
    await logAction(bot, ctx.from.id, 'raid_village', { villageId, result: 'failed' });
    await ctx.answerCbQuery('Raid failed.');
    await ctx.reply(`🛡️ The village guards fought you off. Health -15.`);
  }
}

function registerVillages(bot) {
  bot.command('villages', showVillageList);
  bot.action('village:list', async (ctx) => {
    await ctx.answerCbQuery();
    await showVillageList(ctx);
  });
  bot.action(/^village:view:(\d+)$/, (ctx) => showVillage(ctx, ctx.match[1]));
  bot.action(/^village:donate:(\d+)$/, (ctx) => donateFood(ctx, bot, ctx.match[1]));
  bot.action(/^village:raid:(\d+)$/, (ctx) => raidVillage(ctx, bot, ctx.match[1]));
}

module.exports = { registerVillages };
