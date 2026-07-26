#!/usr/bin/env node
/**
 * Phase 12A — Generate trust and transparency pages.
 */

const fs = require('fs');
const path = require('path');
const { mergeArticleSchema } = require('./aeo-article-schema.js');
const { createTrustSignalsContext, buildTrustPageModel } = require('../lib/presentation/trust-signals.js');
const { renderTrustPageBody } = require('../lib/presentation/trust-signals-html.js');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';

const TRUST_PAGES = [
  { key: 'methodology', slug: 'methodology', title: 'Sources & Methodology' },
  { key: 'editorial-policy', slug: 'editorial-policy', title: 'Editorial Policy' },
  { key: 'architecture', slug: 'architecture', title: 'Architecture' },
  { key: 'quality-assurance', slug: 'quality-assurance', title: 'Quality Assurance' },
];

const CORE_LINKS = [
  { href: '/', text: 'Home' },
  { href: '/names', text: 'All names' },
  { href: '/names/boy' + EXT, text: 'Boy names' },
  { href: '/names/girl' + EXT, text: 'Girl names' },
  { href: '/names/unisex' + EXT, text: 'Unisex names' },
  { href: '/all-name-pages.html', text: 'All name pages' },
  { href: '/country-name-pages.html', text: 'Country name pages' },
  { href: '/style-name-pages.html', text: 'Style name pages' },
  { href: '/alphabet-name-pages.html', text: 'Alphabet name pages' },
  { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
  { href: '/popularity/', text: 'Popularity by year' },
  { href: '/compare/', text: 'Compare by country' },
  { href: '/trends/', text: 'Name trends' },
  { href: '/compatibility/', text: 'Compatibility tool' },
  { href: '/names/trending' + EXT, text: 'Trending names' },
  { href: '/names/popular' + EXT, text: 'Popular names' },
  { href: '/names/letters' + EXT, text: 'Browse by letter' },
  { href: '/about/', text: 'About' },
  { href: '/about/methodology/', text: 'Sources & Methodology' },
  { href: '/about/editorial-policy/', text: 'Editorial Policy' },
  { href: '/about/architecture/', text: 'Architecture' },
  { href: '/about/quality-assurance/', text: 'Quality Assurance' },
  { href: '/legal/privacy.html', text: 'Privacy policy' },
  { href: '/legal/terms.html', text: 'Terms of use' },
];

function htmlEscape(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function layout(opts) {
  const linksHtml = opts.links.map((l) => `<a href="${htmlEscape(l.href)}">${htmlEscape(l.text)}</a>`).join(' · ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta name="description" content="${htmlEscape(opts.description)}">
  <title>${htmlEscape(opts.title)} | nameorigin.io</title>
  <link rel="canonical" href="${htmlEscape(opts.canonical)}">
  <link rel="stylesheet" href="/styles.min.css">
  <script type="application/ld+json">${JSON.stringify(mergeArticleSchema())}</script>
</head>
<body>
  <header class="site-header" role="banner">
    <div class="container">
      <a href="/" class="site-logo">nameorigin.io</a>
      <nav class="site-nav" aria-label="Main navigation">
        <button class="mobile-menu-toggle" aria-label="Open menu">☰</button>
        <div class="nav-inner">
          <a href="/names">Names</a>
          <a href="/about/">About</a>
        </div>
      </nav>
    </div>
  </header>
  <main class="container section trust-page">
    <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/about/">About</a> / <span aria-current="page">${htmlEscape(opts.breadcrumbLabel)}</span></nav>
    <h1>${htmlEscape(opts.heading)}</h1>
    ${opts.mainContent}
    <section aria-labelledby="explore-heading"><h2 id="explore-heading">Explore</h2>
    <p class="internal-links">${linksHtml}</p>
    </section>
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <div class="footer__bottom">
        <p class="mb-0">© 2026 nameorigin.io. All rights reserved.<br>
nameorigin.io is owned and operated by Albor Digital LLC, an independent product studio based in Wyoming, USA.</p>
        <p>Contact: <a href="mailto:contact@nameorigin.io">contact@nameorigin.io</a></p>
        <p><a href="/sitemap/">Sitemap</a></p>
      </div>
    </div>
  </footer>
  <script src="/assets/js/navigation.js" defer></script>
</body>
</html>`;
}

function run() {
  const { writeHtmlWithGuard } = require('./phase-3.4-guards.js');
  const ctx = createTrustSignalsContext();

  for (const page of TRUST_PAGES) {
    const model = buildTrustPageModel(page.key, ctx);
    const body = renderTrustPageBody(model);
    const outDir = path.join(OUT_DIR, 'about', page.slug);
    fs.mkdirSync(outDir, { recursive: true });
    const html = layout({
      title: page.title,
      heading: page.title,
      description: `${page.title} for nameorigin.io. Transparency into editorial methodology, architecture versions, and quality assurance.`,
      canonical: `${SITE_URL}/about/${page.slug}/`,
      breadcrumbLabel: page.title,
      mainContent: body,
      links: CORE_LINKS,
    });
    writeHtmlWithGuard(path.join(outDir, 'index.html'), html, `about/${page.slug}/index.html`);
  }

  console.log('Generated trust pages:', TRUST_PAGES.map((p) => `/about/${p.slug}/`).join(', '));
}

run();
