# nameorigin.io — Phase 0

One-page UX + multi-URL SEO layer. Static-first (HTML5 + vanilla JS), Cloudflare Pages + D1.

## Phase 0 success criteria

- **Database schema**: `schema.sql` (D1)
- **JSON export pipeline**: `scripts/export-d1-data.js` + `/data/*.json`
- **Programmatic generator**: `scripts/generate-programmatic-pages.js` (SEO pages, breadcrumbs, JSON-LD, internal links)
- **Folder structure**: `/data`, `/name`, `/names`, `/scripts`, `/legal`
- **Sample pages**: Generated under `/name/[slug]` and `/names/...`
- **Internal linking**: Each name page includes 15+ internal links (same gender, origin, letter, homepage, etc.)
- **Sitemap**: `node scripts/build-sitemap.js` → `/sitemap.xml` + `/sitemaps/names.xml`, `countries.xml`, `filters.xml`, `lastname.xml`

## Design system

- **styles.css**: Design tokens (colors, typography, 8px spacing, radii, shadows), header, hero, cards, form, result card, FAQ accordion, footer, breadcrumb
- **No frameworks**: Pure CSS, no Tailwind or external UI libraries
- **Semantic HTML**: H1–H4, landmarks, accessible contrast

## Commands

```bash
# Phase 2: Generate all programmatic pages (name, country, style, letter, last-name, hubs)
node scripts/generate-programmatic-pages.js

# Phase 2: Regenerate sitemap (index + 4 sitemaps)
node scripts/build-sitemap.js

# Phase 2: Full build (legacy scripts → programmatic/) or unified (see PHASE-2.md)
node scripts/build-all.js

# Phase 2: Verify success criteria (thousands of pages, internal links, hubs, sitemap, schema, no orphans)
node scripts/verify-phase2.js

# Export D1 → JSON (when using D1: replace stub with wrangler d1 execute / export)
node scripts/export-d1-data.js
```

## Deployment

Push to GitHub → connect Cloudflare Pages → build command (optional: `node scripts/generate-programmatic-pages.js && node scripts/build-sitemap.js`). No build required for initial deploy; pre-generated files in repo are served as-is.

## Phase 2 (programmatic SEO)

- **Docs:** [PHASE-2.md](PHASE-2.md) (engine, URLs, SEO). [PHASE-2-IMPLEMENTATION-MAP.md](PHASE-2-IMPLEMENTATION-MAP.md) maps the Cursor prompt to the codebase.
- **Templates:** `templates/name-page.html`, `filter-page.html`, `last-name-page.html`, `hub-page.html` (see `templates/README.md`).
- **Success criteria:** [SUCCESS-CRITERIA.md](SUCCESS-CRITERIA.md); run `node scripts/verify-phase2.js`.

## URL structure

- `/` — main search
- `/names`, `/names/boy`, `/names/girl`, `/names/unisex`, `/names/trending`, `/names/popular`
- `/names/usa`, `/names/canada`, `/names/india`, `/names/france`, `/names/ireland`
- `/names/boy/canada`, `/names/girl/india`, `/names/unisex/france` (gender + country)
- `/names/style`, `/names/style/nature`, `/names/style/classic`, etc.
- `/names/letters`, `/names/a` … `/names/z`
- `/names/with-last-name`, `/names/with-last-name-smith`, etc.
- `/name/liam`, `/name/olivia`, …
- Hub pages: `/all-name-pages.html`, `/country-name-pages.html`, `/style-name-pages.html`, `/last-name-pages.html`, `/alphabet-name-pages.html`
