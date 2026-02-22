#!/usr/bin/env node
/**
 * Phase 3.3 — Origin integrity audit.
 * Measures: % with origin assigned, % null, country distribution, >40% dominance flag, low-confidence clusters.
 * Output: build/origin-integrity-report.json
 *
 * Usage: node scripts/origin-integrity-audit.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const BUILD_DIR = path.join(ROOT, 'build');
const REPORT_PATH = path.join(BUILD_DIR, 'origin-integrity-report.json');

function loadNames() {
  const enrichedPath = path.join(DATA_DIR, 'names-enriched.json');
  const basePath = path.join(DATA_DIR, 'names.json');
  if (fs.existsSync(enrichedPath)) {
    return JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  }
  return JSON.parse(fs.readFileSync(basePath, 'utf8'));
}

function loadPopularity() {
  const p = path.join(DATA_DIR, 'popularity.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function run() {
  const names = loadNames();
  const popularity = loadPopularity();

  const total = names.length;
  const withOrigin = names.filter(
    (n) =>
      (n.origin_country != null && n.origin_country !== '') ||
      (n.origin_cluster != null && n.origin_cluster !== '') ||
      (n.language != null && n.language !== '')
  ).length;
  const withNullOrigin = total - withOrigin;
  const pctWithOrigin = total === 0 ? 0 : (withOrigin / total) * 100;
  const pctNull = total === 0 ? 0 : (withNullOrigin / total) * 100;

  // Top 1000: by name id (first 1000) when popularity is small; else by popularity rank
  const nameIdsInPop = new Set(popularity.map((p) => p.name_id));
  let top1000Ids;
  if (nameIdsInPop.size >= 500) {
    const byBestRank = new Map();
    popularity.forEach((p) => {
      const id = p.name_id;
      const r = p.rank != null ? p.rank : 9999;
      if (!byBestRank.has(id) || byBestRank.get(id) > r) byBestRank.set(id, r);
    });
    top1000Ids = [...byBestRank.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, 1000)
      .map(([id]) => id);
  } else {
    top1000Ids = names.slice(0, 1000).map((n) => n.id);
  }
  const top1000Set = new Set(top1000Ids);
  const top1000Names = names.filter((n) => top1000Set.has(n.id));
  const top1000Total = top1000Names.length;
  const top1000WithOrigin = top1000Names.filter(
    (n) =>
      (n.origin_country != null && n.origin_country !== '') ||
      (n.origin_cluster != null && n.origin_cluster !== '') ||
      (n.language != null && n.language !== '')
  ).length;
  const top1000Pct = top1000Total === 0 ? 0 : (top1000WithOrigin / top1000Total) * 100;

  // Phase 3.3A: top 300 (controlled scope)
  const top300Names = names.slice(0, 300);
  const top300WithOrigin = top300Names.filter(
    (n) =>
      (n.origin_country != null && n.origin_country !== '') ||
      (n.origin_cluster != null && n.origin_cluster !== '') ||
      (n.language != null && n.language !== '')
  ).length;
  const top300Pct = top300Names.length === 0 ? 0 : (top300WithOrigin / top300Names.length) * 100;

  // Country distribution (by origin_country or origin_cluster)
  const byCountry = new Map();
  names.forEach((n) => {
    const key = (n.origin_country || n.origin_cluster || n.language || '(null)').trim() || '(null)';
    byCountry.set(key, (byCountry.get(key) || 0) + 1);
  });
  const countryDist = [...byCountry.entries()]
    .filter(([k]) => k !== '(null)')
    .map(([country, count]) => ({ country, count, pct: total === 0 ? 0 : (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);

  const maxCountryPct = countryDist.length ? Math.max(...countryDist.map((d) => d.pct)) : 0;
  const dominanceFlag = maxCountryPct > 40 ? `One country >40%: ${countryDist[0].country} (${countryDist[0].pct.toFixed(1)}%)` : null;

  // Low-confidence clusters (origin_confidence < 0.8)
  const withConfidence = names.filter((n) => n.origin_confidence != null);
  const lowConfidence = withConfidence.filter((n) => Number(n.origin_confidence) < 0.8);
  const lowConfidenceByCluster = new Map();
  lowConfidence.forEach((n) => {
    const k = n.origin_cluster || n.origin_country || n.language || 'unknown';
    lowConfidenceByCluster.set(k, (lowConfidenceByCluster.get(k) || 0) + 1);
  });
  const lowConfidenceClusters = [...lowConfidenceByCluster.entries()].map(([cluster, count]) => ({ cluster, count }));

  const report = {
    timestamp: new Date().toISOString(),
    totalNames: total,
    withOriginAssigned: withOrigin,
    withNullOrigin,
    pctWithOrigin: Math.round(pctWithOrigin * 10) / 10,
    pctNull: Math.round(pctNull * 10) / 10,
    top300WithOrigin: top300WithOrigin,
    top300Total: top300Names.length,
    top300PctWithOrigin: Math.round(top300Pct * 10) / 10,
    top1000Total,
    top1000WithOrigin,
    top1000PctWithOrigin: Math.round(top1000Pct * 10) / 10,
    countryDistribution: countryDist,
    countryDominanceFlag: dominanceFlag,
    lowConfidenceCount: lowConfidence.length,
    lowConfidenceClusters,
    successCriteria: {
      top300Enriched: top300WithOrigin > 0,
      noCountryOver40UnlessJustified: !dominanceFlag,
      hasEnrichedData: withOrigin > 0,
      top1000PctAtLeast30: top1000Pct >= 30,
    },
  };

  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log('Origin integrity audit');
  console.log('  Total names:', total);
  console.log('  With origin assigned:', withOrigin, `(${pctWithOrigin.toFixed(1)}%)`);
  console.log('  Top 300 with origin (Phase 3.3A):', top300WithOrigin, '/', top300Names.length, `(${top300Pct.toFixed(1)}%)`);
  console.log('  Top 1000 with origin:', top1000WithOrigin, '/', top1000Total, `(${top1000Pct.toFixed(1)}%)`);
  console.log('  Country dominance:', dominanceFlag || 'none >40%');
  console.log('  Low-confidence count:', lowConfidence.length);
  console.log('Report:', REPORT_PATH);
  if (top300WithOrigin === 0) {
    console.log('  ⚠ Phase 3.3A: No origin overrides in top 300. Run build-origin-seed.js then apply-origin-enrichment.js.');
  }
  if (top1000Pct < 30 && top300WithOrigin > 0) {
    console.log('  ℹ Top 1000 coverage < 30% is expected while scope is top 300 only.');
  }
}

run();
