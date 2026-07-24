# The Canonical Name Knowledge Model — Architecture Specification

_Phase 2A — architecture only. This document defines a permanent target data shape. It contains no migration steps, no implementation instructions, and no code changes. See `schemas/name-entity.schema.json` for the formal contract this document explains, and `audit/knowledge-domains.json`, `audit/dataset-mapping.json`, `audit/generator-dependencies-v2.json`, `audit/knowledge-redundancy.json`, `audit/name-entity-examples.json`, `audit/capability-matrix.json`, and `audit/schema-validation.json` for the supporting analysis._

## Why a canonical model exists

Phases 1A–1D established four things about NameOrigin as it exists today, each traceable to a specific measured finding:

1. **The site has a mature, working architecture** (Phase 1A) — 7,832 pages, 24 templates, a coherent generator pipeline.
2. **Its knowledge is real but sparse** (Phase 1B) — the fields that require research (meaning, origin, popularity) sit at 0.08%–4.4% coverage, while structural fields (gender, letter, syllables) sit at 100%.
3. **Sparsity is sometimes hidden rather than disclosed** (Phase 1C) — the same empty field can produce either an honest placeholder or a fabricated-sounding fallback, depending on which of several independently-written rendering functions touches it.
4. **The same field, read by different generators, can propagate inconsistently** (Phase 1D) — the sharpest example being `origin`, which one generator reads from `data/names-enriched.json` and another reads from the unenriched `data/names.json`, producing two different truthfulness outcomes for the identical underlying fact.

That fourth finding is the direct cause of this document. It is not a content problem — no amount of writing more meanings or origins fixes a data layer where the same concept lives in two files, read inconsistently by different code. It is an architecture problem: **there is currently no single, authoritative representation of "everything known about the name Liam."** There are ten-plus files, each holding a fragment, joined ad hoc by `name_id`, read selectively by whichever generator happens to need which fragment.

The canonical model exists to make that class of problem structurally impossible going forward — not by writing more knowledge, but by giving every future piece of knowledge exactly one place to live and exactly one way to be read.

## Design philosophy

**One entity, one record, many domains.** A name is not a row in a table; it is an entity with many facets — what it means, where it comes from, how it sounds, how popular it is, who else shares its story. `schemas/name-entity.schema.json` models this directly: eighteen domains (`identity`, `classification`, `meaning`, `origin`, `language`, `etymology`, `history`, `culture`, `religion`, `usage`, `pronunciation`, `variants`, `nicknames`, `relatedNames`, `popularity`, `relationships`, `citations`, `metadata`) on one object, rather than eighteen implicit tables joined at read time.

**Absence is `null`, never invented text.** Every optional domain and every optional leaf field may be `null`. There is no "unknown" sentinel string, no default phrase, no placeholder paragraph. This is a direct architectural response to Phase 1C's central finding: today, absence is sometimes represented as generated filler text presented as if it were fact. Under this model, a renderer that receives `meaning: null` knows unambiguously that no meaning exists — what it chooses to *display* for that case is a presentation decision, made once, in one place, not a data-modeling accident repeated differently by every function that happens to touch the field.

**Researched vs. computed is a first-class distinction, not a convention.** Every leaf field in the schema carries an `x-provenance` annotation of either `"researched"` (requires human or sourced input; can be legitimately missing) or `"computed"` (deterministically derived; has no missing-data state). This formalizes a distinction Phase 1C had to reverse-engineer from source code — e.g. recognizing that `letter` and `variants` behave differently from `meaning` and `origin` even though all four currently live as plain fields in the same JSON files. Under the canonical model, that distinction is declared in the schema itself, not inferred from generator behavior after the fact.

## Domain boundaries

Three boundary decisions were made deliberately, each traceable to a Phase 1A–1D finding:

- **`meaning` vs. `etymology` vs. `history` vs. `culture` are four different domains**, not one "about the name" blob. `meaning` is what the name signifies; `etymology` is what word(s) it descends from; `history` is documented past usage; `culture` is present-day significance. Keeping them separate means a future contributor researching etymology does not have to also produce (or fabricate) a meaning, and vice versa — a narrower, more honest unit of research effort than the current single generic "Historical and Cultural Context" section.
- **`religion` is a distinct domain from `classification`**, even though today's only adjacent concept — the `biblical` category tag — lives inside `classification.categories[]` and stays there in the mapping (see `audit/knowledge-domains.json`). Phase 1A already established that no religion taxonomy exists in the project; this model gives that future taxonomy a home without retroactively reinterpreting today's style tag as something it was never curated to mean.
- **Surnames are explicitly out of scope.** `relationships.surnameCompatibility[]` and `relationships.siblingPairs[]` reference other entities by ID, but this schema does not define what a Surname entity contains. `data/last-names.json` and `data/heraldry.json` map to "split" in `audit/dataset-mapping.json` — they belong to a future Surname Entity schema, structurally parallel to this one, not folded into it. A Name is not a Surname; giving them one shared schema would re-create the exact kind of ambiguous, over-general modeling this document argues against.

## Separation of researched vs. computed knowledge

This separation exists because the two have entirely different failure modes. A `researched` field can be legitimately empty — that is a fact about the world (no one has documented this yet), and the correct representation is `null`. A `computed` field (compatibility score, sibling harmony score, first letter, spelling variants) should never be empty for an entity that exists, because it is derived from data already on the record; if it is missing, that is a bug in the computation, not a gap in human knowledge. Conflating the two — as today's flat files do, where `meaning` and `first_letter` sit as equally-plain fields on the same object — makes it impossible to tell, from the data alone, which kind of gap you are looking at. The canonical model makes that determination structural rather than requiring source-code archaeology (which is exactly how Phases 1C and 1D had to establish it).

## Separation of canonical knowledge vs. presentation

Not everything in the current `/data` directory is knowledge. Five datasets (`compatibility-explanation-variants.json`, `sibling-explanation-variants.json`, `cultural-explanation-variants.json`, `comparison-intro-variants.json`, `delta-interpretation-variants.json`) are prose-variant pools — wording-rotation logic for renderers, not facts about any entity. `audit/dataset-mapping.json` classifies all five `keep` or `deprecated`, never `merge`, precisely because they have no canonical field to merge into. The canonical model's job is to describe what NameOrigin *knows*; how that knowledge is phrased, rotated, or styled on a page remains entirely a renderer concern, downstream of and decoupled from the entity record. A renderer reading `meaning.primary: "warrior"` chooses its own sentence structure; the fact itself does not change based on which of several possible sentences expresses it — unlike today, where the same empty `meaning` field currently produces measurably different *facts* (a fabricated claim in one section, an honest placeholder in another) depending on which renderer touches it.

## Ownership rules

Every canonical domain has exactly one of three ownership modes, declared per-field via `x-provenance` and cross-referenced in `audit/knowledge-domains.json`:

1. **Curated-input ownership** (e.g. `origin.*`, sourced from a human-authored overrides file before reaching the entity). The dataset that owns this today, `data/origin-overrides.json`, remains the correct place to author new research under the canonical model too — see `audit/dataset-mapping.json` status `derived`. The canonical model does not change *where research is entered*; it changes what happens to that research once entered — one merge, upstream of every consumer, instead of a merge some consumers see and others don't.
2. **Computed ownership** (e.g. `relationships.*`, entirely `x-provenance: computed`). No dataset owns these; a scoring function does, reading other domains of the same record.
3. **Reference ownership** (e.g. `countries.json`'s relationship to `origin.country`). A small lookup table that the canonical entity *references*, not duplicates — `audit/dataset-mapping.json` classifies this `keep`, not `merge`, because merging a 5-row reference table into every one of 3,697 entity records would itself reintroduce duplication.

## How future datasets should integrate

A new knowledge field (say, a future `history.notableBearers` research effort) integrates by: (1) determining which domain it belongs to using the boundary logic above, (2) adding a curated-input dataset if the field is `researched` or a scoring function if `computed`, (3) writing to that one canonical path. It does **not** integrate by adding a new flat JSON file that some future generator reads and others don't — that is the exact pattern this document exists to end.

## How generators should eventually consume the model

Every current generator's dependency is already mapped in `audit/generator-dependencies-v2.json`, expressed as "canonical fields required" rather than "current dataset reads." The intended eventual shape is uniform: a generator receives one canonical entity record (or a small array of them, for list/comparison pages) and reads whichever domains it needs from that single object. This is not a rewrite instruction — no generator is changed by this phase — but it is the target every future generator change should move toward, and the reason `audit/generator-dependencies-v2.json` exists: so that a future migration phase has an already-computed map of exactly what each generator would need, rather than having to re-derive it from source at that time.

## Why this architecture prevents knowledge divergence

The concrete mechanism, illustrated with the real example already found in this project: today, `scripts/generate-sibling-pages.js` reads `data/names.json` while `scripts/generate-programmatic-pages.js` reads `data/names-enriched.json` — two files, one underlying fact, one generator seeing it and one not. This was not a decision anyone made on purpose; it is what happens by default when knowledge lives in multiple files with no single owner. Under the canonical model, there is exactly one `origin` object per entity. A generator either has access to the canonical entity record or it does not; there is no intermediate state where it has access to a *stale or partial copy* of one domain while another generator has the current one. Divergence of the kind Phase 1D measured (a 100% sibling-page fallback rate against a 95.6% name-detail-page fallback rate, for the identical concept) becomes structurally impossible, not merely less likely — there is only one file left to read.

## Scope of this document

This is a permanent specification, not a plan. It will not be revised by the act of implementing it — future migration-planning, dataset-normalization, and generator-migration phases will produce their own documents describing *how* and *when* to move toward this model. This document only describes *what the destination is* and *why it is shaped this way*, each claim traced to a specific finding already measured and cited in Phases 1A through 1D.
