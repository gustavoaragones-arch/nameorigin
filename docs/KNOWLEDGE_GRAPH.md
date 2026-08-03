# Knowledge Graph & Relationship Engine v1

_Phase 17A — read-only relationship layer atop the frozen editorial corpus._

Phase 17A introduces the first deterministic relationship layer derived entirely from frozen Knowledge Records and canonical entity fields. It creates graph artifacts, not editorial content. Nothing writes back into Knowledge Records, Citation Records, Popularity Records, or KCI.

## Objective

Build a machine-readable Knowledge Graph from the complete 3,697-entity editorial corpus while preserving every frozen layer established during the Expansion Era.

## Architecture

```
Knowledge Records (Frozen)
Citation Records (Frozen)
Popularity Records (Frozen)
        │
        ▼
Relationship Engine (read-only)
        │
        ▼
Knowledge Graph
        │
        ▼
Navigation / APIs / AI exports (future phases)
```

Phase 17A stops at graph generation and validation. No UI, no API, no mutation of upstream layers.

## Relationship types

Phase 17A implements a small deterministic core:

| Type | Semantics | Primary source fields |
| --- | --- | --- |
| `HAS_VARIANT` | Spelling variant resolves to another corpus entity | `variants.spellingVariants` |
| `SAME_ORIGIN` | Shared origin cluster or country | `origin.cluster`, `origin.country` |
| `SAME_LANGUAGE` | Shared primary language | `language.primary` |
| `RELATED_MEANING` | Identical or clustered meaning text | `meaning.primary` |
| `SIMILAR_PRONUNCIATION` | Identical normalized phonetic spelling | `pronunciation.phoneticSpelling` |
| `SAME_CULTURAL_GROUP` | Shared origin cluster + country + language tuple | `origin.*`, `language.primary` |

No editorial prose is generated. Every edge carries structured `explanation` fields derived from existing attributes.

## Confidence tiers

Confidence is deterministic — not ML-based:

| Tier | Usage |
| --- | --- |
| `exact` | Identical normalized attribute (meaning, pronunciation, variant match) |
| `strong` | Same origin cluster or same language |
| `moderate` | Same country-only origin, meaning cluster, or cultural group tuple |
| `weak` | Reserved for future deterministic extensions |

## Edge schema

Every edge includes:

```json
{
  "id": "SAME_ORIGIN:aadi:aaditya",
  "source": "aadi",
  "target": "aaditya",
  "relationshipType": "SAME_ORIGIN",
  "confidence": "strong",
  "derivedFrom": ["origin.cluster"],
  "explanation": {
    "originCluster": "Sanskrit",
    "originCountry": "India"
  },
  "version": "17A-v1"
}
```

Node schema:

```json
{
  "kind": "entity",
  "slug": "aadi",
  "displayName": "Aadi"
}
```

## Group topology

Symmetric relationship types connect entities within equivalence groups:

- Groups with **≤ 30** members use a full clique (all pairs).
- Groups with **> 30** members use a star topology anchored at the lexicographically first slug.

This keeps large origin/language clusters tractable while preserving deterministic, explainable connectivity.

## Validation

Every graph build verifies:

- Every node exists
- Every edge references existing nodes
- No self-links
- No duplicate edge IDs
- Deterministic edge ordering
- Identical semantic hash on rebuild
- Frozen Knowledge Records unchanged (SHA-256 before/after)

## Pipeline

```bash
node scripts/build/generate-knowledge-graph.js
node scripts/build/validate-knowledge-graph.js
```

## Outputs

Machine-readable artifacts under `data/graph/`:

| File | Contents |
| --- | --- |
| `nodes.json` | All entity nodes |
| `edges.json` | Complete edge set |
| `origin-network.json` | `SAME_ORIGIN` edges |
| `meaning-network.json` | `RELATED_MEANING` edges |
| `variant-network.json` | `HAS_VARIANT` edges |
| `pronunciation-network.json` | `SIMILAR_PRONUNCIATION` edges |

Audit artifact: `audit/knowledge-graph.json`

Metrics include node count, edge count, average degree, relationship counts, disconnected components, validation summary, and semantic hash.

## Frozen guarantees

| Layer | Phase 17A behavior |
| --- | --- |
| Knowledge Records | Read-only — hash verified unchanged |
| Citation Records | Not read or modified |
| Popularity Records | Not read or modified |
| KCI engine | Not read or modified |
| Canonical entity builder | Read-only input source |

## Related files

| File | Role |
| --- | --- |
| `lib/analysis/relationship-engine.js` | Pure deterministic relationship computation |
| `scripts/build/generate-knowledge-graph.js` | Graph artifact generator |
| `scripts/build/validate-knowledge-graph.js` | Rebuild + integrity validator |
| `audit/knowledge-graph.json` | Audit metrics and validation summary |

## Roadmap position

Phase 17A is the first post-expansion capability phase. It consumes the complete editorial corpus rather than creating new Knowledge Records.

| Phase | Focus |
| --- | --- |
| **17A** | Knowledge Graph Engine → freeze |
| 17B | Navigation Engine → freeze |
| 17C | Relationship Presentation |
| 18A | Structured Export Engine |
| 18B | AI / Research API |
| 19A | Dataset Publication |

Build → Validate → Freeze → Expose → Publish.
