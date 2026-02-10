/**
 * nameorigin.io — geo.js
 * Trending Near You: getCountryFromLocale, initTrending.
 * Depends on: window.nameorigin (core, accordion for buildNameCard).
 */
(function () {
  'use strict';
  if (!window.nameorigin) return;
  var nameorigin = window.nameorigin;
  nameorigin.getCountryFromLocale = function () {
    var lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : '';
    var parts = (lang || 'en').split('-');
    var region = parts[1] ? parts[1].toUpperCase() : (parts[0] || 'US').toUpperCase();
    var langCode = (parts[0] || 'en').toLowerCase();
    if (region === 'CA' || (langCode === 'fr' && region === 'CA')) return 'Canada';
    if (region === 'GB' || region === 'UK') return 'UK';
    if (region === 'IN') return 'India';
    if (region === 'US' || region === '') return 'USA';
    return 'USA';
  };
  nameorigin.TRENDING_COUNTRY_LABELS = { USA: 'USA', Canada: 'Canada', UK: 'UK', India: 'India' };
})();
