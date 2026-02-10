# Phase 0.5 — UX Conversion Layer ✅

Lightweight interaction modules for nameorigin.io. All implemented.

## Constraints (met)

- **HTML5 + vanilla JS only** — no React/Vue/jQuery
- **Pure CSS animations** — transitions, no JS animation libraries
- **No frameworks** — Tailwind/CDN/UI libs not used
- **SEO-safe semantic HTML** — headings, landmarks, core content in DOM
- **Mobile-first responsive** — 8px grid, breakpoints in `styles.css`

---

## 1. Name Personality Quiz ✅

- **Location**: `#quiz-section` (index.html), logic in app.js
- **Features**: 5 questions (classic/modern, short/long, cultural, rare/popular, soft/strong) → style tag (e.g. Modern Nordic, Classic British) + matching names + CTA
- **Persistence**: `localStorage.nameStyle` (styleId, styleLabel, answers, completedAt)
- **Returning users**: Result shown on load if saved

---

## 2. Swipe Name Discovery ✅

- **Location**: `#swipe-section` (index.html), logic in app.js
- **Features**: Shuffled deck from names.json; 👎 Skip, ❤️ Like, ⭐ Save; touch swipe (right = like, left = skip)
- **Storage**: Favorites in `localStorage.savedNames` (same as Favorites system)
- **UI**: Card with name/meta/meaning; shortlist + favorites list below

---

## 3. Phonetic Compatibility Visualizer ✅

- **Location**: `#phonetic-section` (index.html), logic in app.js
- **Features**: First + last name inputs → rule-based scores: Length harmony, Sound rhythm, Ending match; “Flows naturally” overall %; short description
- **Visuals**: Three horizontal bars (CSS only), no charts lib
- **Data**: Uses names only (syllable heuristic); no AI

---

## 4. Cultural Origin Badges ✅

- **Location**: Result card (`#result-badges`), swipe card (`#swipe-badges`), programmatic name pages (generate-programmatic-pages.js)
- **Features**: Flag emoji + label (e.g. 🇮🇪 Irish) on name cards; hover = short origin hint (tooltip)
- **Lookup**: Rule-based map by origin_country / language in core.js and app

---

## 5. Favorites System ✅

- **Location**: Nav “📄 Saved Names”, `#saved-names-section`, result card “❤️ Save” button, swipe “⭐ Save”
- **Features**: Save/remove from result and swipe; list in “Your saved names” with links to `/name/[slug]`; Download PDF button (disabled, “coming later”)
- **Storage**: `localStorage.savedNames` (array of { id, name, slug, savedAt }); migration from legacy `favoriteNames` on first load

---

## 6. Trending Near You ✅

- **Location**: `#trending-section` (index.html), logic in app.js
- **Features**: `navigator.language` → country (Canada, UK, India, USA); “Trending names in [Country]” + list; USA fallback if no data for locale
- **Data**: `data/popularity.json` + `data/names.json`; Canada/UK entries present

---

## 7. Expandable Meaning Panels ✅

- **Location**: Trending list, Saved names list (name cards); result card “More: popularity & similar names”
- **Features**: Click name → accordion opens with Meaning, Origin, Popularity trend, Similar names; CSS `grid-template-rows` transition; content filled on first open
- **SEO**: All names visible in DOM (trigger text); panels are enhancement only
- **Modules**: `js/accordion.js` (buildNameCard, loadPopularity, getSimilarNames), `js/core.js` (shared API)

---

## File map

| Asset        | Purpose                                      |
|-------------|----------------------------------------------|
| index.html  | All sections, semantic structure, no JS-only content |
| styles.css  | Tokens, layout, cards, accordion, bars, badges |
| app.js      | Search, quiz, swipe, phonetic, geo/trending, inits |
| js/core.js  | loadNamesIndex, getSavedNames, slugify, origin badges, renderSavedNamesSection |
| js/accordion.js | buildNameCard, loadPopularity, getSimilarNames |
| data/*.json | names, popularity, categories, variants, countries, compatibility_patterns (stub) |

Script order: `js/core.js` → `js/accordion.js` → `app.js`.
