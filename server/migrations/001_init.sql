CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  device_id TEXT UNIQUE,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL,
  adult_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_lock BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  partner_id TEXT REFERENCES users(id),
  invite_code TEXT NOT NULL,
  status TEXT NOT NULL,
  can_share BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS intimacy_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  partner_id TEXT REFERENCES users(id),
  occurred_at DATE NOT NULL,
  type TEXT NOT NULL,
  protection TEXT NOT NULL,
  consent_checked BOOLEAN NOT NULL DEFAULT FALSE,
  shared_with_partner BOOLEAN NOT NULL DEFAULT FALSE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  risk_level TEXT NOT NULL,
  note_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  phrase TEXT NOT NULL,
  scene TEXT NOT NULL DEFAULT 'partner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cycle_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE,
  cycle_length INTEGER NOT NULL DEFAULT 28,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phrase_templates (
  id TEXT PRIMARY KEY,
  slot TEXT NOT NULL,
  text TEXT NOT NULL,
  scenario TEXT NOT NULL,
  reviewed BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  author_alias TEXT NOT NULL,
  phrase TEXT NOT NULL,
  resonance_count INTEGER NOT NULL DEFAULT 0,
  reported BOOLEAN NOT NULL DEFAULT FALSE,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
