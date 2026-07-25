# Citation Records v1

_Phase 8B — citation population only, citation infrastructure frozen._

Phase 8B populates entity-level Citation Records for all existing Knowledge Records using the resolved citation mappings from Phase 8A. No editorial content, Knowledge Record schema, rendering, or KCI weights are modified.

## Relationship between artifacts

```
Knowledge Record v2 (unchanged)
        │  sources: [{ type, reference }]
        ▼
Citation Registry v1 (frozen)
        │  17 canonical publications
        ▼
Citation Resolutions v1 (frozen)
        │  per-record domain → citationIds
        ▼
Citation Records v1 (Phase 8B output)
        │  per-entity domain → sorted unique citation IDs
        ▼
Future: KCI citation scoring (Phase 8C+)
```

| Artifact | Path | Role |
| --- | --- | --- |
| Knowledge Records | `data/knowledge-records.json` | Editorial content (unchanged) |
| Citation Registry | `data/citation-registry.json` | Canonical publication definitions |
| Citation Resolutions | `data/citation-resolutions.json` | Source → Citation ID compatibility layer |
| Citation Records | `data/citation-records.json` | Entity-level citation assignments |

## Record model

```json
{
  "name": "Aadi",
  "citations": {
    "origin": ["OXFORD_FIRST_NAMES_2006"],
    "meaning": ["OXFORD_FIRST_NAMES_2006"],
    "pronunciation": [
      "OXFORD_FIRST_NAMES_2006",
      "UNIVERSITY_OF_DELHI_SANSKRIT_PRONUNCIATION"
    ],
    "etymology": [
      "OXFORD_FIRST_NAMES_2006",
      "UNIVERSITY_OF_DELHI_SANSKRIT_ETYMOLOGY"
    ],
    "history": [
      "OXFORD_FIRST_NAMES_2006",
      "UNIVERSITY_OF_DELHI_SANSKRIT_USAGE"
    ]
  }
}
```

Rules:

- One Citation Record per Knowledge Record (1,150 total).
- Only populated editorial domains appear in `citations`.
- Citation IDs are sorted alphabetically within each domain.
- Duplicate Citation IDs within a domain are removed.
- Every Citation ID must exist in the Citation Registry.

Schema: `schemas/citation-records-v1.schema.json`

## Deterministic build workflow

```bash
node scripts/build/run-citation-records-audit.js
```

Or step-by-step:

```bash
node scripts/editorial/build-citation-records.js
node scripts/build/validate-citation-records.js
node scripts/build/run-editorial-qa.js
node scripts/build/run-citation-equivalence.js
```

`build-citation-records.js`:

1. Reads `data/knowledge-records.json`.
2. Reads `data/citation-resolutions.json`.
3. Builds deterministic Citation Records.
4. Writes `data/citation-records.json`.

## Validation

`validate-citation-records.js` verifies:

- Schema compliance
- Every Citation ID exists in the Registry
- No duplicate IDs within a domain
- Deterministic record and ID ordering
- Complete coverage for all populated editorial domains
- Deterministic rebuild equivalence

## Future KCI integration

Citation Records provide the data layer for entity-level citation scoring (10 KCI points). KCI citation weighting remains **disabled** until a future phase explicitly enables scoring against `citation-records.json`.

Phase 8B completes the citation **data model**. Future Wave 2 editorial batches (Phase 8C+) should emit Citation IDs natively during research rather than requiring a separate enrichment pass.

## Phase 8B results

| Metric | Value |
| --- | ---: |
| Citation Records generated | **1,150** |
| Knowledge Records matched | 1,150 |
| Citation IDs assigned | **7,886** |
| Average citations per entity | **6.86** |
| Duplicate removals | 0 |
| Unresolved Citation IDs | **0** |
| Citation validation | **PASS** |
| Editorial QA | **PASS** (0 issues) |
| Citation equivalence | **PASS** |
| KCI average | **23.74** (unchanged) |
| KCI citation coverage | 0% (scoring not yet enabled) |
| Pipeline runtime | ~3.1s |

Domain citation coverage (entities with Citation Records per domain):

| Domain | Count | % of entities |
| --- | ---: | ---: |
| Origin | 978 | 26.45% |
| Meaning | 906 | 24.51% |
| Pronunciation | 976 | 26.40% |
| Etymology | 964 | 26.08% |
| History | 964 | 26.08% |

Audit artifact: `audit/citation-records.json`

## Related files

| File | Role |
| --- | --- |
| `scripts/editorial/citation-records-v1.js` | Shared build/load library |
| `scripts/editorial/build-citation-records.js` | Citation Records builder |
| `scripts/build/validate-citation-records.js` | Validation |
| `scripts/build/run-citation-records-audit.js` | Phase 8B audit runner |
| `audit/citation-records.json` | Phase 8B audit artifact |
| `docs/CITATION_INFRASTRUCTURE_V1.md` | Phase 8A infrastructure docs |

## Boundaries preserved

- Citation Registry unchanged
- Citation resolver unchanged
- Knowledge Record v2 unchanged
- Editorial text, confidence, and provenance unchanged
- `names-enriched.json` unchanged
- Rendering unchanged
- KCI weights unchanged (citation scoring not yet enabled)
