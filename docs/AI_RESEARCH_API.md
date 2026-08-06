# AI / Research API v1

_Phase 18B — deterministic read-only API facade over the Export Contract._

Phase 18B exposes the frozen Export Contract through a versioned, deterministic query layer. The API performs lookup, filtering, search, and serialization only. It never generates knowledge, computes relationships, or reads internal project structures.

## Objective

Provide a stable machine interface for research tools, AI integrations, and future SDKs without coupling consumers to internal `data/` layouts.

## Architecture

```
Knowledge Records (Frozen)
Citation Records (Frozen)
Popularity Records (Frozen)
        │
17A Knowledge Graph
        │
17B Navigation
        │
17C Presentation
        │
18A Export Contract
        │
        ▼
18B AI / Research API (read-only)
        │
        ▼
JSON Responses
```

Phase 18B is a **query layer**, not an application backend.

## Export Contract (sole input)

The API imports **only** artifacts under `exports/`:

| Export artifact | API usage |
| --- | --- |
| `manifest.json` | Dataset metadata endpoint |
| `knowledge.json` | Entity knowledge payloads |
| `citations.json` | Entity citation payloads |
| `popularity.json` | Entity popularity payloads |
| `navigation-*.json` | Relationship and explorer payloads |

The API must **never** import:

- `data/`
- Graph engine (`relationship-engine.js`)
- Navigation engine (`navigation-engine.js`)
- Editorial generators
- KCI engine
- Presentation layer

## Versioning

All endpoints are versioned under `/api/v1/`.

Future breaking changes ship as `/api/v2/` without affecting v1 consumers.

## API surface

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/v1/manifest` | Export manifest, versions, hashes, counts |
| GET | `/api/v1/name/{slug}` | Knowledge + Citation + Popularity + Navigation |
| GET | `/api/v1/relationships/{slug}` | Navigation only |
| GET | `/api/v1/origin/{group}` | Same Origin explorer group |
| GET | `/api/v1/language/{group}` | Same Language explorer group |
| GET | `/api/v1/meaning/{group}` | Related Meaning explorer group |
| GET | `/api/v1/cultural/{group}` | Cultural Group explorer group |
| GET | `/api/v1/search?q=` | Deterministic prefix lookup (max 25) |

Explorer `{group}` path segments are derived deterministically from navigation group IDs (`:` → `-`, `|` → `--`, spaces → `-`).

## Response envelope

Every response includes reproducibility metadata:

```json
{
  "apiVersion": "1",
  "datasetVersion": "18A-v1",
  "semanticHash": "...",
  "generatedAt": "...",
  "endpoint": "/api/v1/name/aadi",
  "...": "..."
}
```

No endpoint performs computation beyond lookup and serialization.

## Static payloads

During development, deterministic JSON payloads are generated under `api/` (gitignored):

```
api/v1/manifest.json
api/v1/name/{slug}.json
api/v1/relationships/{slug}.json
api/v1/origin/{group}.json
api/v1/language/{group}.json
api/v1/meaning/{group}.json
api/v1/cultural/{group}.json
api/v1/search-index.json
api/v1/search/{prefix}.json
api/indexes/slugs.json
api/indexes/endpoints.json
```

## Validation

Every API build verifies:

- Every endpoint resolves
- Entity counts match export manifest (3,697)
- Deterministic ordering
- Lookup correctness (search prefix, name slug)
- Manifest consistency with export bundle
- Export hash unchanged (byte-identical contract)
- Rebuild reproducibility (stable semantic hash)
- No forbidden imports of internal modules or `data/`

## Pipeline

Prerequisites:

```bash
node scripts/build/generate-structured-exports.js
node scripts/build/validate-structured-exports.js
```

Phase 18B:

```bash
node scripts/build/generate-api-indexes.js
node scripts/build/validate-api.js
```

## Frozen guarantees

| Layer | Phase 18B behavior |
| --- | --- |
| Export Contract | Read-only — hash verified unchanged |
| Knowledge Records | Not read directly |
| Graph / Navigation engines | Not invoked |
| KCI | Not read or computed |
| Presentation (17C) | Not read or modified |

## Related files

| File | Role |
| --- | --- |
| `lib/api/export-api.js` | Query engine over Export Contract |
| `scripts/build/generate-api-indexes.js` | Deterministic lookup indexes + static payloads |
| `scripts/build/validate-api.js` | Integrity validator |
| `audit/api.json` | Audit metrics and validation summary |

## Roadmap position

| Phase | Focus |
| --- | --- |
| 17A–17C | Graph → Navigation → Presentation ✅ |
| 18A | Structured Export Engine ✅ |
| **18B** | AI / Research API → freeze |
| 19A | Versioned Dataset Publication |

## Public interfaces

| Contract | Path | Consumers |
| --- | --- | --- |
| Navigation Contract | `data/navigation/*.json` | Presentation (17C) |
| Export Contract | `exports/*` | API (18B), research tools, publication (19A) |

Every machine consumer must use the Export Contract. Internal `data/`, `graph/`, and `navigation/` paths remain platform implementation details.

Build → Validate → Freeze → Expose → Publish.
