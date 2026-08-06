# Versioned Dataset Publication v1

_Phase 19A — publication and release layer over the frozen Export Contract._

Phase 19A packages the frozen Export Contract and AI / Research API outputs into versioned, downloadable dataset releases. It introduces no new knowledge processing, editorial changes, or upstream regeneration.

## Objective

Publish reproducible dataset releases that external researchers, AI systems, developers, and future SDKs can consume without requiring access to the repository.

## Architecture

```
Editorial (Frozen)
Graph (Frozen)
Navigation (Frozen)
Presentation (Frozen)
Export Contract (Frozen)
AI / Research API (Frozen)
        │
        ▼
19A Dataset Publication (packaging only)
        │
        ▼
Versioned Releases
```

Phase 19A is strictly downstream. It copies and packages; it never computes relationships, exports, or API responses.

## Release structure

Each release follows a deterministic layout under `releases/{datasetVersion}/`:

```
manifest.json
checksums.sha256
CHANGELOG.md
LICENSE.txt
README.md
knowledge/
citations/
popularity/
graph/
navigation/
api/
```

Example: `releases/18A-v1/`

## Publication manifest

Each release `manifest.json` includes:

- Publication version (`19A-v1`)
- Dataset version (`18A-v1`)
- Release timestamp
- Export, graph, navigation, and API semantic hashes
- Record counts and schema versions
- API version and compatibility metadata
- Publication semantic hash
- Files packaged and total bytes

## Checksums

`checksums.sha256` lists SHA-256 hashes for every published artifact in standard `hash  path` format, enabling independent verification:

```bash
shasum -a 256 -c checksums.sha256
```

## Changelog

`CHANGELOG.md` is generated automatically from publication metadata only:

- Previous and current version
- Included dataset categories
- Compatibility versions
- Semantic hashes
- Release notes (publication metadata, not editorial summaries)

## Inputs (read-only)

Publication may consume:

| Source | Purpose |
| --- | --- |
| `exports/` | Export Contract artifacts |
| `api/` | AI / Research API static payloads |
| `audit/structured-exports.json` | Export validation hashes |
| `audit/api.json` | API validation hashes |
| `audit/knowledge-graph.json` | Graph semantic hash |
| `audit/navigation.json` | Navigation semantic hash |

Publication must **never** regenerate:

- Knowledge Records, Citation Records, Popularity Records
- Graph, Navigation, Presentation, Export, or API layers

## Validation

Every publication build verifies:

- Manifest consistency with upstream audits
- Checksum correctness for every file
- Bundle completeness (exports + API)
- Export, graph, navigation, and API hash equality
- Deterministic rebuild (stable publication semantic hash)
- No missing files
- Export Contract and API outputs unchanged during packaging

## Pipeline

Prerequisites:

```bash
node scripts/build/generate-structured-exports.js
node scripts/build/validate-structured-exports.js
node scripts/build/generate-api-indexes.js
node scripts/build/validate-api.js
```

Phase 19A:

```bash
node scripts/build/generate-publication.js
node scripts/build/validate-publication.js
```

## Related files

| File | Role |
| --- | --- |
| `lib/publication/publication-engine.js` | Release packaging library |
| `scripts/build/generate-publication.js` | Publication bundle generator |
| `scripts/build/validate-publication.js` | Integrity validator |
| `audit/publication.json` | Audit metrics and validation summary |

## Platform completion

| Layer | Phase | Status |
| --- | --- | --- |
| Editorial corpus | Wave 2 | Frozen |
| Knowledge Graph | 17A | Frozen |
| Navigation Contract | 17B | Frozen |
| Presentation | 17C | Frozen |
| Export Contract | 18A | Frozen |
| AI / Research API | 18B | Frozen |
| **Dataset Publication** | **19A** | **Release layer** |

Future work operates on published dataset versions—new records, languages, or research sources—while preserving the deterministic contracts exposed by the platform.

Build → Validate → Freeze → Expose → Publish.
