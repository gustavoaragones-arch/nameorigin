#!/usr/bin/env node
/**
 * Phase 4 — Intent Monetization Map.
 * Maps each page type to monetization intent (digital products, reports, email).
 * Output: build/intent-monetization-map.json
 * No ads. Revenue aligns with user intent.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const OUT_PATH = path.join(BUILD_DIR, 'intent-monetization-map.json');

const intentMap = {
  pageTypes: {
    name: {
      description: 'Name detail pages',
      intents: [
        { trigger: 'middle_name_suggestions', product: 'baby_name_planner_tool', cta: '/tools/name-report/' },
        { trigger: 'sibling_harmony', product: 'premium_sibling_report', cta: '/tools/sibling-report/' },
        { trigger: 'origin', product: 'printable_meaning_certificate', cta: '/tools/name-certificate/' },
        { trigger: 'popularity', product: 'trend_pdf', cta: '/tools/name-report/' },
      ],
    },
    country: {
      description: 'Country / origin pages',
      intents: [
        { trigger: 'cultural_guide', product: 'cultural_naming_guide_download', cta: null },
        { trigger: 'traditional_names', product: 'traditional_naming_ebook', cta: null },
      ],
    },
    letter: {
      description: 'Letter filter pages (A–Z)',
      intents: [
        { trigger: 'browse_by_letter', product: 'printable_az_name_workbook', cta: null },
      ],
    },
    compare: {
      description: 'Compare (name across countries)',
      intents: [
        { trigger: 'compatibility', product: 'full_compatibility_report_premium', cta: null },
      ],
    },
    sibling: {
      description: 'Sibling harmony pages',
      intents: [
        { trigger: 'harmony_matrix', product: 'full_sibling_compatibility_report', cta: '/tools/sibling-report/' },
      ],
    },
  },
  products: {
    baby_name_planner_tool: { type: 'tool', landing: '/tools/name-report/' },
    premium_sibling_report: { type: 'report', landing: '/tools/sibling-report/' },
    printable_meaning_certificate: { type: 'download', landing: '/tools/name-certificate/' },
    trend_pdf: { type: 'download', landing: '/tools/name-report/' },
    cultural_naming_guide_download: { type: 'download', landing: null },
    traditional_naming_ebook: { type: 'ebook', landing: null },
    printable_az_name_workbook: { type: 'download', landing: null },
    full_compatibility_report_premium: { type: 'report', landing: null },
    full_sibling_compatibility_report: { type: 'report', landing: '/tools/sibling-report/' },
  },
  timestamp: new Date().toISOString(),
};

function run() {
  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(intentMap, null, 2), 'utf8');
  console.log('Wrote', OUT_PATH);
}

run();
