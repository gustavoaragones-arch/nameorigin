/**
 * nameorigin.io — accordion.js
 * Expandable meaning panels: buildNameCard, loadPopularity, getSimilarNames.
 * Depends on: window.nameorigin (core)
 */
(function () {
  'use strict';
  var api = window.nameorigin;
  if (!api) return;

  var popularityCache = null;
  api.loadPopularity = function (callback) {
    if (popularityCache) {
      callback(popularityCache);
      return;
    }
    fetch('/data/popularity.json')
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (data) {
        popularityCache = data;
        callback(data);
      });
  };

  api.getSimilarNames = function (record, names, limit) {
    if (!record || !names) return [];
    var out = [];
    var key = (record.name || '').toLowerCase();
    for (var i = 0; i < names.length && out.length < (limit || 5); i++) {
      if (names[i].id === record.id) continue;
      if ((names[i].name || '').toLowerCase() === key) continue;
      if ((record.first_letter && names[i].first_letter === record.first_letter) || (record.gender && names[i].gender === record.gender)) {
        out.push(names[i]);
      }
    }
    return out.slice(0, limit || 5);
  };

  api.buildNameCard = function (record, names, popularity) {
    var slugify = api.slugify;
    var escapeHtml = api.escapeHtml;
    var getSimilarNames = api.getSimilarNames;
    var card = document.createElement('div');
    card.className = 'name-card';
    card.dataset.nameId = record.id;
    card.dataset.name = record.name || '';
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'name-card__trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'panel-' + (record.id || slugify(record.name)));
    trigger.textContent = record.name || '';
    var panel = document.createElement('div');
    panel.className = 'name-card__panel';
    panel.id = 'panel-' + (record.id || slugify(record.name));
    var inner = document.createElement('div');
    inner.className = 'name-card__panel-inner';
    var content = document.createElement('div');
    content.className = 'name-card__panel-content';
    content.setAttribute('aria-live', 'polite');
    inner.appendChild(content);
    panel.appendChild(inner);
    card.appendChild(trigger);
    card.appendChild(panel);
    trigger.addEventListener('click', function () {
      var isOpen = card.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen && !content.dataset.filled) {
        content.dataset.filled = '1';
        var origin = [record.origin_country || record.origin, record.language].filter(Boolean).join(' · ') || '—';
        var pop = (popularity || []).filter(function (p) { return p.name_id === record.id; }).sort(function (a, b) { return (b.year || 0) - (a.year || 0); }).slice(0, 3);
        var popHtml = pop.length ? pop.map(function (p) { return p.year + ': rank ' + (p.rank || '—'); }).join(' · ') : '—';
        var similar = getSimilarNames(record, names || [], 5);
        var similarHtml = similar.length ? similar.map(function (s) {
          return '<a href="/name/' + slugify(s.name) + '">' + escapeHtml(s.name) + '</a>';
        }).join('') : '—';
        content.innerHTML = '<dl><dt>Meaning</dt><dd>' + escapeHtml(record.meaning || '—') + '</dd><dt>Origin</dt><dd>' + escapeHtml(origin) + '</dd><dt>Popularity trend</dt><dd>' + escapeHtml(popHtml) + '</dd><dt>Similar names</dt><dd><span class="similar-names">' + similarHtml + '</span></dd></dl>';
      }
    });
    return card;
  };
})();
