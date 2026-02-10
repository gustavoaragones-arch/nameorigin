-- nameorigin.io — Cloudflare D1 schema
-- Run against D1 for production; JSON exports mirror this for static generation.

-- Core name records (curated; no AI-generated meanings)
CREATE TABLE IF NOT EXISTS names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('boy', 'girl', 'unisex')),
  origin_country TEXT,
  language TEXT,
  meaning TEXT,
  phonetic TEXT,
  syllables INTEGER,
  first_letter TEXT,
  is_traditional INTEGER DEFAULT 0,
  is_modern INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_names_name ON names(name);
CREATE INDEX IF NOT EXISTS idx_names_gender ON names(gender);
CREATE INDEX IF NOT EXISTS idx_names_first_letter ON names(first_letter);
CREATE INDEX IF NOT EXISTS idx_names_origin_country ON names(origin_country);

-- Popularity by country/year
CREATE TABLE IF NOT EXISTS name_popularity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_id INTEGER NOT NULL REFERENCES names(id),
  country TEXT NOT NULL,
  year INTEGER NOT NULL,
  rank INTEGER,
  count INTEGER,
  UNIQUE(name_id, country, year)
);

CREATE INDEX IF NOT EXISTS idx_popularity_name_id ON name_popularity(name_id);
CREATE INDEX IF NOT EXISTS idx_popularity_country_year ON name_popularity(country, year);

-- Categories (nature, historical, modern, biblical, royal, rare, etc.)
CREATE TABLE IF NOT EXISTS name_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_id INTEGER NOT NULL REFERENCES names(id),
  category TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_name_id ON name_categories(name_id);
CREATE INDEX IF NOT EXISTS idx_categories_category ON name_categories(category);

-- Variants in other languages
CREATE TABLE IF NOT EXISTS name_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_id INTEGER NOT NULL REFERENCES names(id),
  variant TEXT NOT NULL,
  language TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_variants_name_id ON name_variants(name_id);

-- Country reference (for SEO routes)
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  primary_language TEXT,
  region_group TEXT
);
