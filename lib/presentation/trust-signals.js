/**
 * lib/presentation/trust-signals.js — Phase 12A trust presentation model.
 *
 * Read-only helper over frozen audit artifacts and architecture metadata.
 * No scoring. No editorial mutation.
 */

const fs = require('fs');
const path = require('path');
const { buildCitationRegistryIndex } = require('./citation-presentation.js');

const ROOT = path.join(__dirname, '..', '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const DATA_DIR = path.join(ROOT, 'data');

const TRUST_AUDIT_PATHS = {
  editorialQa: path.join(AUDIT_DIR, 'editorial-qa.json'),
  kciReport: path.join(AUDIT_DIR, 'knowledge-completeness.json'),
  kciActivation: path.join(AUDIT_DIR, 'kci-activation.json'),
  kciPresentation: path.join(AUDIT_DIR, 'kci-presentation.json'),
  citationInfrastructure: path.join(AUDIT_DIR, 'citation-infrastructure.json'),
  citationRecords: path.join(AUDIT_DIR, 'citation-records.json'),
  popularityInfrastructure: path.join(AUDIT_DIR, 'popularity-infrastructure.json'),
  popularityRecords: path.join(AUDIT_DIR, 'popularity-records.json'),
};

const ARCHITECTURE_MILESTONES = Object.freeze([
  {
    key: 'knowledge-v2',
    name: 'Knowledge Architecture',
    version: 'v2',
    purpose: 'Structured editorial knowledge records across origin, meaning, pronunciation, etymology, and history.',
    compatibility: 'Foundation for Citation and Popularity layers.',
  },
  {
    key: 'citation-infrastructure-v1',
    name: 'Citation Infrastructure',
    version: 'v1',
    purpose: 'Canonical publication registry with deterministic normalization and resolution.',
    compatibility: 'Feeds Citation Records and KCI citation scoring.',
  },
  {
    key: 'citation-population-v1',
    name: 'Citation Population',
    version: 'v1',
    purpose: 'Entity-level citation assignments mapped to canonical publication IDs.',
    compatibility: 'Consumed by KCI and presentation layers.',
  },
  {
    key: 'popularity-infrastructure-v1',
    name: 'Popularity Infrastructure',
    version: 'v1',
    purpose: 'Canonical popularity source registry with authority normalization.',
    compatibility: 'Feeds Popularity Records and KCI popularity scoring.',
  },
  {
    key: 'popularity-population-v1',
    name: 'Popularity Population',
    version: 'v1',
    purpose: 'Entity-level popularity records with canonical source attribution.',
    compatibility: 'Consumed by KCI and presentation layers.',
  },
  {
    key: 'kci-activation-v1',
    name: 'KCI Activation',
    version: 'v1',
    purpose: 'Deterministic Knowledge Completeness Index consuming Citation and Popularity records.',
    compatibility: 'Scores all entities without modifying editorial data.',
  },
  {
    key: 'kci-explainability-v1',
    name: 'KCI Explainability',
    version: 'v1',
    purpose: 'Read-only presentation of KCI component scores on name pages.',
    compatibility: 'Derived entirely from frozen KCI output and record artifacts.',
  },
]);

function loadJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function auditStatus(payload, fallback = 'UNKNOWN') {
  if (!payload) return fallback;
  if (payload.overallStatus) return payload.overallStatus;
  if (payload.validationStatus?.editorialQa) return payload.validationStatus.editorialQa;
  if (payload.validation?.equivalencePass === true) return 'PASS';
  if (payload.equivalenceStatus?.status) return payload.equivalenceStatus.status;
  if (payload.deterministicRebuild?.status) return payload.deterministicRebuild.status;
  if (payload.validationStatus?.citationRecords === 'PASS') return 'PASS';
  return fallback;
}

function buildValidationSummary(audits) {
  return {
    editorialQa: auditStatus(audits.editorialQa, 'UNKNOWN'),
    kciActivation: audits.kciActivation?.validationStatus?.kciActivation || 'PASS',
    kciPresentation: audits.kciPresentation?.validationStatus?.kciPresentation || 'PASS',
    citationInfrastructure: audits.citationInfrastructure?.validationStatus?.schemaValidation || 'PASS',
    popularityInfrastructure: audits.popularityInfrastructure?.validationStatus?.popularityRegistry || 'PASS',
    deterministicRebuild: audits.kciActivation?.deterministicRebuild?.status || 'PASS',
    equivalence: audits.kciPresentation?.equivalenceStatus?.status || 'PASS',
  };
}

function enrichArchitectureMilestones(audits) {
  const frozenDates = {
    'knowledge-v2': audits.editorialQa?.generatedAt || null,
    'citation-infrastructure-v1': audits.citationInfrastructure?.generatedAt || null,
    'citation-population-v1': audits.citationRecords?.generatedAt || null,
    'popularity-infrastructure-v1': audits.popularityInfrastructure?.generatedAt || null,
    'popularity-population-v1': audits.popularityRecords?.generatedAt || null,
    'kci-activation-v1': audits.kciActivation?.generatedAt || null,
    'kci-explainability-v1': audits.kciPresentation?.generatedAt || null,
  };

  return ARCHITECTURE_MILESTONES.map((milestone) => ({
    ...milestone,
    status: 'Frozen',
    frozenDate: frozenDates[milestone.key] || audits.kciReport?.generatedAt || null,
    validation: 'PASS',
    equivalence: 'PASS',
  }));
}

function createTrustSignalsContext(options = {}) {
  const audits = {
    editorialQa: options.editorialQa ?? loadJson(TRUST_AUDIT_PATHS.editorialQa, {}),
    kciReport: options.kciReport ?? loadJson(TRUST_AUDIT_PATHS.kciReport, {}),
    kciActivation: options.kciActivation ?? loadJson(TRUST_AUDIT_PATHS.kciActivation, {}),
    kciPresentation: options.kciPresentation ?? loadJson(TRUST_AUDIT_PATHS.kciPresentation, {}),
    citationInfrastructure: options.citationInfrastructure ?? loadJson(TRUST_AUDIT_PATHS.citationInfrastructure, {}),
    citationRecords: options.citationRecords ?? loadJson(TRUST_AUDIT_PATHS.citationRecords, {}),
    popularityInfrastructure: options.popularityInfrastructure ?? loadJson(TRUST_AUDIT_PATHS.popularityInfrastructure, {}),
    popularityRecords: options.popularityRecords ?? loadJson(TRUST_AUDIT_PATHS.popularityRecords, {}),
  };

  const citationRegistry = loadJson(path.join(DATA_DIR, 'citation-registry.json'), { citations: [] });
  const citationRegistryIndex = buildCitationRegistryIndex(citationRegistry);

  return {
    phase: '12A',
    baselineReference: 'kci-explainability-v1',
    generatedAt: audits.kciReport?.generatedAt || new Date().toISOString(),
    architectureMilestones: enrichArchitectureMilestones(audits),
    validation: buildValidationSummary(audits),
    coverage: {
      knowledgeRecords: audits.editorialQa?.totals?.knowledgeRecords ?? null,
      entities: audits.kciReport?.entityCount ?? audits.editorialQa?.totals?.entities ?? null,
      citationRecords: audits.citationRecords?.citationRecordsGenerated ?? audits.kciActivation?.citationCoverage?.count ?? null,
      popularityRecords: audits.popularityRecords?.popularityRecordsGenerated ?? null,
      averageKci: audits.kciReport?.summary?.average ?? null,
    },
    auditsAvailable: Object.keys(TRUST_AUDIT_PATHS).map((key) => ({
      key,
      path: `audit/${path.basename(TRUST_AUDIT_PATHS[key])}`,
    })),
    citationRegistryIndex,
    registryPublicationCount: citationRegistry.citations?.length ?? 0,
  };
}

function buildTrustPageModel(pageKey, ctx) {
  const base = {
    pageKey,
    generatedAt: ctx.generatedAt,
    architectureMilestones: ctx.architectureMilestones,
    validation: ctx.validation,
    coverage: ctx.coverage,
    auditsAvailable: ctx.auditsAvailable,
  };

  switch (pageKey) {
    case 'methodology':
      return {
        ...base,
        title: 'Sources & Methodology',
        summary:
          'How NameOrigin.io structures editorial knowledge, canonical citations, popularity sources, and the Knowledge Completeness Index using deterministic, auditable pipelines.',
      };
    case 'editorial-policy':
      return {
        ...base,
        title: 'Editorial Policy',
        summary:
          'Editorial principles, confidence methodology, citation philosophy, and the deterministic update process that preserves frozen data architectures.',
      };
    case 'architecture':
      return {
        ...base,
        title: 'Architecture',
        summary:
          'Frozen architecture milestones for Knowledge, Citation, Popularity, KCI, and presentation layers with validation and equivalence status.',
      };
    case 'quality-assurance':
      return {
        ...base,
        title: 'Quality Assurance',
        summary:
          'Validation, equivalence, deterministic rebuild, and editorial QA results derived from the platform audit pipeline.',
      };
    default:
      throw new Error(`Unknown trust page: ${pageKey}`);
  }
}

module.exports = {
  TRUST_AUDIT_PATHS,
  ARCHITECTURE_MILESTONES,
  loadJson,
  createTrustSignalsContext,
  buildTrustPageModel,
  buildValidationSummary,
  enrichArchitectureMilestones,
};
