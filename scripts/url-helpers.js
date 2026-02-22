/**
 * Normalized URL helpers for internal links. Ensures consistent format (e.g. trailing slash).
 */

/** Names-like page URL: /names-like/<slug>/ (always trailing slash). */
function namesLikeUrl(slug) {
  const s = String(slug || '').trim();
  return s ? `/names-like/${s}/` : '/names-like/';
}

module.exports = { namesLikeUrl };
