#!/usr/bin/env node
/**
 * Phase 3.3 — Origin coverage report (measurable progress).
 * Outputs: total with origin, % coverage, distribution by country, names with confidence < 0.9,
 *          country pages with > 20 names.
 * Writes: build/origin-coverage-report.json
 *
 * Usage: node scripts/origin-coverage-report.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const BUILD_DIR = path.join(ROOT, 'build');
const REPORT_PATH = path.join(BUILD_DIR, 'origin-coverage-report.json');

const ORIGIN_COUNTRY_MAP = {
  france: ['France', 'French'],
  india: ['India', 'Indian'],
  ireland: ['Ireland', 'Irish'],
  usa: ['United States', 'USA', 'American', 'English'],
  canada: ['Canada', 'Canadian', 'English', 'French'],
  uk: ['United Kingdom', 'UK', 'British', 'English'],
  australia: ['Australia', 'Australian', 'English'],
  germany: ['Germany', 'German'],
  spain: ['Spain', 'Spanish'],
  italy: ['Italy', 'Italian'],
};

function loadNames() {
  const enrichedPath = path.join(DATA_DIR, 'names-enriched.json');
  const basePath = path.join(DATA_DIR, 'names.json');
  if (fs.existsSync(enrichedPath)) {
    return JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  }
  return JSON.parse(fs.readFileSync(basePath, 'utf8'));
}

function getNamesForCountry(allNames, countrySlug, countryRecord) {
  const slug = (countrySlug || '').toLowerCase().trim();
  const accepted = ORIGIN_COUNTRY_MAP[slug];
  const labels = accepted
    ? accepted.map((l) => (l || '').toLowerCase().trim()).filter(Boolean)
    : [
        (countryRecord.name || '').toLowerCase().trim(),
        (countryRecord.code || '').toLowerCase().trim(),
        (countryRecord.primary_language || '').toLowerCase().trim(),
      ].filter(Boolean);

  return allNames.filter((n) => {
    const o = (n.origin_country || '').toLowerCase().trim();
    const oc = (n.origin_cluster || '').toLowerCase().trim();
    const lang = (n.language || '').toLowerCase().trim();
    return labels.some((l) => l && (o === l || oc === l || lang === l));
  });
}

function run() {
  const names = loadNames();
  const countries = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'countries.json'), 'utf8'));
  const countrySlugMap = { USA: 'usa', CAN: 'canada', IND: 'india', FRA: 'france', IRL: 'ireland' };

  const total = names.length;
  const withOrigin = names.filter(
    (n) =>
      (n.origin_country != null && n.origin_country !== '') ||
      (n.origin_cluster != null && n.origin_cluster !== '') ||
      (n.language != null && n.language !== '')
  );
  const pctCoverage = total === 0 ? 0 : (withOrigin.length / total) * 100;

  // Distribution by country (count per country page)
  const distributionByCountry = [];
  countries.forEach((c) => {
    const slugKey = (c.code && countrySlugMap[c.code]) || c.name.toLowerCase().replace(/\s+/g, '-');
    const count = getNamesForCountry(names, slugKey, c).length;
    distributionByCountry.push({ country: c.name, slug: slugKey, count });
  });
  distributionByCountry.sort((a, b) => b.count - a.count);

  // Names with confidence < 0.9
  const withConfidence = names.filter((n) => n.origin_confidence != null);
  const lowConfidence = withConfidence.filter((n) => Number(n.origin_confidence) < 0.9);
  const lowConfidenceNames = lowConfidence.map((n) => ({
    name: n.name,
    origin_country: n.origin_country,
    origin_cluster: n.origin_cluster,
    confidence: n.origin_confidence,
  }));

  // Country pages with > 20 names
  const countryPagesOver20 = distributionByCountry.filter((d) => d.count > 20).map((d) => ({ country: d.country, slug: d.slug, count: d.count }));

  const report = {
    timestamp: new Date().toISOString(),
    totalNames: total,
    totalWithOrigin: withOrigin.length,
    pctCoverage: Math.round(pctCoverage * 10) / 10,
    distributionByCountry,
    namesWithConfidenceUnder09: {
      count: lowConfidence.length,
      names: lowConfidenceNames,
    },
    countryPagesWithOver20Names: countryPagesOver20,
  };

  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log('Origin coverage report');
  console.log('  Total names:', total);
  console.log('  With origin:', withOrigin.length, `(${pctCoverage.toFixed(1)}%)`);
  console.log('  Distribution by country:', distributionByCountry.map((d) => `${d.slug}: ${d.count}`).join(', '));
  console.log('  Names with confidence < 0.9:', lowConfidence.length);
  if (lowConfidence.length > 0 && lowConfidence.length <= 20) {
    console.log('    ', lowConfidenceNames.map((n) => n.name).join(', '));
  } else if (lowConfidence.length > 20) {
    console.log('    ', lowConfidenceNames.slice(0, 15).map((n) => n.name).join(', ') + ', ...');
  }
  console.log('  Country pages with > 20 names:', countryPagesOver20.length, countryPagesOver20.map((c) => `${c.slug} (${c.count})`).join(', ') || '—');
  console.log('Report:', REPORT_PATH);
}

run();
