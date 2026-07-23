# Phase 4A — Origin Activation

_Phase 4 begins knowledge activation. Infrastructure migration (Canonical Platform V1) is complete; Phase 4A is the first activation slice._

## Objective

Replace origin fallback behavior with canonical origin knowledge wherever verified origin data already exists.

- No new research
- No dataset enrichment
- No adapter, schema, or builder changes
- Only expose knowledge that already exists in `namesEnriched`

## Truthfulness policy

Every origin statement is exactly one of:

| State | Source | Example |
| --- | --- | --- |
| **Researched origin** | `origin_country`, `language`, or `origin_cluster` on enriched record | "Greek", "Hebrew · English" |
| **Disclosed unknown** | No researched origin on record | "Origin is not recorded in our sources." |
| **Computed origin** | Derived in section helpers from a researched string | Indo-European lineage when country is present |

Never: fallback prose (`various origins`, `multiple traditions`, `various linguistic traditions`, etc.).

Implementation: `lib/render/origin.js` — `resolveOrigin(record)` is the single policy entry point for generators and templates.

## Scope

### Allowed changes

- `scripts/**` — generator and audit updates
- `lib/render/**` — origin rendering policy
- `templates/**` — optional template notes
- `audit/**` — activation metrics
- `docs/**` — this document

### Not changed

- Canonical schema, builder, adapters, entity construction
- Raw datasets (`data/*.json`)
- `namesBase` routing (still used where origin is not rendered, e.g. last-name pages)

## Generator changes

| Generator | Collection | Origin change |
| --- | --- | --- |
| `generate-programmatic-pages.js` | `namesEnriched` (already) | All origin sections use `lib/render/origin.js` |
| `generate-names-like.js` | `namesBase` → **`namesEnriched`** | Intro + same-origin matching; disclosed unknown when missing |
| `generate-sibling-pages.js` | `namesBase` → **`namesEnriched`** | Context via `sibling-explanation-renderer.js` |
| `generate-compare-pages.js` | `namesBase` → **`namesEnriched`** | Origin overlap index uses enriched origins |
| `generate-lastname-pages.js` | `namesBase` (unchanged) | No origin rendering |

## Retired fallback phrases

Removed wherever canonical origin exists (see `FALLBACK_MARKERS` in `lib/render/origin.js`):

- various origins
- multiple traditions
- various linguistic / cultural traditions
- multiple cultures / naming traditions
- diverse cultural / multicultural / broad cultural appeal
- drawn from multiple cultural sources

When origin remains unknown, pages show an explicit missing-information statement instead of fabricated prose.

## Regression expectations (unlike Phase 3)

HTML differences are **expected and desired** where fallback prose is replaced by researched origin or disclosed unknown.

Still required to remain unchanged:

- URLs and canonical paths
- Internal link sets (href lists)
- Structured data (JSON-LD) except where origin values appear in visible copy only

## Validation

```bash
# Rebuild origin-affected pages into build/origin-activation/
node scripts/build/run-origin-activation-audit.js --build

# Or full rebuild including name detail + names-like (longer)
node scripts/build/run-origin-activation-audit.js --build

# Analyze baseline vs activation output
node scripts/build/run-origin-activation-audit.js
```

Wave 1/2 byte-identical regression (`scripts/build/verify-generator-regression.js`) is **not** the Phase 4A gate — use the origin activation audit instead.

## Audit artifacts

| File | Contents |
| --- | --- |
| `audit/origin-activation.json` | Scope, dataset utilization, baseline vs activation summary, success metrics |
| `audit/fallback-reduction.json` | Fallback marker counts before/after, reduction %, by template |
| `audit/truthfulness-improvement.json` | Origin truthfulness proxy improvement |
| `audit/render-differences.json` | Page-level HTML diffs, link/canonical/JSON-LD preservation checks |

## Success metrics

- Fallback reduction percentage
- Researched-origin coverage on origin-affected pages
- Disclosed-missing coverage where origin is absent
- Truthfulness proxy increase
- HTML pages changed (expected > 0)
- Canonical-origin utilization (% of names with enriched origin in dataset)

## Out of scope (Phase 4B+)

- Pronunciation activation
- Meaning activation
- Popularity activation
- New research or AI-generated origins

## Platform archive

Infrastructure milestones through Wave 2 are archived as **Canonical Platform V1** — see `docs/CANONICAL_PLATFORM_V1.md`.
