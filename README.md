# nameorigin.io — Phase 0

One-page UX + multi-URL SEO layer. Static-first (HTML5 + vanilla JS), Cloudflare Pages + D1.

## Phase 0 success criteria

- **Database schema**: `schema.sql` (D1)
- **JSON export pipeline**: `scripts/export-d1-data.js` + `/data/*.json`
- **Programmatic generator**: `scripts/generate-programmatic-pages.js` (SEO pages, breadcrumbs, JSON-LD, internal links)
- **Folder structure**: `/data`, `/name`, `/names`, `/scripts`, `/legal`
- **Sample pages**: Generated under `/name/[slug]` and `/names/...`
- **Internal linking**: Each name page includes 15+ internal links (same gender, origin, letter, homepage, etc.)
- **Sitemap**: `node scripts/build-sitemaps.js` → `sitemap.xml`

## Design system

- **styles.css**: Design tokens (colors, typography, 8px spacing, radii, shadows), header, hero, cards, form, result card, FAQ accordion, footer, breadcrumb
- **No frameworks**: Pure CSS, no Tailwind or external UI libraries
- **Semantic HTML**: H1–H4, landmarks, accessible contrast

## Commands

```bash
# Generate programmatic pages (from /data/*.json)
node scripts/generate-programmatic-pages.js

# Regenerate sitemap after adding pages
node scripts/build-sitemaps.js

# Export D1 → JSON (when using D1: replace stub with wrangler d1 execute / export)
node scripts/export-d1-data.js
```

## Deployment

Push to GitHub → connect Cloudflare Pages → build command (optional: add `node scripts/generate-programmatic-pages.js && node scripts/build-sitemaps.js` if you want build-time generation). No build required for initial deploy; pre-generated files in repo are served as-is.

## URL structure

- `/` — main search
- `/names`, `/names/boy`, `/names/girl`, `/names/unisex`
- `/names/usa`, `/names/canada`, `/names/india`, `/names/france`, etc.
- `/names/boy/canada` (add in generator when needed)
- `/name/liam`, `/name/olivia`, …
- Hub pages: `/name-pages.html`, `/country-name-pages.html`, `/boy-name-pages.html`, `/girl-name-pages.html`, `/last-name-pages.html`
