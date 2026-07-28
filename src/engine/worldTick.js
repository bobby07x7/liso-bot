const { query } = require('../db');
const { computeNextPrice } = require('../utils/pricing');
const { logAction } = require('../middlewares/logger');

let tickCounter = 0;

async function regenerateTiles() {
  // Depleted tiles slowly regrow resources, capped at 100
  await query(
    `UPDATE world_tiles SET resource_amount = LEAST(resource_amount + 5, 100)
     WHERE resource_amount < 100`
  );
}

async function updateMarketPrices() {
  const states = await query('SELECT * FROM market_state');
  const events = [];

  for (const s of states.rows) {
    const nextPrice = computeNextPrice(s.base_price, s.current_price, s.supply, s.demand_pressure);
    const decayedPressure = Number(s.demand_pressure) * 0.5; // pressure decays each tick
    // Supply drifts back toward 1000 slowly (market restocking)
    const nextSupply = Math.round(s.supply + (1000 - s.supply) * 0.1);

    await query(
      `UPDATE market_state SET current_price = $1, demand_pressure = $2, supply = $3, updated_at = NOW()
       WHERE item_key = $4`,
      [nextPrice, decayedPressure, nextSupply, s.item_key]
    );

    if (Math.abs(nextPrice - s.current_price) / Math.max(s.current_price, 1) > 0.15) {
      events.push({ item: s.item_key, from: s.current_price, to: nextPrice });
    }
  }
  return events;
}

async function updateVillages() {
  const villages = await query('SELECT * FROM npc_villages');
  const events = [];

  for (const v of villages.rows) {
    // Population consumes food; food naturally trickles in from farming NPCs
    const foodConsumed = Math.round(v.population * 0.8);
    const foodProduced = Math.round(v.population * 0.6) + 10;
    let nextFood = v.food - foodConsumed + foodProduced;

    let nextPopulation = v.population;
    let status = 'stable';

    if (nextFood <= 0) {
      nextFood = 0;
      nextPopulation = Math.max(0, v.population - Math.round(v.population * 0.15));
      status = 'starving';
      events.push({ village: v.name, event: 'famine', populationLost: v.population - nextPopulation });
    } else if (nextFood > 400) {
      nextPopulation = v.population + Math.round(v.population * 0.05);
      status = 'thriving';
    }

    // Village collapses if population hits zero
    if (nextPopulation <= 0) {
      status = 'collapsed';
      events.push({ village: v.name, event: 'collapsed' });
    }

    await query(
      `UPDATE npc_villages SET population = $1, food = $2, status = $3, last_tick_at = NOW()
       WHERE id = $4`,
      [nextPopulation, nextFood, status, v.id]
    );
  }
  return events;
}

async function runWorldTick(bot) {
  tickCounter += 1;
  const marketEvents = await updateMarketPrices();
  const villageEvents = await updateVillages();
  await regenerateTiles();

  const summary = { tick: tickCounter, marketEvents, villageEvents };
  await query('INSERT INTO world_tick_log (tick_number, summary) VALUES ($1, $2)', [tickCounter, JSON.stringify(summary)]);

  if (villageEvents.length > 0) {
    for (const ev of villageEvents) {
      if (ev.event === 'famine') {
        await broadcastNews(bot, `🌾 Famine hit ${ev.village} — ${ev.populationLost} villagers lost.`);
      } else if (ev.event === 'collapsed') {
        await broadcastNews(bot, `💀 ${ev.village} has collapsed. It stands empty now.`);
      }
    }
  }

  await logAction(bot, 0, 'world_tick', summary);
}

async function broadcastNews(bot, text) {
  const logChannel = process.env.LOG_CHANNEL_ID;
  if (logChannel && bot) {
    bot.telegram.sendMessage(logChannel, `📰 ${text}`).catch(() => {});
  }
}

module.exports = { runWorldTick };
