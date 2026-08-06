/**
 * lib/publication/publication-engine.js — Phase 19A Versioned Dataset Publication v1.
 *
 * Read-only release packaging over the frozen Export Contract and API outputs.
 * Does not regenerate editorial, graph, navigation, export, or API layers.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const EXPORT_DIR = path.join(ROOT, 'exports');
const API_DIR = path.join(ROOT, 'api');
const AUDIT_DIR = path.join(ROOT, 'audit');
const RELEASES_DIR = path.join(ROOT, 'releases');

const PUBLICATION_VERSION = '19A-v1';

const AUDIT_PATHS = Object.freeze({
  structuredExports: path.join(AUDIT_DIR, 'structured-exports.json'),
  api: path.join(AUDIT_DIR, 'api.json'),
  knowledgeGraph: path.join(AUDIT_DIR, 'knowledge-graph.json'),
  navigation: path.join(AUDIT_DIR, 'navigation.json'),
});

const BUNDLE_FILES = Object.freeze([
  { source: 'knowledge.json', category: 'knowledge' },
  { source: 'knowledge.jsonl', category: 'knowledge' },
  { source: 'knowledge.csv', category: 'knowledge' },
  { source: 'citations.json', category: 'citations' },
  { source: 'citations.jsonl', category: 'citations' },
  { source: 'citations.csv', category: 'citations' },
  { source: 'popularity.json', category: 'popularity' },
  { source: 'popularity.jsonl', category: 'popularity' },
  { source: 'popularity.csv', category: 'popularity' },
  { source: 'graph-nodes.json', category: 'graph' },
  { source: 'graph-edges.json', category: 'graph' },
  { source: 'graph.jsonl', category: 'graph' },
  { source: 'navigation-related.json', category: 'navigation' },
  { source: 'navigation-origin.json', category: 'navigation' },
  { source: 'navigation-language.json', category: 'navigation' },
  { source: 'navigation-meaning.json', category: 'navigation' },
  { source: 'navigation-pronunciation.json', category: 'navigation' },
  { source: 'navigation-cultural.json', category: 'navigation' },
]);

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath, 'utf8')).digest('hex');
}

function hashFileBinary(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function loadJson(absPath) {
  if (!fs.existsSync(absPath)) {
    throw new Error(`Missing required file: ${path.relative(ROOT, absPath)}`);
  }
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function loadPublicationInputs() {
  const exportManifest = loadJson(path.join(EXPORT_DIR, 'manifest.json'));
  const structuredExportsAudit = loadJson(AUDIT_PATHS.structuredExports);
  const apiAudit = loadJson(AUDIT_PATHS.api);
  const knowledgeGraphAudit = loadJson(AUDIT_PATHS.knowledgeGraph);
  const navigationAudit = loadJson(AUDIT_PATHS.navigation);

  if (!fs.existsSync(API_DIR)) {
    throw new Error('Missing api/ directory — run generate-api-indexes.js first.');
  }

  return {
    datasetVersion: exportManifest.exportVersion,
    exportManifest,
    structuredExportsAudit,
    apiAudit,
    knowledgeGraphAudit,
    navigationAudit,
    sourceHashes: {
      exportManifest: hashFile(path.join(EXPORT_DIR, 'manifest.json')),
      apiAudit: hashFile(AUDIT_PATHS.api),
    },
  };
}

function listFilesRecursive(dir, baseDir = dir) {
  const entries = [];
  if (!fs.existsSync(dir)) return entries;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...listFilesRecursive(absPath, baseDir));
    } else if (entry.isFile()) {
      entries.push(path.relative(baseDir, absPath));
    }
  }
  return entries.sort((a, b) => a.localeCompare(b));
}

function copyFileSync(sourcePath, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
}

function copyDirectorySync(sourceDir, destDir) {
  if (!fs.existsSync(sourceDir)) return [];
  fs.mkdirSync(destDir, { recursive: true });
  const copied = [];
  for (const relPath of listFilesRecursive(sourceDir)) {
    const sourcePath = path.join(sourceDir, relPath);
    const destPath = path.join(destDir, relPath);
    copyFileSync(sourcePath, destPath);
    copied.push(relPath);
  }
  return copied;
}

function buildReleaseReadme(datasetVersion, manifest) {
  return `# nameorigin.io Dataset Release ${datasetVersion}

This directory contains a frozen, versioned publication bundle derived from the nameorigin.io Export Contract and AI / Research API outputs.

## Contents

- \`knowledge/\` — Knowledge record exports (JSON, JSONL, CSV)
- \`citations/\` — Citation record exports
- \`popularity/\` — Popularity record exports
- \`graph/\` — Knowledge graph nodes, edges, and JSONL
- \`navigation/\` — Navigation contract artifacts
- \`api/\` — Versioned API static payloads (\`/api/v1/\`)
- \`manifest.json\` — Publication manifest with semantic hashes
- \`checksums.sha256\` — SHA-256 checksums for independent verification

## Verification

Verify all files against \`checksums.sha256\`:

\`\`\`bash
shasum -a 256 -c checksums.sha256
\`\`\`

## Reproducibility

Publication version: ${manifest.publicationVersion}
Export semantic hash: ${manifest.hashes.exportSemanticHash}
API semantic hash: ${manifest.hashes.apiSemanticHash}

Entity count: ${manifest.recordCounts.knowledgeRecords}
`;
}

function buildReleaseLicense() {
  return `nameorigin.io Dataset Publication License Notice

Copyright (c) 2026 Albor Digital LLC

This dataset release is provided for research, educational, and non-commercial
analysis purposes. Redistribution must preserve checksums, manifest metadata, and
this license notice. No warranty is provided. Refer to nameorigin.io for current
terms governing commercial use and attribution requirements.
`;
}

function buildReleaseChangelog(currentVersion, previousVersion, manifest) {
  const lines = [
    `# Changelog — ${currentVersion}`,
    '',
    `Publication version: ${manifest.publicationVersion}`,
    `Release timestamp: ${manifest.releaseTimestamp}`,
    '',
  ];

  if (previousVersion) {
    lines.push(`Previous version: ${previousVersion}`, '');
  } else {
    lines.push('Previous version: none (initial publication release)', '');
  }

  lines.push(
    '## Datasets included',
    '',
    '- knowledge (JSON, JSONL, CSV)',
    '- citations (JSON, JSONL, CSV)',
    '- popularity (JSON, JSONL, CSV)',
    '- graph (nodes, edges, JSONL)',
    '- navigation (related, origin, language, meaning, pronunciation, cultural)',
    '- api (v1 static JSON payloads and indexes)',
    '',
    '## Compatibility',
    '',
    `- Dataset version: ${manifest.datasetVersion}`,
    `- API version: ${manifest.apiVersion}`,
    `- Graph version: ${manifest.schemaVersions.graphVersion}`,
    `- Navigation version: ${manifest.schemaVersions.navigationVersion}`,
    '',
    '## Hashes',
    '',
    `- Export semantic hash: ${manifest.hashes.exportSemanticHash}`,
    `- Graph semantic hash: ${manifest.hashes.graphSemanticHash}`,
    `- Navigation semantic hash: ${manifest.hashes.navigationSemanticHash}`,
    `- API semantic hash: ${manifest.hashes.apiSemanticHash}`,
    `- Publication semantic hash: ${manifest.publicationSemanticHash}`,
    '',
    '## Release notes',
    '',
    'Initial versioned dataset publication release. No upstream editorial, graph, navigation, export, or API layers were modified during packaging.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

function buildPublicationManifest(inputs, packagedFiles, generatedAt) {
  const { exportManifest, structuredExportsAudit, apiAudit, knowledgeGraphAudit, navigationAudit } =
    inputs;

  const recordCounts = structuredExportsAudit.metrics.recordCounts;
  const publicationSemanticHash = stableHash({
    publicationVersion: PUBLICATION_VERSION,
    datasetVersion: inputs.datasetVersion,
    packagedFiles: packagedFiles.map((file) => ({
      path: file.path,
      sha256: file.sha256,
      bytes: file.bytes,
    })),
    hashes: {
      exportSemanticHash: structuredExportsAudit.validation.semanticHash,
      graphSemanticHash: knowledgeGraphAudit.validation.semanticHash,
      navigationSemanticHash: navigationAudit.validation.semanticHash,
      apiSemanticHash: apiAudit.validation.semanticHash,
    },
  });

  return {
    publicationVersion: PUBLICATION_VERSION,
    datasetVersion: inputs.datasetVersion,
    releaseTimestamp: generatedAt,
    title: 'nameorigin.io Versioned Dataset Publication v1',
    baselineReference: 'export-contract-v1',
    readOnly: true,
    previousVersion: null,
    apiVersion: apiAudit.apiVersion,
    schemaVersions: {
      knowledgeRecords: exportManifest.sourceLayers.knowledgeRecords.schemaVersion,
      citationRecords: exportManifest.sourceLayers.citationRecords.schemaVersion,
      popularityRecords: exportManifest.sourceLayers.popularityRecords.schemaVersion,
      graphVersion: exportManifest.sourceLayers.knowledgeGraph.graphVersion,
      navigationVersion: exportManifest.sourceLayers.navigation.navigationVersion,
    },
    recordCounts,
    hashes: {
      exportSemanticHash: structuredExportsAudit.validation.semanticHash,
      graphSemanticHash: knowledgeGraphAudit.validation.semanticHash,
      navigationSemanticHash: navigationAudit.validation.semanticHash,
      apiSemanticHash: apiAudit.validation.semanticHash,
    },
    publicationSemanticHash,
    compatibility: {
      exportContract: inputs.datasetVersion,
      apiVersion: apiAudit.apiVersion,
      graphVersion: knowledgeGraphAudit.graphVersion,
      navigationVersion: navigationAudit.navigationVersion,
    },
    filesPackaged: packagedFiles.length,
    totalBytes: packagedFiles.reduce((sum, file) => sum + file.bytes, 0),
    categories: {
      knowledge: packagedFiles.filter((file) => file.path.startsWith('knowledge/')).length,
      citations: packagedFiles.filter((file) => file.path.startsWith('citations/')).length,
      popularity: packagedFiles.filter((file) => file.path.startsWith('popularity/')).length,
      graph: packagedFiles.filter((file) => file.path.startsWith('graph/')).length,
      navigation: packagedFiles.filter((file) => file.path.startsWith('navigation/')).length,
      api: packagedFiles.filter((file) => file.path.startsWith('api/')).length,
    },
  };
}

function buildChecksumsFile(packagedFiles) {
  return `${packagedFiles
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => `${file.sha256}  ${file.path}`)
    .join('\n')}\n`;
}

function collectPackagedFileMetrics(releaseDir, relativePath) {
  const absPath = path.join(releaseDir, relativePath);
  const stat = fs.statSync(absPath);
  return {
    path: relativePath.replace(/\\/g, '/'),
    sha256: hashFileBinary(absPath),
    bytes: stat.size,
  };
}

function buildPublicationBundle(inputs, generatedAt = new Date().toISOString()) {
  const releaseDir = path.join(RELEASES_DIR, inputs.datasetVersion);
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(releaseDir, { recursive: true });

  const packagedPaths = [];

  for (const spec of BUNDLE_FILES) {
    const sourcePath = path.join(EXPORT_DIR, spec.source);
    const destRelative = path.join(spec.category, spec.source).replace(/\\/g, '/');
    copyFileSync(sourcePath, path.join(releaseDir, destRelative));
    packagedPaths.push(destRelative);
  }

  const apiCopied = copyDirectorySync(API_DIR, path.join(releaseDir, 'api'));
  for (const relPath of apiCopied) {
    packagedPaths.push(path.posix.join('api', relPath.replace(/\\/g, '/')));
  }

  const readmePath = 'README.md';
  const licensePath = 'LICENSE.txt';
  const changelogPath = 'CHANGELOG.md';

  fs.writeFileSync(path.join(releaseDir, licensePath), buildReleaseLicense());

  let packagedFiles = packagedPaths.map((relativePath) =>
    collectPackagedFileMetrics(releaseDir, relativePath),
  );

  let manifest = buildPublicationManifest(inputs, packagedFiles, generatedAt);
  fs.writeFileSync(
    path.join(releaseDir, changelogPath),
    buildReleaseChangelog(inputs.datasetVersion, null, manifest),
  );
  fs.writeFileSync(path.join(releaseDir, readmePath), buildReleaseReadme(inputs.datasetVersion, manifest));

  packagedFiles = [
    ...packagedFiles,
    collectPackagedFileMetrics(releaseDir, readmePath),
    collectPackagedFileMetrics(releaseDir, licensePath),
    collectPackagedFileMetrics(releaseDir, changelogPath),
  ];

  manifest = buildPublicationManifest(inputs, packagedFiles, generatedAt);
  const manifestPath = 'manifest.json';
  fs.writeFileSync(path.join(releaseDir, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  packagedFiles.push(collectPackagedFileMetrics(releaseDir, manifestPath));

  manifest = {
    ...manifest,
    checksumCount: packagedFiles.length,
    filesPackaged: packagedFiles.length,
    totalBytes: packagedFiles.reduce((sum, file) => sum + file.bytes, 0),
  };
  fs.writeFileSync(path.join(releaseDir, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  packagedFiles[packagedFiles.length - 1] = collectPackagedFileMetrics(releaseDir, manifestPath);

  const checksumsPath = 'checksums.sha256';
  fs.writeFileSync(path.join(releaseDir, checksumsPath), buildChecksumsFile(packagedFiles));

  return {
    generatedAt,
    phase: '19A',
    title: 'Versioned Dataset Publication v1',
    publicationVersion: PUBLICATION_VERSION,
    datasetVersion: inputs.datasetVersion,
    releaseDir,
    manifest,
    packagedFiles,
    checksumsPath,
  };
}

function hashPublicationSemantic(report) {
  return stableHash({
    publicationVersion: report.publicationVersion,
    datasetVersion: report.datasetVersion,
    manifest: report.manifest,
    checksumSample: report.packagedFiles.slice(0, 10).map((file) => ({
      path: file.path,
      sha256: file.sha256,
    })),
  });
}

function validatePublicationBundle(report, inputs) {
  const errors = [];
  const { releaseDir, manifest, packagedFiles } = report;

  for (const spec of BUNDLE_FILES) {
    const destRelative = path.join(spec.category, spec.source).replace(/\\/g, '/');
    if (!fs.existsSync(path.join(releaseDir, destRelative))) {
      errors.push(`Missing bundled export file: ${destRelative}`);
    }
  }

  if (!fs.existsSync(path.join(releaseDir, 'api', 'v1', 'manifest.json'))) {
    errors.push('Missing bundled API manifest.');
  }

  const checksumsContent = fs.readFileSync(path.join(releaseDir, 'checksums.sha256'), 'utf8');
  for (const file of packagedFiles) {
    if (file.path === 'checksums.sha256') continue;
    const expectedLine = `${file.sha256}  ${file.path}`;
    if (!checksumsContent.includes(expectedLine)) {
      errors.push(`Checksum entry missing or incorrect: ${file.path}`);
    }
    const absPath = path.join(releaseDir, file.path);
    if (hashFileBinary(absPath) !== file.sha256) {
      errors.push(`Checksum mismatch on disk: ${file.path}`);
    }
  }

  if (manifest.hashes.exportSemanticHash !== inputs.structuredExportsAudit.validation.semanticHash) {
    errors.push('Export semantic hash mismatch in publication manifest.');
  }
  if (manifest.hashes.graphSemanticHash !== inputs.knowledgeGraphAudit.validation.semanticHash) {
    errors.push('Graph semantic hash mismatch in publication manifest.');
  }
  if (manifest.hashes.navigationSemanticHash !== inputs.navigationAudit.validation.semanticHash) {
    errors.push('Navigation semantic hash mismatch in publication manifest.');
  }
  if (manifest.hashes.apiSemanticHash !== inputs.apiAudit.validation.semanticHash) {
    errors.push('API semantic hash mismatch in publication manifest.');
  }

  if (manifest.recordCounts.knowledgeRecords !== 3697) {
    errors.push(`Expected 3697 knowledge records, found ${manifest.recordCounts.knowledgeRecords}.`);
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errorCount: errors.length,
    errors,
  };
}

module.exports = {
  PUBLICATION_VERSION,
  RELEASES_DIR,
  EXPORT_DIR,
  API_DIR,
  AUDIT_PATHS,
  BUNDLE_FILES,
  stableHash,
  hashFile,
  hashFileBinary,
  loadPublicationInputs,
  buildPublicationBundle,
  buildChecksumsFile,
  hashPublicationSemantic,
  validatePublicationBundle,
};
