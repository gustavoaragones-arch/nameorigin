# Phase 1 — Curated Data Acquisition Engine

**Goal:** Build a legally safe, normalized, scalable baby-name dataset that feeds the Phase 2 programmatic SEO generator.

---

## Final Phase 1 output

After running the full pipeline, the project has this structure:

```
/data
   names.json        ← Core name records (id, name, gender, origin, meaning, …). Consumed by programmatic SEO.
   popularity.json   ← name_id, country, year, rank, count, trend_direction
   variants.json     ← name_id, variant, language
   categories.json   ← name_id, category

/raw-data            ← Normalized temp data per source (ssa/, uk/, canada/, australia/, wikidata/)
   ssa/normalized.json
   canada/normalized.json
   …

/scripts             ← Import, normalize, enrich, classify, build, export, seed, validate
   import-ssa.js
   import-uk.js
   import-canada.js
   import-australia.js
   import-wikidata-names.js
   normalize-names.js
   enrich-meanings.js
   classify-categories.js
   build-popularity.js
   build-compatibility.js
   export-json-data.js
   seed-d1.js
   validate-data.js
   …

/build                ← Validation and other build artifacts
   data-validation-report.json
```

**What programmatic SEO consumes:** `data/names.json`, `data/popularity.json`, `data/variants.json`, `data/categories.json`.

**Run full Phase 1 (all steps in order):**

```bash
node scripts/run-phase1.js
```

Or run steps individually; see each Step section below for details.

---

## Step 1 — Data source strategy (critical)

We do **not** scrape SEO or commercial name sites. We use only:

- **Public datasets** (government, open data portals)
- **Open linguistic / academic sources**
- **Wikidata** (for meaning/origin enrichment only)

This keeps AdSense approval safe, Google trust high, and long-term authority intact.

### Core name sources (safe + high quality)

| Region | Source | URL | Format / Notes |
|--------|--------|-----|----------------|
| USA | SSA Baby Names | https://www.ssa.gov/oact/babynames/limits.html | National: [names.zip](https://www.ssa.gov/oact/babynames/names.zip) — contains `yobYYYY.txt` (Name,Sex,Count). Privacy: names with &lt;5 occurrences excluded. |
| UK (E&amp;W) | ONS Baby Names | https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/babynamesenglandandwalesbabynamesstatisticsgirls (and boys) | Excel (.xlsx). Historical from 1996. |
| Canada | Statistics Canada | https://www150.statcan.gc.ca/n1/tbl/csv/17100147-eng.zip | CSV zip. Table 17-10-0147-01. Open Government Licence. |
| Australia | ABS / data.gov.au | https://www.abs.gov.au/statistics/people/population/births-australia ; state-level e.g. [data.gov.au Popular Baby Names](https://data.gov.au/data/en/dataset/popular-baby-names1) | ABS Data Explorer or state XLSX. |
| India | No single gov dataset | — | Use curated lists from linguistic/census-based open sources only (no commercial scrapes). |

### Meaning / origin sources (allowed only)

- **Wikidata** dumps or API (given name / etymology / language)
- **Open** multilingual name datasets (e.g. academic, Wiktionary-derived)
- **Linguistic** academic datasets

**Do not:** Scrape Nameberry, BabyCenter, or any commercial name site.

---

## Data schemas (aligned with Phase 2 and `schema.sql`)

### names.json

Array of objects:

- `id` (number) — stable ID
- `name` (string)
- `gender` — `"boy"` \| `"girl"` \| `"unisex"`
- `origin_country` (string, optional)
- `language` (string, optional)
- `meaning` (string, optional)
- `phonetic` (string, optional)
- `syllables` (number, optional)
- `first_letter` (string, one letter)
- `is_traditional` (0 \| 1)
- `is_modern` (0 \| 1)

### popularity.json

Array of objects:

- `name_id` (number) — references `names[].id`
- `country` (string) — e.g. `USA`, `UK`, `CAN`, `AUS`, `IND`
- `year` (number)
- `rank` (number, optional)
- `count` (number, optional)

### variants.json

Array of objects:

- `name_id` (number)
- `variant` (string)
- `language` (string)

### categories.json

Array of objects:

- `name_id` (number)
- `category` (string) — e.g. `traditional`, `biblical`, `modern`, `nature`, `royal`, `literary`

---

## Step 2 — Raw data pipeline

**Layout:** `/raw-data` with one folder per source. Each import script downloads (or reads local files), parses CSV/JSON, and writes **normalized temp data** into that folder.

```
/raw-data
   ssa/          → normalized.json (name, gender, year, count)
   uk/           → normalized.json (from CSV you place here)
   canada/        → normalized.json (name, gender, year, count, rank)
   australia/     → normalized.json (from CSV you place here)
   wikidata/      → normalized.json (name, meaning, wikidata_id, …)
```

**Scripts:**

| Script | Action | Output |
|--------|--------|--------|
| `scripts/import-ssa.js` | Download SSA names.zip, parse yob*.txt | `raw-data/ssa/normalized.json` |
| `scripts/import-uk.js` | Parse CSV in raw-data/uk/ (add boys.csv, girls.csv from ONS) | `raw-data/uk/normalized.json` |
| `scripts/import-canada.js` | Download StatCan CSV zip, parse | `raw-data/canada/normalized.json` |
| `scripts/import-australia.js` | Parse CSV in raw-data/australia/ | `raw-data/australia/normalized.json` |
| `scripts/import-wikidata-names.js` | Query Wikidata SPARQL (given names), fetch labels/descriptions | `raw-data/wikidata/normalized.json` |

Run any subset:

```bash
node scripts/import-ssa.js
node scripts/import-canada.js
node scripts/import-uk.js
node scripts/import-australia.js
node scripts/import-wikidata-names.js
```

UK and Australia scripts write empty `normalized.json` until you add CSV files to the corresponding `raw-data/*` folders (e.g. export from ONS Excel or data.gov.au).

---

## Step 3 — Data normalization engine

**Script:** `scripts/normalize-names.js`

Reads all `raw-data/*/normalized.json` files, then:

1. **Standardize gender** — `M` / `male` → `boy`, `F` / `female` → `girl`, `U` / `unisex` → `unisex`.
2. **Normalize name format** — Capitalize first letter (per word), remove accents (copy variant), create `slug` (lowercase, no accents, hyphens).
3. **Deduplicate** — Merge by: **lowercase name** (same spelling), **phonetic similarity** (Soundex), **origin match** (same origin_country + language). One canonical name per group; other spellings stored as `spelling_variants`.
4. **Derived fields** — `first_letter`, `length`, `syllable_estimate` (vowel groups), `phonetic_code` (Soundex).

**Output:**

- `data/normalized-names.json` — Full normalized list (includes slug, variant_no_accents, length, syllable_estimate, phonetic_code, spelling_variants).
- `data/names.json` — Phase 2 schema (id, name, gender, origin_country, language, meaning, syllables, first_letter, is_traditional, is_modern).

Run after import scripts:

```bash
node scripts/normalize-names.js
```

---

## Step 4 — Meaning + origin enrichment

**Script:** `scripts/enrich-meanings.js`

**Uses:** Wikidata name entities (`raw-data/wikidata/normalized.json`) and curated linguistic datasets (`data/sources/curated-meanings.json`).

**Rules:**
- Only include **verified** meanings (from Wikidata or curated list).
- Store **source reference** in `meaning_source` and `origin_source`.
- **No AI-generated meanings.**

**Schema addition (names):**

| Field | Description |
|-------|-------------|
| `meaning_source` | e.g. `curated`, or `wikidata:https://www.wikidata.org/wiki/Q12345` |
| `origin_source` | Same as above for origin/language. |
| `confidence_score` | `1.0` for curated, `0.9` for Wikidata; null if not enriched. |

Curated entries take precedence. Run after `import-wikidata-names.js` and after adding any entries to `data/sources/curated-meanings.json`:

```bash
node scripts/enrich-meanings.js
```

---

## Step 5 — Category classifier (curated rule engine)

**Script:** `scripts/classify-categories.js`

**Categories assigned via:**

| Rule type | Example |
|-----------|--------|
| **Origin** | `origin == "Hebrew"` → biblical; `origin == "Greek"` → classical |
| **Linguistic / origin map** | Latin, Irish, Sanskrit, etc. → traditional or classical |
| **Meaning keywords** | meaning contains "flower" → nature; "warrior", "king" → royal |
| **Popularity** | top 50 rank → popular; rank > 1000 → rare |
| **Curated rule list** | `data/sources/category-rules.json` (byOrigin, byName, byMeaningKeyword) |

**Output:** `data/categories.json` — `[{ name_id, category }, ...]` (multiple categories per name).

**Run after** names and popularity are built and (optionally) meanings enriched:

```bash
node scripts/classify-categories.js
```

---

## Step 6 — Popularity engine

**Script:** `scripts/build-popularity.js`

Combines all country datasets from `raw-data/ssa`, `raw-data/uk`, `raw-data/canada`, `raw-data/australia` (each `normalized.json`) into **data/popularity.json**.

**Schema:**

| Field | Description |
|-------|-------------|
| name_id | References names.id |
| country | USA, UK, CAN, AUS |
| year | Year of data |
| rank | Rank by count (1 = most popular) |
| count | Number of births (when available) |
| trend_direction | rising / stable / falling |

**Trend rules:** Compare last 3 years of data per (name_id, country). If rank improves (lower number) or count increases → **rising**; if rank worsens or count decreases → **falling**; else **stable**.

**Run after** import scripts and normalize-names (so names.json and raw-data/*/normalized.json exist):

```bash
node scripts/build-popularity.js
```

---

## Step 7 — Export to static data

**Script:** `scripts/export-json-data.js`

Produces the four JSON files consumed by programmatic SEO pages:

| Output | Description |
|--------|-------------|
| **data/names.json** | Canonical name list (id, name, gender, origin_country, language, meaning, phonetic, syllables, first_letter, is_traditional, is_modern). |
| **data/popularity.json** | name_id, country, year, rank, count, trend_direction. |
| **data/variants.json** | name_id, variant, language (canonical + spelling_variants from normalized-names when present). |
| **data/categories.json** | name_id, category. |

Run after the full pipeline (normalize-names, enrich-meanings, classify-categories, build-popularity) so all inputs exist in data/:

```bash
node scripts/export-json-data.js
```

---

## Step 8 — Last name compatibility engine (rule-based)

**Script:** `scripts/build-compatibility.js`

Builds **data/compatibility_patterns.json** with rule-based scoring. **Not per last name** — the same rules apply to any first + last name pair.

**Score factors:**

| Factor | Description |
|--------|-------------|
| **Syllable balance** | Similar syllable count between first and last; best when difference ≤ 1. |
| **Vowel/consonant endings** | First ends vowel + last starts consonant (or vice versa) → better flow. |
| **Phonetic flow** | Avoid double consonant at boundary; different sounds at boundary → better. |
| **Length harmony** | Similar character length or balanced ratio → higher score. |

**Output structure:**

- **factors** — Array of `{ id, label, hint, weight, rule }` defining each factor and how to score it.
- **patterns** — Array of `{ pattern, factor, label, hint, score_weight, when }` for UI and scoring (e.g. vowel_ending, consonant_ending, syllable_balance, phonetic_flow_good, length_harmony).

Run anytime (no input data required; rules are curated in the script):

```bash
node scripts/build-compatibility.js
```

---

## Step 9 — D1 database seeding

**Script:** `scripts/seed-d1.js`

Reads the static data files and generates SQL to seed Cloudflare D1 (or runs it via wrangler). Enables **edge queries**, **analytics**, and **future AI features**.

**Tables seeded:**

| Table | Source | Notes |
|-------|--------|--------|
| **names** | data/names.json | id, name, gender, origin_country, language, meaning, meaning_source, origin_source, confidence_score, phonetic, syllables, first_letter, is_traditional, is_modern |
| **name_popularity** | data/popularity.json | name_id, country, year, rank, count (trend_direction not in D1 schema) |
| **name_categories** | data/categories.json | name_id, category |
| **name_variants** | data/variants.json | name_id, variant, language |

**Output:** `seed-d1.sql` at project root (batched INSERTs). Apply with:

```bash
node scripts/seed-d1.js
# Then:
npx wrangler d1 execute <DB_NAME> --remote --file=seed-d1.sql
```

Or set `D1_DATABASE=<DB_NAME>` and re-run; the script will call `wrangler d1 execute` for you.

**Prerequisite:** Run `scripts/export-json-data.js` so data/names.json, popularity.json, categories.json, variants.json exist.

**If you see `no such table: name_variants` (or similar):** the D1 database has no tables yet. Create them first, then seed:

```bash
# 1. Create tables (run schema.sql)
npx wrangler d1 execute nameorigin-db --remote --file=schema.sql

# 2. Generate and apply seed
node scripts/seed-d1.js
npx wrangler d1 execute nameorigin-db --remote --file=seed-d1.sql
```

Use your actual database name from `wrangler.toml` (e.g. `nameorigin-db`) if different.

---

## Step 10 — Validation engine

**Script:** `scripts/validate-data.js`

Runs data-quality checks and writes **build/data-validation-report.json**.

**Checks:**

| Check | Description |
|-------|-------------|
| **Duplicate names** | Same (name, gender) with different id — fails. |
| **Missing meanings** | meaning null or empty — warning + count/pct. |
| **Missing gender** | gender missing or not boy/girl/unisex — fails. |
| **Missing origin** | Both origin_country and language empty — warning + count/pct. |
| **Empty popularity data** | No rows in popularity.json, or names with no popularity rows — fails if empty; warning for names without any popularity. |

**Report structure:** `generated_at`, `summary` (passed/failed/warnings), `checks` (per-check passed, count, sample_ids), `errors`, `warnings`.

Run after export (or anytime you want to validate data):

```bash
node scripts/validate-data.js
```

---

## Pipeline (scripts in `scripts/acquire/`)

1. **Fetch raw data** (only from allowed sources):
   - `fetch-ssa.js` — USA (SSA names.zip → raw/ssa-usa.json)
   - `fetch-statcan.js` — Canada (StatCan CSV zip → raw/statcan-canada.json)
   - `fetch-ons-uk.js` — UK ONS (documented; optional xlsx download)
   - `fetch-abs.js` / India — placeholders or manual curated files
2. **Build normalized datasets:**
   - `build-names.js` — unique names from raw data; assign id; derive first_letter, syllables; optional Wikidata enrichment
   - `build-popularity.js` — raw → popularity.json with name_id
   - `build-variants.js` — at least (name, English) per name; extend from Wikidata/open data
   - `build-categories.js` — rule-based from gender/origin/lists
3. **Run:** `node scripts/acquire/run-acquire.js` (or run steps 1–2 in order).

Raw data is written under `data/raw/` (or `scripts/acquire/raw/`). Final output is written to `data/*.json`.

---

## Run order

```bash
node scripts/acquire/fetch-ssa.js
node scripts/acquire/fetch-statcan.js
# node scripts/acquire/fetch-ons-uk.js   # when implemented
node scripts/acquire/build-names.js
node scripts/acquire/build-popularity.js
node scripts/acquire/build-variants.js
node scripts/acquire/build-categories.js
```

Or:

```bash
node scripts/acquire/run-acquire.js
```

Phase 2 generators read from `data/names.json`, `data/popularity.json`, `data/variants.json`, `data/categories.json`.

---

## Manual fallback (if automated download is blocked)

Some hosts (e.g. SSA) may return 403 for scripted downloads. You can still build the dataset:

1. **USA (import-ssa):** Download [names.zip](https://www.ssa.gov/oact/babynames/names.zip) and save as `raw-data/ssa/names.zip`.
2. **Canada (import-canada):** Download the [StatCan CSV zip](https://www150.statcan.gc.ca/n1/tbl/csv/17100147-eng.zip) and save as `raw-data/canada/17100147-eng.zip`.

Then run the same import script again; it will use the existing file and continue with extract + normalized output.
