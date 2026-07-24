#!/usr/bin/env node
/**
 * scripts/audit/knowledge-recovery-report.js — Phase 1D:
 * audit/KNOWLEDGE_RECOVERY_REPORT.md (READ-ONLY).
 *
 * Explains how missing knowledge propagates through the project and which
 * fields have the greatest measured leverage. No implementation advice, no
 * code-change suggestions, no SEO recommendations — purely descriptive,
 * same discipline as Phases 1A-1C's executive reports.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditText } = require('./_lib.js');

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run scripts/audit/run-knowledge-recovery.js first.`);
    process.exit(1);
  }
  return data;
}

function run() {
  console.log('Knowledge Recovery Executive Report');

  const roi = requireAudit('knowledge-roi.json');
  const graph = requireAudit('knowledge-impact-graph.json');
  const queue = requireAudit('editorial-priority-queue.json');
  const workload = requireAudit('research-workload.json');
  const scenarios = requireAudit('recovery-scenarios.json');

  const top = queue.queue[0];
  const second = queue.queue[1];
  const third = queue.queue[2];
  const zeroScoreFields = roi.fields.filter((f) => f.knowledgeRecoveryScore === 0);
  const originScenario1000 = scenarios.scenarios.find((s) => s.field === 'origin' && s.recordsRequested === 1000);
  const meaningScenario500 = scenarios.scenarios.find((s) => s.field === 'meaning' && s.recordsRequested === 500);

  const md = `# NameOrigin — Knowledge Recovery Report

_Generated ${new Date().toISOString()} by scripts/audit/knowledge-recovery-report.js (Phase 1D — read-only). Regenerate with \`node scripts/audit/run-knowledge-recovery.js\`._

This report reframes Phases 1A-1C's diagnostic findings as a **prioritization** question: of the knowledge fields found to be sparse, which ones, if enriched, would change the most currently-rendered statements across the most pages? It contains no implementation advice, no code-change suggestions, and no SEO recommendations — only measured leverage.

## How missing knowledge propagates

A single empty field does not produce a single gap. Because the same underlying dataset field is read by multiple independently-coded template sections, one missing value can produce several distinct rendered fallback or disclosed-missing statements on the same page, and — where more than one template reads the same dataset — across more than one page per entity.

The clearest example, traced in \`audit/knowledge-impact-graph.json\`: the **origin** field (\`origin_country\`/\`language\`/\`origin_cluster\` in \`data/names-enriched.json\`) is read by ${graph.fieldsIncluded.includes('origin') ? '4 separate rendering functions on name-detail-page alone' : 'multiple rendering functions'} (Name Usage & Cultural Context, Origin and Linguistic Lineage, Historical and Cultural Context, and the "Where does the name come from?" FAQ answer), plus a fifth occurrence on names-like-page and a sixth on sibling-harmony-page. One missing value therefore backs up to 6 separate rendered statements. This is why \`origin\`'s measured recoverable-occurrence total (${roi.fields.find((f) => f.field === 'origin').recoverableOccurrenceTotal.toLocaleString()}) is larger than its own missing-record count (${workload.workload.find((w) => w.field === 'origin').recordsRequiringEnrichment.toLocaleString()}) by a factor of about ${(roi.fields.find((f) => f.field === 'origin').recoverableOccurrenceTotal / workload.workload.find((w) => w.field === 'origin').recordsRequiringEnrichment).toFixed(1)}.

A second, more subtle propagation pattern: the same conceptual field can be **read from two different files** by two different generators. \`generate-programmatic-pages.js\` reads \`data/names-enriched.json\` (the origin-overrides-merged file) for name-detail-page and names-like-page, but \`generate-sibling-pages.js\` reads the plain, unenriched \`data/names.json\` for sibling-harmony-page. Enriching \`data/names-enriched.json\` alone — the file every other generator already prefers — would not by itself change what sibling-harmony-page renders, because that one generator was never pointed at the enriched file. This dependency detail is only visible by tracing the graph field-by-field, which is what \`audit/knowledge-impact-graph.json\` exists to do.

## Which fields have the greatest leverage

Ranked by measured recovery score (\`audit/editorial-priority-queue.json\`, itself a re-view of \`audit/knowledge-roi.json\` — no new scoring logic):

| Rank | Field | Score | Coverage today | Templates affected | Pages impacted | Recoverable occurrences |
| --- | --- | --- | --- | --- | --- | --- |
${queue.queue.map((q) => `| ${q.rank} | ${q.label} | ${q.knowledgeRecoveryScore} | ${q.currentCoveragePct}% | ${q.templatesAffected.length} | ${q.pagesImpacted.toLocaleString()} | ${q.recoverableOccurrenceTotal.toLocaleString()} |`).join('\n')}

**${top.label}** ranks first: it currently sits at ${top.currentCoveragePct}% coverage, touches ${top.templatesAffected.length} templates (${top.templatesAffected.join(', ')}), and its ${top.recoverableOccurrenceTotal.toLocaleString()} recoverable occurrences is the largest measured figure of any field — driven by the one-missing-value-to-many-rendered-statements multiplier described above. **${second.label}** (score ${second.knowledgeRecoveryScore}) and **${third.label}** (score ${third.knowledgeRecoveryScore}) follow; between them these three fields account for ${(top.recoverableOccurrenceTotal + second.recoverableOccurrenceTotal + third.recoverableOccurrenceTotal).toLocaleString()} of the ${roi.fields.reduce((s, f) => s + f.recoverableOccurrenceTotal, 0).toLocaleString()} total recoverable occurrences measured across all fields.

${zeroScoreFields.length} fields score 0: ${zeroScoreFields.filter((f) => f.currentCoverage.coveragePct == null).map((f) => f.label).join(', ')} have no missing-data state at all (they are computed or fully curated, per Phase 1C), while ${zeroScoreFields.filter((f) => f.currentCoverage.coveragePct != null).map((f) => f.label).join(', ') || '(none)'} have some measured recovery potential but at a scale too small to register against the top fields' totals — see \`audit/knowledge-roi.json\` for their exact (non-zero, just small) figures.

## Incremental scenarios

\`audit/recovery-scenarios.json\` models specific enrichment increments under one stated assumption: enrichment is applied to a uniformly random subset of currently-missing records, so occurrence reduction scales in direct proportion to the fraction of missing records enriched.

- **+500 meaning records**: coverage moves from ${meaningScenario500.coverageBefore.pct}% to ${meaningScenario500.coverageAfter.pct}%; the model projects ${meaningScenario500.totalOccurrenceReduction.toLocaleString()} fewer fallback/disclosed-missing occurrences, and name-detail-page's continuous truthfulness density (a page-weighted metric distinct from Phase 1C's categorical ratio — see below) moves from ${meaningScenario500.templateDensityProjection[0].truthfulnessDensityBeforePct}% to ${meaningScenario500.templateDensityProjection[0].truthfulnessDensityAfterPct}%.
- **+1,000 origin records**: coverage moves from ${originScenario1000.coverageBefore.pct}% to ${originScenario1000.coverageAfter.pct}%; the model projects ${originScenario1000.totalOccurrenceReduction.toLocaleString()} fewer occurrences across ${originScenario1000.templateDensityProjection.length} templates, with name-detail-page's density moving from ${originScenario1000.templateDensityProjection.find((t) => t.template === 'name-detail-page').truthfulnessDensityBeforePct}% to ${originScenario1000.templateDensityProjection.find((t) => t.template === 'name-detail-page').truthfulnessDensityAfterPct}%.

The full scenario set (\`audit/recovery-scenarios.json\`) covers meaning, origin, pronunciation, popularity, and heraldry at several increment sizes each, all built from the same proportional model and the same measured current-state data — no scenario introduces a number that cannot be traced back to a real count in an earlier phase's report.

**Note on the two truthfulness metrics**: Phase 1C's per-template truthfulness ratio is categorical (each assertion type counts once, in whichever state is dominant across its pages) and does not move until an assertion's dominant state actually flips — which requires crossing a 50% coverage threshold, not a gradual change. This report's "truthfulness density" is a different, continuous metric (the page-weighted fraction of all assertion-instances currently factual) introduced specifically so partial, incremental enrichment has a measurable effect to report. The two are deliberately not the same number and should not be compared directly.

## Research workload, for scale

\`audit/research-workload.json\` reports how many records would need enrichment to reach full coverage per field, independent of any scoring:

${workload.workload.map((w) => `- **${w.label}**: ${w.recordsRequiringEnrichment.toLocaleString()} of ${w.totalRecordsInUniverse.toLocaleString()} records (${w.universe}), averaging ${w.occurrencesPerRecordEnriched != null ? w.occurrencesPerRecordEnriched : 'n/a'} recoverable occurrences per record enriched.`).join('\n')}

No time or cost estimate is offered for this workload — no such figure can be derived from repository data alone.

---

### How to regenerate this report and its data

\`\`\`bash
node scripts/audit/run-knowledge-recovery.js
\`\`\`

This runs, in order: \`knowledge-roi.js\` → \`knowledge-impact-graph.js\` → \`editorial-priority-queue.js\` → \`research-workload.js\` → \`recovery-scenarios.js\` → \`knowledge-recovery-report.js\`. Like Phases 1A-1C, every script here only reads the repository and prior \`/audit/*.json\` reports, and only writes into \`/audit/\`.
`;

  writeAuditText('KNOWLEDGE_RECOVERY_REPORT.md', md);
  console.log('Knowledge recovery report written (' + md.length + ' chars).');
}

run();
