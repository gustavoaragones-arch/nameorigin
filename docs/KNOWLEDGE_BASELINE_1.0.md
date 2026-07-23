# Knowledge Baseline 1.0

_Permanent reference point before Phase 5 (Knowledge Acquisition). Archived: 2026-07-23._

Knowledge Baseline 1.0 freezes the canonical rendering architecture, truthfulness policy, production HTML for programmatic pages, validation artifacts, and activation documentation. All future editorial enrichment (Phase 5+) is measured against this milestone.

## Included phases

| Phase | Title | Policy module | Documentation |
| --- | --- | --- | --- |
| **4A** | Origin Activation | `lib/render/origin.js` | `docs/PHASE4A_ORIGIN_ACTIVATION.md` |
| **4B** | Meaning Activation | `lib/render/meaning.js` | `docs/PHASE4B_MEANING_ACTIVATION.md` |
| **4C** | Pronunciation Activation | `lib/render/pronunciation.js` | `docs/PHASE4C_PRONUNCIATION_ACTIVATION.md` |

## Production promotion

Production HTML for programmatic pages was promoted from the validated build:

```
build/pronunciation-activation/
```

No regeneration was performed after validation. Promoted paths:

- `name/` — 3,697 individual name pages (4A + 4B + 4C)
- `names/` — programmatic listing and filter pages
- `compatibility/` — last-name compatibility hub pages
- `sitemaps/` and `sitemap.xml`
- Root programmatic index pages (`all-name-pages.html`, `name-pages.html`, etc.)

## Rendering policy

The platform uses **one policy module per knowledge domain**. Every user-facing assertion for these fields passes through its resolver:

| Domain | Resolver | States |
| --- | --- | --- |
| Origin | `resolveOrigin(record)` | researched → disclosed unknown → computed (reserved) |
| Meaning | `resolveMeaning(record)` | researched → disclosed unknown → computed (reserved) |
| Pronunciation | `resolvePronunciation(record)` | available → empty (disclosed) → computed (reserved) |

```
record (namesEnriched)
        │
        ▼
 resolve{Origin|Meaning|Pronunciation}(record)
        │
        ├── verified data ──► render stored value exactly
        ├── missing data  ──► explicit disclosure sentence
        └── computed      ──► reserved (not implemented)
```

## Platform guarantees (Baseline 1.0)

Baseline 1.0 guarantees on promoted name pages:

- **Zero fabricated origin prose** — fallback markers eliminated (Phase 4A)
- **Zero fabricated meaning prose** — `documented given name` eliminated (Phase 4B)
- **Zero pronunciation placeholders** — `Easy pronunciation`, `phonetic guide on file`, etc. eliminated (Phase 4C)
- **Explicit disclosure** when knowledge is unavailable in sources
- **Deterministic rendering** — same record always produces the same policy outcome
- **Canonical URLs preserved** — no routing or URL changes across activation phases
- **Internal links stable** — semantic changes isolated from navigation drift

## Validation archive

Immutable baseline artifacts are frozen under `audit/baseline-1.0/`:

| Phase | Artifacts |
| --- | --- |
| 4A | `origin-activation.json`, `fallback-reduction.json`, `truthfulness-improvement.json`, `render-differences.json` |
| 4B | `meaning-activation.json`, `meaning-fallback-reduction.json`, `meaning-truthfulness.json`, `meaning-render-differences.json` |
| 4C | `pronunciation-activation.json`, `pronunciation-truthfulness.json`, `pronunciation-render-differences.json`, `pronunciation-normalization.json` |

Release metadata: `release/knowledge-baseline-1.0.json`

## Activation metrics (summary)

| Domain | Researched / available | Coverage | Truthfulness (activation) |
| --- | --- | --- | --- |
| Origin | 167 names | 4.5% | 100% (7,544 origin-affected pages) |
| Meaning | 3 names | 0.08% | 100% (7,394 meaning-affected pages) |
| Pronunciation | 0 stored | 0% | 100% (3,697 name pages) |

Fallback reduction across all three phases: **100%** on affected pages.

## Architectural status

**Rendering architecture is complete.**

Phase 4 activation work is retired. Future improvements will come primarily from expanding verified knowledge in the canonical dataset (Phase 5 — Knowledge Acquisition), not from additional rendering logic.

## Known limitations at Baseline 1.0

- **Knowledge coverage**, not rendering, is the primary bottleneck.
- Phase 4A/4B also validated `names-like`, `compare`, and sibling-harmony pages in separate activation builds; this baseline promotion used `build/pronunciation-activation/` for programmatic output only.
- Legacy paths under `names/*/` (e.g. per-name sibling subpaths) may exist outside the activation build tree and were not modified by this promotion.
- Computed states (origin, meaning, pronunciation) remain reserved — not implemented.

## Next roadmap

See `docs/ROADMAP_STATUS.md`. Phase 5 begins with **Knowledge Completeness Index (KCI)** — an internal scoring system — followed by canonical knowledge acquisition (5A–5E).
