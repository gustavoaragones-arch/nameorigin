# Phase 2.25 — Deployment & Index Integrity Engine

**Goal:** Ensure all pages are properly crawlable, indexable, canonicalized, and safe for scaling. No new features; validation and hardening before scaling SEO.

**Architecture:** All programmatic pages are pre-rendered static HTML at build time. No SSR, no edge rendering, no runtime HTML generation.

---

## Phase 2.25A — Duplicate name URL collapse

**Problem:** Each name previously existed as both `/name/<slug>.html` and `/name/<slug>/index.html`, creating duplicate URLs.

**Goal:** One URL per name: directory-based `/name/<slug>/` only.

| Step | Implementation |
|------|----------------|
| **1. Generator** | Only generates `name/<slug>/index.html`. Path and canonical: `https://nameorigin.io/name/<slug>/`. All internal links use `/name/<slug>/`. |
| **2. Delete flat files** | Run `node scripts/delete-flat-name-pages.js` to remove all `name/*.html`. |
| **3. Internal links** | Generator, `app.js`, `js/core.js`, `js/accordion.js` use `/name/<slug>/` (trailing slash). |
| **4. Canonical** | `<link rel="canonical" href="https://nameorigin.io/name/<slug>/" />` on every name page. |
| **5. Redirect** | `_redirects`: `/name/:slug.html` → `/name/:slug/` 301 (Cloudflare Pages). Use equivalent rule if host differs. |
| **6. Sitemap** | `build-sitemap.js` includes only `/name/<slug>/` in sitemaps/names.xml. |

**End state:** One URL per name, no duplicate pages, clean directory structure, consolidated authority.

---

## Phase 2.5 — Names Like Engine

**Goal:** Generate high-quality, programmatic "Names Like X" pages that capture long-tail intent while maintaining authority score ≥ 0.99, 400+ word floor, ≥8 internal links, self-referencing canonical, and auto-registration in sitemap.

**Architecture:** Static pre-rendered HTML. No SSR. Pages written at build time.

| Step | Implementation |
|------|----------------|
| **1. URL structure** | Directory-based: `/names-like/<slug>/index.html` (e.g. `/names-like/liam/`, `/names-like/olivia/`). No flat `.html` versions. Canonical: `https://nameorigin.io/names-like/<slug>/`. |
| **2. Similarity model** | For each base name, find 8–15 related names based on: (1) same origin, (2) same first letter, (3) phonetic similarity (first 2–3 letters match), (4) similar popularity band, (5) same gender. Fallback: same country popularity cluster. Avoid duplicates. |
| **3. Page structure** | **H1:** "Names Like X — Similar Names & Alternatives". **Intro paragraph** (~150–200 words): explains style similarity, origin similarity, why someone might look for alternatives. **H2 sections:** "Names Similar in Sound" (list with name, 1–2 sentence explanation, link to `/name/<slug>/`), "Names with the Same Origin", "Names with Similar Popularity", "Other Alternatives You Might Like". **Closing paragraph** (~120–150 words): encourages exploring name meanings, links back to main name page. **Minimum:** 600 words, 12 internal links (homepage, base name page, ≥8 related name pages, gender hub, country hub if applicable). |
| **4. Sitemap** | All `/names-like/<slug>/` URLs included in `sitemaps/names-like.xml` (priority 0.8). Sitemap index updated to include 5 sitemaps. |
| **5. Generator script** | Separate script: `scripts/generate-names-like.js`. Iterates through top popular names, builds similarity list, writes HTML, ensures 600+ words and ≥12 links, logs generation count. |
| **6. Expansion control** | First batch: top 50 most popular names (by global popularity score). After generation, run `node scripts/post-2.25a-audit.js`. If `authority_coverage_score ≥ 0.99`, expand to next 150 names (total 200): `node scripts/generate-names-like.js --batch=200`. |
| **7. Avoid thin duplication** | Each page has unique intro (6 variations), unique closing paragraph (6 variations), and varied explanation phrasing (6 variations per section type). Template variation selected deterministically based on name ID hash for consistency. |

**End state:** 
- 50 "Names Like" pages live (expandable to 200 if authority score ≥ 0.99)
- Clean canonical (self-referencing `/names-like/<slug>/`)
- Clean sitemap (`sitemaps/names-like.xml` with priority 0.7)
- ≥600 words each (unique intros/closings, varied explanations)
- ≥12 internal links each (homepage, base name, related names, hubs)
- Authority score maintained (no orphans, no broken links, proper canonicals)

### Important discipline rule

**After generating the first 50 Names Like pages: run the audit, then deploy. Do NOT mass-generate ~3,000 pages immediately.**

- First batch: 50 pages only.
- Run `node scripts/post-2.25a-audit.js`, then deploy.
- Only after deploy and if `authority_coverage_score ≥ 0.99`, expand with `--batch=200` (max 200; script rejects larger batches).

### After Phase 2.5 — Generation workflow

**Step 1: Generate first batch (top 50 names)**

```bash
node scripts/generate-names-like.js --batch=50
```

This generates Names Like pages for the top 50 most popular names (by global popularity score). The script logs:
- Total pages generated
- Average and minimum word count (must be ≥600)
- Average and minimum internal links (must be ≥12)

**Step 2: Run audit and check authority score**

```bash
node scripts/post-2.25a-audit.js
```

This runs sitemap generation, Phase 2 verification, and index integrity audit. It checks `authority_coverage_score` in `build/index-integrity-report.json`.

**Step 3: Expand if authority score ≥ 0.99**

If `authority_coverage_score ≥ 0.99`, expand to 200 names:

```bash
node scripts/generate-names-like.js --batch=200
```

**Step 4: Search Console inspection**

Spot-check 3–5 Names Like URLs (e.g. `/names-like/liam/`, `/names-like/olivia/`) to confirm indexable and canonical correct.

---

### After Phase 2.25A fix — re-run checklist

After deploying the duplicate-URL collapse, run:

| Step | Command / action |
|------|------------------|
| **1. Sitemap generation** | `node scripts/build-sitemap.js` — ensures sitemap only lists `/name/<slug>/`. (Also runs automatically at end of `generate-programmatic-pages.js`.) |
| **2. Internal link audit** | `node scripts/verify-phase2.js` — link graph, reachability, hub↔category links; `node scripts/index-integrity-audit.js` — reports pages with &lt; 8 internal links in `build/index-integrity-report.json`. |
| **3. Canonical audit** | `node scripts/index-integrity-audit.js` — checks missing canonical, canonical-to-homepage, duplicate canonicals; report in `build/index-integrity-report.json`. |
| **4. Search Console inspection** | Spot-check 5 name URLs in Google Search Console (URL Inspection): confirm indexable, canonical `/name/<slug>/`. Example URLs to check: `https://nameorigin.io/name/liam/`, `https://nameorigin.io/name/olivia/`, `https://nameorigin.io/name/noah/`, `https://nameorigin.io/name/emma/`, `https://nameorigin.io/name/oliver/`. |

**One-command automated run (sitemap + both audits):**

```bash
node scripts/post-2.25a-audit.js
```

Then perform step 4 (Search Console) manually.

---

## Static Index Integrity (SSG)

- **Self-referencing canonical (critical for SSG):** Every generated HTML has `<link rel="canonical" href="https://nameorigin.io/EXACT-URL-PATH" />` written at build time. The generator uses `pathSeg` (e.g. `/name/liam/` for name detail pages, `/names/canada.html` for country); baseLayout never uses the homepage as canonical for non-home pages.
- **Unique title & description:** Country pages use title "Popular Baby Names in {Country} — NameOrigin". Name detail pages use "{Name} — Meaning, Origin & Popularity". Meta descriptions are built per page (name: meaning + origin + gender; country: popular/trending + culture snippet) so they do not repeat across hundreds of pages.

---

## Step 3 — Minimum content floor (prevent thin pages)

Every programmatic page must have at least **400 words of contextual content** (excluding name lists). The generator injects structured context when needed:

- **Intro paragraph** — e.g. on name pages: what the page shows and how to use it.
- **Meaning context** — Section explaining where name meanings and origins come from (name pages).
- **Popularity context** — Section explaining how to read popularity data and links to popular/trending (name pages).
- **Internal linking paragraph** — Explicit links to homepage, baby names hub, and exploration paths.

Country, gender+country, style, letter, and last-name pages already use shared intro blocks (COUNTRY_PAGE_INTRO_BLOCK, etc.). Name detail pages now include intro, "About name meanings and origins", "Understanding popularity data", and an internal-linking paragraph. The verifier samples name, country, gender+country, style, and last-name pages and fails if word count &lt; 400.

---

## Step 4 — Internal link graph enforcement (no orphans)

Every generated page must include:

- **Homepage** — Link to `/`.
- **Main baby names hub** — Link to `/names` (e.g. "Baby names hub" in browse section).
- **Country hub** — If applicable: link to country page or "Browse by country" (countrySectionHtml). Name pages and filter pages include countrySectionHtml().
- **Gender hub** — If applicable: link to gender pages or "Browse by gender" (genderSectionHtml). Name pages and filter pages include genderSectionHtml().
- **At least 3 related pages** — Name pages have a "Related names" section (similar names, then same letter, then same gender) with at least 3 links. Country pages link to Boy names, Girl names, Popular/trending names.

No page is orphaned: the verifier ensures every sitemap URL is reachable from the homepage within 3 clicks (Step 6).

---

## Step 5 — Breadcrumb schema (static)

**JSON-LD BreadcrumbList** is injected into every programmatic page via `baseLayout()` (including name, country, and gender pages). The schema is built from the same `breadcrumbItems` used for the visible trail. Example: **Home > Baby Names > Canada > Girl Names** (gender+country page).

**Visible breadcrumb** is rendered in `<main>` via `breadcrumbHtml()` — a `<nav aria-label="Breadcrumb">` with links (e.g. Home / Baby Names / Canada / Girl names). Name pages: Home > Baby Names > {Name}. Country pages: Home > Baby Names > Names from {Country}.

---

## Step 6 — Sitemap generation automation

After programmatic generation completes, the generator **automatically runs the sitemap build** (`require('./build-sitemap.js')`). No separate sitemap step is required when running `node scripts/generate-programmatic-pages.js`.

**Included in sitemap:**

- **Homepage** (`/`) and main names index (`/names`) — in filters.xml
- **All country pages** — sitemaps/countries.xml (country + gender+country)
- **All gender pages** — filters.xml (boy, girl, unisex) and countries.xml (gender+country)
- **All name pages** — sitemaps/names.xml

**All entries use:**

- `<changefreq>weekly</changefreq>`
- `<priority>` in range **0.7–0.9**: name pages 0.9, country/gender/filters 0.8, lastname 0.7

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
| No duplicate canonical collisions | No two different pages must share the same canonical URL. The index-integrity audit script reports duplicate canonicals and exits non-zero if any are found. |

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

## Step 9 — Core Web Vitals for static

Ensure:

| Check | Implementation |
|-------|----------------|
| **JS deferred** | All `<script src="...">` use `defer`. Homepage: `/js/core.js`, `/js/accordion.js`, `/app.js` are deferred. Programmatic pages have no external script tags (only JSON-LD in `<head>`). |
| **CSS minimal** | Single stylesheet `/styles.min.css`. Run `node scripts/minify-css.js` before deploy. Generator and static pages must reference `styles.min.css` only (audit flags `styles.css`). |
| **No blocking fonts** | No Google Fonts or other external font requests. Site uses system font stack only (`--font-heading`, `--font-body` in CSS). |
| **No external calls during initial render** | No third-party scripts in `<head>`; no synchronous external requests. Same-origin data fetches (e.g. homepage trending) run from deferred scripts after DOM ready, so they do not block first paint. |

**Verification:** Index-integrity audit reports pages that reference `styles.css` (should use `styles.min.css`) or have `<script src=` without `defer`; deploy pipeline should run minify-css then generate-programmatic-pages so all output uses minified CSS.

---

## Step 10 — Search Console checklist (after deployment)

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

NameOrigin must be:

| Requirement | Meaning |
|-------------|---------|
| **Fully static** | All pages are pre-rendered static HTML at build time; no SSR or runtime HTML generation. |
| **Fully crawlable** | All pages reachable by crawlers; `robots.txt` allows `/`; no blocking rules for programmatic URLs. |
| **Fully canonical-safe** | Every page has a self-referencing canonical; no canonical to homepage on non-home; no duplicate canonical collisions. |
| **Thin-page resistant** | Programmatic pages have ≥400 words of contextual content, intro, unique H1, and required internal links; verifier and audit enforce this. |
| **Internally linked** | Every page links to homepage, hubs, and ≥3 related pages; no orphans; reachable from homepage within 3 clicks. |
| **Sitemap-synced** | Sitemap regenerated after programmatic generation; covers homepage, names, countries, filters, legal; changefreq and priority set. |
| **Search Console ready** | No noindex; sitemap submitted; URL inspection and indexing allowed; Core Web Vitals–friendly (minified CSS, deferred JS, no blocking fonts, no external calls during initial render). |

---

## Step 8 — Index integrity audit script

**Script:** `scripts/index-integrity-audit.js`

Scans all generated HTML under `OUT_DIR` (default: project root; excludes `templates/`, `docs/`, `node_modules/`, `build/`) and checks:

- **Missing canonical** — page has no or invalid `<link rel="canonical">`
- **Duplicate titles** — same `<title>` on multiple pages
- **Missing meta description** — no `<meta name="description">`
- **Pages &lt; 400 words** — main content word count below minimum
- **Pages with &lt; 8 internal links** — below minimum internal link count
- **Canonical to homepage** — non-homepage page with canonical pointing to homepage
- **Duplicate canonical collisions** — two or more pages sharing the same canonical URL
- **noindex present** — `<meta name="robots" content="noindex">` (indexability safety)
- **Core Web Vitals:** **referencesStylesCss** — page links to `styles.css` (should use `styles.min.css`); **scriptSrcWithoutDefer** — `<script src=>` without `defer`

**Output:** `build/index-integrity-report.json` (timestamp, summary, **integritySummary**, and per-issue lists). Exit code 1 if any issue is found or integrity targets are not met.

**Integrity summary (clean targets):** The report includes an `integritySummary` object with these fields. Target: all count fields = 0, `authority_coverage_score` ≥ 0.99.

| Field | Target | Meaning |
|-------|--------|---------|
| `orphan_pages` | 0 | Sitemap URLs that have a file but are not reachable from homepage within 3 clicks. |
| `broken_internal_links` | 0 | Internal links whose target path has no corresponding file (e.g. old `/name/slug.html` after switching to `/name/slug/`). |
| `duplicate_titles` | 0 | Number of distinct titles that appear on more than one page. |
| `missing_canonical` | 0 | Pages without a valid `<link rel="canonical">`. |
| `canonical_to_homepage` | 0 | Non-homepage pages whose canonical points to the homepage. |
| `pages_under_400_words` | 0 | Pages with main content &lt; 400 words. |
| `pages_with_less_than_8_internal_links` | 0 | Pages with fewer than 8 same-site links. |
| `authority_coverage_score` | ≥ 0.99 | 1 − (orphan + missing_canonical + canonical_to_homepage + duplicate_canonical_pages) / totalPages. |

Run after generating programmatic pages:

```bash
node scripts/index-integrity-audit.js
```

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
