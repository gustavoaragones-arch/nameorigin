# KCI Exposure & Explainability v1

_Phase 11A — presentation only, all data engines frozen._

Phase 11A exposes Knowledge Completeness Index information on public name pages through a read-only presentation layer. No scoring, editorial, or infrastructure changes are made.

## Architecture

```
audit/knowledge-completeness.json (frozen KCI output)
data/citation-records.json
data/popularity-records.json
data/citation-registry.json (titles only)
        │
        ▼
lib/presentation/kci-explainability.js
        │  read-only explainability model
        ▼
lib/presentation/kci-explainability-html.js
        │  deterministic HTML
        ▼
generate-programmatic-pages.js → name/{slug}/index.html
```

The UI never calls the scoring engine directly. It consumes precomputed KCI output and frozen record artifacts through the presentation layer.

## Presentation model

Each name page receives an explainability model with:

| Field | Source |
| --- | --- |
| Overall score | Precomputed KCI entity score |
| Knowledge contribution | Sum of editorial breakdown fields (origin, meaning, pronunciation, etymology, history, variants) |
| Citation contribution | Precomputed `breakdown.citations` |
| Popularity contribution | Precomputed `breakdown.popularity` |
| Citation publications | Citation Registry titles (no internal IDs) |
| Popularity countries/years | Popularity Records regional payload |

No weights are exposed. No internal IDs are exposed.

## Component rendering

| Component | When present | When absent |
| --- | --- | --- |
| Knowledge | Score + badge + editorial explanation | "No editorial knowledge data is currently available." |
| Citation | Score + badge + publication titles | "No citation data is currently available." |
| Popularity | Score + badge + countries/years | "No popularity data is currently available." |

Visual elements:

- Overall KCI score with progress bar
- Per-component score values (earned points only)
- Coverage badges (`Editorial coverage`, `Sources cited`, `Popularity data`)

## Missing-data behavior

Missing Citation or Popularity Records never throw errors. The presentation layer renders deterministic fallback copy with zero contribution scores.

## Unresolved authority behavior

Popularity Records with regional data but no canonical source IDs (e.g. India-only Aakriti record) score zero popularity points in KCI and display the missing-popularity explanation. Regional data is not shown when popularity is unavailable.

## Citation presentation

Only publication **titles** from the Citation Registry are displayed. Internal citation IDs never appear in HTML.

## Popularity presentation

When popularity is available, the UI shows:

- Countries with data
- Years available

Raw ranking calculations are not added beyond existing stored regional records on popularity pages.

## Pipeline

```bash
node scripts/build/run-kci-presentation-audit.js
```

Or step-by-step:

```bash
node scripts/build/run-kci.js
node scripts/build/validate-kci-presentation.js
node scripts/build/run-editorial-qa.js
node scripts/build/run-kci-presentation-equivalence.js
```

Regenerate name pages after presentation changes:

```bash
node scripts/generate-programmatic-pages.js
```

## Phase 11A results

| Metric | Value |
| --- | ---: |
| Pages tested | **3,697** |
| Citation sections with data | **1,150** |
| Popularity sections with data | **4** |
| Missing citation handled | **2,547** |
| Missing popularity handled | **3,693** |
| Internal IDs exposed | **0** |
| KCI presentation validation | **PASS** |
| KCI activation validation | **PASS** |
| Editorial QA | **PASS** |
| Equivalence | **PASS** |

## Boundaries preserved

- Knowledge Architecture unchanged
- Citation Architecture unchanged
- Popularity Architecture unchanged
- KCI engine unchanged
- KCI weights unchanged
- No editorial changes

## Future extensibility

Future phases may add richer explainability (source weighting, regional detail, trend summaries) by extending the presentation layer only. Scoring refinements remain isolated from page templates.

## Related files

| File | Role |
| --- | --- |
| `lib/presentation/kci-explainability.js` | Read-only explainability model |
| `lib/presentation/kci-explainability-html.js` | HTML renderer |
| `scripts/build/validate-kci-presentation.js` | Presentation validation |
| `scripts/build/run-kci-presentation-equivalence.js` | Equivalence audit |
| `scripts/build/run-kci-presentation-audit.js` | Phase 11A audit runner |
| `scripts/generate-programmatic-pages.js` | Name page integration |
| `styles.css` | KCI presentation styles |
| `audit/kci-presentation.json` | Phase 11A audit artifact |
