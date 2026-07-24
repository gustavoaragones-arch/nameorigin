# NameOrigin — Knowledge Recovery Report

_Generated 2026-07-21T18:26:16.075Z by scripts/audit/knowledge-recovery-report.js (Phase 1D — read-only). Regenerate with `node scripts/audit/run-knowledge-recovery.js`._

This report reframes Phases 1A-1C's diagnostic findings as a **prioritization** question: of the knowledge fields found to be sparse, which ones, if enriched, would change the most currently-rendered statements across the most pages? It contains no implementation advice, no code-change suggestions, and no SEO recommendations — only measured leverage.

## How missing knowledge propagates

A single empty field does not produce a single gap. Because the same underlying dataset field is read by multiple independently-coded template sections, one missing value can produce several distinct rendered fallback or disclosed-missing statements on the same page, and — where more than one template reads the same dataset — across more than one page per entity.

The clearest example, traced in `audit/knowledge-impact-graph.json`: the **origin** field (`origin_country`/`language`/`origin_cluster` in `data/names-enriched.json`) is read by 4 separate rendering functions on name-detail-page alone (Name Usage & Cultural Context, Origin and Linguistic Lineage, Historical and Cultural Context, and the "Where does the name come from?" FAQ answer), plus a fifth occurrence on names-like-page and a sixth on sibling-harmony-page. One missing value therefore backs up to 6 separate rendered statements. This is why `origin`'s measured recoverable-occurrence total (17,820) is larger than its own missing-record count (3,534) by a factor of about 5.0.

A second, more subtle propagation pattern: the same conceptual field can be **read from two different files** by two different generators. `generate-programmatic-pages.js` reads `data/names-enriched.json` (the origin-overrides-merged file) for name-detail-page and names-like-page, but `generate-sibling-pages.js` reads the plain, unenriched `data/names.json` for sibling-harmony-page. Enriching `data/names-enriched.json` alone — the file every other generator already prefers — would not by itself change what sibling-harmony-page renders, because that one generator was never pointed at the enriched file. This dependency detail is only visible by tracing the graph field-by-field, which is what `audit/knowledge-impact-graph.json` exists to do.

## Which fields have the greatest leverage

Ranked by measured recovery score (`audit/editorial-priority-queue.json`, itself a re-view of `audit/knowledge-roi.json` — no new scoring logic):

| Rank | Field | Score | Coverage today | Templates affected | Pages impacted | Recoverable occurrences |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Origin (country / language / cluster) | 100 | 4.41% | 3 | 7,544 | 17,820 |
| 2 | Popularity | 42 | 0.14% | 3 | 7,544 | 7,534 |
| 3 | Meaning | 41 | 0.08% | 1 | 3,697 | 7,391 |
| 4 | Pronunciation (phonetic) | 21 | 0% | 1 | 3,697 | 3,697 |
| 5 | Heraldry | 0 | 2.67% | 1 | 75 | 74 |
| 6 | Trend / rank movement | 0 | 0.03% | 1 | 20 | 20 |

**Origin (country / language / cluster)** ranks first: it currently sits at 4.41% coverage, touches 3 templates (name-detail-page, sibling-harmony-page, names-like-page), and its 17,820 recoverable occurrences is the largest measured figure of any field — driven by the one-missing-value-to-many-rendered-statements multiplier described above. **Popularity** (score 42) and **Meaning** (score 41) follow; between them these three fields account for 32,745 of the 36,536 total recoverable occurrences measured across all fields.

13 fields score 0: Compatibility / harmony score, Cultural context (compare-page), Letter (alphabetical), Phonetic similarity (names-like), Surname origin have no missing-data state at all (they are computed or fully curated, per Phase 1C), while Category / style tag, Equivalent names, Gender, Gender/country cluster (names-like), Heraldry, Syllables, Trend / rank movement, Spelling variants have some measured recovery potential but at a scale too small to register against the top fields' totals — see `audit/knowledge-roi.json` for their exact (non-zero, just small) figures.

## Incremental scenarios

`audit/recovery-scenarios.json` models specific enrichment increments under one stated assumption: enrichment is applied to a uniformly random subset of currently-missing records, so occurrence reduction scales in direct proportion to the fraction of missing records enriched.

- **+500 meaning records**: coverage moves from 0.08% to 13.61%; the model projects 1,000 fewer fallback/disclosed-missing occurrences, and name-detail-page's continuous truthfulness density (a page-weighted metric distinct from Phase 1C's categorical ratio — see below) moves from 39.8% to 41.9%.
- **+1,000 origin records**: coverage moves from 4.41% to 31.46%; the model projects 5,042 fewer occurrences across 3 templates, with name-detail-page's density moving from 39.8% to 48.2%.

The full scenario set (`audit/recovery-scenarios.json`) covers meaning, origin, pronunciation, popularity, and heraldry at several increment sizes each, all built from the same proportional model and the same measured current-state data — no scenario introduces a number that cannot be traced back to a real count in an earlier phase's report.

**Note on the two truthfulness metrics**: Phase 1C's per-template truthfulness ratio is categorical (each assertion type counts once, in whichever state is dominant across its pages) and does not move until an assertion's dominant state actually flips — which requires crossing a 50% coverage threshold, not a gradual change. This report's "truthfulness density" is a different, continuous metric (the page-weighted fraction of all assertion-instances currently factual) introduced specifically so partial, incremental enrichment has a measurable effect to report. The two are deliberately not the same number and should not be compared directly.

## Research workload, for scale

`audit/research-workload.json` reports how many records would need enrichment to reach full coverage per field, independent of any scoring:

- **Trend / rank movement**: 18,480 of 18,485 records (name × country pairs), averaging 0 recoverable occurrences per record enriched.
- **Pronunciation (phonetic)**: 3,697 of 3,697 records (data/names.json (names)), averaging 1 recoverable occurrences per record enriched.
- **Meaning**: 3,694 of 3,697 records (data/names.json (names)), averaging 2 recoverable occurrences per record enriched.
- **Popularity**: 3,692 of 3,697 records (data/names.json (names)), averaging 2.04 recoverable occurrences per record enriched.
- **Origin (country / language / cluster)**: 3,534 of 3,697 records (data/names.json (names)), averaging 5.04 recoverable occurrences per record enriched.
- **Heraldry**: 73 of 75 records (data/last-names.json (surnames)), averaging 1.01 recoverable occurrences per record enriched.

No time or cost estimate is offered for this workload — no such figure can be derived from repository data alone.

---

### How to regenerate this report and its data

```bash
node scripts/audit/run-knowledge-recovery.js
```

This runs, in order: `knowledge-roi.js` → `knowledge-impact-graph.js` → `editorial-priority-queue.js` → `research-workload.js` → `recovery-scenarios.js` → `knowledge-recovery-report.js`. Like Phases 1A-1C, every script here only reads the repository and prior `/audit/*.json` reports, and only writes into `/audit/`.
