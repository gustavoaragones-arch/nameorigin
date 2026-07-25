/**
 * lib/presentation/kci-explainability-html.js — Phase 11A HTML renderer.
 *
 * Converts presentation explainability models into deterministic HTML.
 * No scoring. No internal IDs exposed.
 */

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCoverageBadge(label) {
  if (!label) return '';
  return `<span class="kci-badge">${escapeHtml(label)}</span>`;
}

function renderComponentBlock(key, label, component) {
  const badge = renderCoverageBadge(component.badge);
  const extra = [];

  if (key === 'citation' && component.available && component.publicationTitles?.length) {
    extra.push(
      `<ul class="kci-publications">${component.publicationTitles
        .map((title) => `<li>${escapeHtml(title)}</li>`)
        .join('')}</ul>`,
    );
  }

  if (key === 'popularity' && component.available) {
    const countryText =
      component.countries?.length > 0
        ? `Countries: ${component.countries.map(escapeHtml).join(', ')}`
        : null;
    const yearText =
      component.yearsAvailable?.length > 0
        ? `Years available: ${component.yearsAvailable.join(', ')}`
        : null;
    if (countryText || yearText) {
      extra.push(
        `<p class="kci-meta">${[countryText, yearText].filter(Boolean).join(' · ')}</p>`,
      );
    }
  }

  return (
    `<article class="kci-component kci-component--${key}">` +
    `<div class="kci-component__header">` +
    `<h3 class="kci-component__title">${escapeHtml(label)}</h3>` +
    badge +
    `</div>` +
    `<p class="kci-component__score" aria-label="${escapeHtml(label)} score">${component.score}</p>` +
    `<p class="kci-component__explanation">${escapeHtml(component.explanation)}</p>` +
    extra.join('') +
    `</article>`
  );
}

function renderKciExplainabilitySection(model) {
  if (!model) return '';

  const { overallScore, maxScore, progressPct, components } = model;
  const knowledge = components.knowledge;
  const citation = components.citation;
  const popularity = components.popularity;

  return (
    `<section class="kci-explainability" aria-labelledby="kci-heading">` +
    `<h2 id="kci-heading">Knowledge Completeness</h2>` +
    `<p class="kci-intro">How thoroughly this name is documented across editorial knowledge, published sources, and popularity records.</p>` +
    `<div class="kci-overall">` +
    `<div class="kci-overall__label">Overall score</div>` +
    `<div class="kci-overall__value">${overallScore}<span class="kci-overall__max"> / ${maxScore}</span></div>` +
    `<div class="kci-progress" role="progressbar" aria-valuenow="${overallScore}" aria-valuemin="0" aria-valuemax="${maxScore}" aria-label="Knowledge completeness score">` +
    `<div class="kci-progress__bar" style="width:${progressPct}%"></div>` +
    `</div>` +
    `</div>` +
    `<div class="kci-components">` +
    renderComponentBlock('knowledge', 'Knowledge', knowledge) +
    renderComponentBlock('citation', 'Citation', citation) +
    renderComponentBlock('popularity', 'Popularity', popularity) +
    `</div>` +
    `</section>`
  );
}

module.exports = {
  escapeHtml,
  renderKciExplainabilitySection,
};
