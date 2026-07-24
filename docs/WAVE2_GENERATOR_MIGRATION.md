# Wave 2 Generator Migration — Phase 3D

_Phase 3D completes the infrastructure migration started in Phase 3C (Wave 1). Adapter-compatible page generators with larger rendering footprints are switched to canonical-backed reads while preserving every byte of current output — including intentional fallback behavior. Phase 4 (Knowledge Activation) has **not** been started._

## Objective

Migrate the remaining structurally compatible generators to adapter-backed data. **Zero behavioral change.** Newly available canonical knowledge (e.g. enriched origin on generators that historically read `data/names.json`) is deliberately **not** activated until Phase 4.

## Migrated generators (Wave 2)

| Generator | Adapter collections | Legacy file reads retained |
| --- | --- | --- |
| `scripts/generate-programmatic-pages.js` | `namesEnriched`, `popularity`, `categories`, `variants` | `countries`, `last-names`, `build/topic-clusters.json` |
| `scripts/generate-names-like.js` | `namesBase`, `popularity`, `categories` | — |
| `scripts/generate-sibling-pages.js` | `namesBase`, `popularity`, `categories` | — |
| `scripts/generate-lastname-pages.js` | `namesBase` | `last-names`, heraldry/compatibility prose pools |
| `scripts/generate-compare-pages.js` | `namesBase`, `popularity` | — |
| `scripts/generate-equivalent-pages.js` | `namesEnriched` | `name-equivalents.json` |

### Wave 1 (unchanged, still migrated)

See `docs/WAVE1_GENERATOR_MIGRATION.md` for the seven Wave 1 generators (sitemaps, homepage, popularity pages, data-builders).

### Remaining on legacy pipeline

| Generator | Reason |
| --- | --- |
| `scripts/generate-trends-page.js` | **requires-refactor** (Phase 2B) — reads popularity, regional-trend-acceleration, and country-differentials with three incompatible access patterns; adapter cannot remove that reconciliation logic |

After Wave 2, **only `generate-trends-page.js`** remains a legacy-read page generator awaiting its dedicated refactor phase.

## Behavior preservation: `namesBase`

Phase 3B intentionally unified adapter `names` and `namesEnriched` to enriched-equivalent records. Generators that historically read **`data/names.json` (unenriched)** — `generate-names-like.js`, `generate-sibling-pages.js`, `generate-compare-pages.js`, `generate-lastname-pages.js` — use runtime collection **`namesBase`**, which always reads the on-disk unenriched file. This preserves existing fallback strings and scoring inputs until Phase 4.

This is a runtime routing decision in `lib/adapters/legacy-dataset-runtime.js`, not an adapter-layer redesign.

## Migration rule

1. Import `loadLegacyCollection` / `loadJsonFromFile` from `lib/adapters/legacy-dataset-runtime.js`.
2. Replace adapter-covered `loadJson(...)` calls only.
3. Do **not** change rendering logic, templates, URLs, or structured-data blocks.
4. Roll back per generator with `NAMEORIGIN_LEGACY_DATA=1`.

## Validation

```bash
node scripts/build/verify-generator-regression.js
```

Verifies Wave 1 + Wave 2 generators:

- Identical HTML (byte-for-byte)
- Identical metadata, URLs, filenames, internal links
- Identical JSON-LD structured data
- Zero regression count across all migrated generators

Audit artifacts:

- `audit/generator-regression.json`
- `audit/production-equivalence.json`
- `audit/migration-progress.json`
- `audit/migration-performance.json`

## Rollback

```bash
NAMEORIGIN_LEGACY_DATA=1 node scripts/generate-programmatic-pages.js
```

Each generator rolls back independently. Revert git commits for a full Wave 2 rollback.

## Remaining technical debt

1. **`generate-trends-page.js`** — requires refactor before adapter migration.
2. **Reference datasets without adapters** — `countries`, `last-names`, `name-equivalents`, `topic-clusters`, trend/differential files.
3. **Per-process adapter rebuild** — each generator spawn rebuilds canonical entities; a shared build orchestrator could amortize cost (measured, not implemented).
4. **`namesBase` vs enriched adapter `names`** — Phase 4 will retire `namesBase` reads where enriched knowledge should flow through.

## After Wave 2

Infrastructure migration is effectively complete. The next focus shifts to **Phase 4 — Knowledge Activation**: using the canonical model to remove fallback content and improve page quality, starting with high-ROI domains (origin, meaning, pronunciation, popularity) from Phase 1D.

## Related documents

- `docs/WAVE1_GENERATOR_MIGRATION.md`
- `docs/ADAPTER_LAYER.md`
- `audit/generator-compatibility-simulation.json`
- `audit/backward-compatibility.json`
