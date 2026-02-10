# Base templates

Canonical HTML structure for generated pages. Use `{{PLACEHOLDER}}` in generator scripts to inject content.

## name-page.html

**Use for:** Individual name detail pages (`/name/{slug}`).

| Placeholder | Description |
|-------------|-------------|
| `{{BREADCRUMB_SCHEMA}}` | JSON-LD BreadcrumbList |
| `{{NAME_STRUCTURED_DATA}}` | JSON-LD Person (name, description) |
| `{{FAQ_SCHEMA}}` | JSON-LD FAQPage (optional) |
| `{{BREADCRUMB_HTML}}` | Visible breadcrumb nav |
| `{{NAME}}`, `{{MEANING}}`, `{{ORIGIN}}`, `{{GENDER}}` | Name fields |
| `{{ORIGIN_BADGE}}` | Origin badge HTML |
| `{{PHONETIC_HTML}}` | Pronunciation (optional) |
| `{{POPULARITY_HTML}}` | Popularity table |
| `{{VARIANTS_HTML}}` | Variants list |
| `{{STYLE_TAGS_HTML}}` | Style/category tags |
| `{{COMPATIBILITY_TIPS_HTML}}` | Last-name compatibility copy |
| `{{CORE_LINKS_HTML}}` | Core links (home, generator, trending, top, etc.) |
| `{{CONTEXTUAL_LINKS_HTML}}` | Same gender, origin, style, letter links |
| `{{SIMILAR_NAMES_HTML}}` | “Similar names you may like” list |
| `{{RELATED_LINKS_HTML}}` | Full internal link list |
| `{{META_DESCRIPTION}}`, `{{PAGE_TITLE}}`, `{{CANONICAL_URL}}` | Meta |

**Includes:** Breadcrumb schema, Person schema, FAQ schema, expandable panels (`<details>`/`<summary>`), internal link module.

---

## filter-page.html

**Use for:** List/filter pages (e.g. `/names`, `/names/boy`, `/names/style/nature`, `/names/a`).

| Placeholder | Description |
|-------------|-------------|
| `{{BREADCRUMB_SCHEMA}}`, `{{BREADCRUMB_HTML}}` | Breadcrumbs |
| `{{FAQ_SCHEMA}}`, `{{FAQ_HTML}}` | FAQ (optional) |
| `{{TITLE}}`, `{{INTRO_TEXT}}` | Intro block |
| `{{HUB_LINKS_HTML}}` | Hub navigation links |
| `{{RESULTS_HEADING}}`, `{{RESULTS_HTML}}` | Results grid (name list) |
| `{{CORE_LINKS_HTML}}` | Explore links |
| `{{META_DESCRIPTION}}`, `{{PAGE_TITLE}}`, `{{CANONICAL_URL}}` | Meta |

**Includes:** Intro text block, results grid, hub links, FAQ, breadcrumbs.

---

## last-name-page.html

**Use for:** Last-name compatibility pages (`/names/with-last-name-{slug}`).

| Placeholder | Description |
|-------------|-------------|
| `{{LAST_NAME}}`, `{{INTRO_TEXT}}` | Title and intro |
| `{{COMPATIBILITY_LOGIC_HTML}}` | Generic compatibility rules (vowel/consonant, syllables) |
| `{{PHONETIC_EXPLANATION_HTML}}` | Surname-specific phonetic tips |
| `{{CULTURAL_MATCHING_HTML}}` | Cultural/origin matching copy and names |
| `{{COMPATIBLE_NAMES_HTML}}` | List of compatible first names |
| `{{HUB_LINKS_HTML}}`, `{{FILTER_LINKS_HTML}}`, `{{CORE_LINKS_HTML}}` | Internal link clusters |

**Includes:** Compatibility logic, phonetic explanation, internal link clusters.

---

## hub-page.html

**Use for:** Hub/index pages that list all related generated pages.

| Placeholder | Description |
|-------------|-------------|
| `{{HUB_TITLE}}`, `{{INTRO_TEXT}}` | Title and intro |
| `{{NAME_LISTS_HTML}}` | All names, Boy, Girl, Unisex, Trending, Popular |
| `{{COUNTRY_INDEX_HTML}}` | Country index (USA, Canada, etc.) |
| `{{GENDER_COUNTRY_HTML}}` | Gender × country links |
| `{{STYLE_INDEX_HTML}}` | Style pages (nature, classic, etc.) |
| `{{LAST_NAME_INDEX_HTML}}` | Last-name compatibility pages |
| `{{ALPHABET_INDEX_HTML}}` | A–Z letter pages |
| `{{CORE_LINKS_HTML}}` | Explore links |

**Includes:** All related generated pages, alphabet index, country index, authority hub links.

---

## Usage

The generator (`scripts/generate-programmatic-pages.js`) currently builds HTML inline with `baseLayout()`. To use these templates:

1. Load the template file (e.g. `fs.readFileSync('templates/name-page.html', 'utf8')`).
2. Replace each `{{PLACEHOLDER}}` with the computed value.
3. Optionally wrap in the same header/footer as `baseLayout()` or use the template’s full document.

Empty or optional sections can be replaced with `''` or omitted if the template is parsed and sections removed when empty.
