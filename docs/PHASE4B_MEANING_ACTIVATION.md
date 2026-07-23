# Phase 4B — Meaning Activation

Phase 4B establishes the same truthfulness contract for **meaning** that Phase 4A established for **origin**. This phase is primarily a **truthfulness improvement**, not a coverage improvement: only 3 of 3,697 names currently have researched meaning in the canonical model.

## Objective

Replace all meaning fallback prose with canonical meaning knowledge wherever verified meaning already exists. When meaning is absent, disclose explicitly — never fabricate.

- No new research
- No dataset enrichment
- No AI-generated meanings
- No adapter, schema, builder, routing, or URL changes

## Truthfulness policy

Every rendered meaning resolves to exactly one state via `resolveMeaning(record)` in `lib/render/meaning.js`:

| State | When | Example |
| --- | --- | --- |
| **Researched** | Non-empty `record.meaning` that is not a known fallback marker | `Universal; whole.` |
| **Computed** | Deterministically derived from researched data only | _(none implemented yet)_ |
| **Disclosed unknown** | Empty or fallback-marker meaning | `A documented meaning is not currently available in our sources.` |

### Retired fallback phrases

Never rendered when meaning is absent:

- `documented given name` / `a documented given name`
- `meaning varies`, `meaning uncertain`, `meaning has evolved`
- `traditionally interpreted`, `often interpreted as`, `commonly believed`
- `is thought to mean`, `traditionally associated`

Quick Facts table uses `—` for missing meaning (disclosed-missing table label), consistent with Phase 4A origin table handling.

## Rendering flow

```
record (namesEnriched)
        │
        ▼
 resolveMeaning(record)     ← lib/render/meaning.js (only approved entry point)
        │
        ├── researched ──► quoted gloss in meta, direct answer, FAQ, snippets
        ├── computed   ──► (reserved)
        └── disclosed  ──► explicit sentence; no fabricated gloss
```

## Generator updates

| Generator | Change |
| --- | --- |
| `generate-programmatic-pages.js` | All meaning sections use `resolveMeaning()` / `meaningTableLabel()` |
| `generate-names-like.js` | List snippets use `meaningSnippet()` — researched only, omitted when unknown |
| `generate-compare-pages.js` | Unchanged (does not render per-name meaning glosses) |

## Audit artifacts

| File | Purpose |
| --- | --- |
| `audit/meaning-activation.json` | Scope, dataset utilization, success metrics |
| `audit/meaning-fallback-reduction.json` | Fallback marker counts before/after |
| `audit/meaning-truthfulness.json` | Page-level truthfulness ratio |
| `audit/meaning-render-differences.json` | HTML diffs with **category breakdown** |

### Diff categories (Phase 4B+)

Future activation audits separate:

- **semantic** — intended knowledge activation (fallback removed, disclosed added, researched meaning shown)
- **generator-drift** — footer/link/layout evolution unrelated to the activation policy
- **build-environment** — timestamps and non-meaning schema churn

Baseline for Phase 4B comparisons: `build/origin-activation/` when present (post–Phase 4A output), otherwise repo root HTML.

## Validation

```bash
# Build meaning activation output + audit
node scripts/build/run-meaning-activation-audit.js --build

# Audit only (uses build/meaning-activation/ vs baseline)
node scripts/build/run-meaning-activation-audit.js
```

Confirm:

- URLs unchanged (canonical paths preserved)
- No meaning fallback prose where researched data exists
- Every rendered meaning is researched, computed, or disclosed unknown
- Meaning rendering flows exclusively through `lib/render/meaning.js`

## Limitations

- **Coverage**: 3 / 3,697 names have researched meaning — Phase 4B improves honesty, not breadth.
- **Computed meaning**: No deterministic derivations are implemented yet.
- **Compare pages**: Generic prose mentions "meaning and origin" on linked name pages but does not assert per-name glosses.

## Out of scope

- Phase 4C — Pronunciation activation
- Phase 4D — Popularity activation
- Phase 4E — Etymology / History
- Phase 4F — Citations & provenance

## Related

- Phase 4A: `docs/PHASE4A_ORIGIN_ACTIVATION.md`
- Platform archive: `docs/CANONICAL_PLATFORM_V1.md`
