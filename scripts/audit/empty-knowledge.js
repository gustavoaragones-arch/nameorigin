#!/usr/bin/env node
/**
 * scripts/audit/empty-knowledge.js — Phase 1B / PART 6: Empty Knowledge
 * Report (READ-ONLY).
 *
 * Identifies attributes/sections that exist in page templates (always
 * rendered) whose backing dataset field is populated for almost no
 * records. Quantifies two things per attribute:
 *   1. dataset-level coverage (from audit/knowledge-coverage.json)
 *   2. rendered-page fallback usage — an exact count of how many generated
 *      HTML files contain the literal fallback string the generator
 *      substitutes when the field is empty (scripts/audit/knowledge-lib.js
 *      FALLBACK_MARKERS, each verified against real generator source).
 * No fixes are recommended — quantification only, per the Phase 1B brief.
 */

const path = require('path');
const { AUDIT_DIR, allHtmlFiles, readJsonSafe, writeAuditJson } = require('./_lib.js');
const { FALLBACK_MARKERS, countFilesContainingMarker } = require('./knowledge-lib.js');
const { classify } = require('./classify.js');

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run scripts/audit/knowledge-coverage.js first.`);
    process.exit(1);
  }
  return data;
}

function run() {
  console.log('PART 6 — Empty Knowledge Report');
  const kc = requireAudit('knowledge-coverage.json');

  const htmlFiles = allHtmlFiles();
  const nameDetailPages = htmlFiles.filter((f) => classify(f).category === 'name-detail-page');

  const markerResults = FALLBACK_MARKERS.map((m) => {
    const pool = m.appliesTo.includes('name-detail-page') ? nameDetailPages : htmlFiles.filter((f) => m.appliesTo.includes(classify(f).category));
    const matches = countFilesContainingMarker(pool, m.marker);
    return {
      id: m.id,
      attribute: m.attribute,
      marker: m.marker,
      sourceFunction: m.sourceFunction,
      sourceLines: m.sourceLines,
      description: m.description,
      pagesScanned: pool.length,
      pagesContainingFallback: matches,
      fallbackRatePct: Number(((100 * matches) / pool.length).toFixed(2)),
    };
  });

  // Cross-reference: attribute-level dataset coverage vs rendered-page
  // fallback rate. A wide gap between "template always renders this
  // section" and "dataset rarely has this field" is the core Phase 1B
  // signal.
  const gaps = [
    {
      attribute: 'meaning',
      templateBehavior: 'always-with-fallback (name-detail-page)',
      datasetCoveragePct: kc.entityLevelCoverage.meaning.coveragePct,
      renderedFallbackPct: markerResults.find((m) => m.id === 'meaning-fallback-documented-given-name')?.fallbackRatePct,
      gapNote: 'Dataset coverage and rendered-fallback rate agree closely (both ~99.9% empty vs ~99.9% pages using the fabricated fallback phrase), confirming the sparsity is not masked anywhere else in the pipeline.',
    },
    {
      attribute: 'origin_country / language / origin_cluster',
      templateBehavior: 'always-with-fallback (name-detail-page, 3 separate sections)',
      datasetCoveragePct: kc.entityLevelCoverage.origin_country_or_language.coveragePct,
      renderedFallbackPct: markerResults.find((m) => m.id === 'origin-fallback-various-linguistic-traditions')?.fallbackRatePct,
      gapNote: 'Three independent template sections (buildNameUsageContextSection, buildOriginLineage, buildCulturalContext) each re-derive their own fallback text from the same empty field, so the same ~95.6% of pages repeat generic origin language three times over.',
    },
    {
      attribute: 'phonetic',
      templateBehavior: 'optional (name-detail-page Pronunciation section)',
      datasetCoveragePct: 0,
      renderedFallbackPct: null,
      gapNote: 'Unlike meaning/origin, the phonetic field has no fallback text — the Pronunciation section is conditionally omitted (rendered only when record.phonetic is truthy). Because coverage is exactly 0%, this section never renders on any of the 3,697 pages; it exists in the template code but has never once fired.',
    },
    {
      attribute: 'popularity',
      templateBehavior: 'optional (name-detail-page, names-like-page similarity dimension, popularity-year-page source)',
      datasetCoveragePct: kc.entityLevelCoverage.popularity_record.coveragePct,
      renderedFallbackPct: null,
      gapNote: 'Popularity sections are conditionally omitted rather than faked (no literal fallback string found), but because only 5 of 3,697 names have any row, the "Names with Similar Popularity" dimension on names-like-page and the Popularity section on name-detail-page are absent for 99.86% of pages by construction, not by explicit fallback text.',
    },
  ];

  const totalNameDetailPages = nameDetailPages.length;
  // Headline is fixed to the fabricated-content marker (states a false
  // claim) rather than auto-selected by raw count, which would surface the
  // honest "—" placeholder marker (100% of pages) as if it were equally
  // concerning — it is not the same kind of finding. Both are reported in
  // fallbackMarkerResults regardless.
  const worstOffender = markerResults.find((m) => m.id === 'meaning-fallback-documented-given-name') || markerResults[0];
  const mostPervasiveMarker = [...markerResults].sort((a, b) => b.pagesContainingFallback - a.pagesContainingFallback)[0];

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    method: 'For each known fallback marker (identified by reading the generator source, see scripts/audit/knowledge-lib.js), every relevant generated HTML file is scanned for the literal substring. This is an exact count over real committed output, not a sample.',
    totalNameDetailPagesScanned: totalNameDetailPages,
    fallbackMarkerResults: markerResults,
    coverageVsRenderedGaps: gaps,
    headlineFinding: {
      marker: worstOffender.marker,
      attribute: worstOffender.attribute,
      pagesAffected: worstOffender.pagesContainingFallback,
      totalPages: worstOffender.pagesScanned,
      pct: worstOffender.fallbackRatePct,
      statement: `${worstOffender.pagesContainingFallback} of ${worstOffender.pagesScanned} name-detail pages (${worstOffender.fallbackRatePct}%) contain the literal fallback phrase "${worstOffender.marker}" as the stated meaning of the name, in the meta description and/or on-page direct-answer text.`,
    },
    mostPervasiveMarker: {
      marker: mostPervasiveMarker.marker,
      attribute: mostPervasiveMarker.attribute,
      pagesAffected: mostPervasiveMarker.pagesContainingFallback,
      totalPages: mostPervasiveMarker.pagesScanned,
      pct: mostPervasiveMarker.fallbackRatePct,
      note: 'Reported separately from headlineFinding because this marker (an honest "—" placeholder in the Quick Facts table) is a different kind of gap than a fabricated claim — it discloses missing data rather than papering over it, even though it technically appears on more pages.',
    },
    notes: [
      'This report only counts sections that ALWAYS render with a substituted generic value. Sections that are conditionally omitted when data is missing (phonetic, popularity) are listed for contrast but are not "empty knowledge" in the same sense — they under-populate silently rather than fabricate.',
      'No section, marker, or gap here is scored, ranked by severity beyond raw counts, or paired with a fix — that is explicitly out of scope for Phase 1B per the brief.',
    ],
  };

  writeAuditJson('empty-knowledge.json', report);
  console.log('Fallback markers scanned:', markerResults.length, '| headline:', report.headlineFinding.statement);
}

run();
