# Sources & Methodology

_Human-readable overview of how NameOrigin.io evaluates and presents name information._

## Knowledge Records

Knowledge Records are the editorial source of truth for structured name knowledge. Each record may include origin, meaning, pronunciation, etymology, and history domains with explicit confidence and provenance metadata.

Knowledge Architecture v2 is **frozen**. Presentation phases read Knowledge Records but never modify them.

## Citation Infrastructure

Editorial source references are normalized to canonical publications through a deterministic Citation Registry. Multiple reference variants collapse to a single publication identity.

Users see **publication titles, editions, and organizations** — never internal registry identifiers.

## Popularity Infrastructure

Popularity sources are normalized to canonical authority datasets (government statistics, civil registration, national statistics, and related classes). Entity Popularity Records reference these canonical sources.

Unresolved authorities (regions without a registry mapping) preserve data internally but do not contribute popularity points or user-facing source attribution until a canonical source is registered.

## Knowledge Completeness Index (KCI)

KCI is a deterministic internal score derived from:

- Editorial knowledge domains
- Citation Records (when present)
- Popularity Records (when present with canonical sources)

KCI weights are **frozen**. Phase 10A activated citation and popularity dimensions without rebalancing editorial weights.

## Validation Pipeline

The platform maintains deterministic validation at each architecture milestone:

1. Registry or record builders
2. Schema and reference validation
3. Editorial QA
4. Equivalence audits (frozen artifacts unchanged)
5. Infrastructure or population audits

## Deterministic Builds

Identical inputs produce identical outputs. Registry rebuilds, record population, KCI activation, and presentation rendering all support deterministic rebuild verification.

## Editorial QA

Editorial QA verifies Knowledge Record consistency, confidence alignment, duplicate detection, and schema compliance before presentation or scoring phases consume editorial data.

## Public trust pages

- [/about/methodology/](/about/methodology/)
- [/about/editorial-policy/](/about/editorial-policy/)
- [/about/architecture/](/about/architecture/)
- [/about/quality-assurance/](/about/quality-assurance/)
