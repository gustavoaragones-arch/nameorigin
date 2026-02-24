#!/usr/bin/env node
/**
 * Phase 4 — Tool landing pages (conversion, no popups).
 * Output: tools/name-report/index.html, tools/sibling-report/index.html, tools/name-certificate/index.html
 * STEP 8: Word count ≥ 800, ≥ 15 internal links. No intrusive JS. No blocking scripts.
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const TOOL_LINKS = [
  { href: '/', text: 'Home' },
  { href: '/names', text: 'Baby names hub' },
  { href: '/names/boy' + EXT, text: 'Boy names' },
  { href: '/names/girl' + EXT, text: 'Girl names' },
  { href: '/names/unisex' + EXT, text: 'Unisex names' },
  { href: '/names/letters' + EXT, text: 'Browse by letter' },
  { href: '/names/style' + EXT, text: 'Names by style' },
  { href: '/names/with-last-name' + EXT, text: 'Last name compatibility' },
  { href: '/names/trending' + EXT, text: 'Trending names' },
  { href: '/names/popular' + EXT, text: 'Popular names' },
  { href: '/compare/', text: 'Compare by country' },
  { href: '/compatibility/', text: 'Compatibility tool' },
  { href: '/tools/name-report/', text: 'Name report' },
  { href: '/tools/sibling-report/', text: 'Sibling report' },
  { href: '/tools/name-certificate/', text: 'Name certificate' },
];

function toolLayout(opts) {
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
        <a href="/names/boy${EXT}">Boy Names</a>
        <a href="/names/girl${EXT}">Girl Names</a>
        <a href="/names/letters${EXT}">By letter</a>
        <a href="/names/with-last-name${EXT}">Last name fit</a>
      </nav>
    </div>
  </header>
  <main class="container section">
    <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/names">Names</a> / <span aria-current="page">${htmlEscape(opts.breadcrumbLabel)}</span></nav>
    ${opts.mainContent}
    <section aria-labelledby="explore-heading"><h2 id="explore-heading">Explore</h2>
    <p class="internal-links">${linksHtml}</p>
    </section>
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <p class="mb-0"><a href="/">nameorigin.io</a> — Curated name meanings and origins.</p>
    </div>
  </footer>
</body>
</html>`;
}

function countWords(html) {
  const text = (html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function countInternalLinks(html) {
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let n = 0;
  let m;
  while ((m = re.exec(html))) {
    const h = (m[1] || '').trim();
    if (h.startsWith('/') || h.includes('nameorigin.io')) n++;
  }
  return n;
}

function run() {
  const toolsDir = path.join(OUT_DIR, 'tools');
  ensureDir(toolsDir);

  // --- Name Report ---
  const nameReportDir = path.join(toolsDir, 'name-report');
  ensureDir(nameReportDir);
  const nameReportContent = `
    <h1>Personalized Name Report</h1>
    <p class="contextual">Get a single, printable report that combines everything you need for one name: meaning and origin, popularity over time, sibling harmony ideas, and middle name pairings. No ads, no clutter—just one document you can save or print for your baby name planning.</p>
    <p class="contextual">Our name report pulls from the same curated data that powers nameorigin.io: linguistic and historical sources for meaning and origin, official birth statistics for popularity, and phonetic and style matching for sibling and middle name suggestions. You get a clear summary without clicking through multiple pages.</p>
    <h2 id="what-you-get">What you get</h2>
    <ul>
      <li>Full origin breakdown—language, region, and cultural context</li>
      <li>Popularity trajectory—rank by year and country where available</li>
      <li>Sibling harmony matrix—names that pair well phonetically and stylistically</li>
      <li>Middle name pairing grid—short complementary options with rhythm balance</li>
      <li>One PDF-ready layout—save or print for your records</li>
    </ul>
    <div class="screenshot-placeholder" aria-hidden="true" style="min-height:200px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;margin:1.5rem 0;"></div>
    <p><a href="/tools/name-report/" class="cta-button">Generate My Report</a></p>
    <section class="quick-faq" aria-labelledby="tool-faq-heading">
      <h2 id="tool-faq-heading">Frequently asked questions</h2>
      <h3>How do I generate a name report?</h3>
      <p>Start from any name page on nameorigin.io and click “Generate Full Name Report,” or use the button above. You will be guided to enter the name and receive a single report combining origin, popularity, sibling ideas, and middle name options.</p>
      <h3>Is the report free?</h3>
      <p>Name report options may include a free summary or a full printable report. Check the tool page for current offerings. We do not show display ads; revenue supports the site through optional paid reports and tools.</p>
      <h3>Can I get reports for multiple names?</h3>
      <p>Yes. You can generate a report for each name you are considering. Use the baby names hub to browse names by gender, letter, or country, then open a name’s page and use the report link from there.</p>
    </section>
    <p class="contextual">Choosing a baby name is a big decision. Many parents want to combine meaning, family heritage, and sound. A name report brings together origin, popularity trends, and pairing ideas in one place. You can compare names side by side using our <a href="/compare/">compare by country</a> feature, or explore <a href="/names/with-last-name${EXT}">last name compatibility</a> to see how first names sound with your surname. The <a href="/compatibility/">compatibility tool</a> helps with phonetic fit. All name pages on nameorigin.io link to meaning, origin, and popularity; the report is an optional way to get a consolidated view for one name.</p>
    <p class="contextual">We source meaning and origin from established linguistic and historical references. Popularity data comes from official birth statistics where available (e.g. U.S. Social Security, UK ONS). Sibling and middle name suggestions use the same style and phonetic logic as the rest of the site. No algorithm replaces your taste—we just organize the data so you can decide.</p>
    <p class="contextual">If you prefer to browse without a report, use the <a href="/names">names hub</a> to filter by <a href="/names/boy${EXT}">boy</a>, <a href="/names/girl${EXT}">girl</a>, or <a href="/names/unisex${EXT}">unisex</a>, or by <a href="/names/letters${EXT}">letter</a> and <a href="/names/style${EXT}">style</a>. Each name has a dedicated page with meaning, origin, and related names. The report is for parents who want one document to keep or share.</p>
    <p class="contextual">Baby name planning often involves comparing several names before you settle on one. A single report lets you print or save the full picture for one name—meaning, origin, popularity trend, and pairing ideas—so you can share it with a partner or keep it in a folder. Some parents use reports at baby showers or as part of a birth announcement. Others simply want a clean reference without clicking through multiple tabs. The report does not include ads or third-party content; it is generated from the same curated data that powers every name page on nameorigin.io.</p>
    <p class="contextual">Origin breakdown in the report includes the language or region where the name became established, and where possible a short note on cultural or historical context. Popularity trajectory shows rank over time so you can see whether the name is rising, stable, or declining in use. Sibling harmony and middle name sections use our compatibility logic: phonetic flow, syllable balance, and style cluster so suggested names pair well with the name you chose. You can use the report as a starting point and then explore any of the suggested names on the site for their full profile.</p>
    <p class="contextual">We do not require an account to browse names or to read meaning and origin on the site. The name report is an optional product for users who want a consolidated, printable document. Revenue from reports helps support the site and keeps the main name pages free and ad-free. If you have questions about how the report is generated or what data it includes, the content on this page and on individual name pages provides the full picture. Use the explore links below to return to the names hub, letter index, or compatibility tools.</p>
  `;
  const nameReportHtml = toolLayout({
    title: 'Personalized Name Report',
    description: 'Generate a single report with meaning, origin, popularity, sibling ideas, and middle name pairings for any baby name. Printable, no ads.',
    canonical: SITE_URL + '/tools/name-report/',
    breadcrumbLabel: 'Name report',
    mainContent: nameReportContent,
    links: TOOL_LINKS,
  });
  const nameReportWords = countWords(nameReportHtml);
  const nameReportLinks = countInternalLinks(nameReportHtml);
  if (nameReportWords < 800) throw new Error(`Phase 4 STEP 8: tools/name-report has ${nameReportWords} words (min 800).`);
  if (nameReportLinks < 15) throw new Error(`Phase 4 STEP 8: tools/name-report has ${nameReportLinks} internal links (min 15).`);
  fs.writeFileSync(path.join(nameReportDir, 'index.html'), nameReportHtml, 'utf8');
  console.log('Wrote tools/name-report/index.html (words:', nameReportWords, ', links:', nameReportLinks, ')');

  // --- Sibling Report ---
  const siblingReportDir = path.join(toolsDir, 'sibling-report');
  ensureDir(siblingReportDir);
  const siblingReportContent = `
    <h1>Full Sibling Compatibility Report</h1>
    <p class="contextual">Get a detailed sibling compatibility report: a 50-name compatibility matrix, style compatibility scoring, phonetic match index, and cultural alignment analysis. See which names pair best with your chosen first name for siblings.</p>
    <p class="contextual">Sibling names that sound and feel cohesive are easier to say and remember. Our report uses the same harmony logic as the sibling pages on nameorigin.io—phonetic flow, syllable balance, and style fit—and expands it into a full matrix with scores and short explanations.</p>
    <h2 id="what-you-get-sibling">What you get</h2>
    <ul>
      <li>50-name compatibility matrix—scores for each name pair</li>
      <li>Style compatibility scoring—classic, modern, and thematic fit</li>
      <li>Phonetic match index—how well names flow together</li>
      <li>Cultural alignment analysis—origin and tradition consistency</li>
      <li>Printable or saveable format—one document for your planning</li>
    </ul>
    <div class="screenshot-placeholder" aria-hidden="true" style="min-height:200px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;margin:1.5rem 0;"></div>
    <p><a href="/tools/sibling-report/" class="cta-button">Get the Full Sibling Compatibility Report</a></p>
    <section class="quick-faq" aria-labelledby="sibling-faq-heading">
      <h2 id="sibling-faq-heading">Frequently asked questions</h2>
      <h3>What is the sibling compatibility report?</h3>
      <p>The report expands the sibling harmony suggestions you see on name pages into a full 50-name matrix. Each name is scored for how well it pairs with your chosen name—phonetically, stylistically, and by cultural alignment. You get one document with all scores and brief explanations.</p>
      <h3>How is compatibility scored?</h3>
      <p>We use syllable balance, ending and starting sounds, and style cluster (e.g. classic, modern, nature). Names that avoid tongue-twisters and share a similar “feel” score higher. The report explains the main factors for each pairing.</p>
      <h3>Can I use this for more than two siblings?</h3>
      <p>The matrix focuses on pairing with one chosen name. For multiple siblings, you can generate a report for each anchor name or use the matrix to compare how different options pair with your first choice. Browse <a href="/names">names by gender and letter</a> to find candidates, then use the report to compare.</p>
    </section>
    <p class="contextual">Many parents want sibling names that sound good together without being too matchy. Our <a href="/names">sibling harmony pages</a> on nameorigin.io already suggest names that pair well with a given name; the full report adds a 50-name matrix, style scoring, and phonetic index so you can see the full picture. You can still browse <a href="/names/boy${EXT}">boy</a>, <a href="/names/girl${EXT}">girl</a>, and <a href="/names/unisex${EXT}">unisex</a> names by <a href="/names/letters${EXT}">letter</a> and <a href="/names/style${EXT}">style</a> for free. The report is an optional upgrade for parents who want the full compatibility analysis in one place.</p>
    <p class="contextual">Phonetic fit matters when you say both names together. Names that end in a vowel often pair well with names that start with a consonant, and vice versa. Syllable count also affects rhythm. The report captures these factors and adds style and cultural alignment so you can choose names that feel cohesive. We do not replace your judgment—we organize the data.</p>
    <p class="contextual">If you are also considering middle names, see the <a href="/tools/name-report/">name report</a> for middle name pairing ideas. For last name fit, use <a href="/names/with-last-name${EXT}">last name compatibility</a> and the <a href="/compatibility/">compatibility tool</a>. All tools use the same curated name data: meaning, origin, and popularity from nameorigin.io.</p>
    <p class="contextual">The 50-name matrix in the full report expands the top 12 you see on each sibling page. Every name in the matrix is scored for compatibility with your chosen anchor name. Style compatibility scoring reflects whether names share a category—classic, modern, nature-inspired, and so on—so you can avoid pairing a very classic name with a very modern one if you prefer cohesion. The phonetic match index summarizes how well the sounds of the two names flow together when said aloud. Cultural alignment indicates whether names share an origin or linguistic tradition, which many parents value when naming multiple children.</p>
    <p class="contextual">You can use the free sibling harmony pages to get a first shortlist, then order the full report if you want to explore more options without clicking through dozens of name pages. The report is one document you can save or print. We do not use display ads on nameorigin.io; optional reports and tools support the site. Use the explore links below to return to the names hub, letter index, or other tools.</p>
    <p class="contextual">Scoring is consistent across the site: the same two names always receive the same compatibility score. The full report simply extends the list from 12 names to 50 so you can see a wider range of options ranked by the same criteria. Parents who are deciding between several first names can generate a report for each and compare which name has the strongest set of sibling options. No account is required to use the free sibling pages; the full report is an optional upgrade for deeper analysis and planning.</p>
  `;
  const siblingReportHtml = toolLayout({
    title: 'Full Sibling Compatibility Report',
    description: 'Get a 50-name sibling compatibility matrix with style scoring, phonetic index, and cultural alignment. One report for your sibling name planning.',
    canonical: SITE_URL + '/tools/sibling-report/',
    breadcrumbLabel: 'Sibling report',
    mainContent: siblingReportContent,
    links: TOOL_LINKS,
  });
  const siblingReportWords = countWords(siblingReportHtml);
  const siblingReportLinks = countInternalLinks(siblingReportHtml);
  if (siblingReportWords < 800) throw new Error(`Phase 4 STEP 8: tools/sibling-report has ${siblingReportWords} words (min 800).`);
  if (siblingReportLinks < 15) throw new Error(`Phase 4 STEP 8: tools/sibling-report has ${siblingReportLinks} internal links (min 15).`);
  fs.writeFileSync(path.join(siblingReportDir, 'index.html'), siblingReportHtml, 'utf8');
  console.log('Wrote tools/sibling-report/index.html (words:', siblingReportWords, ', links:', siblingReportLinks, ')');

  // --- Name Certificate ---
  const nameCertDir = path.join(toolsDir, 'name-certificate');
  ensureDir(nameCertDir);
  const nameCertContent = `
    <h1>Printable Name Meaning Certificate</h1>
    <p class="contextual">Download a printable name meaning certificate for any name. The certificate includes the name’s meaning, origin, and a clean layout suitable for framing or gifting. Perfect for baby showers, birth announcements, or keepsakes.</p>
    <p class="contextual">Many parents and grandparents want a tangible record of their chosen name’s meaning and origin. Our certificate uses the same curated data as nameorigin.io: linguistic and historical sources for meaning, and region or language for origin. You get a single, printable page—no ads, no clutter.</p>
    <h2 id="what-you-get-cert">What you get</h2>
    <ul>
      <li>One-page certificate with the name and its meaning</li>
      <li>Origin and language or region noted</li>
      <li>Print-ready layout—suitable for framing</li>
      <li>No account required to preview—optional download or purchase</li>
      <li>Same data as the name pages on nameorigin.io</li>
    </ul>
    <div class="screenshot-placeholder" aria-hidden="true" style="min-height:180px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;margin:1.5rem 0;"></div>
    <p><a href="/tools/name-certificate/" class="cta-button">Create Name Certificate</a></p>
    <section class="quick-faq" aria-labelledby="cert-faq-heading">
      <h2 id="cert-faq-heading">Frequently asked questions</h2>
      <h3>What is on the name certificate?</h3>
      <p>The certificate shows the name, its meaning, and origin (language or region). The layout is designed for printing and framing. Data comes from the same sources we use across nameorigin.io for meaning and origin.</p>
      <h3>Can I get a certificate for any name?</h3>
      <p>Certificates are available for names in our database. Browse <a href="/names">names</a> by <a href="/names/boy${EXT}">boy</a>, <a href="/names/girl${EXT}">girl</a>, or <a href="/names/letters${EXT}">letter</a> to find your name, then use the “Download a printable name meaning certificate” link on the name page, or start from this tool page.</p>
      <h3>Is the certificate free?</h3>
      <p>Options may include a free preview or a paid printable download. Check this page for current offerings. We do not use display ads; optional paid products like the certificate support the site.</p>
    </section>
    <p class="contextual">Name certificates are a popular way to celebrate a new baby or to honor a name’s heritage. You can browse all names on nameorigin.io by <a href="/names">hub</a>, <a href="/names/trending${EXT}">trending</a>, <a href="/names/popular${EXT}">popular</a>, or <a href="/names/style${EXT}">style</a>. Each name page includes a link to create a certificate for that name. The certificate is a standalone product; the rest of the site remains free to use for meaning, origin, and popularity.</p>
    <p class="contextual">We source meanings from established linguistic and historical references. Origin may refer to the language or region where the name became established. The certificate does not add new data—it presents the same information in a print-ready format. For more tools, see the <a href="/tools/name-report/">name report</a> (origin, popularity, sibling and middle name ideas) and <a href="/tools/sibling-report/">sibling compatibility report</a>. For last name fit, use <a href="/names/with-last-name${EXT}">last name compatibility</a> and the <a href="/compatibility/">compatibility tool</a>.</p>
    <p class="contextual">Whether you are planning a baby name or looking for a gift for new parents, a name meaning certificate is a simple way to capture the meaning and origin of a name in one place. Explore <a href="/compare/">compare by country</a> to see how names rank in different regions, or <a href="/names/letters${EXT}">browse by letter</a> to discover more names. All name pages on nameorigin.io link to this certificate option so you can go from reading about a name to ordering or downloading a certificate in one click.</p>
    <p class="contextual">The certificate layout is designed for standard paper sizes so you can print at home or use a print service. No account is required to browse names or to read meaning and origin on the site; the certificate is an optional product for users who want a keepsake. Revenue from certificates and other tools helps keep the main site free and ad-free. We do not sell or share email addresses; any signup for updates is separate and optional. If you have questions about what appears on the certificate or how to order, the information on this page and on individual name pages covers the data we use. Use the explore links below to return to the names hub or other tools.</p>
    <p class="contextual">Many parents and grandparents frame a name meaning certificate for the nursery or give it as a baby shower gift. The design is clean and readable, with the name, meaning, and origin clearly stated. You can create a certificate for any name in our database—search or browse by letter, gender, or country to find the name, then follow the link from the name page or from this tool page. The same data appears on the name’s full profile; the certificate is simply a print-optimized version for those who want a physical record.</p>
    <p class="contextual">We do not collect or store the names you search for when you browse the site. Certificate generation uses the same public data as the rest of nameorigin.io. If you have a name in mind, start from the <a href="/names">names hub</a> or use the <a href="/names/letters${EXT}">letter index</a> to find it. Each name page has a direct link to create a certificate for that name. The explore links below take you back to the main name lists and tools.</p>
  `;
  const nameCertHtml = toolLayout({
    title: 'Printable Name Meaning Certificate',
    description: 'Download a printable certificate with your chosen name’s meaning and origin. Print-ready, one page, no ads.',
    canonical: SITE_URL + '/tools/name-certificate/',
    breadcrumbLabel: 'Name certificate',
    mainContent: nameCertContent,
    links: TOOL_LINKS,
  });
  const nameCertWords = countWords(nameCertHtml);
  const nameCertLinks = countInternalLinks(nameCertHtml);
  if (nameCertWords < 800) throw new Error(`Phase 4 STEP 8: tools/name-certificate has ${nameCertWords} words (min 800).`);
  if (nameCertLinks < 15) throw new Error(`Phase 4 STEP 8: tools/name-certificate has ${nameCertLinks} internal links (min 15).`);
  fs.writeFileSync(path.join(nameCertDir, 'index.html'), nameCertHtml, 'utf8');
  console.log('Wrote tools/name-certificate/index.html (words:', nameCertWords, ', links:', nameCertLinks, ')');

  console.log('Phase 4 tool pages complete.');
}

run();
