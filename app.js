/**
 * nameorigin.io — Vanilla JS
 * Form handling, client-side name lookup, FAQ accordion.
 * No frameworks. Minimal DOM.
 */

(function () {
  'use strict';

  var RESULTS_SECTION = document.getElementById('results-section');
  var RESULT_CARD = document.getElementById('result-card');
  var RESULT_NAME = document.getElementById('result-name');
  var RESULT_META = document.getElementById('result-meta');
  var RESULT_MEANING = document.getElementById('result-meaning');
  var RESULT_LINKS = document.getElementById('result-links');
  var NAME_SEARCH_FORM = document.getElementById('name-search-form');
  var NAME_QUERY = document.getElementById('name-query');

  // Names index: loaded once from /data/names.json or inlined at build time
  var namesIndex = null;

  /**
   * Load names index (static JSON). In production, can be inlined in HTML or fetched once.
   */
  function loadNamesIndex(callback) {
    if (namesIndex) {
      callback(namesIndex);
      return;
    }
    fetch('/data/names.json')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) {
        namesIndex = Array.isArray(data) ? data : (data.names || []);
        callback(namesIndex);
      })
      .catch(function () { callback([]); });
  }

  /**
   * Normalize name for lookup (lowercase, trim).
   */
  function normalizeKey(name) {
    return String(name).toLowerCase().trim();
  }

  /**
   * Find name in index by exact match first, then optional fuzzy.
   */
  function findName(query, index) {
    var key = normalizeKey(query);
    for (var i = 0; i < index.length; i++) {
      if (normalizeKey(index[i].name) === key) return index[i];
    }
    return null;
  }

  /**
   * Render result card and show section.
   */
  function showResult(record) {
    if (!record) return;
    RESULT_NAME.textContent = record.name;
    var meta = [record.origin_country || record.origin, record.language, record.gender].filter(Boolean).join(' · ');
    RESULT_META.textContent = meta || '—';
    RESULT_MEANING.textContent = record.meaning || 'No meaning listed.';
    RESULT_LINKS.innerHTML = '';

    var links = [];
    if (record.gender) links.push({ href: '/names/' + record.gender, text: 'More ' + record.gender + ' names' });
    links.push({ href: '/names', text: 'Browse all names' });
    links.push({ href: '/name/' + normalizeKey(record.name), text: 'Full page for ' + record.name });
    links.forEach(function (item) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.text;
      li.appendChild(a);
      RESULT_LINKS.appendChild(li);
    });

    RESULTS_SECTION.hidden = false;
    RESULT_CARD.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Handle form submit: look up name and show result or redirect to /name/slug.
   */
  function onFormSubmit(e) {
    e.preventDefault();
    var q = (NAME_QUERY && NAME_QUERY.value) || '';
    if (!q.trim()) return;

    loadNamesIndex(function (index) {
      var record = findName(q, index);
      if (record) {
        showResult(record);
      } else {
        // No client-side match: go to canonical name page (server or static will 404 until generated)
        window.location.href = '/name/' + encodeURIComponent(normalizeKey(q));
      }
    });
  }

  if (NAME_SEARCH_FORM) NAME_SEARCH_FORM.addEventListener('submit', onFormSubmit);

  /**
   * FAQ accordion: toggle data-open and aria-expanded.
   */
  function initFaq() {
    var triggers = document.querySelectorAll('.faq-item__trigger');
    triggers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq-item');
        var open = item.getAttribute('data-open') === 'true';
        item.setAttribute('data-open', !open);
        btn.setAttribute('aria-expanded', !open);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaq);
  } else {
    initFaq();
  }
})();
