# Trust Signals v1

_Phase 12A — authority and transparency presentation only._

Phase 12A strengthens trust by exposing how NameOrigin.io is built, validated, and versioned — without modifying Knowledge, Citation, Popularity, KCI, or editorial data.

## Architecture

```
Frozen audit artifacts + registries (read-only)
        │
        ▼
lib/presentation/trust-signals.js
        │
        ▼
lib/presentation/trust-signals-html.js
        │
        ▼
scripts/generate-trust-pages.js
        │
        ▼
/about/methodology/
/about/editorial-policy/
/about/architecture/
/about/quality-assurance/
```

Shared citation formatting:

```
lib/presentation/citation-presentation.js
        │
        ├── KCI name-page citations
        └── Future citation displays
```

## Presentation model

Trust pages expose:

- Architecture version table (version, status, validation, equivalence)
- Validation badges (Editorial QA, KCI, deterministic rebuild, equivalence)
- Coverage summary (records, entities, average KCI)
- Audit artifact availability
- Last generated timestamp

Never exposed: semantic hashes, internal registry IDs, KCI weights.

## Version strategy

Version metadata is derived from frozen architecture milestones documented in `docs/ARCHITECTURE_VERSION_HISTORY.md`. Status values are standardized as **Frozen** or **Complete** with **PASS** validation and equivalence badges.

## Validation strategy

`validate-trust-signals.js` verifies:

- All four trust pages exist
- No internal IDs in HTML
- No semantic hashes in HTML
- Deterministic rendering
- Consistent version metadata

## Pipeline

```bash
node scripts/build/run-trust-signals-audit.js
```

## Phase 12A results

| Metric | Value |
| --- | ---: |
| Trust pages generated | **4** |
| Architecture milestones documented | **7** |
| Shared citation renderer | **Yes** |
| Internal IDs exposed | **0** |
| Semantic hashes exposed | **0** |
| Trust validation | **PASS** |
| KCI presentation validation | **PASS** |
| Editorial QA | **PASS** (0 issues) |
| Equivalence | **PASS** |
| Pipeline elapsed | **1,736 ms** |

## Boundaries preserved

- Knowledge Architecture unchanged
- Citation Architecture unchanged
- Popularity Architecture unchanged
- KCI engine unchanged
- KCI presentation semantics unchanged (scores and counts)
- No editorial changes

## Future extensibility

Trust signals can add provenance JSON-LD, author attribution blocks, and expanded methodology sections by extending the presentation layer only.

## Related files

| File | Role |
| --- | --- |
| `lib/presentation/trust-signals.js` | Trust presentation model |
| `lib/presentation/trust-signals-html.js` | Trust page HTML renderer |
| `lib/presentation/citation-presentation.js` | Shared citation formatting |
| `scripts/generate-trust-pages.js` | Trust page generator |
| `scripts/build/validate-trust-signals.js` | Validation |
| `scripts/build/run-trust-signals-equivalence.js` | Equivalence audit |
| `scripts/build/run-trust-signals-audit.js` | Phase 12A audit runner |
| `audit/trust-signals.json` | Audit artifact |
