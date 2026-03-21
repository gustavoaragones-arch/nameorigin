/**
 * Phase 5.5: Build date for last-updated signals (updates every rebuild).
 */
function getBuildDate() {
  const d = new Date();
  return {
    iso: d.toISOString().slice(0, 10),
    display: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
}

module.exports = { getBuildDate };
