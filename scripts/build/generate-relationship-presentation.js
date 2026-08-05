#!/usr/bin/env node
/**
 * Phase 17C — Generate relationship presentation HTML from frozen navigation artifacts.
 *
 * Usage: node scripts/build/generate-relationship-presentation.js
 *
 * Prerequisite: node scripts/build/generate-navigation.js
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
  injectRelationshipNavigationSection,
  RELATIONSHIP_NAV_MARKER_START,
} = require('../../lib/presentation/relationship-html.js');

const ROOT = path.join(__dirname, '..', '..');
const NAME_DIR = path.join(ROOT, 'name');
const RELATIONSHIPS_DIR = path.join(ROOT, 'relationships');
const AUDIT_PATH = path.join(ROOT, 'audit', 'relationship-presentation.json');
const KNOWLEDGE_RECORDS_PATH = path.join(ROOT, 'data', 'knowledge-records.json');
const NAVIGATION_AUDIT_PATH = path.join(ROOT, 'audit', 'navigation.json');
const GRAPH_AUDIT_PATH = path.join(ROOT, 'audit', 'knowledge-graph.json');
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function writeJson(absPath, payload) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeHtml(absPath, html) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, html);
}

function validatePresentationSources() {
  const presentationPath = path.join(ROOT, 'lib/presentation/relationship-presentation.js');
  const htmlPath = path.join(ROOT, 'lib/presentation/relationship-html.js');
  for (const absPath of [presentationPath, htmlPath]) {
    const source = fs.readFileSync(absPath, 'utf8');
    const requires = source.match(/require\(['"][^'"]+['"]\)/g) || [];
    for (const statement of requires) {
      if (
        statement.includes('relationship-engine') ||
        statement.includes('navigation-engine') ||
        statement.includes('data/graph')
      ) {
        throw new Error(`Forbidden require in ${path.relative(ROOT, absPath)}: ${statement}`);
      }
    }
  }
}

function renderRelationshipsHub(ctx) {
  const sections = [
    { title: 'Same Origin', kind: 'origin', href: '/relationships/origin/' },
    { title: 'Same Language', kind: 'language', href: '/relationships/language/' },
    { title: 'Related Meaning', kind: 'meaning', href: '/relationships/meaning/' },
    { title: 'Similar Pronunciation', kind: 'pronunciation', href: '/relationships/pronunciation/' },
    { title: 'Cultural Groups', kind: 'cultural', href: '/relationships/cultural/' },
  ];

  const body = sections
    .map((section) => {
      const groups = ctx.explorers[section.kind] || [];
      const preview = groups
        .slice(0, 12)
        .map(
          (group) =>
            `<li><a href="/relationships/${section.kind}/${groupIdToUrlSegment(group.id)}/">${group.label?.originCluster || group.label?.language || group.label?.meaning || group.label?.pronunciation || group.label?.meaningCluster || group.id}</a> (${group.memberCount})</li>`,
        )
        .join('');
      return (
        `<section aria-labelledby="relationship-hub-${section.kind}">` +
        `<h2 id="relationship-hub-${section.kind}"><a href="${section.href}">${section.title}</a></h2>` +
        `<p>${groups.length} explorer groups</p>` +
        `<ul>${preview}</ul>` +
        `<p><a href="${section.href}">Browse all ${section.title.toLowerCase()} groups</a></p>` +
        `</section>`
      );
    })
    .join('');

  return renderPageLayout({
    siteUrl: SITE_URL,
    title: `Relationship Explorers | ${SITE_URL.replace(/^https?:\/\//, '')}`,
    description: 'Explore baby names by origin, language, meaning, pronunciation, and cultural group.',
    path: '/relationships/',
    breadcrumb: [
      { name: 'Home', path: '/' },
      { name: 'Relationships', path: '/relationships/' },
    ],
    mainContent: `<h1>Relationship Explorers</h1><p>Browse deterministic relationship groups derived from the frozen navigation layer.</p>${body}`,
  });
}

function renderKindIndex(kind, groups) {
  const titleMap = {
    origin: 'Same Origin Explorers',
    language: 'Same Language Explorers',
    meaning: 'Related Meaning Explorers',
    pronunciation: 'Similar Pronunciation Explorers',
    cultural: 'Cultural Group Explorers',
  };

  const list = groups
    .map(
      (group) =>
        `<li><a href="/relationships/${kind}/${groupIdToUrlSegment(group.id)}/">${group.label?.originCluster || group.label?.language || group.label?.meaning || group.label?.pronunciation || group.label?.meaningCluster || group.id}</a> (${group.memberCount})</li>`,
    )
    .join('');

  return renderPageLayout({
    siteUrl: SITE_URL,
    title: `${titleMap[kind]} | nameorigin.io`,
    description: `Browse ${groups.length} ${kind} relationship groups.`,
    path: `/relationships/${kind}/`,
    breadcrumb: [
      { name: 'Home', path: '/' },
      { name: 'Relationships', path: '/relationships/' },
      { name: titleMap[kind], path: `/relationships/${kind}/` },
    ],
    mainContent: `<h1>${titleMap[kind]}</h1><ul class="relationship-kind-index">${list}</ul>`,
  });
}

function main() {
  validatePresentationSources();

  if (!fs.existsSync(NAVIGATION_AUDIT_PATH)) {
    console.error('Missing audit/navigation.json — run generate-navigation.js first.');
    process.exitCode = 1;
    return;
  }

  const editorialHashBefore = hashFile(KNOWLEDGE_RECORDS_PATH);
  const navigationAudit = JSON.parse(fs.readFileSync(NAVIGATION_AUDIT_PATH, 'utf8'));
  const graphAudit = fs.existsSync(GRAPH_AUDIT_PATH)
    ? JSON.parse(fs.readFileSync(GRAPH_AUDIT_PATH, 'utf8'))
    : null;

  const ctx = createRelationshipPresentationContext();
  const report = buildPresentationReport(ctx);
  const semanticHash = hashPresentationSemantic(report);

  let pagesUpdated = 0;
  let pagesMissing = 0;
  let pagesWithMarkers = 0;
  let relatedNameCards = 0;
  const brokenLinks = [];

  for (const model of report.namePresentations) {
    const namePagePath = path.join(NAME_DIR, model.slug, 'index.html');
    if (!fs.existsSync(namePagePath)) {
      pagesMissing += 1;
      brokenLinks.push(`Missing name page: ${model.slug}`);
      continue;
    }

    for (const row of model.relatedNames) {
      relatedNameCards += 1;
      const targetPath = path.join(NAME_DIR, row.slug, 'index.html');
      if (!fs.existsSync(targetPath)) brokenLinks.push(`Missing related target page: ${row.slug}`);
    }

    const sectionHtml = renderRelationshipNavigationSection(model);
    const currentHtml = fs.readFileSync(namePagePath, 'utf8');
    if (currentHtml.includes(RELATIONSHIP_NAV_MARKER_START)) pagesWithMarkers += 1;
    const nextHtml = injectRelationshipNavigationSection(currentHtml, sectionHtml);
    writeHtml(namePagePath, nextHtml);
    pagesUpdated += 1;
  }

  writeHtml(path.join(RELATIONSHIPS_DIR, 'index.html'), renderRelationshipsHub(ctx));

  for (const [kind, groups] of Object.entries(ctx.explorers)) {
    writeHtml(path.join(RELATIONSHIPS_DIR, kind, 'index.html'), renderKindIndex(kind, groups));
    for (const group of groups) {
      const explorerModel = report.explorerPresentations.find(
        (row) => row.kind === kind && row.groupId === group.id,
      );
      if (!explorerModel) continue;
      for (const member of explorerModel.members) {
        const memberPath = path.join(NAME_DIR, member.slug, 'index.html');
        if (!fs.existsSync(memberPath)) {
          brokenLinks.push(`Missing explorer member page: ${member.slug}`);
        }
      }
      const html = renderPageLayout({
        siteUrl: SITE_URL,
        title: `${explorerModel.title} | nameorigin.io`,
        description: explorerModel.description,
        path: explorerModel.urlPath,
        breadcrumb: [
          { name: 'Home', path: '/' },
          { name: 'Relationships', path: '/relationships/' },
          {
            name: kind.charAt(0).toUpperCase() + kind.slice(1),
            path: `/relationships/${kind}/`,
          },
          { name: explorerModel.title, path: explorerModel.urlPath },
        ],
        mainContent: renderExplorerPageBody(explorerModel),
      });
      writeHtml(
        path.join(RELATIONSHIPS_DIR, kind, groupIdToUrlSegment(group.id), 'index.html'),
        html,
      );
    }
  }

  const editorialHashAfter = hashFile(KNOWLEDGE_RECORDS_PATH);
  const validationStatus = brokenLinks.length === 0 ? 'PASS' : 'FAIL';

  const audit = {
    generatedAt: report.generatedAt,
    phase: '17C',
    title: 'Relationship Presentation v1',
    baselineReference: 'editorial-architecture-v2',
    readOnly: true,
    presentationVersion: report.presentationVersion,
    navigationVersion: report.navigationVersion,
    graphVersion: report.graphVersion,
    graphSemanticHash: report.graphSemanticHash,
    navigationSemanticHash: report.navigationSemanticHash,
    entityCount: report.entityCount,
    metrics: {
      ...report.metrics,
      pagesUpdated,
      pagesMissing,
      pagesWithMarkers,
      relatedNameCards,
      brokenLinks: brokenLinks.length,
    },
    validation: {
      status: validationStatus,
      errorCount: brokenLinks.length,
      errors: brokenLinks.slice(0, 50),
      deterministicOrdering: true,
      semanticHash,
      editorialDataUnchanged: editorialHashBefore === editorialHashAfter,
      graphUnchanged: graphAudit
        ? report.graphSemanticHash === graphAudit.validation.semanticHash
        : true,
      navigationUnchanged: report.navigationSemanticHash === navigationAudit.validation.semanticHash,
      frozenLayers: {
        knowledgeRecordsUnchanged: editorialHashBefore === editorialHashAfter,
        knowledgeGraphUnchanged: graphAudit
          ? report.graphSemanticHash === graphAudit.validation.semanticHash
          : true,
        navigationUnchanged: report.navigationSemanticHash === navigationAudit.validation.semanticHash,
      },
    },
    outputs: {
      namePages: 'name/{slug}/index.html',
      relationshipsHub: 'relationships/index.html',
      explorerPages: 'relationships/{kind}/{group-id}/index.html',
    },
  };

  writeJson(AUDIT_PATH, audit);

  console.log('Relationship presentation generation complete.');
  console.log('  Name pages updated:', pagesUpdated);
  console.log('  Explorer pages:', report.metrics.explorerPages);
  console.log('  Related name cards:', relatedNameCards);
  console.log('  Broken links:', brokenLinks.length);
  console.log('  Validation:', validationStatus);
  console.log('  Semantic hash:', semanticHash.slice(0, 16) + '...');
  console.log('  Audit:', AUDIT_PATH);

  if (validationStatus !== 'PASS') {
    for (const error of brokenLinks.slice(0, 10)) console.error('  -', error);
    process.exitCode = 1;
  }
}

main();
