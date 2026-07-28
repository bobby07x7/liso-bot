-- LISO Bot Phase 1 schema

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  name TEXT,
  gold BIGINT DEFAULT 500,
  health INT DEFAULT 100,
  energy INT DEFAULT 100,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  traits JSONB DEFAULT '[]',
  reputation JSONB DEFAULT '{"kindness":0,"bandit":0,"merchant":0}',
  titles JSONB DEFAULT '[]',
  pos_x INT DEFAULT 0,
  pos_y INT DEFAULT 0,
  banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  qty INT DEFAULT 1,
  UNIQUE(player_id, item_key)
);

CREATE TABLE IF NOT EXISTS items (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '',
  price INT DEFAULT 0,
  category TEXT DEFAULT 'misc',
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS world_tiles (
  x INT NOT NULL,
  y INT NOT NULL,
  terrain TEXT DEFAULT 'plains',
  resource_amount INT DEFAULT 100,
  discovered_by INT REFERENCES players(id),
  discovered_name TEXT,
  PRIMARY KEY (x, y)
);

CREATE TABLE IF NOT EXISTS world_history (
  id SERIAL PRIMARY KEY,
  day_number INT,
  event_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  actor_id BIGINT,
  action TEXT,
  details JSONB,
  error_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO items (key, name, emoji, price, category, image_url) VALUES
  ('wood', 'Wood', '🪵', 5, 'resource', NULL),
  ('stone', 'Stone', '🪨', 8, 'resource', NULL),
  ('iron', 'Iron', '⛓️', 20, 'resource', NULL),
  ('iron_sword', 'Iron Sword', '⚔️', 250, 'weapon', NULL),
  ('diamond', 'Diamond', '💎', 1900, 'resource', NULL)
ON CONFLICT (key) DO NOTHING;

-- ===== Phase 2: dynamic market, NPC villages, world tick =====

CREATE TABLE IF NOT EXISTS market_state (
  item_key TEXT PRIMARY KEY REFERENCES items(key) ON DELETE CASCADE,
  base_price INT NOT NULL,
  current_price INT NOT NULL,
  supply INT DEFAULT 1000,
  demand_pressure NUMERIC DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO market_state (item_key, base_price, current_price)
SELECT key, price, price FROM items
ON CONFLICT (item_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS market_transactions (
  id SERIAL PRIMARY KEY,
  item_key TEXT REFERENCES items(key),
  player_id INT REFERENCES players(id),
  type TEXT CHECK (type IN ('buy', 'sell')),
  qty INT DEFAULT 1,
  price_each INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS npc_villages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  x INT NOT NULL,
  y INT NOT NULL,
  population INT DEFAULT 50,
  food INT DEFAULT 200,
  army INT DEFAULT 10,
  gold INT DEFAULT 500,
  status TEXT DEFAULT 'stable',
  last_tick_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO npc_villages (name, x, y, population, food, army, gold)
SELECT * FROM (VALUES
  ('Rivermeet', 3, 2, 60, 250, 12, 800),
  ('Stonehollow', -4, 5, 45, 180, 8, 500),
  ('Ashford', 1, -6, 70, 300, 15, 1100)
) AS seed(name, x, y, population, food, army, gold)
WHERE NOT EXISTS (SELECT 1 FROM npc_villages);

CREATE TABLE IF NOT EXISTS world_tick_log (
  id SERIAL PRIMARY KEY,
  tick_number INT,
  summary JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
