#!/usr/bin/env node
/**
 * Step 2 — Raw data pipeline: Wikidata given names.
 * Queries Wikidata Query Service (SPARQL) for given-name items (Q202444),
 * fetches label and optional description/meaning. Outputs normalized JSON to raw-data/wikidata/.
 * No scraping; public API only.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const RAW_WIKI = path.join(ROOT, 'raw-data', 'wikidata');
const NORMALIZED_PATH = path.join(RAW_WIKI, 'normalized.json');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const QUERY = `
SELECT ?item ?itemLabel ?itemDescription WHERE {
  ?item wdt:P31 wd:Q202444.
  FILTER(LANG(?itemLabel) = "en")
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 5000
`;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fetchSparql(query) {
  return new Promise((resolve, reject) => {
    const u = new URL(SPARQL_ENDPOINT);
    const body = new URLSearchParams({ query, format: 'json' }).toString();
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          Accept: 'application/sparql-results+json',
          'User-Agent': 'nameorigin/1.0',
        },
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${buf.slice(0, 200)}`));
          try {
            resolve(JSON.parse(buf));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  ensureDir(RAW_WIKI);

  console.log('Querying Wikidata for given names...');
  let data;
  try {
    data = await fetchSparql(QUERY);
  } catch (e) {
    console.error(e.message);
    console.error('Writing empty normalized.json. Re-run when network is available.');
    fs.writeFileSync(NORMALIZED_PATH, '[]', 'utf8');
    process.exit(1);
  }

  const bindings = data.results && data.results.bindings ? data.results.bindings : [];
  const rows = [];
  for (const b of bindings) {
    const id = b.item && b.item.value ? b.item.value.replace(/.*\//, '') : null;
    const name = b.itemLabel && b.itemLabel.value ? b.itemLabel.value.trim() : null;
    const description = b.itemDescription && b.itemDescription.value ? b.itemDescription.value.trim() : null;
    if (!name) continue;
    rows.push({
      wikidata_id: id,
      name,
      meaning: description || null,
      language: null,
      origin: null,
    });
  }

  fs.writeFileSync(NORMALIZED_PATH, JSON.stringify(rows, null, 0), 'utf8');
  console.log('Wrote', rows.length, 'rows to', NORMALIZED_PATH);
}

main().catch((err) => { console.error(err); process.exit(1); });
