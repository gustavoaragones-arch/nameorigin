/**
 * nameorigin.io — core.js
 * Shared API: loadNamesIndex, getSavedNames, slugify, escapeHtml, renderOriginBadges, etc.
 */
(function () {
  'use strict';
  var namesIndex = null;
  var SAVED_NAMES_KEY = 'savedNames';
  var LEGACY_FAVORITES_KEY = 'favoriteNames';

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

  function getSavedNames() {
    try {
      var raw = localStorage.getItem(SAVED_NAMES_KEY);
      if (raw) {
        var list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
      }
      raw = localStorage.getItem(LEGACY_FAVORITES_KEY);
      if (raw) {
        var list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          try {
            localStorage.setItem(SAVED_NAMES_KEY, raw);
            localStorage.removeItem(LEGACY_FAVORITES_KEY);
          } catch (e) {}
          return list;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  function saveSavedNames(list) {
    try {
      localStorage.setItem(SAVED_NAMES_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function slugify(name) {
    return String(name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderSavedNamesSection() {
    var list = getSavedNames();
    var listEl = document.getElementById('saved-names-list');
    var emptyEl = document.getElementById('saved-names-empty');
    var countEl = document.getElementById('nav-saved-count');
    if (emptyEl) emptyEl.hidden = list.length > 0;
    if (countEl) countEl.textContent = list.length > 0 ? list.length : '';
    if (!listEl || list.length === 0) {
      if (listEl) listEl.innerHTML = '';
      return;
    }
    listEl.innerHTML = '';
    var api = window.nameorigin;
    loadNamesIndex(function (names) {
      if (api && api.loadPopularity && api.buildNameCard) {
        api.loadPopularity(function (popularity) {
          list.forEach(function (item) {
            var record = names.filter(function (n) { return n.id === item.id || (n.name && n.name.toLowerCase() === (item.name || '').toLowerCase()); })[0];
            var li = document.createElement('li');
            if (record) {
              li.appendChild(api.buildNameCard(record, names, popularity));
            } else {
              var card = document.createElement('div');
              card.className = 'name-card';
              var trigger = document.createElement('a');
              trigger.href = '/name/' + (item.slug || slugify(item.name));
              trigger.className = 'name-card__trigger';
              trigger.textContent = item.name;
              card.appendChild(trigger);
              li.appendChild(card);
            }
            listEl.appendChild(li);
          });
        });
      } else {
        list.forEach(function (item) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '/name/' + (item.slug || slugify(item.name));
          a.textContent = item.name;
          li.appendChild(a);
          listEl.appendChild(li);
        });
      }
    });
  }

  function normalizeKey(name) {
    return String(name).toLowerCase().trim();
  }

  function findName(query, index) {
    var key = normalizeKey(query);
    for (var i = 0; i < index.length; i++) {
      if (normalizeKey(index[i].name) === key) return index[i];
    }
    return null;
  }

  var ORIGIN_BADGES = {
    ireland: { flag: '\uD83C\uDDEE\uD83C\uDDEA', label: 'Irish', hint: 'Irish and Celtic origins; common in Ireland and the diaspora.' },
    italy: { flag: '\uD83C\uDDEE\uD83C\uDDF9', label: 'Italian', hint: 'From Latin and Italian tradition; used across Romance-language cultures.' },
    india: { flag: '\uD83C\uDDEE\uD83C\uDDF3', label: 'Sanskrit', hint: 'Sanskrit and Indian origins; classical and modern usage.' },
    germany: { flag: '\uD83C\uDDE9\uD83C\uDDEA', label: 'German', hint: 'Germanic roots; widespread in German-speaking and European naming.' },
    hebrew: { flag: '\uD83C\uDDEE\uD83C\uDDF1', label: 'Hebrew', hint: 'Hebrew and biblical tradition; used in Jewish and broader contexts.' },
    latin: { flag: '\uD83C\uDDEE\uD83C\uDDF9', label: 'Latin', hint: 'Latin origin; classical and Romance-language naming.' },
    sanskrit: { flag: '\uD83C\uDDEE\uD83C\uDDF3', label: 'Sanskrit', hint: 'Sanskrit origin; traditional and contemporary Indian names.' },
    german: { flag: '\uD83C\uDDE9\uD83C\uDDEA', label: 'German', hint: 'Germanic origin; common in German and European naming.' },
    irish: { flag: '\uD83C\uDDEE\uD83C\uDDEA', label: 'Irish', hint: 'Irish and Celtic origins; popular in Ireland and abroad.' },
    french: { flag: '\uD83C\uDDEB\uD83C\uDDF7', label: 'French', hint: 'French tradition; used in France and Francophone regions.' },
    english: { flag: '\uD83C\uDDEC\uD83C\uDDE7', label: 'English', hint: 'English-speaking usage; often from Old English or adopted from other languages.' },
    usa: { flag: '\uD83C\uDDFA\uD83C\uDDF8', label: 'English', hint: 'Widely used in English-speaking countries including the USA.' },
  };

  function getOriginBadge(record) {
    if (!record) return null;
    var country = (record.origin_country || '').toLowerCase().replace(/\s+/g, '');
    var lang = (record.language || '').toLowerCase().replace(/\s+/g, '');
    return ORIGIN_BADGES[country] || ORIGIN_BADGES[lang] || (country ? { flag: '\uD83C\uDF0D', label: record.origin_country || record.language, hint: 'Origin: ' + (record.origin_country || record.language) + '.' } : null);
  }

  function renderOriginBadges(container, record) {
    if (!container) return;
    container.innerHTML = '';
    var badge = getOriginBadge(record);
    if (!badge) return;
    var span = document.createElement('span');
    span.className = 'origin-badge';
    span.setAttribute('title', badge.hint);
    span.innerHTML = '<span aria-hidden="true">' + badge.flag + '</span> <span>' + escapeHtml(badge.label) + '</span><span class="origin-badge__hint" role="tooltip">' + escapeHtml(badge.hint) + '</span>';
    container.appendChild(span);
  }

  window.nameorigin = {
    loadNamesIndex: loadNamesIndex,
    getSavedNames: getSavedNames,
    saveSavedNames: saveSavedNames,
    slugify: slugify,
    escapeHtml: escapeHtml,
    renderSavedNamesSection: renderSavedNamesSection,
    normalizeKey: normalizeKey,
    findName: findName,
    ORIGIN_BADGES: ORIGIN_BADGES,
    getOriginBadge: getOriginBadge,
    renderOriginBadges: renderOriginBadges,
  };
})();
