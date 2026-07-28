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
- `/inventory` — resource/item list
- `/explore` — grid movement (⬆️⬇️⬅️➡️) + discovery naming system
- `/market` — category browsing + buy flow, gold deduction, inventory credit
- `/admin` (owner-only) — broadcast, eco give/take, ban/unban, serverstats
- Audit logging — every meaningful action writes to `audit_log` and
  optionally mirrors to a Telegram log channel

## Next phases (not yet built here)

- Clans, politics, research tree
- NPC villages with population/food/army simulation
- World tick cron job (resource regen, weather, market price shifts)
- Combat, bosses, legendary items
- Ships/ocean, companions, disease system
- Secret societies, hidden mysteries, world events

Each of these slots into the same `commands/` + `utils/keyboards.js` +
`db/schema.sql` pattern already established.
