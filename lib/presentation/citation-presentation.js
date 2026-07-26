/**
 * lib/presentation/citation-presentation.js — Phase 12A shared citation formatting.
 *
 * Standardized publication reference rendering from Citation Registry rows.
 * Never exposes internal registry IDs.
 */

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEditionLabel(edition, year) {
  if (edition) {
    const normalized = String(edition).trim();
    if (/^\d/.test(normalized) || normalized.endsWith('ed.') || normalized.endsWith('edition')) {
      return normalized;
    }
    return `${normalized} ed.`;
  }
  if (year != null) return String(year);
  return null;
}

function formatPublicationReference(citation) {
  if (!citation) return '';
  const title = citation.title || citation.canonicalReference || 'Published source';
  const edition = formatEditionLabel(citation.edition, citation.year);
  const organization = citation.publisher || citation.authority || null;

  return {
    title,
    edition,
    organization,
    formatted: [title, edition, organization].filter(Boolean).join(' · '),
  };
}

function buildCitationRegistryIndex(registry) {
  const index = new Map();
  for (const row of registry?.citations || []) {
    index.set(row.id, row);
  }
  return index;
}

function resolvePublicationReferences(citationIds, registryIndex) {
  const ids = [...new Set((citationIds || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const references = [];
  const seenFormatted = new Set();

  for (const id of ids) {
    const row = registryIndex.get(id);
    if (!row) continue;
    const reference = formatPublicationReference(row);
    if (seenFormatted.has(reference.formatted)) continue;
    seenFormatted.add(reference.formatted);
    references.push(reference);
  }

  references.sort((a, b) => a.formatted.localeCompare(b.formatted));
  return references;
}

function resolvePublicationReferencesFromRecord(citationRecord, registryIndex) {
  if (!citationRecord) return [];
  const ids = new Set();
  for (const domainIds of Object.values(citationRecord.citations || {})) {
    for (const id of domainIds || []) ids.add(id);
  }
  return resolvePublicationReferences([...ids], registryIndex);
}

function renderPublicationList(references, options = {}) {
  const items = references || [];
  if (!items.length) return options.emptyHtml || '';

  const listClass = options.listClass || 'citation-publications';
  return (
    `<ul class="${listClass}">` +
    items
      .map((ref) => {
        const editionPart = ref.edition ? `<span class="citation-publication__edition">${escapeHtml(ref.edition)}</span>` : '';
        const orgPart = ref.organization
          ? `<span class="citation-publication__organization">${escapeHtml(ref.organization)}</span>`
          : '';
        const meta = [editionPart, orgPart].filter(Boolean).join(' · ');
        const metaHtml = meta ? `<span class="citation-publication__meta">${meta}</span>` : '';
        return (
          `<li class="citation-publication">` +
          `<span class="citation-publication__title">${escapeHtml(ref.title)}</span>` +
          metaHtml +
          `</li>`
        );
      })
      .join('') +
    `</ul>`
  );
}

module.exports = {
  escapeHtml,
  formatEditionLabel,
  formatPublicationReference,
  buildCitationRegistryIndex,
  resolvePublicationReferences,
  resolvePublicationReferencesFromRecord,
  renderPublicationList,
};
