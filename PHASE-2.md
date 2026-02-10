# Phase 2 — Programmatic SEO Generator Engine

Automatically generate SEO pages from curated JSON. Semantic HTML, static delivery, internal linking, hub architecture, safe canonicals.

**Success criteria:** See [SUCCESS-CRITERIA.md](SUCCESS-CRITERIA.md). Verify with `node scripts/verify-phase2.js`.

## Engine structure

```
/programmatic/
  /names/          # All names list + boy, girl, unisex + per-name pages (e.g. liam/)
  /countries/      # Hub + per-country (usa/, canada/, india/, ...)
  /last-names/     # Hub + per-surname (smith/, garcia/, nguyen/, ...)
  /styles/         # Naming styles hub
  /letters/        # Hub + per-letter (a/, b/, ...)
  index.html       # Main hub

/templates/
  name-page.html       # Name detail: breadcrumb + Person + FAQ schema, expandable panels, internal link module
  filter-page.html     # List/filter: intro, results grid, hub links, FAQ, breadcrumbs
  last-name-page.html  # Last-name: compatibility logic, phonetic explanation, internal link clusters
  hub-page.html        # Hub: all related pages, alphabet index, country index
  README.md            # Placeholder documentation for each template

/scripts/
  lib.js                    # Shared: loadJson, slug, baseLayout, breadcrumbs, origin badges
  generate-name-pages.js     # Individual name pages → programmatic/names/[slug]/
  generate-filter-pages.js   # Names (all/boy/girl/unisex), countries, letters
  generate-lastname-pages.js # Last-name compatibility pages
  generate-hubs.js           # Hub index pages
  build-sitemap.js           # sitemap index + sitemaps/names.xml, countries.xml, filters.xml, lastname.xml
```

## Data flow

- **Input**: `data/names.json`, `data/popularity.json`, `data/countries.json`, etc.
- **Templates**: HTML fragments with `{{PLACEHOLDER}}`; scripts replace and wrap with `lib.baseLayout()`.
- **Output**: Static HTML under `programmatic/` with canonical URLs, breadcrumb JSON-LD, Person schema (name pages), internal links.

## Run order

**Master script (runs all in sequence):**

```bash
node scripts/build-all.js
```

This runs: `generate-name-pages.js` → `generate-filter-pages.js` → `generate-lastname-pages.js` → `generate-hubs.js` → `build-sitemap.js`.

**Or run individually:**

```bash
node scripts/generate-name-pages.js
node scripts/generate-filter-pages.js
node scripts/generate-lastname-pages.js
node scripts/generate-hubs.js
node scripts/build-sitemap.js
```

**Unified generator (name, country, style, letter, last-name, hub pages at root):**  
`node scripts/generate-programmatic-pages.js && node scripts/build-sitemap.js`

## URL structure

| Path | Description |
|------|-------------|
| `/programmatic/` | Main hub |
| `/programmatic/names/` | All names list |
| `/programmatic/names/boy/`, `/girl/`, `/unisex/` | Gender filters |
| `/programmatic/names/liam/` | Name detail page |
| `/programmatic/countries/` | Countries hub |
| `/programmatic/countries/usa/` | Names from USA |
| `/programmatic/letters/` | Letters hub |
| `/programmatic/letters/a/` | Names starting with A |
| `/programmatic/last-names/` | Last-name hub |
| `/programmatic/last-names/smith/` | Names that go with Smith |
| `/programmatic/styles/` | Naming styles hub |

## Page types — Individual name pages

**URLs:** `/name/liam`, `/name/olivia`, `/name/aarav` (from `generate-programmatic-pages.js` with `OUT_DIR` at root).

**Content:**

| Section | Source |
|--------|--------|
| Meaning | `names.meaning` |
| Origin | `names.origin_country`, `names.language` + origin badge |
| Popularity chart | Table: Year, Country, Rank, Count (from `popularity.json`, last 15 years) |
| Variants | `variants.json` for this name_id (variant + language) |
| Style tags | `categories.json` for this name_id (e.g. traditional, biblical, nature) |
| Compatibility tips | Short copy + link to `/programmatic/last-names/` |
| Related names | 20+ internal links (see below) |

**Internal links (target 20+ per page):**

- Home, All names, Name generator & tools
- Same gender: gender list link + 6 same-gender names
- Same origin: country/origin list link + 6 same-origin names (if origin present)
- Similar length: 6 names with ±1 character length
- Same first letter: letter hub link + 6 same-letter names
- Trending: “Trending names” link + 6 names with `trend_direction: rising` in popularity

Run `node scripts/generate-programmatic-pages.js` (default writes to project root: `name/`, `names/`). Use `OUT_DIR=programmatic` to output under `/programmatic/` instead.

## Page types — Country pages

**URLs:** `/names/canada`, `/names/usa`, `/names/france`, `/names/india`, `/names/ireland` (from `data/countries.json`).

**Content:**

| Section | Source |
|--------|--------|
| Local naming culture | Short static blurb per country (USA, Canada, France, India, Ireland, UK, Australia) |
| Filter links | All names, Boy names, Girl names, Unisex names, Last name compatibility, Browse by letter |
| Trending names | Names with rising trend in that country (from `popularity.json`); fallback to popular |
| Popular names | Top 25 by rank in that country (latest year in popularity) |
| Rising names | Names with `trend_direction: rising` in that country |
| Names by origin | Names whose origin_country/language match the country (up to 80, then “Browse all names”) |

**Links to:**

- Gender pages: `/names/boy`, `/names/girl`, `/names/unisex`
- Last-name pages: `/programmatic/last-names/`
- Letters hub: `/programmatic/letters/`
- Individual names: linked in each section (trending, popular, rising, by origin)

Popularity data is used when the country slug maps to a popularity country code (`usa`→USA, `canada`→CAN, `uk`→UK, `australia`→AUS). Other countries still get the culture blurb, filter links, and names by origin.

## Page types — Gender + country filters

**URLs:** `/names/boy/canada`, `/names/girl/india`, `/names/unisex/france`, etc. (every combination of gender × country from `data/countries.json`).

**Content:**

| Section | Source |
|--------|--------|
| Title / intro | “{Gender} names from {Country}” — names that match both gender and country (origin_country / language) |
| Filter & explore | Links: All names, current gender, names from country, Boy/Girl/Unisex, Last name compatibility, Browse by letter |
| Names list | Names filtered by gender + country; each with link to `/name/{slug}` and short meaning; empty state links to gender and country pages |

**Breadcrumb:** Home → Names → {Gender} names → {Country}

**Links to:** `/names`, `/names/{gender}`, `/names/{countrySlug}`, `/name/{slug}` for each name.

## Page types — Last name compatibility

**URLs:** `/names/with-last-name-smith`, `/names/with-last-name-garcia`, `/names/with-last-name-nguyen`, etc. (from `data/last-names.json`). Hub: `/names/with-last-name`.

**Content (per last name page):**

| Section | Description |
|--------|--------------|
| Short educational intro | Why first + last flow matters (easier to say and remember; phonetic and cultural guidelines). |
| Phonetic explanation | Tips for that surname: vowel/consonant (e.g. “Smith starts with a consonant → first names ending in a vowel flow well”), syllable balance (surname syllable count + similar first names). |
| Cultural matching | Surname origin and note from `last-names.json`; names with matching `origin_country` / `language` when available. |
| Compatible names | Up to 60 first names scored by compatibility (vowel/consonant boundaries, syllable balance, length harmony, no boundary clash); each links to `/name/{slug}` with short meaning. |
| Explore more | Links to All names, Boy/Girl/Unisex, Last name compatibility hub. |

**Data:** `data/last-names.json` — each entry: `name`, `origin`, `syllables`, `note`. Compatibility uses `data/compatibility_patterns.json` logic (vowel/consonant, syllable balance, phonetic flow, length) applied in `scoreCompatibility()`.

**Links:** Name pages link to “Last name compatibility” (hub) and to Smith, Garcia, Nguyen. Country and gender pages link to `/names/with-last-name`.

## Page types — Style pages

**URLs:** `/names/style/nature`, `/names/style/classic`, `/names/style/modern`, `/names/style/rare`, plus `/names/style/biblical`, `/names/style/popular`, `/names/style/traditional`. Hub: `/names/style`.

**Content (per style page):** Title & intro (style label + description), Explore links (All names, Boy/Girl/Unisex, Names by style, Last name compatibility), Names list (from `categories.json` or `is_modern` for modern). **Data:** Slug `classic` → category `classical`; `modern` → `names.is_modern === 1`. **Links:** Country and gender pages link to `/names/style`; hub at `/names/style` lists all styles.

## Page types — Alphabet / letter pages

**URLs:** `/names/a`, `/names/b`, `/names/c`, … `/names/z`. Hub: `/names/letters`.

**Content (per letter page):** Title “Names starting with {X}”, count, **Browse by letter** block (A–Z with current letter emphasized, each linking to `/names/{letter}`), Explore links (All names, Boy/Girl/Unisex, Names by style, Last name compatibility), full list of names (each → `/name/{slug}`). **Hub** at `/names/letters`: A–Z links to each letter page. These pages act as large internal link hubs (every name on the page links to a name page; every letter links to another letter page).

**Links:** Name pages link “Names starting with X” to `/names/{letter}`. Country, gender, and style pages link “Browse by letter” to `/names/letters`.

## Page types — Authority hub pages (root-level)

**URLs:** `/all-name-pages.html`, `/country-name-pages.html`, `/style-name-pages.html`, `/last-name-pages.html`, `/alphabet-name-pages.html`

Structured index pages at the site root for authority/hub SEO. Each hub lists all relevant sub-pages in sections with `<section>`, `<h2>`, and `<ul>` link lists.

| File | Content |
|------|--------|
| `all-name-pages.html` | All names, Boy names, Girl names, Unisex names |
| `country-name-pages.html` | Countries (USA, Canada, …) + Gender + country (boy/girl/unisex × each country) |
| `style-name-pages.html` | Names by style hub + each style (nature, classic, modern, rare, biblical, popular, traditional) |
| `last-name-pages.html` | Last name compatibility hub + each surname (Smith, Garcia, Nguyen, …) |
| `alphabet-name-pages.html` | Browse by letter hub + Names starting with A … Z |

## SEO structure rules (every generated page)

Each generated page **must** include:

| Element | Implementation |
|--------|----------------|
| `<title>` | From `opts.title` in `baseLayout()`; fallback "Name Origin". |
| `<meta name="description" content="...">` | From `opts.description`; fallback generic tagline. |
| `<link rel="canonical" href="...">` | From `opts.canonical` or `SITE_URL + opts.path`. |
| `<script type="application/ld+json">` **BreadcrumbList** | Always output; from `opts.breadcrumb` or default (Home + current page). |
| `<script type="application/ld+json">` **FAQPage** | Always output; from `opts.faqSchema` or `defaultFaqForPage(path, title)` (1–3 questions per page type). |

`baseLayout()` in `scripts/generate-programmatic-pages.js` enforces these. Optional: `opts.extraSchema` for Person (name pages) or other schema.

## SEO features

- **Semantic HTML**: `<main>`, `<nav>`, `<section>`, headings, lists.
- **Canonical**: Every page has `<link rel="canonical" href="...">`.
- **Breadcrumb JSON-LD**: On all generated pages.
- **FAQPage JSON-LD**: On all generated pages (default or custom).
- **Person schema**: On name detail pages via `extraSchema`.
- **Internal links**: 20+ per name page (home, all names, generator, same gender, same origin, similar length, same letter, trending).
- **Sitemap**: `node scripts/build-sitemap.js` writes `/sitemap.xml` (sitemap index) and `/sitemaps/names.xml`, `/sitemaps/countries.xml`, `/sitemaps/filters.xml`, `/sitemaps/lastname.xml`. Uses same OUT_DIR and SITE_URL as the page generator.

## Deployment

Point Cloudflare Pages (or any static host) at the project root. Generated `programmatic/**/*.html` and `sitemap.xml` are served as static files. Regenerate after updating `data/*.json`.
