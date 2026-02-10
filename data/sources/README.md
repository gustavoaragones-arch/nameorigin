# Curated meaning/origin sources

**curated-meanings.json** — Human-verified name meanings and origins only. No AI-generated content.

- **name** (required): Exact spelling as in main names list (match is case-insensitive).
- **meaning**: Verified meaning; cite linguistic or academic source when possible.
- **origin_country**: Country or culture of origin (e.g. Ireland, Hebrew, India).
- **language**: Language of origin (e.g. Irish, Latin, Sanskrit).

Used by `scripts/enrich-meanings.js` with `confidence_score` 1.0 and `meaning_source` / `origin_source` set to `"curated"`.

---

**category-rules.json** — Optional override/extend rules for `scripts/classify-categories.js`.

- **byOrigin**: object mapping origin/language (lowercase, no spaces) to category, e.g. `"hebrew": "biblical"`, `"greek": "classical"`.
- **byName**: object mapping lowercase name to category or array of categories, e.g. `"mary": "biblical"`.
- **byMeaningKeyword**: array of `{ "keywords": ["word1", "word2"], "category": "nature" }` to add meaning-based rules.
