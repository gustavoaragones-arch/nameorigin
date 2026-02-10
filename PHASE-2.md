# Phase 2 — Programmatic SEO Generator Engine

Automatically generate SEO pages from curated JSON. Semantic HTML, static delivery, internal linking, hub architecture, safe canonicals.

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
  name-page.html       # Name detail placeholders
  filter-page.html     # List/filter placeholders
  last-name-page.html  # Last-name compatibility placeholders
  hub-page.html        # Hub index placeholders

/scripts/
  lib.js                    # Shared: loadJson, slug, baseLayout, breadcrumbs, origin badges
  generate-name-pages.js     # Individual name pages → programmatic/names/[slug]/
  generate-filter-pages.js   # Names (all/boy/girl/unisex), countries, letters
  generate-lastname-pages.js # Last-name compatibility pages
  generate-hubs.js           # Hub index pages
  build-sitemap.js           # sitemap.xml from programmatic/ + static
```

## Data flow

- **Input**: `data/names.json`, `data/popularity.json`, `data/countries.json`, etc.
- **Templates**: HTML fragments with `{{PLACEHOLDER}}`; scripts replace and wrap with `lib.baseLayout()`.
- **Output**: Static HTML under `programmatic/` with canonical URLs, breadcrumb JSON-LD, Person schema (name pages), internal links.

## Run order

```bash
node scripts/generate-name-pages.js
node scripts/generate-filter-pages.js
node scripts/generate-lastname-pages.js
node scripts/generate-hubs.js
node scripts/build-sitemap.js
```

Or run all in sequence (e.g. `npm run build` or a shell one-liner).

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

## SEO features

- **Semantic HTML**: `<main>`, `<nav>`, `<section>`, headings, lists.
- **Canonical**: Every page has `<link rel="canonical" href="...">`.
- **Breadcrumb JSON-LD**: On all generated pages.
- **Person schema**: On name detail pages.
- **Internal links**: 15–20+ per name page (home, all names, gender, country, letter, similar names).
- **Sitemap**: `build-sitemap.js` writes `sitemap.xml` at project root.

## Deployment

Point Cloudflare Pages (or any static host) at the project root. Generated `programmatic/**/*.html` and `sitemap.xml` are served as static files. Regenerate after updating `data/*.json`.
