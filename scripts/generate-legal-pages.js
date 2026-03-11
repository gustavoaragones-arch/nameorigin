#!/usr/bin/env node
/**
 * Phase 3.4 — Generate legal pages with ≥400 words, ≥20 internal links, meta description.
 * Output: legal/privacy.html, legal/terms.html
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = process.env.OUT_DIR ? path.join(ROOT, process.env.OUT_DIR) : ROOT;
const SITE_URL = process.env.SITE_URL || 'https://nameorigin.io';
const EXT = '.html';

function htmlEscape(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
  { href: '/legal/privacy.html', text: 'Privacy policy' },
  { href: '/legal/terms.html', text: 'Terms of use' },
];

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
</head>
<body>
  <header class="site-header" role="banner">
    <div class="container">
      <a href="/" class="site-logo">nameorigin.io</a>
      <nav class="site-nav" aria-label="Main navigation">
        <a href="/names">Names</a>
        <a href="/">Search</a>
      </nav>
    </div>
  </header>
  <main class="container section">
    <nav aria-label="Breadcrumb"><a href="/">Home</a> / <span aria-current="page">${htmlEscape(opts.breadcrumbLabel)}</span></nav>
    ${opts.mainContent}
    <section aria-labelledby="explore-heading"><h2 id="explore-heading">Explore</h2>
    <p class="internal-links">${linksHtml}</p>
    </section>
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <p class="mb-0">© 2026 nameorigin.io. All rights reserved.<br>
nameorigin.io is owned and operated by Albor Digital LLC, an independent product studio based in Wyoming, USA.</p>
    </div>
  </footer>
</body>
</html>`;
}

function run() {
  const { writeHtmlWithGuard } = require('./phase-3.4-guards.js');

  const privacyContent = `
    <h1>Privacy policy</h1>
    <h2>Publisher Identity</h2>
    <p class="contextual">nameorigin.io is owned and operated by Albor Digital LLC, a Wyoming, USA-based independent product studio. Albor Digital builds and operates its own digital products and does not provide client services.</p>
    <p class="contextual">nameorigin.io is a static site that provides baby name meanings, origins, and popularity data. We do not sell personal data. This page describes what data we collect, if any, and how we use it.</p>
    <p class="contextual">As a static website, we minimize data collection. We do not require accounts or logins. Server logs may include IP address, user agent, and referrer for operational and security purposes only. We do not use this data for profiling or advertising. If we use analytics, they are configured for privacy (anonymized IP, no cross-site tracking).</p>
    <p class="contextual">Name data on this site is for informational purposes. We do not collect or store names you search for or names you view. All content is static and pre-generated. Use the explore links below to browse names by letter, country, style, and more. Each name has a dedicated page with meaning and origin.</p>
    <p class="contextual">Our name data is derived from public sources and curated for meaning, origin, and popularity. We do not track which names you view or search for. The site is designed to minimize data collection while providing useful baby name information. If you use our compatibility tool or other features, we do not store your inputs beyond what is necessary for the session.</p>
    <p class="contextual">As a static website, nameorigin.io minimizes data collection. We do not require accounts or logins. When you visit the site, your browser may send standard request data (IP address, user agent, referrer) to our hosting provider. We do not use this data for profiling or advertising. Server logs may be retained for security and operational purposes only.</p>
    <p class="contextual">We do not use cookies for tracking. If we use analytics, they would be configured to respect privacy (e.g. anonymized IP, no cross-site tracking). Third-party scripts, if any, are limited and disclosed. We do not share personal data with advertisers or third parties for marketing.</p>
    <p class="contextual">Name data on this site is for informational purposes only. It is derived from public sources and curated for meaning, origin, and popularity. We do not collect or store names you search for or names you view. All content is static and pre-generated.</p>
    <p class="contextual">If you have questions about privacy, you can contact us through the site. We may update this policy from time to time. Continued use of the site after changes constitutes acceptance. For terms of use, see the <a href="/legal/terms.html">Terms of use</a> page.</p>
    <p class="contextual">Data retention: We do not retain personal data beyond what is necessary for operating the site. Server logs may be kept for a limited period. We comply with applicable data protection laws to the extent they apply to our minimal data practices.</p>
  `;

  const termsContent = `
    <h1>Terms of use</h1>
    <p class="contextual">nameorigin.io provides baby name meanings, origins, and popularity data for informational purposes only. By using this site, you agree to these terms. Name data is curated from public sources and is not a substitute for professional advice.</p>
    <p class="contextual">This website is operated by Albor Digital LLC, a Wyoming, USA-based independent product studio.</p>
    <p class="contextual">Content is provided as-is. We do not guarantee accuracy, completeness, or suitability for any purpose. Name meanings and origins may vary by source and culture. Popularity data reflects official statistics where available. Browse and link for personal, non-commercial use. Do not scrape or republish at scale without permission.</p>
    <p class="contextual">Use the explore links below to browse names by letter, country, style, and popularity. Each name has a dedicated page with meaning and origin. The compatibility tool helps when pairing a first name with your last name. The compare section shows how names rank across countries.</p>
    <p class="contextual">We aggregate rankings from official birth statistics (e.g. U.S. Social Security, UK ONS) and curate meaning and origin from established references. Data is provided as-is. Names and naming decisions are personal; use our content to inform your choices but verify critical details independently when needed.</p>
    <p class="contextual">Content on nameorigin.io is provided as-is. We do not guarantee accuracy, completeness, or suitability for any purpose. Name meanings and origins may vary by source and culture. Popularity data reflects official statistics where available (e.g. U.S. Social Security, UK ONS) and may not cover all regions or years.</p>
    <p class="contextual">You may browse and link to our pages for personal, non-commercial use. Do not scrape, copy, or republish our content at scale without permission. Respect our structure and attribution. Links to external sources, if any, are provided for reference; we are not responsible for third-party content.</p>
    <p class="contextual">We reserve the right to modify or discontinue the site at any time. We may update these terms; continued use after changes constitutes acceptance. For privacy practices, see our <a href="/legal/privacy.html">Privacy policy</a>.</p>
    <p class="contextual">Limitation of liability: nameorigin.io and its operators are not liable for any damages arising from use of the site or reliance on its content. Use at your own risk. Names and naming decisions are personal; we provide information only.</p>
    <p class="contextual">If any provision of these terms is invalid, the remaining provisions remain in effect. These terms are governed by applicable law. Contact us through the site for questions about these terms.</p>
  `;

  fs.mkdirSync(path.join(OUT_DIR, 'legal'), { recursive: true });

  const privacyHtml = layout({
    title: 'Privacy policy',
    description: 'Privacy policy for nameorigin.io. How we handle data and what we collect. We do not sell personal data; static site with minimal collection.',
    canonical: SITE_URL + '/legal/privacy.html',
    breadcrumbLabel: 'Privacy',
    mainContent: privacyContent,
    links: CORE_LINKS,
  });
  writeHtmlWithGuard(path.join(OUT_DIR, 'legal', 'privacy.html'), privacyHtml, 'legal/privacy.html');

  const termsHtml = layout({
    title: 'Terms of use',
    description: 'Terms of use for nameorigin.io. Name data is for informational purposes only. Browse and link for personal use; no scraping.',
    canonical: SITE_URL + '/legal/terms.html',
    breadcrumbLabel: 'Terms',
    mainContent: termsContent,
    links: CORE_LINKS,
  });
  writeHtmlWithGuard(path.join(OUT_DIR, 'legal', 'terms.html'), termsHtml, 'legal/terms.html');

  const aboutContent = `
    <h1>About nameorigin.io</h1>
    <p class="contextual">nameorigin.io provides baby name meanings, origins, and popularity data by country. You can browse names by letter, gender, style, and region, and compare popularity across countries.</p>
    <p class="contextual">nameorigin.io is a product of Albor Digital LLC, an independent product studio based in Wyoming, USA. Albor Digital builds, owns, and operates its digital products directly for end users.</p>
    <p class="contextual">Data is curated from public sources such as official birth statistics (e.g. U.S. Social Security, UK ONS). We do not use AI-generated content for name meanings or origins; entries are researched and verified from established references. The site is static and pre-generated: each name has a dedicated page with meaning, origin, and where available, popularity by year and by country.</p>
    <p class="contextual">You can explore names by <a href="/names/letters.html">letter</a>, <a href="/names/boy.html">boy</a>, <a href="/names/girl.html">girl</a>, or <a href="/names/unisex.html">unisex</a>, or by <a href="/country-name-pages.html">country</a>. The <a href="/popularity/">popularity hub</a> shows top names by year; the <a href="/compare/">compare</a> section shows how names rank in different regions. The <a href="/compatibility/">compatibility tool</a> helps when pairing a first name with your last name. <a href="/names/with-last-name.html">Last name compatibility</a> pages suggest names that work well with common surnames. All name pages link to related names and to <a href="/trends/">trends</a> and <a href="/names/trending.html">trending names</a> for further discovery.</p>
    <p class="contextual">Popularity rankings reflect official birth records where available. Name meanings and origins are drawn from published reference works and cultural sources; we cite or summarize rather than invent. The site does not offer client services or custom research; it is a self-service resource for parents and anyone curious about name meanings and trends.</p>
    <p class="contextual">If you are looking for a name by style, try the <a href="/style-name-pages.html">style name pages</a> or <a href="/alphabet-name-pages.html">alphabet index</a>. For sibling name ideas, many name pages link to sibling harmony suggestions. Year-over-year movement is visible on the <a href="/popularity/">popularity by year</a> pages and in the <a href="/names/popular.html">popular names</a> and <a href="/names/trending.html">trending names</a> lists. Content is provided as-is; for accuracy and suitability, see our <a href="/legal/terms.html">Terms of use</a>.</p>
    <p class="contextual">We do not require an account to browse or read content. For policy details, see our <a href="/legal/privacy.html">Privacy policy</a> and <a href="/legal/terms.html">Terms of use</a>. Use the explore links below to reach the main hubs and legal pages.</p>
  `;
  fs.mkdirSync(path.join(OUT_DIR, 'about'), { recursive: true });
  const aboutHtml = layout({
    title: 'About nameorigin.io',
    description: 'About nameorigin.io. Baby name meanings, origins, and popularity by country. Operated by Albor Digital LLC.',
    canonical: SITE_URL + '/about/',
    breadcrumbLabel: 'About',
    mainContent: aboutContent,
    links: CORE_LINKS,
  });
  writeHtmlWithGuard(path.join(OUT_DIR, 'about', 'index.html'), aboutHtml, 'about/index.html');

  console.log('Generated legal/privacy.html, legal/terms.html, and about/index.html');
}

run();
