#!/usr/bin/env node
/**
 * scripts/audit/editorial-priority-queue.js — Phase 1D:
 * audit/editorial-priority-queue.json (READ-ONLY).
 *
 * Ranks MISSING KNOWLEDGE FIELDS (not individual pages) by measured,
 * project-wide impact — reusing audit/knowledge-roi.json directly. No new
 * scoring logic here; this is a re-view/re-rank of already-computed data,
 * same discipline as Phase 1C's truthfulness-hotspots.js re-viewing
 * page-truthfulness.js.
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditJson } = require('./_lib.js');

function run() {
  console.log('Editorial Priority Queue — audit/editorial-priority-queue.json');
  const roi = readJsonSafe(path.join(AUDIT_DIR, 'knowledge-roi.json'));
  if (!roi) {
    console.error('Missing knowledge-roi.json — run scripts/audit/knowledge-roi.js first.');
    process.exit(1);
  }

  const queue = roi.fields
    .filter((f) => f.knowledgeRecoveryScore > 0 || f.recoverableOccurrenceTotal > 0)
    .map((f, idx) => ({
      rank: 0, // assigned after sort
      field: f.field,
      label: f.label,
      knowledgeRecoveryScore: f.knowledgeRecoveryScore,
      currentCoveragePct: f.currentCoverage.coveragePct != null ? f.currentCoverage.coveragePct : null,
      missingRecords: f.currentCoverage.missing != null ? f.currentCoverage.missing : null,
      templatesAffected: f.templatesAffected,
      pagesImpacted: f.pagesImpacted,
      recoverableOccurrenceTotal: f.recoverableOccurrenceTotal,
    }))
    .sort((a, b) => b.knowledgeRecoveryScore - a.knowledgeRecoveryScore || b.recoverableOccurrenceTotal - a.recoverableOccurrenceTotal);

  queue.forEach((q, i) => { q.rank = i + 1; });

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    scope: 'Ranks knowledge FIELDS by measured project-wide impact, not individual pages. Sort key: audit/knowledge-roi.json knowledgeRecoveryScore (ties broken by recoverableOccurrenceTotal). No implementation or editorial-effort estimate is included — only measured impact.',
    queue,
    notes: [
      'This ranking answers "which missing field, if populated, touches the most currently-non-factual rendered statements across the most pages" — it does not account for how difficult or time-consuming any given field is to research, which is deliberately out of scope for a read-only measurement phase.',
      'Fields with zero fallback/disclosed-missing occurrences (fully computed or fully curated fields) are excluded from this queue entirely, since they have no measurable recovery potential — see audit/knowledge-roi.json for the complete field list including those.',
    ],
  };

  writeAuditJson('editorial-priority-queue.json', report);
  console.log('Fields queued:', queue.length, '| #1:', queue[0] ? queue[0].field : 'none');
}

run();
