/**
 * lib/presentation/trust-signals-html.js — Phase 12A trust page HTML renderer.
 */

const { escapeHtml } = require('./citation-presentation.js');

function renderStatusBadge(label, status) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();
  const className = normalized === 'PASS' ? 'trust-badge trust-badge--pass' : 'trust-badge';
  return `<span class="${className}">${escapeHtml(label)}: ${escapeHtml(normalized)}</span>`;
}

function renderValidationPanel(validation) {
  const items = [
    ['Editorial QA', validation.editorialQa],
    ['KCI Activation', validation.kciActivation],
    ['KCI Presentation', validation.kciPresentation],
    ['Deterministic Rebuild', validation.deterministicRebuild],
    ['Equivalence', validation.equivalence],
  ];

  return (
    `<section class="trust-panel" aria-labelledby="validation-heading">` +
    `<h2 id="validation-heading">Validation Status</h2>` +
    `<div class="trust-badges">` +
    items.map(([label, status]) => renderStatusBadge(label, status)).join('') +
    `</div>` +
    `</section>`
  );
}

function renderArchitectureTable(milestones) {
  const rows = (milestones || [])
    .map(
      (row) =>
        `<tr>` +
        `<td>${escapeHtml(row.name)}</td>` +
        `<td>${escapeHtml(row.version)}</td>` +
        `<td>${escapeHtml(row.status)}</td>` +
        `<td>${escapeHtml(row.validation)}</td>` +
        `<td>${escapeHtml(row.equivalence)}</td>` +
        `</tr>`,
    )
    .join('');

  return (
    `<section class="trust-panel" aria-labelledby="architecture-table-heading">` +
    `<h2 id="architecture-table-heading">Architecture Versions</h2>` +
    `<table class="trust-table">` +
    `<thead><tr><th>Architecture</th><th>Version</th><th>Status</th><th>Validation</th><th>Equivalence</th></tr></thead>` +
    `<tbody>${rows}</tbody>` +
    `</table>` +
    `</section>`
  );
}

function renderCoverageSummary(coverage) {
  return (
    `<section class="trust-panel" aria-labelledby="coverage-heading">` +
    `<h2 id="coverage-heading">Coverage Summary</h2>` +
    `<ul class="trust-list">` +
    `<li>Knowledge Records: ${escapeHtml(String(coverage.knowledgeRecords ?? '—'))}</li>` +
    `<li>Total entities: ${escapeHtml(String(coverage.entities ?? '—'))}</li>` +
    `<li>Citation Records: ${escapeHtml(String(coverage.citationRecords ?? '—'))}</li>` +
    `<li>Popularity Records: ${escapeHtml(String(coverage.popularityRecords ?? '—'))}</li>` +
    `<li>Average KCI: ${escapeHtml(String(coverage.averageKci ?? '—'))}</li>` +
    `</ul>` +
    `</section>`
  );
}

function renderTrustNav(currentKey) {
  const pages = [
    { key: 'methodology', href: '/about/methodology/', label: 'Sources & Methodology' },
    { key: 'editorial-policy', href: '/about/editorial-policy/', label: 'Editorial Policy' },
    { key: 'architecture', href: '/about/architecture/', label: 'Architecture' },
    { key: 'quality-assurance', href: '/about/quality-assurance/', label: 'Quality Assurance' },
  ];

  return (
    `<nav class="trust-nav" aria-label="Trust and transparency pages">` +
    pages
      .map((page) => {
        if (page.key === currentKey) {
          return `<span aria-current="page">${escapeHtml(page.label)}</span>`;
        }
        return `<a href="${page.href}">${escapeHtml(page.label)}</a>`;
      })
      .join(' · ') +
    `</nav>`
  );
}

function renderMethodologyContent(model) {
  return (
    `<p class="contextual">${escapeHtml(model.summary)}</p>` +
    `<p class="contextual">NameOrigin.io separates editorial knowledge, canonical citations, popularity attribution, and scoring into independent layers. Each layer is built, validated, and frozen before the next layer consumes it. This page explains how those layers work together without exposing internal implementation identifiers.</p>` +
    `<section class="trust-panel"><h2>Knowledge Records</h2><p class="contextual">Structured editorial knowledge across origin, meaning, pronunciation, etymology, and history. Knowledge Records are the editorial source of truth and remain frozen during presentation phases. Editorial QA verifies record consistency before records contribute to scoring or public explainability.</p></section>` +
    `<section class="trust-panel"><h2>Citation Infrastructure</h2><p class="contextual">Editorial source references are normalized to canonical publications through a deterministic registry. Users see publication titles, editions, and organizations — never internal registry identifiers. Citation Records map each editorial entity to sorted, deduplicated publication references.</p></section>` +
    `<section class="trust-panel"><h2>Popularity Infrastructure</h2><p class="contextual">Popularity sources are normalized to canonical authority datasets such as government statistics and national registry publications. Entity popularity records reference these sources without embedding raw authority names on public pages. Regions without registry mappings preserve data but do not contribute popularity attribution until a canonical source exists.</p></section>` +
    `<section class="trust-panel"><h2>Knowledge Completeness Index</h2><p class="contextual">KCI is a deterministic internal score derived from editorial knowledge, citation records, and popularity records. Component scores are exposed on name pages through a read-only presentation layer that does not recalculate scoring. Missing records contribute zero points without error.</p></section>` +
    `<section class="trust-panel"><h2>Deterministic Builds</h2><p class="contextual">Registry builders, record population, KCI activation, and presentation rendering all support deterministic rebuild verification. Identical inputs produce identical outputs, and equivalence audits confirm that frozen artifacts remain unchanged when presentation layers are extended.</p></section>` +
    `<section class="trust-panel"><h2>How to read name pages</h2><p class="contextual">Each name page includes a Knowledge Completeness section summarizing editorial coverage, cited publications, and popularity availability. Publication references use a shared formatter that displays title, edition when available, and publishing organization. Browse <a href="/names/">all names</a> or review our <a href="/about/quality-assurance/">quality assurance</a> results for current validation status.</p></section>`
  );
}

function renderEditorialPolicyContent(model) {
  return (
    `<p class="contextual">${escapeHtml(model.summary)}</p>` +
    `<p class="contextual">NameOrigin.io treats editorial quality as an architectural concern, not an afterthought. Records are validated before they influence scoring or public presentation. This policy describes the principles that govern editorial work and the boundaries that protect frozen data during trust and presentation phases.</p>` +
    `<section class="trust-panel"><h2>Editorial Principles</h2><ul class="trust-list"><li>Research-backed entries from established references.</li><li>Disclosed-unknown states when data is unavailable.</li><li>No AI-generated meanings presented as verified fact.</li><li>Deterministic editorial QA before publication.</li><li>Explicit architectural milestones for any editorial expansion.</li></ul></section>` +
    `<section class="trust-panel"><h2>Confidence Methodology</h2><p class="contextual">Confidence reflects verified editorial coverage and supporting citations. KCI component scores summarize completeness without replacing editorial judgment. A high completeness score indicates structured coverage exists; it does not guarantee universal agreement on contested etymologies.</p></section>` +
    `<section class="trust-panel"><h2>Citation Philosophy</h2><p class="contextual">Citations map editorial claims to canonical publications. Multiple reference variants collapse to a single deterministic publication identity. Public pages show publication titles and organizations through a shared citation renderer used across the site.</p></section>` +
    `<section class="trust-panel"><h2>Popularity Methodology</h2><p class="contextual">Popularity information is shown only when a canonical source is registered and attributed. Unresolved regional data does not produce popularity points or public source claims until an authoritative registry entry exists.</p></section>` +
    `<section class="trust-panel"><h2>Data Preservation</h2><p class="contextual">Presentation and trust phases never modify Knowledge Records, Citation Records, Popularity Records, or KCI weights. Updates occur through explicit architectural milestones documented in the <a href="/about/architecture/">architecture</a> page.</p></section>` +
    `<section class="trust-panel"><h2>Future Updates</h2><p class="contextual">New editorial batches follow the established pattern: expand records, run QA, validate equivalence, then expose results through presentation layers. See <a href="/about/methodology/">sources and methodology</a> for the full pipeline description.</p></section>` +
    `<section class="trust-panel"><h2>Operator</h2><p class="contextual">NameOrigin.io is operated by Albor Digital LLC. Editorial and engineering decisions prioritize deterministic reproducibility so that public claims about data quality can be verified against internal audit artifacts rather than informal release notes.</p></section>`
  );
}

function renderArchitectureContent(model) {
  const milestoneSummaries = (model.architectureMilestones || [])
    .map(
      (row) =>
        `<li><strong>${escapeHtml(row.name)} (${escapeHtml(row.version)})</strong> — ${escapeHtml(row.purpose)} Status: ${escapeHtml(row.status)}.</li>`,
    )
    .join('');

  return (
    `<p class="contextual">${escapeHtml(model.summary)}</p>` +
    `<p class="contextual">The platform architecture follows a strict layering model. Each milestone completes with validation, equivalence, and audit artifacts before the next milestone begins. This prevents presentation work from silently modifying editorial or scoring data.</p>` +
    renderArchitectureTable(model.architectureMilestones) +
    `<section class="trust-panel"><h2>Milestone Summaries</h2><ul class="trust-list">${milestoneSummaries}</ul></section>` +
    `<section class="trust-panel"><h2>Layering Model</h2><ol class="trust-list"><li>Knowledge — editorial source of truth</li><li>Citation — canonical publication attribution</li><li>Popularity — normalized source attribution</li><li>KCI — deterministic scoring engine</li><li>Presentation — read-only user exposure</li><li>Trust — transparency and methodology pages</li></ol></section>` +
    `<section class="trust-panel"><h2>Compatibility</h2><p class="contextual">Frozen layers remain readable by all higher layers but are never mutated by them. Citation Infrastructure and Popularity Infrastructure were completed before their respective population phases, mirroring the Knowledge Record pattern established earlier in the project.</p></section>` +
    `<section class="trust-panel"><h2>Version Presentation</h2><p class="contextual">Every architecture milestone displays a version label, frozen status, and PASS validation and equivalence badges where applicable. These values are derived from audit artifacts rather than hand-maintained page copy. Review the <a href="/about/quality-assurance/">quality assurance</a> page for the latest validation summary.</p></section>`
  );
}

function renderQualityAssuranceContent(model) {
  const auditList = (model.auditsAvailable || [])
    .map((row) => `<li><code>${escapeHtml(row.path)}</code></li>`)
    .join('');

  return (
    `<p class="contextual">${escapeHtml(model.summary)}</p>` +
    `<p class="contextual">Quality assurance on NameOrigin.io is automated and reproducible. Validation scripts verify schema compliance, deterministic rebuild, and reference integrity. Equivalence scripts confirm that frozen artifacts remain unchanged when presentation layers are extended.</p>` +
    renderValidationPanel(model.validation) +
    renderCoverageSummary(model.coverage) +
    `<section class="trust-panel"><h2>Deterministic Rebuild</h2><p class="contextual">Registry builders, record population scripts, and page generators support deterministic rebuild verification. Running the same build twice with identical inputs must produce byte-identical outputs for frozen artifacts. This prevents silent drift between editorial releases and public pages.</p></section>` +
    `<section class="trust-panel"><h2>Equivalence Verification</h2><p class="contextual">Equivalence audits hash frozen Knowledge Records, Citation Records, Popularity Records, and KCI outputs before and after presentation changes. A PASS result confirms that trust and explainability work did not alter editorial or scoring data. Presentation semantic hashes may change when HTML formatting improves, but underlying scores and counts must remain identical.</p></section>` +
    `<section class="trust-panel"><h2>Audit Availability</h2><p class="contextual">Internal audit artifacts verify validation, equivalence, and deterministic rebuild across architecture milestones. These artifacts support internal review and the public trust pages linked from the <a href="/about/">about</a> section.</p><ul class="trust-list">${auditList}</ul></section>` +
    `<section class="trust-panel"><h2>Presentation Validation</h2><p class="contextual">KCI presentation validation confirms that all name pages render explainability sections, handle missing citation and popularity data gracefully, and never expose internal registry identifiers. Trust signal validation applies the same rules to methodology and policy pages, including minimum content thresholds and internal link requirements.</p></section>` +
    `<section class="trust-panel"><h2>Editorial QA</h2><p class="contextual">Editorial QA runs against Knowledge Records to detect missing metadata, confidence inconsistencies, and duplicate editorial text clusters. A PASS result indicates zero blocking issues at the time of the last audit run. Editorial QA does not modify records; it reports issues for editorial milestones to resolve.</p></section>` +
    `<section class="trust-panel"><h2>Trust Signal Validation</h2><p class="contextual">Trust pages must expose version metadata, validation badges, and methodology summaries without leaking semantic hashes or internal identifiers. Citation references on name pages and trust pages share one formatter so publication presentation remains consistent site-wide. See <a href="/about/methodology/">sources and methodology</a> for the architectural context behind these checks.</p></section>` +
    `<p class="trust-generated"><time datetime="${escapeHtml(model.generatedAt)}">Last generated: ${escapeHtml(model.generatedAt)}</time></p>`
  );
}

function renderTrustPageBody(model) {
  const nav = renderTrustNav(model.pageKey);
  let content = '';

  switch (model.pageKey) {
    case 'methodology':
      content = renderMethodologyContent(model);
      break;
    case 'editorial-policy':
      content = renderEditorialPolicyContent(model);
      break;
    case 'architecture':
      content = renderArchitectureContent(model);
      break;
    case 'quality-assurance':
      content = renderQualityAssuranceContent(model);
      break;
    default:
      content = `<p class="contextual">${escapeHtml(model.summary || '')}</p>`;
  }

  return nav + content + renderValidationPanel(model.validation);
}

module.exports = {
  renderTrustPageBody,
  renderArchitectureTable,
  renderValidationPanel,
  renderCoverageSummary,
  renderTrustNav,
};
