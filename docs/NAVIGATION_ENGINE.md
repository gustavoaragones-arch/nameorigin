# Relationship Navigation Engine v1

_Phase 17B — read-only navigation layer atop the frozen Knowledge Graph._

Phase 17B introduces deterministic navigation artifacts derived exclusively from frozen graph outputs produced in Phase 17A. It does not compute relationships, modify graph data, or touch Knowledge Records, Citation Records, Popularity Records, or KCI.

## Objective

Build cached lookup tables for relationship navigation while preserving every frozen layer established during the Expansion Era and Phase 17A.

## Architecture

```
Knowledge Records (Frozen)
Citation Records (Frozen)
Popularity Records (Frozen)
Knowledge Graph (Frozen)
        │
        ▼
Navigation Engine (read-only)
        │
        ▼
Navigation Artifacts
        │
        ▼
Name Pages / Explorer Pages / APIs (future)
```

Phase 17B stops at navigation artifact generation and validation. No UI, no page generation, no API.

## Inputs

The navigation engine reads only Phase 17A graph artifacts:

| Input | Source |
| --- | --- |
| Entity nodes | `data/graph/nodes.json` |
| Relationship edges | `data/graph/edges.json` |
| Graph semantic hash | `audit/knowledge-graph.json` |

The engine never imports `relationship-engine.js` and never rebuilds graph logic.

## Outputs

Machine-readable artifacts under `data/navigation/` (gitignored):

| File | Contents |
| --- | --- |
| `related-names.json` | Per-entity related name navigation with explainability |
| `origin-navigation.json` | `SAME_ORIGIN` explorer groups |
| `language-navigation.json` | `SAME_LANGUAGE` explorer groups |
| `meaning-navigation.json` | `RELATED_MEANING` explorer groups |
| `pronunciation-navigation.json` | `SIMILAR_PRONUNCIATION` explorer groups |
| `cultural-navigation.json` | `SAME_CULTURAL_GROUP` explorer groups |

Audit artifact: `audit/navigation.json`

## Related names schema

Every entity receives a deterministic navigation object:

```json
{
  "slug": "aadi",
  "relatedNames": ["aaditya", "aarav", "aditya"],
  "sources": ["RELATED_MEANING", "SAME_ORIGIN"],
  "byRelationship": {
    "SAME_ORIGIN": {
      "count": 2,
      "entries": []
    }
  },
  "entries": [
    {
      "target": "aaditya",
      "relationship": "SAME_ORIGIN",
      "confidence": "strong",
      "derivedFrom": ["origin.cluster"],
      "explanation": {
        "originCluster": "Sanskrit",
        "originCountry": "India"
      }
    }
  ]
}
```

Navigation never invents explanations. Every entry copies relationship metadata directly from graph edges.

## Explainability

Entries preserve graph provenance so presentation layers can render human-readable copy without recomputing logic:

```json
{
  "target": "aaditya",
  "relationship": "SAME_ORIGIN",
  "confidence": "strong",
  "derivedFrom": ["origin.cluster"],
  "explanation": {
    "originCluster": "Sanskrit",
    "originCountry": "India"
  }
}
```

A future presentation layer can render: _Related because both names belong to the Sanskrit origin cluster._

## Navigation ranking

Deterministic priority:

1. Confidence tier: `exact` → `strong` → `moderate` → `weak`
2. Alphabetical slug

No ML. No popularity weighting. No KCI weighting. No randomness.

## Limits

| Limit | Value | Scope |
| --- | --- | --- |
| Max related names | 25 | Per relationship type, per entity |
| Max explorer members | 25 | Per group (`members`); `memberCount` reports full group size |

Large cultural groups remain navigable without exposing thousands of names in a single artifact.

## Explorer group schema

```json
{
  "id": "cluster:sanskrit",
  "relationshipType": "SAME_ORIGIN",
  "derivedFrom": ["origin.cluster"],
  "label": {
    "originCluster": "Sanskrit",
    "originCountry": "India"
  },
  "memberCount": 42,
  "members": ["aadi", "aaditya"]
}
```

Group IDs are derived from edge `explanation` fields already present in the graph.

## Validation

Every navigation build verifies:

- Every navigation target exists in the graph node set
- No self references
- No duplicate related names
- Deterministic ordering (confidence, then slug)
- Every navigation entry maps to an existing graph edge
- Per-type limits respected
- Navigation reproducible (semantic hash stable on rebuild)
- Graph semantic hash unchanged
- Editorial hashes unchanged

## Pipeline

Prerequisite:

```bash
node scripts/build/generate-knowledge-graph.js
node scripts/build/validate-knowledge-graph.js
```

Phase 17B:

```bash
node scripts/build/generate-navigation.js
node scripts/build/validate-navigation.js
```

## Frozen guarantees

| Layer | Phase 17B behavior |
| --- | --- |
| Knowledge Records | Read-only — hash verified unchanged |
| Citation Records | Not read or modified |
| Popularity Records | Not read or modified |
| KCI engine | Not read or modified |
| Knowledge Graph | Read-only — semantic hash verified unchanged |
| Relationship engine | Not invoked |

## Related files

| File | Role |
| --- | --- |
| `lib/navigation/navigation-engine.js` | Pure deterministic navigation index builder |
| `scripts/build/generate-navigation.js` | Navigation artifact generator |
| `scripts/build/validate-navigation.js` | Rebuild + integrity validator |
| `audit/navigation.json` | Audit metrics and validation summary |

## Roadmap position

| Phase | Focus |
| --- | --- |
| 17A | Knowledge Graph Engine → freeze ✅ |
| **17B** | Navigation Engine → freeze |
| 17C | Relationship Presentation (name pages + explorer pages) |
| 18A | Structured Export Engine |
| 18B | AI / Research API |
| 19A | Dataset Publication |

Build → Validate → Freeze → Expose → Publish.
