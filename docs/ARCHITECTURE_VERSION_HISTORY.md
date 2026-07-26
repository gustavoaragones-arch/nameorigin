# Architecture Version History

_Frozen milestones for NameOrigin.io data and presentation architecture._

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

## Frozen date reference

Frozen dates correspond to the `generatedAt` timestamp of each milestone's final audit artifact in `/audit/`. See [/about/quality-assurance/](/about/quality-assurance/) for current validation status.
