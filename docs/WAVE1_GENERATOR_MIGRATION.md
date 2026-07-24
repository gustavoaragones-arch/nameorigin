# Wave 1 Generator Migration — Phase 3C

_Phase 3C — first production integration of the canonical adapter layer. This document describes the controlled, incremental migration of seven low-risk generators from direct `data/*.json` reads to adapter-backed canonical reads via `lib/adapters/legacy-datasets.js`. Phase 3D (Knowledge-Aware Generator Migration) has **not** been started._

## Objective

Replace legacy dataset reads with adapter-backed canonical reads **only** for Wave 1 generators whose Phase 2B/3B dependency analysis classifies them as structurally satisfiable for the collections they consume. Every migrated generator must produce byte-for-byte equivalent output wherever the canonical model already contains identical information.

Behavioral changes caused by newly available knowledge are explicitly **out of scope** for this phase.

## Migrated generators (Wave 1)

| Generator | Adapter collections | Phase 3B compatibility |
| --- | --- | --- |
| `scripts/build-sitemap.js` | `names`, `popularity` | Partially satisfied (slug enumeration covered; `countries` / `last-names` remain legacy file reads) |
| `scripts/generate-html-sitemap.js` | `names`, `popularity` | Partially satisfied (same profile as build-sitemap) |
| `scripts/generate-homepage.js` | `namesEnriched`, `popularity` | Fully satisfied |
| `scripts/generate-popularity-pages.js` | `names`, `popularity` | Fully satisfied |
| `scripts/generate-popularity-year-pages.js` | `names`, `popularity` | Fully satisfied |
| `scripts/classify-categories.js` | `namesEnriched`, `popularity` | Data-builder; enriched names + popularity adapter-backed (`category-rules` unchanged) |
| `scripts/build-popularity.js` | `names` | Data-builder; names input only adapter-backed (`raw-data` unchanged) |

### Unchanged generators (Wave 1 exclusion list)

These remain on the legacy pipeline unchanged, deferred to later waves:

- `scripts/generate-programmatic-pages.js`
- `scripts/generate-names-like.js`
- `scripts/generate-sibling-pages.js`
- `scripts/generate-trends-page.js`

All other generators continue using direct `data/*.json` reads.

## Architecture

```
data/*.json (read-only, unchanged on disk)
        ↓
lib/canonical/loaders.js
        ↓
lib/canonical/entity-builder.js
        ↓
lib/adapters/legacy-datasets.js
        ↓
lib/adapters/legacy-dataset-runtime.js  ← Wave 1 read boundary
        ↓
Wave 1 generators (logic unchanged)
```

Wave 1 generators import `loadLegacyCollection()` from `lib/adapters/legacy-dataset-runtime.js`. That runtime module calls `buildLegacyDatasets()` from `lib/adapters/legacy-datasets.js` — no generator re-implements the reshape logic.

Non-adapter datasets (`countries`, `last-names`, `category-rules`, `raw-data/*`) continue to load from their original paths unchanged.

## Rationale

1. **Lowest risk first** — sitemap and homepage generators depend primarily on identity slugs and popularity aggregates; adapter validation (Phase 3B) confirmed row-level parity for `names` and `popularity`.
2. **Incremental and reversible** — each generator can roll back independently without affecting siblings.
3. **No behavioral change** — generator rendering logic, HTML templates, routing, and URLs are untouched; only the data source at the read boundary changed.
4. **Deterministic** — adapter entity assembly uses a fixed build timestamp (`1970-01-01T00:00:00.000Z`) since Wave 1 generators do not consume metadata fields.

## Validation

Run the Wave 1 regression suite:

```bash
node scripts/build/verify-generator-regression.js
```

This generates:

| Artifact | Purpose |
| --- | --- |
| `audit/generator-regression.json` | Legacy vs adapter output comparison per generator |
| `audit/migration-progress.json` | Migrated / remaining generators and adapter utilization |
| `audit/production-equivalence.json` | URL, slug, metadata, and internal-link parity |
| `audit/migration-performance.json` | Legacy vs adapter build times and memory |

Verification checks:

- Record counts
- Identifiers and ordering (via byte comparison)
- Rendered text / generated filenames
- Metadata and internal links (HTML generators)
- Zero differences expected where canonical data is equivalent

## Rollback procedure

Each migrated generator is independently reversible:

```bash
NAMEORIGIN_LEGACY_DATA=1 node scripts/build-sitemap.js
```

Setting `NAMEORIGIN_LEGACY_DATA=1` restores direct reads from `data/*.json` for adapter-backed collections only. Remove the environment variable (or set it to `0`) to use the adapter path again.

To roll back the entire Wave 1 migration in git, revert the Phase 3C commit(s) affecting the seven generator files and `lib/adapters/legacy-dataset-runtime.js`. Original dataset files on disk are never modified by Wave 1 generators at read time.

## Constraints honored

- Migrated only Wave 1 generators
- No HTML redesign
- No routing or URL changes
- No schema changes
- No adapter redesign (`legacy-datasets.js` unchanged)
- No canonical builder changes
- Existing datasets remain read-only at the file level
- Phase 3D not started

## After Wave 1

Wave 2 (Phase 3D) migrated the remaining adapter-compatible page generators. See **`docs/WAVE2_GENERATOR_MIGRATION.md`**.

## Related documents

- `docs/ADAPTER_LAYER.md` — Phase 3B adapter design
- `docs/CANONICAL_MIGRATION_PLAN.md` — full migration specification
- `audit/generator-compatibility-simulation.json` — Phase 3B structural compatibility
- `audit/adapter-validation.json` — row-level parity proof
