#!/usr/bin/env node
/**
 * Phase 6B — Editorial QA & Consistency Audit.
 *
 * Validates Knowledge Record v2 editorial quality. Audit and reporting only —
 * does not modify editorial content, rendering, schema, or KCI.
 *
 * Usage: node scripts/build/run-editorial-qa.js
 */

const fs = require('fs');
const path = require('path');
const { validateNode } = require('../../lib/canonical/schema-check.js');
const {
  DOMAINS,
  PATHS,
  loadJson,
  normalizeKey,
  confidenceLevel,
  loadKnowledgeRecordsPayload,
} = require('../editorial/knowledge-record-v2.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUT_PATH = path.join(AUDIT_DIR, 'editorial-qa.json');
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'knowledge-record-v2.schema.json');

const TEXT_DOMAINS = ['meaning', 'pronunciation', 'etymology', 'history'];
const DUPLICATE_CLUSTER_THRESHOLD = 10;

const ACCEPTED_SOURCE_TYPES_BY_DOMAIN = {
  origin: require('../editorial/origin-wave1-sources.js').ACCEPTED_SOURCE_TYPES,
  meaning: require('../editorial/meaning-wave1-sources.js').ACCEPTED_SOURCE_TYPES,
  pronunciation: require('../editorial/pronunciation-wave1-sources.js').ACCEPTED_SOURCE_TYPES,
  etymology: require('../editorial/etymology-wave1-sources.js').ACCEPTED_SOURCE_TYPES,
  history: require('../editorial/history-wave1-sources.js').ACCEPTED_SOURCE_TYPES,
};

const ALL_ACCEPTED_SOURCE_TYPES = [
  ...new Set(Object.values(ACCEPTED_SOURCE_TYPES_BY_DOMAIN).flat()),
];

const ORIGIN_FAMILIES = {
  Hebrew: ['hebrew', 'jewish', 'biblical', 'israel'],
  Arabic: ['arabic', 'islamic', 'muslim'],
  Sanskrit: ['sanskrit', 'indian', 'hindi', 'punjabi', 'tamil', 'telugu'],
  Greek: ['greek', 'byzantine'],
  Latin: ['latin', 'roman', 'romance', 'italian', 'spanish', 'french'],
  English: ['english', 'germanic', 'anglo', 'british', 'scottish', 'irish', 'welsh'],
  Slavic: ['slavic', 'russian', 'polish', 'ukrainian'],
  African: ['african', 'yoruba', 'igbo', 'swahili'],
};

const ETYMOLOGY_KEYWORDS = {
  Hebrew: ['hebrew', 'yosef', 'sarah', 'david', 'biblical', 'torah', 'old testament'],
  Arabic: ['arabic', 'qur', 'islam', 'muslim'],
  Sanskrit: ['sanskrit', 'hindu', 'india', 'devanagari'],
  Greek: ['greek', 'greek name', 'ancient greek'],
  Latin: ['latin', 'roman'],
  English: ['english', 'germanic', 'norman', 'old english', 'anglo'],
};

function stableStringify(value) {
  return JSON.stringify(value);
}

function inferOriginFamily(record) {
  const value = record.origin?.value;
  if (!value) return null;
  const haystack = [value.origin_cluster, value.language, value.origin_country]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [family, keywords] of Object.entries(ORIGIN_FAMILIES)) {
    if (keywords.some((word) => haystack.includes(word))) return family;
  }
  return null;
}

function inferTextFamily(text) {
  if (!text || typeof text !== 'string') return null;
  const haystack = text.toLowerCase();
  const matches = [];
  for (const [family, keywords] of Object.entries(ETYMOLOGY_KEYWORDS)) {
    if (keywords.some((word) => haystack.includes(word))) matches.push(family);
  }
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return matches[0];
  return null;
}

function hasExplanatoryNotes(record, domains) {
  return domains.some((domain) => {
    const notes = record[domain]?.notes;
    return typeof notes === 'string' && notes.trim().length > 0;
  });
}

function auditMissingMetadata(records) {
  const issues = [];
  for (const record of records) {
    for (const domain of DOMAINS) {
      const field = record[domain];
      if (!field) continue;
      const base = { name: record.name, domain };
      if (!Object.prototype.hasOwnProperty.call(field, 'value')) {
        issues.push({ ...base, type: 'missing-value' });
      }
      if (!Object.prototype.hasOwnProperty.call(field, 'confidence')) {
        issues.push({ ...base, type: 'missing-confidence' });
      }
      if (!Object.prototype.hasOwnProperty.call(field, 'confidenceLevel')) {
        issues.push({ ...base, type: 'missing-confidenceLevel' });
      }
      if (!Array.isArray(field.sources)) {
        issues.push({ ...base, type: 'missing-sources-array' });
      }
      if (!Object.prototype.hasOwnProperty.call(field, 'notes')) {
        issues.push({ ...base, type: 'missing-notes-field' });
      }
    }
  }
  return issues;
}

function auditConfidenceConsistency(records) {
  const issues = [];
  for (const record of records) {
    for (const domain of DOMAINS) {
      const field = record[domain];
      if (!field || field.confidence == null || !field.confidenceLevel) continue;
      const expected = confidenceLevel(field.confidence);
      if (field.confidenceLevel !== expected) {
        issues.push({
          name: record.name,
          domain,
          type: 'confidence-level-mismatch',
          confidence: field.confidence,
          confidenceLevel: field.confidenceLevel,
          expectedConfidenceLevel: expected,
        });
      }
    }
  }
  return issues;
}

function auditDuplicateText(records) {
  const clusters = {};
  for (const domain of TEXT_DOMAINS) {
    clusters[domain] = new Map();
  }

  for (const record of records) {
    for (const domain of TEXT_DOMAINS) {
      const value = record[domain]?.value;
      if (value == null) continue;
      const text = typeof value === 'string' ? value.trim() : stableStringify(value);
      if (!text) continue;
      if (!clusters[domain].has(text)) clusters[domain].set(text, []);
      clusters[domain].get(text).push(record.name);
    }
  }

  const duplicateClusters = [];
  for (const domain of TEXT_DOMAINS) {
    for (const [text, names] of clusters[domain].entries()) {
      if (names.length < DUPLICATE_CLUSTER_THRESHOLD) continue;
      duplicateClusters.push({
        domain,
        recordCount: names.length,
        textPreview: text.length > 160 ? `${text.slice(0, 157)}...` : text,
        affectedNames: names.slice(0, 25),
        additionalNames: Math.max(0, names.length - 25),
      });
    }
  }

  duplicateClusters.sort((a, b) => b.recordCount - a.recordCount || a.domain.localeCompare(b.domain));
  return duplicateClusters;
}

function auditSourceIntegrity(records) {
  const issues = [];
  for (const record of records) {
    for (const domain of DOMAINS) {
      const field = record[domain];
      if (!field || !Array.isArray(field.sources)) continue;
      const accepted = new Set(ACCEPTED_SOURCE_TYPES_BY_DOMAIN[domain] || ALL_ACCEPTED_SOURCE_TYPES);
      const seen = new Set();

      field.sources.forEach((source, index) => {
        const base = { name: record.name, domain, sourceIndex: index };
        if (!source || typeof source !== 'object') {
          issues.push({ ...base, type: 'invalid-source-object' });
          return;
        }
        if (!source.type || !String(source.type).trim()) {
          issues.push({ ...base, type: 'missing-source-type' });
        }
        if (!source.reference || !String(source.reference).trim()) {
          issues.push({ ...base, type: 'empty-source-reference' });
        }
        if (source.type && !accepted.has(source.type)) {
          issues.push({ ...base, type: 'unaccepted-source-type', sourceType: source.type });
        }
        const dedupeKey = `${source.type}::${source.reference}`;
        if (seen.has(dedupeKey)) {
          issues.push({ ...base, type: 'duplicate-source-entry', sourceType: source.type });
        }
        seen.add(dedupeKey);
      });
    }
  }
  return issues;
}

function auditEditorialCompleteness(records, entityCount) {
  const domainCounts = {
    origin: 0,
    meaning: 0,
    pronunciation: 0,
    etymology: 0,
    history: 0,
  };
  const populatedDomainsDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalPopulatedDomains = 0;

  for (const record of records) {
    let populated = 0;
    for (const domain of DOMAINS) {
      if (record[domain]) {
        domainCounts[domain] += 1;
        populated += 1;
      }
    }
    if (populated >= 1 && populated <= 5) {
      populatedDomainsDistribution[populated] += 1;
    }
    totalPopulatedDomains += populated;
  }

  const pct = (count) => (entityCount ? Number(((100 * count) / entityCount).toFixed(2)) : 0);

  return {
    entityCount,
    knowledgeRecordCount: records.length,
    domainCoverage: {
      origin: { count: domainCounts.origin, pct: pct(domainCounts.origin) },
      meaning: { count: domainCounts.meaning, pct: pct(domainCounts.meaning) },
      pronunciation: { count: domainCounts.pronunciation, pct: pct(domainCounts.pronunciation) },
      etymology: { count: domainCounts.etymology, pct: pct(domainCounts.etymology) },
      history: { count: domainCounts.history, pct: pct(domainCounts.history) },
    },
    averagePopulatedDomainsPerRecord: records.length
      ? Number((totalPopulatedDomains / records.length).toFixed(2))
      : 0,
    populatedDomainsDistribution,
  };
}

function auditCrossDomainConsistency(records) {
  const warnings = [];

  for (const record of records) {
    const originFamily = inferOriginFamily(record);
    const etymologyFamily = inferTextFamily(record.etymology?.value);
    const historyFamily = inferTextFamily(record.history?.value);

    if (originFamily && etymologyFamily && originFamily !== etymologyFamily) {
      const explained = hasExplanatoryNotes(record, ['origin', 'etymology', 'history']);
      if (!explained) {
        warnings.push({
          name: record.name,
          type: 'origin-etymology-family-mismatch',
          originFamily,
          etymologyFamily,
          message: `${originFamily} origin with ${etymologyFamily} etymology and no supporting notes.`,
        });
      }
    }

    if (originFamily && historyFamily && originFamily !== historyFamily) {
      const explained = hasExplanatoryNotes(record, ['origin', 'history', 'etymology']);
      if (!explained) {
        warnings.push({
          name: record.name,
          type: 'origin-history-family-mismatch',
          originFamily,
          historyFamily,
          message: `${originFamily} origin with ${historyFamily} history and no supporting notes.`,
        });
      }
    }

    const nonEnglishOriginFamilies = ['Hebrew', 'Arabic', 'Sanskrit', 'Greek', 'Slavic', 'African'];
    if (
      originFamily &&
      nonEnglishOriginFamilies.includes(originFamily) &&
      record.pronunciation?.value &&
      !hasExplanatoryNotes(record, ['pronunciation', 'origin']) &&
      (!Array.isArray(record.pronunciation.sources) || record.pronunciation.sources.length === 0)
    ) {
      warnings.push({
        name: record.name,
        type: 'non-english-origin-pronunciation-without-notes',
        originFamily,
        pronunciation: record.pronunciation.value,
        message: `${originFamily} origin with pronunciation assigned but no pronunciation notes or sources.`,
      });
    }
  }

  return warnings;
}

function auditNameNormalization(records) {
  const issues = [];
  const byNormalized = new Map();
  const byNfc = new Map();

  for (const record of records) {
    const name = record.name;
    const key = normalizeKey(name);
    const nfc = String(name || '').normalize('NFC');
    const nfd = String(name || '').normalize('NFD');
    const collapsed = key.replace(/\s+/g, '');

    if (!byNormalized.has(key)) byNormalized.set(key, []);
    byNormalized.get(key).push(name);

    if (!byNfc.has(nfc)) byNfc.set(nfc, []);
    byNfc.get(nfc).push(name);

    if (name !== nfc) {
      issues.push({ name, type: 'not-nfc-normalized', nfcForm: nfc });
    }
    if (nfc !== nfd && nfc.normalize('NFD') !== nfd) {
      issues.push({ name, type: 'unicode-normalization-variant' });
    }
    if (/\s{2,}/.test(name)) {
      issues.push({ name, type: 'spacing-variant' });
    }
    if (key !== collapsed && name.includes(' ')) {
      issues.push({ name, type: 'internal-spacing', normalizedKey: key });
    }
  }

  const duplicateRecords = [];
  for (const [key, names] of byNormalized.entries()) {
    const uniqueDisplay = [...new Set(names)];
    if (uniqueDisplay.length > 1) {
      duplicateRecords.push({ normalizedKey: key, variants: uniqueDisplay, type: 'case-or-display-variant' });
    }
    if (names.length > 1) {
      duplicateRecords.push({ normalizedKey: key, count: names.length, type: 'duplicate-record-key' });
    }
  }

  return {
    issues,
    duplicateRecords,
    uniqueNormalizedKeys: byNormalized.size,
  };
}

function resolveSchemaNode(node) {
  if (!node || !Array.isArray(node.allOf)) return node;
  const merged = { type: 'object', properties: {}, required: [] };
  for (const part of node.allOf) {
    if (part.$ref && part.$ref.startsWith('#/$defs/')) {
      const refKey = part.$ref.replace('#/$defs/', '');
      Object.assign(merged.properties, nodeRoot.$defs?.[refKey]?.properties || {});
      merged.required = [...new Set([...(merged.required || []), ...(nodeRoot.$defs?.[refKey]?.required || [])])];
    }
    if (part.properties) Object.assign(merged.properties, part.properties);
    if (part.required) merged.required = [...new Set([...(merged.required || []), ...part.required])];
    if (part.additionalProperties !== undefined) merged.additionalProperties = part.additionalProperties;
  }
  return merged;
}

let nodeRoot = null;

function auditSchemaValidation(payload) {
  const schema = loadJson(SCHEMA_PATH, null);
  if (!schema) {
    return { status: 'FAIL', errors: ['Missing schemas/knowledge-record-v2.schema.json'] };
  }

  nodeRoot = schema;
  const envelopeErrors = validateNode(payload, schema, '$');
  const recordErrors = [];

  if (Array.isArray(payload.records)) {
    const recordSchema = resolveSchemaNode(schema.$defs?.record);
    payload.records.forEach((record, index) => {
      if (!recordSchema) return;
      recordErrors.push(...validateNode(record, recordSchema, `$.records[${index}]`));
      for (const domain of DOMAINS) {
        if (!record[domain]) continue;
        const domainSchema = resolveSchemaNode(recordSchema.properties?.[domain]);
        if (domainSchema) {
          recordErrors.push(...validateNode(record[domain], domainSchema, `$.records[${index}].${domain}`));
        }
      }
    });
  }

  const errors = [...envelopeErrors, ...recordErrors];
  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errorCount: errors.length,
    sample: errors.slice(0, 25),
  };
}

function auditSourceCompleteness(records) {
  const summary = {};
  for (const domain of DOMAINS) {
    const populated = records.filter((record) => record[domain]).length;
    const emptySources = records.filter(
      (record) => record[domain] && Array.isArray(record[domain].sources) && record[domain].sources.length === 0,
    ).length;
    const nullNotes = records.filter(
      (record) =>
        record[domain] &&
        (record[domain].notes == null || String(record[domain].notes).trim() === ''),
    ).length;
    summary[domain] = { populated, emptySources, nullNotes };
  }
  return summary;
}

function buildReport(generatedAt = new Date().toISOString()) {
  const payload = loadKnowledgeRecordsPayload();
  if (!payload || !Array.isArray(payload.records)) {
    throw new Error('Missing data/knowledge-records.json — run build-knowledge-records.js first.');
  }

  const records = payload.records;
  const entityCount = loadJson(PATHS.names, []).length;

  const missingMetadata = auditMissingMetadata(records);
  const confidenceIssues = auditConfidenceConsistency(records);
  const duplicateClusters = auditDuplicateText(records);
  const sourceIssues = auditSourceIntegrity(records);
  const coverageSummary = auditEditorialCompleteness(records, entityCount);
  const crossDomainWarnings = auditCrossDomainConsistency(records);
  const nameNormalization = auditNameNormalization(records);
  const schemaValidation = auditSchemaValidation(payload);
  const sourceCompleteness = auditSourceCompleteness(records);

  const issueCountsByType = {};
  const bump = (type) => {
    issueCountsByType[type] = (issueCountsByType[type] || 0) + 1;
  };

  missingMetadata.forEach((item) => bump(item.type));
  confidenceIssues.forEach((item) => bump(item.type));
  sourceIssues.forEach((item) => bump(item.type));
  nameNormalization.issues.forEach((item) => bump(item.type));
  nameNormalization.duplicateRecords.forEach((item) => bump(item.type));
  crossDomainWarnings.forEach((item) => bump(item.type));

  const recordsWithIssues = new Set([
    ...missingMetadata.map((item) => item.name),
    ...confidenceIssues.map((item) => item.name),
    ...sourceIssues.map((item) => item.name),
    ...nameNormalization.issues.map((item) => item.name),
    ...crossDomainWarnings.map((item) => item.name),
  ]).size;

  return {
    phase: '6B',
    title: 'Editorial QA & Consistency Audit',
    generatedAt,
    baselineReference: 'knowledge-baseline-v2',
    knowledgeRecordSource: 'data/knowledge-records.json',
    schemaReference: 'schemas/knowledge-record-v2.schema.json',
    totals: {
      knowledgeRecords: records.length,
      entities: entityCount,
      recordsWithIssues,
      totalIssueCount:
        missingMetadata.length +
        confidenceIssues.length +
        sourceIssues.length +
        nameNormalization.issues.length +
        nameNormalization.duplicateRecords.length +
        crossDomainWarnings.length +
        (schemaValidation.status === 'FAIL' ? schemaValidation.errorCount || 1 : 0),
    },
    issueCountsByType,
    audits: {
      missingMetadata: {
        issueCount: missingMetadata.length,
        sample: missingMetadata.slice(0, 25),
      },
      confidenceConsistency: {
        issueCount: confidenceIssues.length,
        sample: confidenceIssues.slice(0, 25),
      },
      duplicateText: {
        clusterThreshold: DUPLICATE_CLUSTER_THRESHOLD,
        clusterCount: duplicateClusters.length,
        clusters: duplicateClusters,
      },
      sourceIntegrity: {
        issueCount: sourceIssues.length,
        sample: sourceIssues.slice(0, 25),
      },
      sourceCompleteness,
      editorialCompleteness: coverageSummary,
      crossDomainConsistency: {
        warningCount: crossDomainWarnings.length,
        sample: crossDomainWarnings.slice(0, 25),
      },
      nameNormalization: {
        issueCount: nameNormalization.issues.length + nameNormalization.duplicateRecords.length,
        uniqueNormalizedKeys: nameNormalization.uniqueNormalizedKeys,
        sample: [...nameNormalization.issues.slice(0, 15), ...nameNormalization.duplicateRecords.slice(0, 10)],
      },
      schemaValidation,
    },
    acceptedSourceTypes: ACCEPTED_SOURCE_TYPES_BY_DOMAIN,
    overallStatus: schemaValidation.status === 'PASS' ? 'PASS' : 'FAIL',
    editorialQualityStatus: recordsWithIssues === 0 && duplicateClusters.length === 0 ? 'CLEAN' : 'NEEDS_ATTENTION',
  };
}

function stripVolatile(report) {
  const clone = JSON.parse(stableStringify(report));
  delete clone.generatedAt;
  return clone;
}

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const reportA = buildReport(new Date(0).toISOString());
  const reportB = buildReport(new Date(0).toISOString());
  const determinismStatus = stableStringify(stripVolatile(reportA)) === stableStringify(stripVolatile(reportB)) ? 'PASS' : 'FAIL';

  const report = buildReport();
  report.determinism = {
    status: determinismStatus,
    runsCompared: 2,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('Phase 6B Editorial QA complete.');
  console.log('  Knowledge records:', report.totals.knowledgeRecords);
  console.log('  Records with issues:', report.totals.recordsWithIssues);
  console.log('  Schema validation:', report.audits.schemaValidation.status);
  console.log('  Determinism:', report.determinism.status);
  console.log('  Overall status:', report.overallStatus);
  console.log('  Editorial quality:', report.editorialQualityStatus);
  console.log('  Output:', OUT_PATH);

  if (report.overallStatus !== 'PASS' || report.determinism.status !== 'PASS') {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildReport, stripVolatile };
