/**
 * lib/presentation/relationship-html.js — Phase 17C HTML renderer.
 */

const { escapeHtml } = require('./citation-presentation.js');

const RELATIONSHIP_NAV_MARKER_START = '<!-- phase-17c-relationship-navigation -->';
const RELATIONSHIP_NAV_MARKER_END = '<!-- /phase-17c-relationship-navigation -->';
const SITE_NAME = 'nameorigin.io';
const EXT = '.html';

function renderConfidenceBadge(confidence) {
  if (!confidence) return '';
  return `<span class="relationship-badge relationship-badge--confidence">${escapeHtml(confidence)}</span>`;
}

function renderRelationshipBadge(label) {
  if (!label) return '';
  return `<span class="relationship-badge relationship-badge--type">${escapeHtml(label)}</span>`;
}

function renderNavigationCard(entry) {
  return (
    `<li class="relationship-card">` +
    `<a class="relationship-card__name" href="${escapeHtml(entry.href)}">${escapeHtml(entry.displayName)}</a>` +
    `<div class="relationship-card__meta">` +
    renderRelationshipBadge(entry.relationshipLabel) +
    renderConfidenceBadge(entry.confidence) +
    `</div>` +
    `<p class="relationship-card__explanation">${escapeHtml(entry.explanation)}</p>` +
    `</li>`
  );
}

function renderBreakdownSection(section) {
  return (
    `<section class="relationship-breakdown__section" aria-labelledby="relationship-${escapeHtml(section.relationship.toLowerCase())}-heading">` +
    `<h3 id="relationship-${escapeHtml(section.relationship.toLowerCase())}-heading">${escapeHtml(section.title)}</h3>` +
    `<ul class="relationship-cards">${section.entries.map(renderNavigationCard).join('')}</ul>` +
    `</section>`
  );
}

function renderRelationshipNavigationSection(model) {
  if (!model) return '';

  const cards = model.breakdown.flatMap((section) => section.entries);
  const uniqueCards = [];
  const seen = new Set();
  for (const entry of cards) {
    if (seen.has(entry.target)) continue;
    seen.add(entry.target);
    uniqueCards.push(entry);
  }

  const relatedList =
    model.relatedNames.length > 0
      ? `<p class="relationship-related-list name-links">${model.relatedNames
          .map((row) => `<a href="${escapeHtml(row.href)}">${escapeHtml(row.displayName)}</a>`)
          .join(', ')}</p>`
      : '';

  const whyRelated =
    model.whyRelated.length > 0
      ? `<div class="relationship-why">` +
        `<h3 id="relationship-why-heading">Why these names are related</h3>` +
        `<ul class="relationship-why__list">${model.whyRelated
          .map((text) => `<li>${escapeHtml(text)}</li>`)
          .join('')}</ul>` +
        `</div>`
      : '';

  const breakdown =
    model.breakdown.length > 0
      ? `<div class="relationship-breakdown">${model.breakdown.map(renderBreakdownSection).join('')}</div>`
      : '';

  const explorerLinks =
    model.explorerLinks.length > 0
      ? `<nav class="relationship-explorers" aria-label="Relationship explorers">` +
        `<h3>Explore related groups</h3>` +
        `<ul class="relationship-explorer-links">${model.explorerLinks
          .map(
            (link) =>
              `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.title)}</a>` +
              `<span class="relationship-explorer-count"> (${link.memberCount} names)</span></li>`,
          )
          .join('')}</ul>` +
        `</nav>`
      : '';

  if (!relatedList && !whyRelated && !breakdown && uniqueCards.length === 0) {
    return '';
  }

  const cardList =
    uniqueCards.length > 0
      ? `<ul class="relationship-cards relationship-cards--summary">${uniqueCards
          .map(renderNavigationCard)
          .join('')}</ul>`
      : '';

  return (
    `<section class="relationship-navigation" aria-labelledby="relationship-navigation-heading">` +
    `<h2 id="relationship-navigation-heading">Related Names</h2>` +
    relatedList +
    cardList +
    whyRelated +
    breakdown +
    explorerLinks +
    `</section>`
  );
}

function renderExplorerPageBody(model) {
  const membersList =
    model.members.length > 0
      ? `<ul class="relationship-explorer-members name-list">${model.members
          .map(
            (member) =>
              `<li><a href="${escapeHtml(member.href)}">${escapeHtml(member.displayName)}</a></li>`,
          )
          .join('')}</ul>`
      : '<p>No members listed in this navigation group.</p>';

  const truncatedNote =
    model.memberCount > model.members.length
      ? `<p class="relationship-explorer-note">Showing ${model.members.length} of ${model.memberCount} names in this group.</p>`
      : '';

  return (
    `<h1>${escapeHtml(model.title)}</h1>` +
    `<p class="relationship-explorer-intro">${escapeHtml(model.description)}</p>` +
    `<p class="relationship-explorer-meta">` +
    `${renderRelationshipBadge(model.relationshipLabel)}` +
    `<span class="relationship-explorer-total">${model.memberCount} names</span>` +
    `</p>` +
    truncatedNote +
    membersList
  );
}

function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function renderBreadcrumbHtml(items) {
  const links = items.map((item, index) => {
    const isLast = index === items.length - 1;
    if (isLast) return `<span aria-current="page">${escapeHtml(item.name)}</span>`;
    return `<a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>`;
  });
  return `<nav aria-label="Breadcrumb" class="breadcrumb">${links.join(' / ')}</nav>`;
}

function renderPageLayout(opts) {
  const title = opts.title || 'Name Origin';
  const description = opts.description || 'Discover related baby names.';
  const pathSeg = opts.path || '/';
  const siteUrl = opts.siteUrl || 'https://nameorigin.io';
  const canonical = `${siteUrl}${pathSeg}`;
  const breadcrumbItems = opts.breadcrumb || [{ name: 'Home', path: '/' }];
  const breadcrumbSchema = JSON.stringify(
    breadcrumbJsonLd(
      breadcrumbItems.map((item) => ({
        name: item.name,
        url: item.path.startsWith('http') ? item.path : `${siteUrl}${item.path}`,
      })),
    ),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <script type="application/ld+json">${breadcrumbSchema}</script>
</head>
<body>
  <header class="site-header" role="banner">
    <div class="container">
      <a href="/" class="site-logo">${SITE_NAME}</a>
      <nav class="site-nav" aria-label="Main navigation">
        <a href="/names">Names</a>
        <a href="/names/boy${EXT}">Boy Names</a>
        <a href="/names/girl${EXT}">Girl Names</a>
        <a href="/relationships/">Relationships</a>
      </nav>
    </div>
  </header>
  <main class="container section">
    ${renderBreadcrumbHtml(breadcrumbItems)}
    ${opts.mainContent || ''}
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <p class="mb-0">© 2026 ${SITE_NAME}. All rights reserved.</p>
      <p><a href="/sitemap/">Sitemap</a></p>
    </div>
  </footer>
</body>
</html>`;
}

function wrapRelationshipNavigationMarkers(sectionHtml) {
  return `${RELATIONSHIP_NAV_MARKER_START}\n${sectionHtml || ''}\n${RELATIONSHIP_NAV_MARKER_END}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function injectRelationshipNavigationSection(pageHtml, sectionHtml) {
  const wrapped = wrapRelationshipNavigationMarkers(sectionHtml);
  const markerPattern = new RegExp(
    `${escapeRegExp(RELATIONSHIP_NAV_MARKER_START)}[\\s\\S]*?${escapeRegExp(RELATIONSHIP_NAV_MARKER_END)}\\n?`,
  );

  if (markerPattern.test(pageHtml)) {
    return pageHtml.replace(markerPattern, wrapped);
  }

  const kciIndex = pageHtml.indexOf('class="kci-explainability"');
  if (kciIndex !== -1) {
    const sectionClose = pageHtml.indexOf('</section>', kciIndex);
    if (sectionClose !== -1) {
      const insertAt = sectionClose + '</section>'.length;
      return `${pageHtml.slice(0, insertAt)}\n${wrapped}${pageHtml.slice(insertAt)}`;
    }
  }

  const factsIndex = pageHtml.indexOf('class="name-facts"');
  if (factsIndex !== -1) {
    const tableClose = pageHtml.indexOf('</table>', factsIndex);
    if (tableClose !== -1) {
      const insertAt = tableClose + '</table>'.length;
      return `${pageHtml.slice(0, insertAt)}\n${wrapped}${pageHtml.slice(insertAt)}`;
    }
  }

  return `${wrapped}\n${pageHtml}`;
}

module.exports = {
  RELATIONSHIP_NAV_MARKER_START,
  RELATIONSHIP_NAV_MARKER_END,
  renderRelationshipNavigationSection,
  renderExplorerPageBody,
  renderPageLayout,
  wrapRelationshipNavigationMarkers,
  injectRelationshipNavigationSection,
};
