# Phase 2 SEO Generator Engine — Implementation Map

This document maps the **Cursor prompt / Phase 2 requirements** to the actual codebase. All items are implemented.

---

## 1. Programmatic page system

| Requirement | Implementation | URLs / output |
|-------------|----------------|---------------|
| **1. Individual name pages** | `scripts/generate-programmatic-pages.js` → `generateNamePage()` | `/name/{slug}` (e.g. `/name/liam`) |
| **2. Country pages** | Same script → `generateCountryPage()` | `/names/usa`, `/names/canada`, `/names/india`, `/names/france`, `/names/ireland` |
| **3. Gender + country filters** | Same script → `generateGenderCountryPage()` | `/names/boy/canada`, `/names/girl/india`, `/names/unisex/france`, etc. |
| **4. Last-name compatibility pages** | Same script → `generateLastNamePage()` | `/names/with-last-name`, `/names/with-last-name-smith`, etc. |
| **5. Style pages** | Same script → `generateStylePage()` | `/names/style`, `/names/style/nature`, `/names/style/classic`, `/names/style/modern`, `/names/style/rare`, etc. |
| **6. Alphabet pages** | Same script → `generateLetterPage()` | `/names/letters`, `/names/a`, `/names/b`, … `/names/z` |
| **7. Authority hub pages** | Same script → `writeHubPage()` | `/all-name-pages.html`, `/country-name-pages.html`, `/style-name-pages.html`, `/last-name-pages.html`, `/alphabet-name-pages.html` |

**Primary generator:** `scripts/generate-programmatic-pages.js` (writes to project root by default; set `OUT_DIR=programmatic` to nest under `/programmatic/`).

**Legacy (optional):** Separate scripts output under `programmatic/`: `generate-name-pages.js`, `generate-filter-pages.js`, `generate-lastname-pages.js`, `generate-hubs.js`.

---

## 2. Templates

| Template | Location | Placeholders / use |
|----------|----------|--------------------|
| **name-page.html** | `templates/name-page.html` | Breadcrumb + Person + FAQ schema, expandable panels, internal link module (see `templates/README.md`) |
| **filter-page.html** | `templates/filter-page.html` | Intro, results grid, hub links, FAQ, breadcrumbs |
| **last-name-page.html** | `templates/last-name-page.html` | Compatibility logic, phonetic explanation, internal link clusters |
| **hub-page.html** | `templates/hub-page.html` | Related pages, alphabet index, country index |

The generator currently builds HTML inline via `baseLayout()`. Templates define the canonical structure; to drive output from them, load each file and replace `{{PLACEHOLDER}}` in the generator.

---

## 3. Internal link graph (15–25 links per page)

| Link type | Where implemented |
|-----------|-------------------|
| **Homepage** | `coreLinksHtml()` + `internalLinksForName()` → `/` |
| **Generator** | Same → `/programmatic/` |
| **Trending / top names** | Same → `/names/trending`, `/names/popular` |
| **Same gender** | `internalLinksForName()` → `/names/{gender}` + 4–6 same-gender names |
| **Same origin / country** | Same → `/names/{countrySlug}` + 4–6 same-origin names |
| **Same style** | Same → `/names/style/{slug}` for name’s categories |
| **Alphabet** | Same → `/names/{letter}` + same-letter names |
| **Country page** | Same → `/names/{countrySlug}` when origin present |
| **Related / similar names** | `getSimilarNamesForName()` → “Similar names you may like” (8 names) + full explore block |

**All list/filter/hub pages:** `coreLinksHtml()` adds 11 core links (home, generator, trending, top, all names, boy/girl/unisex, style, last-name, letters).  
**Minimum:** Name pages typically have 25+ internal links; other pages have 11+ core plus page-specific links.

---

## 4. Schema, canonical, meta

| Requirement | Implementation |
|-------------|----------------|
| **Breadcrumb JSON-LD** | `baseLayout()` always outputs `<script type="application/ld+json">` BreadcrumbList (default if `opts.breadcrumb` missing). |
| **FAQ schema** | Same; always outputs FAQPage from `opts.faqSchema` or `defaultFaqForPage(path, title)`. |
| **Canonical tags** | `<link rel="canonical" href="...">` in `baseLayout()` from `opts.canonical` or `SITE_URL + opts.path`. |
| **Unique meta titles + descriptions** | Every `baseLayout()` call passes `opts.title` and `opts.description` (page-specific). |

Defined in `scripts/generate-programmatic-pages.js`: `baseLayout()`, `breadcrumbJsonLd()`, `faqJsonLd()`, `defaultFaqForPage()`.

---

## 5. Scripts

| Script | Purpose |
|--------|--------|
| **generate-programmatic-pages.js** | Unified generator: name, country, gender+country, style, letter, last-name, hub pages (and trending/popular lists). |
| **generate-name-pages.js** | Legacy: name pages only → `programmatic/names/[slug]/`. |
| **generate-filter-pages.js** | Legacy: names, countries, letters → `programmatic/`. |
| **generate-lastname-pages.js** | Legacy: last-name pages → `programmatic/last-names/`. |
| **generate-hubs.js** | Legacy: hub index pages → `programmatic/`. |
| **build-sitemap.js** | Builds `/sitemap.xml` (index) and `/sitemaps/names.xml`, `/sitemaps/countries.xml`, `/sitemaps/filters.xml`, `/sitemaps/lastname.xml`. |
| **build-all.js** | Runs the five legacy scripts in order. For unified output, run: `node scripts/generate-programmatic-pages.js && node scripts/build-sitemap.js`. |

---

## 6. How to run

**Unified (recommended): all page types at project root**

```bash
node scripts/generate-programmatic-pages.js
node scripts/build-sitemap.js
```

**Legacy: output under `programmatic/`**

```bash
node scripts/build-all.js
```

**Verify Phase 2 success criteria**

```bash
node scripts/verify-phase2.js
```

---

## 7. Data dependencies

- `data/names.json`
- `data/popularity.json`
- `data/countries.json`
- `data/categories.json`
- `data/variants.json`
- `data/last-names.json`

Run Phase 1 (or equivalent) to produce these before generating Phase 2 pages.
