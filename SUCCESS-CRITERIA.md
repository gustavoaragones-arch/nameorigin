# Phase 2 — Success Criteria

All criteria are enforced by the generator and sitemap design. Run `node scripts/verify-phase2.js` to check.

---

## ✅ Thousands of static pages

- **Source:** Individual name pages (`/name/{slug}`), list/filter pages (`/names`, `/names/boy`, etc.), country pages, gender+country, style pages, letter pages (A–Z), last-name compatibility pages, hub pages.
- **Generator:** `generate-programmatic-pages.js` (or legacy: `generate-name-pages.js` + `generate-filter-pages.js` + …).
- **Check:** Total HTML files under `name/`, `names/`, and any `programmatic/` ≥ 1000.

---

## ✅ Complete internal linking

- **Target:** 15–25 internal links per page minimum.
- **Implementation:**  
  - **Name pages:** Core links (home, generator, trending, top names), contextual (same gender, same origin, same style, similar phonetics, alphabet page, country page), “Similar names you may like,” full explore block.  
  - **Other pages:** `coreLinksHtml()` on every list, country, style, letter, last-name, and hub page (11 core links + page-specific links).
- **Check:** Sample name page has ≥15 `<a href="...">` internal links.

---

## ✅ Structured hubs

- **Authority hub pages (root):**  
  `all-name-pages.html`, `country-name-pages.html`, `style-name-pages.html`, `last-name-pages.html`, `alphabet-name-pages.html`
- **Section hubs:**  
  `/names/letters`, `/names/style`, `/names/with-last-name`
- **Check:** At least 5 of these hub files exist.

---

## ✅ Sitemap coverage

- **Files:**  
  - `/sitemap.xml` — Sitemap index (references the 4 sitemaps).  
  - `/sitemaps/names.xml` — All `/name/{slug}` URLs.  
  - `/sitemaps/countries.xml` — Country + gender+country URLs.  
  - `/sitemaps/filters.xml` — Homepage, `/names`, gender, style, letters, trending, popular, hub .html.  
  - `/sitemaps/lastname.xml` — Last-name compatibility URLs.
- **Generator:** `node scripts/build-sitemap.js` (uses same data as page generator).
- **Check:** Sitemap index exists and all 4 sitemap files exist.

---

## ✅ Breadcrumb schema everywhere

- **Implementation:** `baseLayout()` in `generate-programmatic-pages.js` always outputs:  
  `<script type="application/ld+json">…BreadcrumbList…</script>`
- **Default:** If a page doesn’t pass `breadcrumb`, a default (Home + current page) is used.
- **Check:** Sample generated page contains `BreadcrumbList` and `application/ld+json`.

---

## ✅ Zero orphan pages

- **Design:**  
  - Every URL is included in at least one sitemap (`build-sitemap.js` builds from the same data as the pages).  
  - Name pages are linked from letter pages (A–Z), country/origin sections, style pages, “Similar names,” and explore blocks.  
  - List/hub pages link to each other and to name pages via `coreLinksHtml()` and section links.
- **Check:** Sitemap URL count is consistent with generated page count (sitemap covers all generated pages).

---

## How to verify

```bash
node scripts/verify-phase2.js
```

Exit code 0 = all criteria pass; 1 = one or more failed.

After building:

```bash
node scripts/generate-programmatic-pages.js
node scripts/build-sitemap.js
node scripts/verify-phase2.js
```

Or with the legacy build:

```bash
node scripts/build-all.js
node scripts/verify-phase2.js
```
