# The Canonical Entity Builder — Architecture & Reference

_Phase 3A — the first implementation phase. This document describes the builder that now exists at `lib/canonical/**` and `scripts/build/**`, additive to the current production site (nothing in production reads it yet). See `docs/CANONICAL_KNOWLEDGE_MODEL.md` (Phase 2A) for the schema this builder targets and `docs/CANONICAL_MIGRATION_PLAN.md` (Phase 2B) for how a future phase would eventually connect it to live generators — this document does not repeat or extend that migration plan._

## Builder architecture

Three layers, each with one job:

```
lib/canonical/loaders.js          — reads today's datasets, once, read-only, immutable
        ↓
lib/canonical/domains/*.js        — 18 modules, one per canonical domain, pure functions
        ↓
lib/canonical/entity-builder.js   — orchestrates the 18 domain modules into one entity
        ↓
scripts/build/build-canonical-entities.js  — iterates all 3,697 names, writes data/canonical/names.json
scripts/build/validate-canonical.js        — deeper validation pass over the written output
```

`lib/canonical/util.js` and `lib/canonical/schema-check.js` are small shared support modules (a null-handling helper and a dependency-free structural validator for `schemas/name-entity.schema.json`), used by more than one layer above to avoid duplicating logic.

## Domain ownership

Each of the 18 files in `lib/canonical/domains/` exports one function, `build(nameRow, ctx)`, that returns **only** its own domain's object (or `null`). No domain module reads another domain's output, and none writes to another domain's key — `entity-builder.js` enforces this structurally by iterating a fixed list of `[domainName, domainModule]` pairs and assigning each module's return value to exactly one key. `scripts/build/validate-canonical.js` independently re-verifies this per built entity (its "ownership rules" check confirms every entity has exactly the 18 expected top-level keys, no more, no fewer), and separately checks for prose-like values leaking between domains (its "no cross-domain field duplication" check).

The one deliberate exception is `metadata.dataCompletenessScore`, which cannot be computed by any single domain in isolation — it depends on seeing every other domain's populated state. `entity-builder.js` computes it once, after the other 17 domains are built, and passes it into `metadata.js` as an input parameter. This is orchestration-level computation, not domain module cross-population, and is documented as such in both files.

## Build flow

1. `lib/canonical/loaders.js` reads `data/names.json`, `data/names-enriched.json`, `data/normalized-names.json`, `data/categories.json`, `data/variants.json`, `data/popularity.json`, `data/name-equivalents.json`, `data/country-differentials.json`, `data/countries.json`, and `build/topic-clusters.json` exactly once, builds `Map`-based indexes by `name_id` (or slug, where relevant) for O(1) lookup, and deep-freezes every structure so 3,697 entity assemblies cannot accidentally mutate shared data.
2. `entity-builder.js`'s `buildAllEntities()` calls `buildEntity()` once per name row; each call runs all 18 domain builders against the same immutable context.
3. `scripts/build/build-canonical-entities.js` times each phase (dataset load, entity assembly, schema validation, file write), runs a fast inline schema check via `lib/canonical/schema-check.js`, checks for duplicate `identity.id`/`identity.slug` values, writes `data/canonical/names.json`, and writes `audit/canonical-build-report.json` and `audit/canonical-performance.json`.
4. `scripts/build/validate-canonical.js` re-reads the written output (it does not rebuild it) and runs six independent checks — schema compliance, required fields, ownership rules, cross-domain duplication, null-handling correctness, and identifier uniqueness — writing `audit/canonical-validation.json`.

## Validation pipeline

Two validation passes exist deliberately, at different depths:

- **Inline (during build)**: a fast per-entity schema check, run against every one of the 3,697 entities as they're built, so a structural regression fails the build immediately rather than being discovered later.
- **Standalone (`validate-canonical.js`)**: a deeper pass over the already-written file, including a check no inline pass could efficiently do — scanning every string value in every entity for the exact literal fallback-text markers documented in `scripts/audit/knowledge-lib.js`'s `FALLBACK_MARKERS` (Phases 1B/1C): `"documented given name"`, `"multiple traditions"`, `"various linguistic traditions"`, `"various cultural traditions"`, `"various origins"`, and two others. Zero occurrences is not a soft target — it is the builder's core promise, verified mechanically on every run rather than asserted.

## Provenance handling

Every leaf field in `schemas/name-entity.schema.json` carries an `x-provenance` annotation of `"researched"` or `"computed"` (Phase 2A). `build-canonical-entities.js` reads these annotations directly from the schema (not from a separate hardcoded list) to report `provenanceFieldCounts` in `audit/canonical-build-report.json` — this build found 21 computed and 29 researched leaf fields, counted from the schema itself, not estimated.

## Null handling

The builder's single hardest rule: **absence is `null`, never a substituted string.** Every domain module that has no backing data for a given name (`etymology`, `history`, `culture`, `religion`, `nicknames`, and `citations` — none of which have any current dataset — plus `meaning`/`origin`/`language`/`popularity`/`relationships` for the majority of names, which are real fields with sparse real data) returns `null` for that domain, or `null` for individual leaf fields within a partially-populated domain, via `lib/canonical/util.js`'s `nullIfBlank`/`nullIfAllFieldsBlank` helpers. No domain module contains a fallback string anywhere in its source. `validate-canonical.js`'s fallback-marker scan is the mechanical proof of this, not just a design intention.

## Deterministic guarantees

Given the same dataset files on disk, `build-canonical-entities.js` produces byte-identical entity content on every run, with one narrow, intentional exception: `metadata.createdAt`/`metadata.lastUpdated`, which are stamped from a single timestamp computed once per build run (not per entity — every entity in the same run shares an identical value) and therefore differ between runs by design, the same way a build date differs between two builds of the same site. Every other field is a pure function of the loaded dataset content. `audit/canonical-equivalence.json` verifies this determinism indirectly: every one of 3,697 entities' identity, slug, category, variant, popularity, and origin data was confirmed to match its source dataset exactly, with zero mismatches.

## Known, documented schema-shape deviation

`relationships.comparisonPairs[]` is the one place this builder's output does not literally match `schemas/name-entity.schema.json`'s illustrative shape. The schema (Phase 2A) declared `{countryA, countryB, rankA, rankB}` — a country-*pair* shape, matching the `/compare/{name}/{a}-vs-{b}/` page structure. The real source dataset, `data/country-differentials.json`, was found (verified in this phase) to store exactly one country per name per entry — zero of the current 5 entries have a second country to pair against. Rather than fabricate a second country's data to force-fit the schema's illustrative shape, the builder emits the real shape, `{country, rank, priorRank, delta, volatilityScore}`, and this deviation is checked and reported (not hidden) in `audit/canonical-validation.json`'s `knownDocumentedDeviations`. This is a direct instance of the builder's core rule — never fabricate — overriding a schema illustration that assumed data which doesn't currently exist.

## Scope boundaries carried forward from Phase 2A/2B

Three relational fields are intentionally always `null` in this build, not because of a bug but because computing them requires cross-entity logic (comparing one name against many others), which is out of scope for a per-entity data-assembly pass:

- `relatedNames.similarNameIds[]` — would require the same phonetic/origin/popularity/gender pool-matching logic as `scripts/generate-names-like.js`, run against all 3,696 other names.
- `relationships.surnameCompatibility[]` — would require invoking `scripts/generate-smoothness-score.js`'s scoring logic against all 75 surnames.
- `relationships.siblingPairs[]` — would require invoking `scripts/generate-sibling-harmony.js`'s scoring logic against other names.

Each is documented with this same rationale directly in its owning domain module's header comment. A future phase that wishes to populate these would add a separate, explicitly cross-entity computation step — not retrofit it into this per-entity builder.

## Limitations

- Performance figures in `audit/canonical-performance.json` are a single measured run, not an average across multiple runs or multiple machines — reported as such, not smoothed.
- The schema validator in `lib/canonical/schema-check.js` is a minimal, purpose-built structural checker (type unions, required fields, `additionalProperties: false`, enum, and the schema's `x-nullable` convention) — not a general JSON Schema engine. It validates everything `schemas/name-entity.schema.json` actually uses, and no more.
- This builder does not modify, read for writing, or otherwise touch any existing generator, dataset, HTML file, or build output — confirmed in this phase's own scope-verification pass, not merely asserted in this document.
