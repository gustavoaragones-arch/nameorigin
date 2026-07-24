# The Canonical Adapter Layer — Architecture & Reference

_Phase 3B. This document describes `lib/adapters/**`, additive to and read-only against production — nothing in production reads through it yet. It does not describe migration or generator refactoring; see `docs/CANONICAL_MIGRATION_PLAN.md` (Phase 2B) for that. See `docs/CANONICAL_BUILDER.md` (Phase 3A) for the canonical entity model this layer adapts._

## Adapter philosophy

Phase 3A proved a canonical entity could be assembled from today's datasets without touching them. Phase 3B asks the next question: could today's *generators* consume that canonical entity without being rewritten? The answer this phase gives is not a promise — it's a working translation layer plus a validated measurement of exactly how far it goes.

The adapter's one job is narrow on purpose: **reshape, never reinterpret.** It takes a canonical entity's already-assembled facts and presents them under the field names a generator's existing code already reads (`record.origin_country` instead of `entity.origin.country`), and nothing more. It does not re-derive anything, does not fill gaps, and does not decide what a generator should do with a null value — that decision remains entirely inside the generator's own (unmodified) code, exactly as it is today.

## Legacy compatibility

Two adapters, two grains:

- **`lib/adapters/legacy-name-record.js`** — one canonical entity → one flat record, shaped exactly like a `data/names-enriched.json` row. Verified byte-for-byte identical to the real file's row shape for a real entity (Aadi) during this phase's implementation.
- **`lib/adapters/legacy-datasets.js`** — the full canonical entity collection → the five flat/relational collections a generator loads today: `names`, `namesEnriched`, `popularity`, `categories`, `variants`. Row counts were verified to match the original datasets exactly (3,697 / 3,697 / 7 / 4,468 / 18,426), and row *content* (compared per `name_id`, since row order was never a meaningful fact — see "Mapping rules" below) matched with zero discrepancies across all 3,697 names.

## Mapping rules

| Canonical | Legacy | Note |
| --- | --- | --- |
| `identity.id` / `.name` / `.gender` / `.firstLetter` | `id` / `name` / `gender` / `first_letter` | Direct. |
| `origin.country` / `.cluster` / `.confidence` | `origin_country` / `origin_cluster` / `origin_confidence` | Direct. |
| `language.primary` | `language` | Direct. |
| `meaning.primary` | `meaning` | Direct. |
| `pronunciation.ipa` | `phonetic` | The legacy shape has one slot; `ipa` was chosen as the closer candidate over `phoneticSpelling` — a documented decision, not an arbitrary one (see the code comment in `legacy-name-record.js`). Currently moot in practice since both are null for every entity today. |
| `pronunciation.syllableCount` | `syllables` | Direct. |
| `classification.isTraditional` / `.isModern` | `is_traditional` / `is_modern` (0/1) | Converted from the canonical boolean back to the legacy numeric flag convention — a format change, not a value change. |
| `classification.categories[]` | `categories` rows (`{name_id, category}`) | Flattened back to relational rows. |
| `variants.spellingVariants[]` | `variants` rows (`{name_id, variant, language}`) | Flattened, **plus** the canonical spelling itself is deterministically re-added as the leading row — the original dataset always included it; the canonical builder deliberately excludes it as redundant (Phase 3A). Re-adding a value already known from `identity.name` is a shape-reconstruction rule, not a fabrication. |
| `popularity.records[]` | `popularity` rows (`{name_id, country, year, rank, count}`) | Flattened; `trendDirection` is dropped since no live row in the original dataset ever carried it. |

**`names` and `namesEnriched` deliberately resolve to the identical record set.** This is the adapter's central architectural point, not an implementation shortcut: the original two-file split (`data/names.json` vs. `data/names-enriched.json`) existed specifically so that some generators could read one and some the other — and Phases 1C/1D found that this is exactly what caused `scripts/generate-sibling-pages.js` to see a 100% origin-fallback rate instead of the ~4.4% the rest of the site sees. Because the adapter has no split to reproduce, a generator reading either legacy collection name gets the same, fully-current data. There is no longer a "wrong file" to accidentally read.

## Null preservation

Verified mechanically, not just designed for: `scripts/build/verify-adapters.js` scans every string value in the adapter's output for the exact fallback-text markers documented in Phases 1B/1C (`"documented given name"`, `"various origins"`, and five others) and confirms zero occurrences. Where the canonical entity has `null`, the adapter's legacy field is `null` — never a substituted string, never an empty-string stand-in. This is the same guarantee Phase 3A's builder made for the canonical layer itself, now confirmed to survive the translation back to legacy shape unchanged.

## Provenance handling

The legacy flat-record shape never had a provenance concept — no row in `data/names.json` ever indicated whether a field was researched or computed. The adapter does not invent one now; adding a new field under a legacy dataset name would not be reproducing legacy behavior; it would be silently changing it. Provenance remains fully available exactly where Phase 3A already put it — `schemas/name-entity.schema.json`'s `x-provenance` annotations and `audit/canonical-build-report.json`'s counts — one layer upstream of the adapter, for any caller that needs it.

## Deterministic guarantees

`scripts/build/verify-adapters.js` builds the full adapter output twice from the same canonical input and confirms the two runs are byte-identical JSON. Separately, it confirms the single-entity adapter (`legacy-name-record.js`) and the collection adapter (`legacy-datasets.js`) — two different code paths — produce identical per-entity output, as a structural proof that no value differs depending on which adapter function produced it.

## Deferred fields, reported not synthesized

Three relationship-shaped canonical fields are `null` in every entity today because Phase 3A deferred their cross-entity computation: `relatedNames.similarNameIds[]`, `relationships.siblingPairs[]`, `relationships.surnameCompatibility[]`. The adapter does not attempt to synthesize placeholder values for these — it has nothing to translate because the canonical source has nothing, and `audit/adapter-coverage.json` reports this explicitly per field rather than omitting them silently.

## What this phase does not claim

This adapter layer is not wired into any generator, and this document does not evaluate whether it *should* be — `audit/generator-compatibility-simulation.json` reports which of the 23 generators' *structural* dataset needs the adapter currently satisfies (8 of 11 true page-generator consumers fully, 3 partially — the other 12 generators are data-producers or pure computation engines for which "adapter compatibility" isn't the relevant question). Whether and how to actually connect a generator to this layer is a decision for a future phase, guided by `docs/CANONICAL_MIGRATION_PLAN.md`, not this one.
