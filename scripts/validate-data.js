#!/usr/bin/env node
/**
 * Step 10 — Validation engine.
 * Checks: duplicate names, missing meanings, missing gender, missing origin, empty popularity data.
 * Output: build/data-validation-report.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const BUILD_DIR = path.join(ROOT, 'build');
const REPORT_PATH = path.join(BUILD_DIR, 'data-validation-report.json');

function loadJson(name) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function run() {
  const names = loadJson('names');
  const popularity = loadJson('popularity');

  const report = {
    generated_at: new Date().toISOString(),
    summary: { passed: 0, failed: 0, warnings: 0 },
    checks: {},
    errors: [],
    warnings: [],
  };

  if (!names || !Array.isArray(names)) {
    report.errors.push('data/names.json missing or not an array');
    report.checks.names_loaded = false;
    if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.error('Validation failed: no names data.');
    process.exit(1);
  }
  report.checks.names_loaded = true;

  const nameIds = new Set(names.map((n) => n.id));
  const nameKey = (n) => `${(n.name || '').toLowerCase().trim()}\t${(n.gender || '').toLowerCase()}`;

  // 1) Duplicate names (same name + gender)
  const byKey = new Map();
  const duplicateNames = [];
  for (const n of names) {
    const k = nameKey(n);
    if (byKey.has(k)) {
      duplicateNames.push({ id: n.id, name: n.name, gender: n.gender, duplicate_of_id: byKey.get(k) });
    } else {
      byKey.set(k, n.id);
    }
  }
  report.checks.duplicate_names = {
    passed: duplicateNames.length === 0,
    count: duplicateNames.length,
    samples: duplicateNames.slice(0, 20),
    all_ids: duplicateNames.map((x) => x.id),
  };
  if (duplicateNames.length > 0) report.errors.push(`Duplicate names (same name+gender): ${duplicateNames.length}`);

  // 2) Missing meanings
  const missingMeaning = names.filter((n) => n.meaning == null || String(n.meaning).trim() === '');
  report.checks.missing_meanings = {
    passed: missingMeaning.length === 0,
    count: missingMeaning.length,
    pct: names.length ? `${((missingMeaning.length / names.length) * 100).toFixed(1)}%` : '0%',
    sample_ids: missingMeaning.slice(0, 30).map((n) => n.id),
  };
  if (missingMeaning.length > 0) report.warnings.push(`Missing meaning: ${missingMeaning.length} names (${report.checks.missing_meanings.pct})`);

  // 3) Missing gender
  const validGenders = new Set(['boy', 'girl', 'unisex']);
  const missingGender = names.filter((n) => !n.gender || !validGenders.has(String(n.gender).toLowerCase()));
  report.checks.missing_gender = {
    passed: missingGender.length === 0,
    count: missingGender.length,
    sample_ids: missingGender.slice(0, 20).map((n) => n.id),
  };
  if (missingGender.length > 0) report.errors.push(`Missing or invalid gender: ${missingGender.length} names`);

  // 4) Missing origin (both origin_country and language empty)
  const missingOrigin = names.filter((n) => {
    const oc = n.origin_country == null || String(n.origin_country).trim() === '';
    const lang = n.language == null || String(n.language).trim() === '';
    return oc && lang;
  });
  report.checks.missing_origin = {
    passed: missingOrigin.length === 0,
    count: missingOrigin.length,
    pct: names.length ? `${((missingOrigin.length / names.length) * 100).toFixed(1)}%` : '0%',
    sample_ids: missingOrigin.slice(0, 30).map((n) => n.id),
  };
  if (missingOrigin.length > 0) report.warnings.push(`Missing origin (country+language): ${missingOrigin.length} names (${report.checks.missing_origin.pct})`);

  // 5) Empty popularity data
  const popList = popularity && Array.isArray(popularity) ? popularity : [];
  const nameIdsWithPop = new Set(popList.map((r) => r.name_id));
  const namesWithoutPop = names.filter((n) => !nameIdsWithPop.has(n.id));
  const emptyPopularity = popList.length === 0;
  report.checks.empty_popularity_data = {
    passed: !emptyPopularity,
    popularity_row_count: popList.length,
    names_with_no_popularity: namesWithoutPop.length,
    sample_ids_no_pop: namesWithoutPop.slice(0, 20).map((n) => n.id),
  };
  if (emptyPopularity) report.errors.push('Popularity data is empty (no rows in data/popularity.json)');
  else if (namesWithoutPop.length > 0) report.warnings.push(`Names with no popularity rows: ${namesWithoutPop.length}`);

  report.summary.passed = [report.checks.duplicate_names, report.checks.missing_gender, report.checks.empty_popularity_data].filter((c) => c.passed).length;
  report.summary.failed = report.errors.length;
  report.summary.warnings = report.warnings.length;

  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log('Validation report:', REPORT_PATH);
  console.log('  Duplicate names:', report.checks.duplicate_names.count);
  console.log('  Missing meaning:', report.checks.missing_meanings.count, `(${report.checks.missing_meanings.pct})`);
  console.log('  Missing gender:', report.checks.missing_gender.count);
  console.log('  Missing origin:', report.checks.missing_origin.count, `(${report.checks.missing_origin.pct})`);
  console.log('  Popularity rows:', report.checks.empty_popularity_data.popularity_row_count, '| Names with no popularity:', report.checks.empty_popularity_data.names_with_no_popularity);
  if (report.errors.length > 0) console.log('  Errors:', report.errors.length);
  if (report.warnings.length > 0) console.log('  Warnings:', report.warnings.length);
}

run();
