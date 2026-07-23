# Phase 4C — Pronunciation Activation

Phase 4C establishes a **structural normalization** policy for **pronunciation** display — consistency over coverage. The canonical model contains pronunciation fields for all 3,697 entities, but stored phonetic values are currently empty (0% utilization via `record.phonetic`). This phase does not add research, IPA, or inference.

## Objective

Establish a single pronunciation rendering policy across the platform:

- No new pronunciations
- No AI-generated IPA
- No language inference
- Only normalize how existing pronunciation data is displayed

## Truthfulness policy

Every rendered pronunciation resolves to exactly one state via `resolvePronunciation(record)` in `lib/render/pronunciation.js`:

| State | When | Example |
| --- | --- | --- |
| **Available** | Non-empty `record.phonetic` that is not a known fallback marker | Render stored value exactly |
| **Empty** | Empty or fallback-marker phonetic | `Pronunciation is not currently available in our sources.` |
| **Computed** | Deterministically derived from researched data only | _(not implemented — reserved)_ |

### Retired placeholder phrases

Never rendered when pronunciation is absent (unless backed by stored pronunciation data):

- `easy to pronounce` / `Easy pronunciation and spelling`
- `pronunciation varies`
- `commonly pronounced` / `generally pronounced`
- `phonetic guide on file` / `ask speakers you trust`

Quick Facts table uses `—` for missing pronunciation (disclosed-missing table label), consistent with Phase 4A/4B table handling.

## Rendering flow

```
record (namesEnriched)
        │
        ▼
 resolvePronunciation(record)     ← lib/render/pronunciation.js (only approved entry point)
        │
        ├── available ──► stored phonetic rendered exactly (no rewriting)
        ├── computed  ──► (reserved)
        └── empty     ──► explicit disclosure; no guessed pronunciation
```

## Generator updates

| Generator | Change |
| --- | --- |
| `generate-programmatic-pages.js` | PAA pronunciation answer, snippet bullet, Quick Facts row, always-on pronunciation paragraph |
| `generate-names-like.js` | Unchanged (no pronunciation display snippets) |

## Audit artifacts

| File | Purpose |
| --- | --- |
| `audit/pronunciation-activation.json` | Scope, dataset utilization, success metrics |
| `audit/pronunciation-truthfulness.json` | Page-level truthfulness ratio |
| `audit/pronunciation-render-differences.json` | HTML diffs with **category breakdown** |
| `audit/pronunciation-normalization.json` | Single-policy compliance, exact-match rendering |

### Diff categories

- **semantic** — intended pronunciation normalization (placeholders removed, disclosures added)
- **generator-drift** — footer/link/layout evolution unrelated to pronunciation policy
- **build-environment** — timestamps and non-pronunciation schema churn

Baseline for Phase 4C comparisons: `build/meaning-activation/` when present (post–Phase 4A+4B output), otherwise repo root HTML.

## Validation

```bash
# Build pronunciation activation output + audit
node scripts/build/run-pronunciation-activation-audit.js --build

# Audit only (requires existing build/pronunciation-activation/)
node scripts/build/run-pronunciation-activation-audit.js
```

Confirm:

- URLs unchanged
- Internal links unchanged
- JSON-LD unchanged except pronunciation text (if any)
- All pronunciation rendering flows through `lib/render/pronunciation.js`
- Zero guessed pronunciations
- Zero generator drift attributable to this phase

## Out of scope

- Canonical schema, datasets, builder, adapters, routing, URLs
- Phase 4D (Popularity Activation) — not started
- New pronunciation research or phonetic inference

## After Phase 4C

Once Origin, Meaning, and Pronunciation share the same three-state rendering contract, remaining high-impact work shifts from rendering policy to **knowledge acquisition** — expanding researched origin, meaning, pronunciation, etymology, and citation coverage.
