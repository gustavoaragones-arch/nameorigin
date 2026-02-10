#!/usr/bin/env node
/**
 * Phase 1 — UK ONS baby names (England and Wales).
 * Data is Excel (.xlsx) from ONS; no direct CSV. Options:
 * 1) Download manually from:
 *    https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/babynamesenglandandwalesbabynamesstatisticsgirls
 *    https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/babynamesenglandandwalesbabynamesstatisticsboys
 *    Save as data/raw/ons-girls.xlsx and data/raw/ons-boys.xlsx, then run a parser (e.g. xlsx package).
 * 2) Or use a pre-built open dataset that cites ONS.
 * This script writes an empty raw file so the pipeline doesn't fail; implement xlsx parsing when needed.
 */

const fs = require('fs');
const path = require('path');
const { RAW_DIR, SOURCES } = require('./config.js');

const OUT_PATH = path.join(RAW_DIR, SOURCES.ONS_UK.rawFile);

function run() {
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
  if (!fs.existsSync(OUT_PATH)) {
    fs.writeFileSync(OUT_PATH, '[]', 'utf8');
    console.log('Placeholder:', OUT_PATH, '(add ONS xlsx files and xlsx parser for UK data)');
  } else {
    console.log('UK raw file exists:', OUT_PATH);
  }
}

run();
