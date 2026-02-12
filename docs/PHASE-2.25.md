# Phase 2.25 — Deployment & Index Integrity Engine

**Goal:** Ensure all pages are properly crawlable, indexable, canonicalized, and safe for scaling. No new features; validation and hardening before scaling SEO.

---

## Step 1 — Global meta & canonical structure

For **all** HTML pages:

| Requirement | Implementation |
|-------------|----------------|
| Unique `<title>` | Generator sets per-page title; `index.html` and legal pages have unique titles. |
| Unique `<meta name="description">` | Generator sets per-page description; index and legal have unique descriptions. |
| Self-referencing canonical | `<link rel="canonical" href="https://nameorigin.io/current-page-url" />` — canonical matches final deployed URL. |

**Sources:**

- **Programmatic pages:** `scripts/generate-programmatic-pages.js` — `baseLayout()` uses `opts.canonical || SITE_URL + (opts.path || '/')`; every page type passes its own `pathSeg` so canonical is always self-referencing.
- **Homepage:** `index.html` — canonical `https://nameorigin.io/`.
- **Legal:** `legal/privacy.html`, `legal/terms.html` — canonicals `https://nameorigin.io/legal/privacy.html`, `https://nameorigin.io/legal/terms.html`; explicit `<meta name="robots" content="index, follow">`.

---

## Step 2 — Remove index blockers

| Check | Status |
|-------|--------|
| No `noindex` meta tags | Generator and static pages use `index, follow` or no robots meta (default index). Verifier samples confirm no noindex. |
| No accidental X-Robots-Tag | No `X-Robots-Tag` or `noindex` in project config (`wrangler.toml`, `_headers`, `netlify.toml`, `vercel.json`). **Deploy:** ensure hosting does not add `X-Robots-Tag: noindex` for these paths. |
| No canonical pointing to homepage | Only `index.html` may have canonical `https://nameorigin.io/` or `https://nameorigin.io`. Verifier checks index, legal, and samples from `name/` and `names/`; fails if any non-homepage has homepage canonical. |
| No canonical loops | All canonicals are self-referencing (one canonical per page, pointing to that page’s URL). No A→B, B→A loops. |

---

## Step 3 — robots.txt hardening

`robots.txt` must contain:

- `User-agent: *`
- `Allow: /`
- `Sitemap: https://nameorigin.io/sitemap.xml`
- **No** `Disallow` rules for programmatic pages (all pages are indexable).

The file is maintained at project root; a comment documents that no Disallow rules are intentional.

---

## Step 4 — Sitemap full coverage

**Build:** `node scripts/build-sitemap.js`

**Coverage:** Sitemap index references four URL sets:

| Sitemap | Contents |
|---------|----------|
| `sitemaps/names.xml` | All name detail pages (`/name/{slug}.html`) |
| `sitemaps/countries.xml` | All programmatic country pages + gender+country |
| `sitemaps/filters.xml` | Homepage `/`, core names page `/names`, all gender pages, letters, style, trending/popular, hub pages, legal |
| `sitemaps/lastname.xml` | Last-name compatibility hub + all last-name pages |

**Each URL entry includes:**

- `<loc>`
- `<lastmod>`
- `<changefreq>weekly</changefreq>`
- `<priority>0.8</priority>`

Regenerate after adding programmatic pages or changing URLs.

---

## Step 5 — Programmatic page validation

Programmatic pages (e.g. `/names/canada.html`, `/names/girl/france.html`, `/names/style/nature.html`, `/names/with-last-name-smith.html`) must:

- **Minimum 400 words** of contextual content (intro + body); not just name lists.
- **Intro paragraph(s)** before lists/sections.
- **Unique H1** per URL.
- **Internal links** to: Homepage (`/`), gender filters (`/names/boy.html`, etc.), country filters (e.g. `/names/canada.html`), and related pages.

The generator injects shared contextual blocks (e.g. `COUNTRY_PAGE_INTRO_BLOCK`, `GENDER_COUNTRY_INTRO_BLOCK`) so every such page has enough prose. The verifier samples country, gender+country, style, and last-name pages and fails if word count &lt; 400 or required links are missing.

---

## Step 6 — Internal link graph

- **Every page reachable from homepage within 3 clicks:** The verifier builds a reachable set by BFS from `/` (depth limit 3) using links in each page; all sitemap URLs must be in that set.
- **No orphan pages:** Enforced by the same reachability check.
- **Programmatic pages link back to hub:** e.g. country page links to `/names`, last-name page links to `/names/with-last-name.html`. Verifier spot-checks country and last-name pages.
- **Hub links to programmatic categories:** e.g. letters hub links to `/names/a.html`, style hub to `/names/style/nature.html`, last-name hub to individual last-name pages. Verifier checks hub samples.

---

## Step 7 — Breadcrumb schema

**BreadcrumbList** JSON-LD is emitted by the generator for all programmatic pages. Pattern matches the example:

- **Home** → **Baby Names** → **Canada** → **Girl Names** (gender+country)
- **Home** → **Baby Names** → **Names from Canada** (country)
- **Home** → **Baby Names** → **Liam** (name detail)

The second-level label is "Baby Names" (names index). Gender+country pages use order: Home > Baby Names > Country > Gender (e.g. Girl names). Country pages: Home > Baby Names > Names from {country}. Name detail: Home > Baby Names > {name}.

---

## Step 8 — Core Web Vitals

- **No blocking scripts in head:** Only `<script type="application/ld+json">` (data) is in `<head>`; no render-blocking JS.
- **CSS minified:** `scripts/minify-css.js` reads `styles.css`, strips comments and collapses whitespace, writes `styles.min.css`. All pages reference `/styles.min.css`. Run `node scripts/minify-css.js` before deploy (or when changing CSS).
- **JS deferred:** Homepage scripts (`/js/core.js`, `/js/accordion.js`, `/app.js`) use `defer`.
- **No external font blocking:** Site uses system font stack only; no Google Fonts or other external font requests.

---

## Step 9 — Search Console checklist (after deployment)

After deploying NameOrigin.io:

1. **Re-submit sitemap**  
   In Google Search Console (and Bing Webmaster Tools if used): add or re-submit `https://nameorigin.io/sitemap.xml`.

2. **Inspect homepage URL**  
   Use URL Inspection on `https://nameorigin.io/`; confirm “URL is on Google” or request indexing.

3. **Inspect 3 programmatic URLs**  
   Inspect one of each type, e.g.:  
   - `https://nameorigin.io/names/canada.html`  
   - `https://nameorigin.io/names/girl/france.html`  
   - `https://nameorigin.io/name/liam.html`  
   Confirm they are indexable and that the indexed content matches the live page.

4. **Confirm indexing allowed**  
   Check that no “Indexing allowed?” issues are reported for these URLs; ensure `robots.txt` and page-level robots meta do not block.

---

## DO NOT

- **Do not** add AI-generated filler content. Use only curated, sourced name data and the shared contextual blocks in the generator.
- **Do not** add duplicate meta descriptions. Every page must have a unique `<meta name="description">`.
- **Do not** add country pages with only lists. Country (and all programmatic) pages must meet the 400+ word contextual content requirement (Step 5).
- **Do not** create orphan name pages. Every page must be reachable from the homepage within 3 clicks and listed in the sitemap.
- **Do not** add tracking beyond Cloudflare. Keep the site lightweight; no additional analytics or tracking scripts unless explicitly approved.

---

## END STATE

NameOrigin.io must be:

| Requirement | Meaning |
|-------------|---------|
| **Fully crawlable** | All programmatic and static pages reachable by crawlers; `robots.txt` allows `/`; no blocking rules for programmatic URLs. |
| **Fully indexable** | No `noindex`; no accidental `X-Robots-Tag`; every page has `index, follow` or equivalent. |
| **Canonical-safe** | Every page has a self-referencing canonical; no canonical pointing to the homepage on non-homepage URLs; no canonical loops. |
| **Thin-page resistant** | Programmatic pages have ≥400 words of contextual content, intro, unique H1, and required internal links; verifier enforces this. |
| **Programmatic-ready** | Sitemap covers all URLs; BreadcrumbList on country, gender, and name pages; Core Web Vitals–friendly (minified CSS, deferred JS, no blocking fonts); link graph ensures no orphans and hub ↔ category links. |

---

## Verification

Run:

```bash
node scripts/verify-phase2.js
```

Phase 2.25 checks included:

- **Phase 2.25 (canonical):** No canonical-to-homepage on non-homepage pages (index, legal, name sample, names sample).
- **Phase 2.25 (headers):** No X-Robots-Tag/noindex in project config files.

All Phase 2 success criteria (including Phase 2.25) must pass before considering scaling SEO.
