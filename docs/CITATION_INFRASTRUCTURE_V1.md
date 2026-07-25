# Citation Infrastructure v1

_Phase 8A — infrastructure only, no editorial expansion._

Phase 8A introduces a canonical, deterministic citation layer that editorial domains can reference without modifying Knowledge Record v2, enrichment output, rendering, or KCI weights.

## Objective

Create reusable citation infrastructure supporting Origin, Meaning, Pronunciation, Etymology, and History provenance references.

| Capability | Status |
| --- | --- |
| Canonical Citation Registry | ✅ `data/citation-registry.json` |
| Deterministic Citation IDs | ✅ |
| Source normalization | ✅ |
| Knowledge Record compatibility layer | ✅ `data/citation-resolutions.json` |
| Validation + equivalence audits | ✅ |

Knowledge Record `sources` arrays remain unchanged. Citation IDs are resolved in a separate compatibility layer.

## Architecture

```
Knowledge Record v2 (unchanged)
        │
        │  sources: [{ type, reference }, …]
        ▼
build-citation-registry.js
        │
        ▼
data/citation-registry.json   ← single source of truth for publications
        │
        ▼
resolve-citations.js
        │
        ▼
data/citation-resolutions.json   ← sourceKey → citationId + per-record domain maps
```

## Registry model

Each citation receives a deterministic identifier:

```json
{
  "id": "OXFORD_FIRST_NAMES_2006",
  "title": "Oxford Dictionary of First Names",
  "type": "onomastic_dictionary",
  "publisher": "Oxford University Press",
  "edition": "1st",
  "year": 2006,
  "language": "en",
  "authority": "Patrick Hanks, Kate Hardcastle, Flavia Hodges",
  "license": "editorial_reference",
  "url": null,
  "retrieved": null,
  "canonicalReference": "Oxford Dictionary of First Names (Hanks, Hardcastle, Hodges, 2006)",
  "sourceTypes": ["academic_reference", "etymological_dictionary", "historical_name_dictionary", "onomastic_dictionary"]
}
```

Schema: `schemas/citation-registry-v1.schema.json`

## Deterministic ID generation

1. Collect all `{ type, reference }` pairs from Knowledge Records and Wave 1 source catalogs.
2. Normalize `reference` to a canonical publication key.
3. Assign a predefined ID from the publication metadata catalog when available.
4. Otherwise derive an uppercase slug from the canonical reference.
5. Sort citations by `id` for stable output.

## Normalization rules

| Rule | Example |
| --- | --- |
| ODFN variants collapse to one publication | `Oxford Dictionary of First Names — Indian name etymology key` → `OXFORD_FIRST_NAMES_2006` |
| Same publication, different source types | All map to one Citation ID |
| Distinct publications | Separate IDs (e.g. `LGPN`, `DMNES`, `CAMBRIDGE_ENGLISH_PRONOUNCING_DICTIONARY`) |
| No duplicated publication definitions | Registry is the single source of truth |

## Resolver pipeline

`resolve-citations.js`:

1. Load `citation-registry.json`.
2. Build `sourceResolutionIndex` mapping `type|reference` → `citationId`.
3. Walk every populated Knowledge Record domain.
4. Attach resolved Citation IDs per domain without modifying KR sources.
5. Fail if any source reference cannot be resolved.

Output: `data/citation-resolutions.json`

## Validation workflow

```bash
node scripts/build/run-citation-infrastructure-audit.js
```

Or step-by-step:

```bash
node scripts/editorial/build-citation-registry.js
node scripts/editorial/resolve-citations.js
node scripts/build/validate-citation-registry.js
node scripts/build/run-editorial-qa.js
node scripts/build/run-citation-equivalence.js
```

`validate-citation-registry.js` verifies:

- Unique citation IDs
- No duplicate canonical publications
- Required metadata present
- Stable registry ordering
- 100% source resolution coverage
- Deterministic registry rebuild

`run-citation-equivalence.js` verifies:

- Knowledge Records unchanged (hash-equivalent)
- `names-enriched.json` unchanged
- KCI average, max, and weights unchanged
- Only citation artifacts added

## Future Wave 2 integration

| Phase | Work |
| --- | --- |
| **8A (this phase)** | Registry, resolver, validation, audits — infrastructure only |
| **8B** | Populate canonical entity-level citation records from resolved provenance |
| **8C+** | New Wave 2 editorial batches emit Citation IDs natively at research time |

Phase 8A deliberately mirrors the Knowledge Record v2 pattern: build the engine first, populate data second.

## Related files

| File | Role |
| --- | --- |
| `scripts/editorial/citation-infrastructure-v1.js` | Shared normalization + registry library |
| `scripts/editorial/build-citation-registry.js` | Registry builder |
| `scripts/editorial/resolve-citations.js` | Resolver / compatibility layer |
| `scripts/build/validate-citation-registry.js` | Registry validation |
| `scripts/build/run-citation-equivalence.js` | KR / enrichment / KCI equivalence |
| `scripts/build/run-citation-infrastructure-audit.js` | Full Phase 8A audit runner |
| `audit/citation-infrastructure.json` | Phase 8A audit artifact |
| `audit/citation-equivalence.json` | Equivalence audit artifact |
| `docs/CITATION_INFRASTRUCTURE_V1.md` | This document |

## Phase 8A results

| Metric | Value |
| --- | ---: |
| Canonical citations in registry | **17** |
| Unique raw reference strings | 31 |
| Raw source entries (type \| reference) | 38 |
| Duplicate publications normalized | **14** |
| Source references resolved | **7,886 / 7,886** (100%) |
| Knowledge Records with citation mappings | 1,150 |
| Editorial QA | **PASS** (0 issues) |
| Citation equivalence | **PASS** |
| KCI average | **23.74** (unchanged) |
| Entity citation coverage (KCI dimension) | 0% (population deferred to Phase 8B) |
| Pipeline runtime | ~3.5s |

Primary normalization win: **14** ODFN and related reference variants collapse to `OXFORD_FIRST_NAMES_2006`.

## Boundaries preserved

- Knowledge Record v2 schema unchanged
- Editorial values unchanged
- Rendering / HTML / routing unchanged
- KCI weights unchanged
- Editorial QA rules unchanged
- Deterministic rebuild pipeline unchanged
