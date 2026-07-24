# Knowledge Record v2

_Phase 6A — unified editorial data architecture (internal only)._

Knowledge Record v2 consolidates the five Wave 1 editorial domains (Origin, Meaning, Pronunciation, Etymology, History) into a single deterministic record per name while preserving all enrichment semantics and rendered output.

## Architecture

```
Legacy override files (compatibility layer)
origin-overrides.json
meaning-overrides.json
pronunciation-overrides.json
etymology-overrides.json
history-overrides.json
        │
        ▼
build-knowledge-records.js
        │
        ▼
data/knowledge-records.json   ← canonical editorial source (v2)
        │
        ▼
rebuild-names-enriched.js
        │
        ▼
data/names-enriched.json
        │
        ▼
canonical builder → KCI → (future) generator rebuild
```

During Phase 6A, legacy override files remain supported. The rebuild script prefers `knowledge-records.json` when present and falls back to legacy per-domain files if absent.

## Schema (frozen v2.0)

Envelope:

```json
{
  "schemaVersion": "2.0",
  "title": "Knowledge Record v2",
  "generatedAt": "2026-07-24T00:00:00.000Z",
  "records": [ ... ]
}
```

Each record:

```json
{
  "name": "Emma",
  "origin": {
    "value": {
      "origin_country": "England",
      "origin_cluster": "Germanic",
      "language": "English"
    },
    "confidence": 0.92,
    "confidenceLevel": "high",
    "sources": [
      { "type": "historical_name_dictionary", "reference": "Oxford Dictionary of First Names (2006)" }
    ],
    "notes": "Wave 1 explicit editorial assignment."
  },
  "meaning": { "value": "...", "confidence": 0.88, "confidenceLevel": "medium", "sources": [], "notes": null },
  "pronunciation": { "value": "EM-uh", "confidence": 0.88, "confidenceLevel": "medium", "sources": [], "notes": null },
  "etymology": { "value": "...", "confidence": 0.90, "confidenceLevel": "high", "sources": [], "notes": null },
  "history": { "value": "...", "confidence": 0.92, "confidenceLevel": "high", "sources": [], "notes": null }
}
```

Domain keys are omitted when no editorial data exists for that name.

JSON Schema: `schemas/knowledge-record-v2.schema.json`

### Domain value shapes

| Domain | `value` type | Enriched field |
| --- | --- | --- |
| Origin | `{ origin_country, origin_cluster, language }` | `origin_country`, `origin_cluster`, `language`, `origin_confidence` |
| Meaning | string | `meaning` |
| Pronunciation | string (respelling) | `phonetic` |
| Etymology | string | `etymology` |
| History | string | `history` |

Metadata fields (`confidence`, `confidenceLevel`, `sources`, `notes`) are editorial only — not rendered directly.

## Migration strategy

1. **Build** — `node scripts/editorial/build-knowledge-records.js`
   - Reads all five legacy override files
   - Enriches with wave-1 research metadata (`data/sources/*-wave1-research.json`) where available
   - Writes `data/knowledge-records.json` with records sorted alphabetically by name

2. **Validate** — `node scripts/build/validate-knowledge-records.js`
   - Schema shape validation
   - Deterministic ordering check
   - Every legacy override entry migrated with preserved values and confidence
   - Source metadata and notes preserved from research files

3. **Equivalence** — `node scripts/build/run-knowledge-record-equivalence.js`
   - Compares legacy pipeline vs Knowledge Record pipeline
   - Requires zero field differences across all 3,697 entities
   - Verifies KCI identical

4. **Rebuild** — `node scripts/editorial/rebuild-names-enriched.js`
   - Prefers Knowledge Record v2 when present

## Deterministic guarantees

- Records sorted by lowercase name key
- No inferred editorial content during migration
- No generated prose — values copied from existing overrides only
- Research metadata copied from existing research files only
- `confidenceLevel` derived from stored confidence using frozen thresholds (≥0.90 high, ≥0.85 medium, else low) when not present in research

## Compatibility layer

| Component | Status |
| --- | --- |
| Legacy override files | Retained (read fallback) |
| Wave 1 apply scripts | Unchanged — still write legacy overrides |
| `rebuild-names-enriched.js` | Reads Knowledge Record v2 first |
| Rendering / HTML | Unchanged |
| Canonical schema | Unchanged |
| KCI weights | Unchanged |

Legacy override removal is deferred to a future phase after extended validation.

## Validation

```bash
node scripts/editorial/build-knowledge-records.js
node scripts/build/validate-knowledge-records.js
node scripts/build/run-knowledge-record-equivalence.js
```

Audit artifact: `audit/knowledge-record-migration.json`

## Phase 6A results

| Metric | Value |
| --- | ---: |
| Total records | 757 |
| Origin domains | 585 |
| Meaning domains | 513 |
| Pronunciation domains | 583 |
| Etymology domains | 571 |
| History domains | 571 |
| Equivalence differences | 0 |
| KCI average | 15.24 (unchanged) |
| KCI max | 90 (unchanged) |

## Future extensibility

Knowledge Record v2 is designed to absorb additional editorial domains (e.g. Citations) as sibling domain objects without changing enrichment merge semantics. Wave 2 expansion can add or update records in a single file rather than maintaining separate override files per domain.

## Related files

| File | Role |
| --- | --- |
| `scripts/editorial/knowledge-record-v2.js` | Shared library (build, load, merge) |
| `scripts/editorial/build-knowledge-records.js` | Migration builder |
| `scripts/editorial/rebuild-names-enriched.js` | Enrichment rebuild |
| `scripts/build/validate-knowledge-records.js` | Migration validation |
| `scripts/build/run-knowledge-record-equivalence.js` | Equivalence audit |
