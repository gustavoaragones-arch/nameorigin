# Relationship Presentation v1

_Phase 17C — presentation layer over the frozen Navigation Contract._

Phase 17C exposes deterministic relationship navigation throughout the website. It consumes only frozen navigation artifacts and produces HTML. It does not compute relationships, rebuild navigation indexes, or modify Knowledge Records, Citation Records, Popularity Records, KCI, or graph data.

## Objective

Render relationship navigation on every name page and generate relationship explorer pages from the six navigation artifacts produced in Phase 17B.

## Architecture

```
Knowledge Records (Frozen)
        │
        ▼
Knowledge Graph (Frozen)
        │
        ▼
Navigation Engine (Frozen)
        │
        ▼
Navigation Contract
(data/navigation/*.json)
        │
        ▼
Relationship Presentation (17C)
        │
        ▼
Static HTML
```

Phase 17C produces HTML only. No new intelligence is introduced.

## Navigation Contract

Presentation consumes **only** these artifacts:

| Artifact | Purpose |
| --- | --- |
| `data/navigation/related-names.json` | Per-entity related name navigation |
| `data/navigation/origin-navigation.json` | Same Origin explorer groups |
| `data/navigation/language-navigation.json` | Same Language explorer groups |
| `data/navigation/meaning-navigation.json` | Related Meaning explorer groups |
| `data/navigation/pronunciation-navigation.json` | Similar Pronunciation explorer groups |
| `data/navigation/cultural-navigation.json` | Cultural Group explorer groups |

Presentation must **never** import:

- `data/graph/*`
- `relationship-engine.js`
- `navigation-engine.js`

If graph internals change, presentation and UI remain stable as long as the navigation contract is unchanged.

## Name page additions

Every name page receives a deterministic **Related Names** block injected after the KCI explainability section:

- Related name links
- Navigation cards with relationship badge, confidence badge, and deterministic explanation
- **Why these names are related** — templated copy from navigation metadata only
- Relationship breakdown sections (Same Origin, Same Language, Related Meaning, Similar Pronunciation, Cultural Group) — each rendered only when navigation data exists
- Links to relevant explorer pages

No AI-generated prose. No inference beyond navigation artifact fields.

## Explorer pages

Deterministic explorer pages are generated under:

```
relationships/
  index.html
  origin/{group-id}/index.html
  language/{group-id}/index.html
  meaning/{group-id}/index.html
  pronunciation/{group-id}/index.html
  cultural/{group-id}/index.html
```

Each explorer page lists up to 25 member names (per navigation artifact limits) and reports full `memberCount`.

## Explanation rendering

Explanations are templated deterministically from navigation entry metadata:

| Relationship | Example output |
| --- | --- |
| `SAME_ORIGIN` | These names share the same Sanskrit origin cluster. |
| `SAME_LANGUAGE` | These names share the same primary language: Sanskrit. |
| `RELATED_MEANING` | These names have closely related meanings in the beginning cluster. |
| `SIMILAR_PRONUNCIATION` | These names share a similar pronunciation: AH-dee. |
| `SAME_CULTURAL_GROUP` | These names belong to the same cultural group (Indian, India, and Sanskrit). |

## Validation

Every presentation build verifies:

- Every navigation link resolves to an existing name page
- No broken links
- Every explanation derives from navigation artifact fields
- No graph imports in presentation source
- No relationship engine imports
- No navigation engine imports
- Deterministic rebuild (semantic hash stable)
- Frozen graph hash unchanged
- Frozen navigation hash unchanged
- Knowledge Records unchanged

## Pipeline

Prerequisites:

```bash
node scripts/build/generate-knowledge-graph.js
node scripts/build/validate-knowledge-graph.js
node scripts/build/generate-navigation.js
node scripts/build/validate-navigation.js
```

Phase 17C:

```bash
node scripts/build/generate-relationship-presentation.js
node scripts/build/validate-relationship-presentation.js
```

Name pages must exist (`name/{slug}/index.html`) before running presentation generation.

## Frozen guarantees

| Layer | Phase 17C behavior |
| --- | --- |
| Knowledge Records | Unchanged — hash verified |
| Citation Records | Not read or modified |
| Popularity Records | Not read or modified |
| KCI engine | Not read or modified |
| Knowledge Graph | Unchanged — semantic hash verified |
| Navigation Engine | Unchanged — semantic hash verified |

Only HTML output changes.

## Related files

| File | Role |
| --- | --- |
| `lib/presentation/relationship-presentation.js` | Presentation model from navigation artifacts |
| `lib/presentation/relationship-html.js` | HTML renderer and page injection |
| `scripts/build/generate-relationship-presentation.js` | Inject name pages + generate explorer pages |
| `scripts/build/validate-relationship-presentation.js` | Integrity validator |
| `audit/relationship-presentation.json` | Audit metrics and validation summary |

## Roadmap position

| Phase | Focus |
| --- | --- |
| 17A | Knowledge Graph Engine → freeze ✅ |
| 17B | Navigation Engine → freeze ✅ |
| **17C** | Relationship Presentation → freeze |
| 18A | Structured Export Engine |
| 18B | AI / Research API |
| 19A | Dataset Publication |

Build → Validate → Freeze → Expose → Publish.

Future consumers (18A, 18B, search) should consume the same Navigation Contract rather than reading graph artifacts directly.
