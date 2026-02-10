/**
 * Phase 1 — Data source URLs and paths (public / government only).
 * No commercial or SEO name sites.
 */

const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const RAW_DIR = path.join(DATA_DIR, 'raw');

const SOURCES = {
  SSA_USA: {
    name: 'SSA Baby Names (USA)',
    url: 'https://www.ssa.gov/oact/babynames/names.zip',
    country: 'USA',
    rawFile: 'ssa-usa.json',
  },
  STATCAN_CANADA: {
    name: 'Statistics Canada - First names at birth',
    url: 'https://www150.statcan.gc.ca/n1/tbl/csv/17100147-eng.zip',
    country: 'CAN',
    rawFile: 'statcan-canada.json',
  },
  ONS_UK: {
    name: 'ONS Baby Names England and Wales',
    url: null, // Excel datasets; see PHASE-1.md
    country: 'UK',
    rawFile: 'ons-uk.json',
  },
  ABS_AUSTRALIA: {
    name: 'ABS / data.gov.au baby names',
    url: null,
    country: 'AUS',
    rawFile: 'abs-australia.json',
  },
};

module.exports = { ROOT, DATA_DIR, RAW_DIR, SOURCES };
