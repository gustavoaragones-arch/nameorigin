#!/usr/bin/env node
/**
 * scripts/audit/knowledge-impact-graph.js — Phase 1D:
 * audit/knowledge-impact-graph.json (READ-ONLY).
 *
 * Traces: Dataset field → Generator → Template → Assertion → Live pages,
 * for every field with recovery potential. Reuses audit/knowledge-
 * dependencies.json (Phase 1B) for the dataset→generator chain, corrected
 * where Phase 1C's source verification found a discrepancy (compare pages
 * do not actually read data/country-differentials.json).
 */

const path = require('path');
const { AUDIT_DIR, readJsonSafe, writeAuditJson } = require('./_lib.js');
const { buildConceptImpacts } = require('./knowledge-recovery-lib.js');

function requireAudit(filename) {
  const data = readJsonSafe(path.join(AUDIT_DIR, filename));
  if (!data) {
    console.error(`Missing ${filename} — run the prior phases first.`);
    process.exit(1);
  }
  return data;
}

// Dataset field the generator(s) actually read, per Phase 1B chains
// (audit/knowledge-dependencies.json) with the Phase 1C correction applied
// for the compare-pages/country-differentials discrepancy.
const CONCEPT_DATASET_FIELD = {
  meaning: 'data/names.json / data/names-enriched.json (meaning)',
  origin: 'data/names-enriched.json (origin_country/language/origin_cluster) for name-detail-page & names-like-page; data/names.json (unenriched — see caveat) for sibling-harmony-page',
  popularity: 'data/popularity.json',
  pronunciation: 'data/names-enriched.json (phonetic)',
  heraldry: 'data/heraldry.json',
  trend: 'data/popularity.json (generate-compare-pages.js computes rank/movement directly; does NOT read data/country-differentials.json — Phase 1C correction to the Phase 1B chain)',
};

function run() {
  console.log('Knowledge Impact Graph — audit/knowledge-impact-graph.json');
  const deps = requireAudit('knowledge-dependencies.json');
  const impacts = buildConceptImpacts().filter((i) => i.hasRecoveryPotential);

  const nodes = [];
  const edges = [];
  const addNode = (id, kind, label) => {
    if (!nodes.some((n) => n.id === id)) nodes.push({ id, kind, label });
  };

  for (const impact of impacts) {
    const fieldId = 'field:' + impact.concept;
    addNode(fieldId, 'dataset-field', CONCEPT_DATASET_FIELD[impact.concept] || impact.concept);

    const seenGenerators = new Set();
    for (const inst of impact.allInstances) {
      if (inst.state !== 'fallback' && inst.state !== 'disclosed-missing') continue;
      const genId = 'generator:' + inst.generatorFunction;
      const tplId = 'template:' + inst.template;
      const assertId = 'assertion:' + inst.template + ':' + inst.assertion;
      const pagesId = 'pages:' + inst.template;

      addNode(genId, 'generator', inst.generatorFunction);
      addNode(tplId, 'template', inst.template);
      addNode(assertId, 'assertion', inst.assertion);
      addNode(pagesId, 'live-pages', inst.template + ' (' + impact.pagesImpacted + ' pages total for this template — see audit/project-inventory.json)');

      if (!seenGenerators.has(genId)) {
        edges.push({ from: fieldId, to: genId, relationship: 'READ_BY' });
        seenGenerators.add(genId);
      }
      edges.push({ from: genId, to: tplId, relationship: 'GENERATES' });
      edges.push({ from: tplId, to: assertId, relationship: 'RENDERS' });
      edges.push({ from: assertId, to: pagesId, relationship: 'APPEARS_ON', state: inst.state });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    description: 'Dataset field -> Generator -> Template -> Assertion -> Live pages, for every field with at least one fallback or disclosed-missing assertion. Built from scripts/audit/truthfulness-lib.js (Phase 1C) assertions and audit/knowledge-dependencies.json (Phase 1B) dataset chains.',
    fieldsIncluded: impacts.map((i) => i.concept),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
    correctionsAppliedFromPhase1B: [
      'audit/knowledge-dependencies.json (Phase 1B) attributed compare-name-country-pair-page to data/country-differentials.json. Phase 1C source verification (scripts/generate-compare-pages.js) found it instead computes rank/movement directly from data/popularity.json and never reads country-differentials.json. This graph reflects the corrected chain.',
      'The "origin" field node is split by template in its label because sibling-harmony-page reads the unenriched data/names.json (via generate-sibling-pages.js) while name-detail-page and names-like-page read data/names-enriched.json (via generate-programmatic-pages.js) — the same conceptual field, populated through two different files, so enriching one does not automatically propagate to the other.',
    ],
    notes: [
      'Only fallback and disclosed-missing assertions are graphed here — supported/computed assertions have no recovery potential and are out of scope for an impact graph about missing knowledge.',
      'This graph answers "if I populate field X, which generators, templates, and pages does that touch?" — it does not weight or score impact; see audit/knowledge-roi.json for the scored view of the same relationships.',
    ],
  };

  writeAuditJson('knowledge-impact-graph.json', report);
  console.log('Nodes:', nodes.length, '| edges:', edges.length, '| fields graphed:', impacts.length);
}

run();
