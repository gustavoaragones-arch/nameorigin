#!/usr/bin/env node
/**
 * Phase 17C — Validate relationship presentation layer.
 *
 * Usage: node scripts/build/validate-relationship-presentation.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  createRelationshipPresentationContext,
  buildRelationshipPresentationForSlug,
  buildPresentationReport,
  hashPresentationSemantic,
  groupIdToUrlSegment,
} = require('../../lib/presentation/relationship-presentation.js');
const {
  renderRelationshipNavigationSection,
  renderExplorerPageBody,
  renderPageLayout,
  RELATIONSHIP_NAV_MARKER_START,
  RELATIONSHIP_NAV_MARKER_END,
} = require('../../lib/presentation/relationship-html.js');

const ROOT = path.join(__dirname, '..', '..');
const NAME_DIR = path.join(ROOT, 'name');
const RELATIONSHIPS_DIR = path.join(ROOT, 'relationships');
const AUDIT_PATH = path.join(ROOT, 'audit', 'relationship-presentation.json');
const NAVIGATION_AUDIT_PATH = path.join(ROOT, 'audit', 'navigation.json');
const GRAPH_AUDIT_PATH = path.join(ROOT, 'audit', 'knowledge-graph.json');
const KNOWLEDGE_RECORDS_PATH = path.join(ROOT, 'data', 'knowledge-records.json');

const FORBIDDEN_REQUIRE_PATTERNS = ['relationship-engine', 'navigation-engine', 'data/graph'];

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function readSourceFiles() {
  return [
    path.join(ROOT, 'lib/presentation/relationship-presentation.js'),
    path.join(ROOT, 'lib/presentation/relationship-html.js'),
    path.join(ROOT, 'scripts/build/generate-relationship-presentation.js'),
  ];
}

function validateForbiddenImports(errors) {
  for (const absPath of readSourceFiles()) {
    const source = fs.readFileSync(absPath, 'utf8');
    const requires = source.match(/require\(['"][^'"]+['"]\)/g) || [];
    for (const statement of requires) {
      for (const token of FORBIDDEN_REQUIRE_PATTERNS) {
        if (statement.includes(token)) {
          errors.push(`Forbidden require in ${path.relative(ROOT, absPath)}: ${statement}`);
        }
      }
    }
  }
}

function extractNameLinks(html) {
  const links = [];
  const pattern = /href="(\/name\/([a-z0-9-]+)\/)"/g;
  let match = pattern.exec(html);
  while (match) {
    links.push(match[2]);
    match = pattern.exec(html);
  }
  return links;
}

function validateDeterministicPresentation(ctx, errors) {
  const first = ctx.entities[0];
  const modelA = buildRelationshipPresentationForSlug(first.slug, ctx);
  const htmlA = renderRelationshipNavigationSection(modelA);
  const modelB = buildRelationshipPresentationForSlug(first.slug, ctx);
  const htmlB = renderRelationshipNavigationSection(modelB);
  if (htmlA !== htmlB) {
    errors.push('Deterministic presentation produced different HTML for the same entity.');
  }
}

function validateExplanationProvenance(model, errors) {
  for (const section of model.breakdown) {
    for (const entry of section.entries) {
      if (!entry.explanation || !entry.explanation.trim()) {
        errors.push(`Missing explanation for ${model.slug} -> ${entry.target}`);
      }
      if (!entry.derivedFrom?.length) {
        errors.push(`Missing derivedFrom for ${model.slug} -> ${entry.target}`);
      }
    }
  }
}

function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error('Missing audit/relationship-presentation.json — run generate-relationship-presentation.js first.');
    process.exitCode = 1;
    return;
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  const navigationAudit = JSON.parse(fs.readFileSync(NAVIGATION_AUDIT_PATH, 'utf8'));
  const graphAudit = fs.existsSync(GRAPH_AUDIT_PATH)
    ? JSON.parse(fs.readFileSync(GRAPH_AUDIT_PATH, 'utf8'))
    : null;
  const editorialHash = hashFile(KNOWLEDGE_RECORDS_PATH);

  const ctx = createRelationshipPresentationContext();
  const rebuilt = buildPresentationReport(ctx);
  const rebuiltHash = hashPresentationSemantic(rebuilt);
  const errors = [];

  validateForbiddenImports(errors);
  validateDeterministicPresentation(ctx, errors);

  if (rebuiltHash !== audit.validation.semanticHash) {
    errors.push('Deterministic rebuild produced a different semantic hash.');
  }
  if (rebuilt.entityCount !== 3697) {
    errors.push(`Expected 3697 entities, found ${rebuilt.entityCount}.`);
  }
  if (audit.validation.navigationUnchanged === false) {
    errors.push('Prior presentation generation reported navigation mutation.');
  }
  if (audit.validation.graphUnchanged === false) {
    errors.push('Prior presentation generation reported graph mutation.');
  }
  if (navigationAudit.validation.semanticHash !== audit.navigationSemanticHash) {
    errors.push('Navigation semantic hash mismatch against navigation audit.');
  }
  if (graphAudit && graphAudit.validation.semanticHash !== audit.graphSemanticHash) {
    errors.push('Graph semantic hash mismatch against knowledge-graph audit.');
  }
  if (editorialHash && audit.validation.frozenLayers?.knowledgeRecordsUnchanged === false) {
    errors.push('Knowledge Records hash check failed against prior audit state.');
  }

  let pagesWithSection = 0;
  let relatedNameCards = 0;
  const brokenLinks = [];

  for (const model of rebuilt.namePresentations) {
    validateExplanationProvenance(model, errors);
    relatedNameCards += model.relatedNames.length;

    const pagePath = path.join(NAME_DIR, model.slug, 'index.html');
    if (!fs.existsSync(pagePath)) {
      brokenLinks.push(`Missing name page: ${model.slug}`);
      continue;
    }

    const html = fs.readFileSync(pagePath, 'utf8');
    if (!html.includes(RELATIONSHIP_NAV_MARKER_START) || !html.includes(RELATIONSHIP_NAV_MARKER_END)) {
      errors.push(`Missing relationship navigation markers on ${model.slug}`);
      continue;
    }
    if (!html.includes('relationship-navigation')) {
      errors.push(`Missing relationship navigation section on ${model.slug}`);
      continue;
    }
    pagesWithSection += 1;

    for (const slug of extractNameLinks(html)) {
      const targetPath = path.join(NAME_DIR, slug, 'index.html');
      if (!fs.existsSync(targetPath)) brokenLinks.push(`Broken name link: ${model.slug} -> ${slug}`);
    }
  }

  for (const explorer of rebuilt.explorerPresentations) {
    const explorerPath = path.join(
      RELATIONSHIPS_DIR,
      explorer.kind,
      groupIdToUrlSegment(explorer.groupId),
      'index.html',
    );
    if (!fs.existsSync(explorerPath)) {
      errors.push(`Missing explorer page: ${explorer.urlPath}`);
    }

    const html = renderPageLayout({
      title: explorer.title,
      description: explorer.description,
      path: explorer.urlPath,
      mainContent: renderExplorerPageBody(explorer),
    });
    if (!html.includes('relationship-explorer-intro')) {
      errors.push(`Explorer render missing intro for ${explorer.urlPath}`);
    }
  }

  if (brokenLinks.length) {
    errors.push(...brokenLinks.slice(0, 20));
  }

  const status = errors.length === 0 ? 'PASS' : 'FAIL';
  console.log('Relationship presentation validation:', status);
  console.log('  Pages with relationship section:', pagesWithSection);
  console.log('  Explorer pages:', rebuilt.metrics.explorerPages);
  console.log('  Related name cards:', relatedNameCards);
  console.log('  Semantic hash match:', rebuiltHash === audit.validation.semanticHash);
  console.log('  Navigation hash match:', navigationAudit.validation.semanticHash === audit.navigationSemanticHash);
  if (errors.length) {
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
