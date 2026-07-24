# The Canonical Migration Plan — Permanent Specification

_Phase 2B — planning only. No dataset, generator, schema, or HTML file was modified to produce this document or any of its supporting `audit/*.json` artifacts. This is the permanent migration specification for moving from today's fragmented multi-dataset architecture to the canonical model defined in Phase 2A (`schemas/name-entity.schema.json`). It contains no implementation code and no timeline — see `audit/migration-dependency-graph.json`, `audit/migration-waves.json`, `audit/generator-impact-matrix.json`, `audit/dataset-transition-map.json`, `audit/backward-compatibility.json`, `audit/migration-risk-register.json`, `audit/canonical-readiness.json`, and `audit/migration-validation.json` for the measured analysis this document explains in prose._

## Migration philosophy

A migration plan for this project has one job that matters more than any other: **never let two different generators disagree about the same fact.** Phase 1D's central finding — that `scripts/generate-sibling-pages.js` reads a different, unenriched copy of the origin field than every other generator — is not a bug to patch. It is the predictable outcome of an architecture where the same knowledge lives in more than one place. A migration that moves data around without addressing *why* that happened would simply relocate the risk, not remove it.

This plan therefore treats migration not as "convert file format A to file format B" but as "collapse N sources of truth into 1, one domain at a time, in an order that never asks a domain to migrate before what it depends on already has." Everything else in this document — the wave ordering, the adapter strategy, the risk register — follows from that one commitment.

## Architectural principles

1. **Dependency order is computed, not chosen.** Every wave in `audit/migration-waves.json` is the output of a topological-level computation over real, source-cited prerequisite edges (`audit/migration-dependency-graph.json`), independently re-run and confirmed acyclic in `audit/migration-validation.json`. No domain was placed in a wave by preference.
2. **Structural risk and behavioral risk are measured separately.** `audit/generator-impact-matrix.json` (breadth of domains touched, will output change) and `audit/backward-compatibility.json` (can a data-source swap alone satisfy this generator) are two different questions with two different answers for the same generators — several "high complexity" generators are simultaneously "adapter-ready," because complexity here means *the migration will change what the page says*, not *the code is hard to adapt*.
3. **Duplication is resolved by evidence, not assumption.** Where Phase 2A found two datasets producing identical output (spelling variants, syllable counts — verified across all 3,697 names with zero exceptions), this plan treats that as the lowest-risk class of merge. Where two datasets produce *conceptually* overlapping but *independently computed* output (the three popularity-derived files), this plan treats that as requiring reconciliation, not assumption of agreement.
4. **New domains with no current data are not blocked by this plan — they are simply empty until populated.** `etymology`, `history`, `culture`, `religion`, and `nicknames` have no current dataset to migrate. Their wave-3 placement reflects a conceptual ordering recommendation (research them once `origin`/`language` exist, for narrative coherence), not a hard technical dependency — there is nothing to move, so there is nothing that can technically block them.

## Dependency ordering

The full chain — dataset → generator → canonical destination → downstream consumer → prerequisite — is documented per-domain in `audit/migration-dependency-graph.json`. Two findings from that graph shape everything downstream of it:

- **`origin` has the widest fan-out of any domain** (6 downstream consumers: citations, history, culture, religion, `relationships.siblingPairs[]`, `relatedNames.similarNameIds[]`) — consistent with Phase 1D's independent finding that `origin` is the single highest-leverage field on the site.
- **`citations` is the unique terminal node** (dependency level 4, the deepest in the graph) — because a citation is, by definition, provenance for another fact, and cannot precede the fact it supports.

## Migration waves

| Wave | Domains | Why |
| --- | --- | --- |
| 1 — Foundation | identity, metadata | Zero prerequisites; every other domain keys off `identity.id`. |
| 2 — Direct identity-dependents (parallel-safe) | classification, variants, origin, language, popularity, meaning, pronunciation, nicknames | Each has exactly one hard prerequisite (identity) and no dependency on any sibling in this wave — topologically parallel. A secondary, measurement-based sub-ordering (provenance, then Phase 1D's Knowledge Recovery Score) sequences the actual work within the wave without adding a hard dependency (`audit/migration-waves.json`). |
| 3 — Second-order dependents | etymology, history, culture, religion, usage, relatedNames, relationships | Each depends on at least one wave-2 domain — `usage` on `popularity` (hard: it's literally derived from popularity records), `relatedNames` and `relationships` on 3-4 wave-2 domains each (hard, verified against real generator scoring-weight documentation), the four new-and-empty domains on `origin`/`language` (soft, conceptual only). |
| 4 — Terminal | citations | Depends on 4 other researched domains (`meaning`, `origin`, `etymology`, `history`) simultaneously — the deepest node in the graph, by construction. |

Every domain belongs to exactly one wave; `audit/migration-validation.json` confirms this programmatically, not by inspection.

## Compatibility strategy

`audit/backward-compatibility.json` found that **19 of 23 generators (83%) are adapter-ready** — meaning a thin translation shim that reshapes a canonical entity record back into each generator's existing flat-object expectations satisfies them with *zero code changes*. This is the plan's default strategy: migrate the data, not the generator, wherever possible. Three generators are `partial` (a dual-producer question needs resolving independent of the adapter question); one, `scripts/generate-trends-page.js`, is `requires-refactor` (its own logic performs multi-source reconciliation that becomes dead code, not adaptable code, once its three current sources unify into one).

The practical implication: this migration does not require rewriting the majority of the page-generation layer. It requires (a) consolidating where data is written, (b) an adapter layer at the read boundary, and (c) a small, named set of generators that need their own logic revisited — not a sitewide generator rewrite.

## Validation strategy

Every wave has a validation checkpoint named in `audit/migration-risk-register.json`, tied to the specific risk it guards against — not a generic "test before deploy" gate:

- **Wave 1**: a full-catalog slug diff with zero tolerance for mismatch (URL stability is non-negotiable — risk-04).
- **Wave 2**: re-run the exhaustive variants/syllables equality check immediately before merging duplicate producers (risk-02); run the existing 400-word build guard against a sample of newly-enriched pages, since removing fallback prose can — ironically — reduce word count below an existing threshold (risk-05).
- **Wave 3**: diff sibling-harmony scores across all 150 live pairs before publishing the switch, since real origin data will change previously-published scores (risk-01); snapshot the live trend page's rendered output before `generate-trends-page.js`'s refactor (risk-03).
- **Pre-Wave-4**: confirm `scripts/enrich-meanings.js`'s output columns actually populate in a live run, since they are currently always-null in production data (risk-06) — citations cannot meaningfully begin otherwise.

`audit/migration-validation.json` additionally runs 7 structural checks (domain-wave completeness, dataset-transition completeness, generator-classification completeness, dependency termination, cycle-freedom, orphan-freedom, transition-conflict-freedom) — all 7 pass today, against the *plan*, before any wave has executed. These are gates on the plan's soundness, distinct from the per-wave content gates above, which apply during execution.

## Rollback philosophy

Rollback is a property this plan builds in structurally, not a procedure bolted on afterward: every dataset transition in `audit/dataset-transition-map.json` uses one of six states, and none of them is "delete." The two most cautious states — `parallel` (run old and new side by side before cutover) and `archive-after-validation` (retain read-only, confirm no external consumer, only then set aside) — exist specifically so that any wave can be reverted by resuming reads from the still-intact prior source, for as long as the parallel/retention period is kept open. A migration whose only path forward is also its only path back is not safely reversible; this plan avoids that by never fully retiring a source until the canonical replacement has been validated against it, per-wave, at the checkpoints above.

## Completion criteria

A wave is complete when, and only when:

1. Every domain in that wave has real data flowing from its canonical destination to every generator classified as consuming it (`audit/generator-impact-matrix.json`), confirmed by the wave's specific validation checkpoint above — not merely "the code runs without erroring."
2. Every generator's rendered output has been diffed against its pre-migration baseline, and any change is a *known, accepted* consequence of more complete data (e.g. a sibling-harmony score shifting because real origin data now feeds it) rather than an *unexplained* difference.
3. `audit/migration-validation.json`'s structural checks continue to pass — a wave's completion must not introduce a new orphaned domain, unclassified generator, or dataset transition conflict.

The migration as a whole is complete when Wave 4 (`citations`) closes — at which point every canonical domain has either live data flowing into it from a resolved source, or is a confirmed-empty new domain awaiting future research (`etymology`, `history`, `culture`, `religion`, `nicknames` — never blocked, only unpopulated). Completion is a statement about architecture, not about knowledge coverage: this plan does not claim, and is not designed to claim, that `meaning` or `origin` will reach any particular coverage percentage. That is Phase 1D's Knowledge Recovery Engine's concern, operating on top of an architecture this plan exists to make trustworthy either way.
