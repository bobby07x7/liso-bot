# LISO Bot — Phase 1 MVP

Telegram bot foundation for "Lost Island Survival Online" (LISO), built with
Telegraf + PostgreSQL (Neon) + Redis, deployable on Railway.

This is **Phase 1** of the full roadmap discussed — player profile, DNA
traits, inventory, grid exploration with discovery naming, a basic market,
and an owner admin panel with audit logging. Later phases (clans, research,
combat, world events, NPC villages, ships, etc.) build on this same
structure.

## Setup

```bash
cd liso-bot
npm install
cp .env.example .env
# fill in BOT_TOKEN, DATABASE_URL, REDIS_URL, OWNER_ID, LOG_CHANNEL_ID
npm run migrate   # creates tables + seeds starter items
npm start
```

## Folder structure

```
src/
  bot.js              # entry point, wires everything together
  db/
    schema.sql         # Postgres schema (players, inventory, items, world_tiles, audit_log)
    index.js           # pg pool + query helper
    migrate.js          # run schema.sql against DATABASE_URL
  middlewares/
    auth.js             # ensurePlayer (auto-registers + DNA trait roll), ownerOnly guard
    logger.js           # audit_log writer + optional log-channel mirror
  commands/
    start.js, profile.js, inventory.js, explore.js, market.js, admin.js
  utils/
    fontStyles.js        # Unicode styled text (boldSans, smallCaps, etc.)
    keyboards.js          # inline keyboard builders (main menu, explore pad, market)
    images.js             # image/banner sending + swapping helper
  assets/                 # put your banner/item images here (see below)
```

## Using images

`src/utils/images.js` has an `IMAGES` map of logical keys (`welcome_banner`,
`profile_banner`, `market_banner`, `explore_banner`) pointing at files in
`src/assets/`. Drop your actual PNG/JPG art there with matching filenames:

```
src/assets/welcome_banner.png
src/assets/profile_banner.png
src/assets/market_banner.png
src/assets/explore_banner.png
```

If a file is missing, the bot automatically falls back to a plain text
message instead of crashing — so you can wire up commands before the art is
ready and drop images in later.

For per-item images (shop catalog, forge items), add an `image_url` column
value in the `items` table and extend `market.js`'s `showCategory` to call
`ctx.replyWithPhoto` per item instead of plain text — same pattern as
`sendImageMessage`.

For frequently-sent images, after the first send Telegram gives back a
`file_id` in the response — cache that in Redis or a DB column and reuse it
instead of re-uploading the file every time. This is much faster at scale.

## What's implemented (Phase 1)

- `/start` — registration, DNA trait roll (2 random traits), welcome banner
- `/profile` — stats card with health/energy bars, gold, reputation, titles
- `/inventory` — resource/item list, with sell buttons (Phase 2)
- `/explore` — grid movement (⬆️⬇️⬅️➡️) + discovery naming system
- `/market` — category browsing + buy/sell flow
- `/admin` (owner-only) — broadcast, eco give/take, ban/unban, serverstats
- Audit logging — every meaningful action writes to `audit_log` and
  optionally mirrors to a Telegram log channel

## What's implemented (Phase 2 — the living world)

- **World tick engine** (`src/engine/worldTick.js` + `scheduler.js`) — runs on
  a cron schedule (default every 10 min, tune via `WORLD_TICK_CRON` in
  `.env`, e.g. `*/5 * * * *`). Each tick:
  - Recalculates every item's market price from supply/demand
  - Regenerates depleted world tile resources
  - Simulates NPC villages: food consumption/production, population growth,
    famine, and collapse
  - Logs a summary to `world_tick_log` and pushes notable events (famine,
    village collapse, big price swings) to the log channel
- **Dynamic market** (`src/utils/pricing.js`) — `market_state` table tracks
  `base_price`, `current_price`, `supply`, `demand_pressure` per item.
  Buying nudges price up and supply down immediately; selling does the
  opposite. The tick engine eases prices toward a supply/demand target each
  cycle rather than snapping, so charts move smoothly. All buys/sells are
  logged in `market_transactions`.
- **NPC villages** (`src/commands/villages.js`) — `/villages` lists
  discovered villages with a status emoji (🟢 thriving, 🟡 stable, 🔴
  starving, ⚫ collapsed). `/village <id>` shows details plus:
  - **Donate** — spend 5 wood to boost village food, +5 kindness reputation
  - **Raid** — risk/reward attack; success loots gold and adds bandit
    reputation, failure costs health. Currently uses a placeholder power
    value (`10`) until the combat/gear system exists — swap that constant
    for a real stat once Phase 3 combat lands.
- **`/newspaper`** — pulls the last 3 world ticks from `world_tick_log` and
  renders price swings and village events as a readable daily digest.

Tune the tick frequency in `.env`:
```
WORLD_TICK_CRON=*/10 * * * *
```

## Next phases (not yet built here)

- Clans, politics, research tree
- Combat, bosses, legendary items
- Ships/ocean, companions, disease system
- Secret societies, hidden mysteries, world events
- Forge/upgrade crafting system

Each of these slots into the same `commands/` + `utils/keyboards.js` +
`db/schema.sql` pattern already established.
