# Structured Export Engine v1

_Phase 18A — read-only publication layer for machine-consumable datasets._

Phase 18A exports the complete frozen knowledge system into deterministic, machine-consumable bundles. It does not regenerate graph or navigation data, modify editorial records, or touch KCI or presentation layers.

## Objective

Establish the platform's first publication layer: standardized exports that downstream APIs, research tools, and dataset publication can consume without reading internal project structures.

## Architecture

```
Knowledge Records (Frozen)
Citation Records (Frozen)
Popularity Records (Frozen)
Knowledge Graph (Frozen)
Navigation Contract (Frozen)
        │
        ▼
18A Structured Export Engine (read-only)
        │
        ▼
Export Bundles (JSON / JSONL / CSV / Manifest)
```

Phase 18A stops at export generation and validation. No UI, no API, no mutation of upstream layers.

## Export Contract v1

The contents of `exports/` form the **Export Contract** — the only supported machine interface for downstream consumers.

```
exports/
  manifest.json
  knowledge.json | knowledge.jsonl | knowledge.csv
  citations.json | citations.jsonl | citations.csv
  popularity.json | popularity.jsonl | popularity.csv
  graph-nodes.json | graph-edges.json | graph.jsonl
  navigation-related.json
  navigation-origin.json
  navigation-language.json
  navigation-meaning.json
  navigation-pronunciation.json
  navigation-cultural.json
```

Phase 18B (AI / Research API), Phase 19A (Dataset Publication), external tools, and future SDKs must consume **only** this contract. Nothing should read internal `data/` structures directly.

The platform now exposes two stable public interfaces:

| Contract | Consumers |
| --- | --- |
| Navigation Contract (`data/navigation/*.json`) | Presentation (17C), UI |
| Export Contract (`exports/*`) | APIs, research tools, dataset publication |

## Read-only inputs

The export engine may read only:

| Source | Path |
| --- | --- |
| Knowledge Records | `data/knowledge-records.json` |
| Citation Records | `data/citation-records.json` |
| Popularity Records | `data/popularity-records.json` |
| Graph nodes | `data/graph/nodes.json` |
| Graph edges | `data/graph/edges.json` |
| Navigation artifacts | `data/navigation/*.json` |
| Layer audits | `audit/knowledge-graph.json`, `audit/navigation.json`, `audit/knowledge-completeness.json` |

The export engine must **never**:

- Regenerate graph or navigation
- Modify Knowledge Records, Citation Records, or Popularity Records
- Modify KCI or presentation layers
- Import `relationship-engine.js`, `navigation-engine.js`, or generation pipelines

## Export formats

Generated under `exports/` (gitignored):

| File | Format | Contents |
| --- | --- | --- |
| `knowledge.json` | JSON | Knowledge Records bundle |
| `knowledge.jsonl` | JSONL | One knowledge record per line |
| `knowledge.csv` | CSV | Flattened knowledge fields |
| `citations.json` | JSON | Citation Records bundle |
| `citations.jsonl` | JSONL | One citation record per line |
| `citations.csv` | CSV | Domain citation IDs per entity |
| `popularity.json` | JSON | Popularity Records bundle |
| `popularity.jsonl` | JSONL | One popularity record per line |
| `popularity.csv` | CSV | Exploded regional popularity rows |
| `graph-nodes.json` | JSON | Graph entity nodes |
| `graph-edges.json` | JSON | Graph relationship edges |
| `graph.jsonl` | JSONL | One graph edge per line |
| `navigation-related.json` | JSON | Related names navigation |
| `navigation-origin.json` | JSON | Same Origin explorer groups |
| `navigation-language.json` | JSON | Same Language explorer groups |
| `navigation-meaning.json` | JSON | Related Meaning explorer groups |
| `navigation-pronunciation.json` | JSON | Similar Pronunciation explorer groups |
| `navigation-cultural.json` | JSON | Cultural Group explorer groups |
| `manifest.json` | JSON | Dataset manifest |

## Manifest

`manifest.json` records:

- Export version (`18A-v1`)
- Generation timestamp
- Semantic hash of the export bundle
- Source layer versions and SHA-256 hashes
- Graph and navigation semantic hashes
- Per-artifact record counts and file hashes
- Supported formats

The manifest is the authoritative index for export bundle integrity.

## Validation

Every export build verifies:

- Deterministic rebuild (stable semantic hash)
- Record counts match across JSON, JSONL, and CSV representations
- Manifest consistency with on-disk artifacts
- Schema envelope compliance (`exportVersion`, `recordCount`, etc.)
- Frozen Knowledge Records unchanged (byte-identical SHA-256)
- Frozen Citation Records unchanged
- Frozen Popularity Records unchanged
- Frozen Graph unchanged
- Frozen Navigation unchanged
- Frozen KCI audit unchanged

## Pipeline

Prerequisites:

```bash
node scripts/build/generate-knowledge-graph.js
node scripts/build/validate-knowledge-graph.js
node scripts/build/generate-navigation.js
node scripts/build/validate-navigation.js
```

Phase 18A:

```bash
node scripts/build/generate-structured-exports.js
node scripts/build/validate-structured-exports.js
```

## Frozen guarantees

| Layer | Phase 18A behavior |
| --- | --- |
| Knowledge Records | Read-only — hash verified unchanged |
| Citation Records | Read-only — hash verified unchanged |
| Popularity Records | Read-only — hash verified unchanged |
| KCI | Read-only — audit hash verified unchanged |
| Knowledge Graph | Read-only — semantic hash verified unchanged |
| Navigation Engine | Read-only — semantic hash verified unchanged |
| Presentation (17C) | Not read or modified |

## Related files

| File | Role |
| --- | --- |
| `lib/export/export-engine.js` | Shared export library |
| `scripts/build/generate-structured-exports.js` | Export generator |
| `scripts/build/validate-structured-exports.js` | Integrity validator |
| `audit/structured-exports.json` | Audit metrics and validation summary |

## Roadmap position

| Phase | Focus |
| --- | --- |
| 17A | Knowledge Graph Engine → freeze ✅ |
| 17B | Navigation Engine → freeze ✅ |
| 17C | Relationship Presentation → freeze ✅ |
| **18A** | Structured Export Engine → freeze |
| 18B | AI / Research API |
| 19A | Versioned Dataset Publication |

Build → Validate → Freeze → Expose → Publish.

Phase 18B and 19A should consume these standardized exports rather than reading internal `data/` structures directly.
