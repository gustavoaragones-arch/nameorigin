# Architecture Version History

_Frozen milestones and lifecycle eras for NameOrigin.io._

## Platform lifecycle

With **v8** complete, the project has entered a new lifecycle. Versions **v2–v8** were **Platform Construction** — establishing deterministic infrastructure, scoring, presentation, trust, and operational intelligence. Everything from **v9 onward** is **Platform Expansion** — growing the knowledge base through audit-driven, deterministic workflows without inventing new core infrastructure.

| Era | Versions | Purpose |
| --- | --- | --- |
| **Foundation** | v2–v4 | Establish deterministic Knowledge, Citation, and Popularity infrastructure |
| **Intelligence** | v5–v6 | Introduce explainable KCI scoring and read-only presentation |
| **Trust** | v7–v8 | Add transparency, methodology, and operational intelligence |
| **Expansion** | v9+ | Grow the knowledge base through audit-driven, deterministic workflows |

Future work no longer invents new infrastructure. It systematically expands the value of an already mature platform.

## Construction milestones (v2–v8)

| Architecture | Version | Purpose | Status | Compatibility |
| --- | --- | --- | --- | --- |
| Knowledge Architecture | v2 | Structured editorial knowledge across five domains | **Frozen** | Foundation for Citation and Popularity |
| Citation Infrastructure | v1 | Canonical publication registry and resolver | **Frozen** | Feeds Citation Records and KCI |
| Citation Population | v1 | Entity-level citation assignments | **Complete** | Consumed by KCI and presentation |
| Popularity Infrastructure | v1 | Canonical popularity source registry | **Frozen** | Feeds Popularity Records and KCI |
| Popularity Population | v1 | Entity-level popularity records | **Complete** | Consumed by KCI and presentation |
| KCI Activation | v1 | Deterministic scoring from frozen records | **Complete** | Scores all entities without mutating data |
| KCI Explainability | v1 | Read-only KCI exposure on name pages | **Complete** | Derived from KCI output and records |
| Trust Signals | v1 | Authority and transparency pages | **Complete** | Derived from audit artifacts |
| Citation Coverage Intelligence | v1 | Read-only citation measurement and prioritization | **Complete** | Informs Expansion phases; no data mutation |

## Growth Era roadmap (v9+)

Every expansion phase follows:

```
Audit → Prioritize → Expand → Validate → Freeze
```

| Phase | Focus | Type | Status |
| --- | --- | --- | --- |
| **13A** | Citation Coverage Intelligence | Measure | **Complete** |
| **13B** | Citation Diversity Improvement | Optimize | Planned |
| **14A** | Popularity Coverage Intelligence | Measure | Planned |
| **14B** | Popularity Diversity Improvement | Optimize | Planned |
| **15A** | Editorial Coverage Intelligence | Measure | Planned |
| **15B** | Knowledge Expansion | Expand | Planned |
| **16A** | Knowledge Navigation Layer | Discovery | Planned |
| **17A** | Knowledge Graph | Export | Planned |
| **18A** | Structured AI Outputs | Export | Planned |
| **19A** | Dataset Publication | Publish | Planned |

### Phase 13A insight (v8)

Citation Coverage Intelligence established that:

- Citation architecture is **complete** for the researched corpus.
- **1,150 / 1,150** Knowledge Records have Citation Records with full domain assignment.
- **100%** registry utilization (17 / 17 publications referenced).
- The dominant bottleneck is **editorial coverage** — **2,547** entities lack Knowledge Records.
- Citation diversity (~79% top-three publication concentration) is a **quality optimization**, not a capability blocker.

**Implication:** Highest-ROI work is editorial expansion (15A → 15B), not citation mechanics. Phase 13B remains valuable as a small diversity optimization for the existing 1,150 researched entities.

### Editorial expansion workflow (15B+)

New editorial work follows a strict pipeline:

```
Knowledge Record
        ↓
Citation Record
        ↓
Popularity attribution
        ↓
Validation
        ↓
Freeze
```

Discovery phases (16A–19A) proceed only after editorial density improves.

---

## Milestone details

### Knowledge Architecture v2

- **Purpose:** Editorial source of truth for origin, meaning, pronunciation, etymology, and history.
- **Status:** Frozen
- **Compatibility:** Required baseline for all subsequent layers.

### Citation Infrastructure v1

- **Purpose:** Deterministic normalization of editorial source references to canonical publication IDs.
- **Status:** Frozen
- **Compatibility:** Citation Records and citation presentation consume the registry read-only.

### Citation Population v1

- **Purpose:** Entity-level Citation Records for all Knowledge Records with resolved citation IDs.
- **Status:** Complete (1,150 records)
- **Compatibility:** KCI citation dimension and name-page citation display.

### Popularity Infrastructure v1

- **Purpose:** Canonical popularity source registry with authority normalization.
- **Status:** Frozen
- **Compatibility:** Popularity Records and future dataset expansion.

### Popularity Population v1

- **Purpose:** Entity-level Popularity Records migrated from legacy popularity data.
- **Status:** Complete (5 records, 7 legacy rows)
- **Compatibility:** KCI popularity dimension; unresolved authorities score zero.

### KCI Activation v1

- **Purpose:** Connect KCI engine to Citation Records and Popularity Records.
- **Status:** Complete
- **Compatibility:** Presentation layers consume KCI output read-only.

### KCI Explainability v1

- **Purpose:** Expose KCI component scores on name pages through a presentation layer.
- **Status:** Complete (3,697 name pages)
- **Compatibility:** Does not recalculate scores.

### Trust Signals v1

- **Purpose:** Public transparency pages for methodology, policy, architecture, and QA.
- **Status:** Complete
- **Compatibility:** Derived entirely from audit artifacts; no data mutation.

### Citation Coverage Intelligence v1

- **Purpose:** Deterministic citation coverage measurement and gap prioritization without modifying frozen artifacts.
- **Status:** Complete
- **Key finding:** Researched corpus has 100% KR → CR coverage; editorial coverage is the primary growth lever.
- **Compatibility:** Informs 13B diversity work and 15B editorial expansion; no engine changes.

## Frozen date reference

Frozen dates correspond to the `generatedAt` timestamp of each milestone's final audit artifact in `/audit/`. See [/about/quality-assurance/](/about/quality-assurance/) for current validation status.
