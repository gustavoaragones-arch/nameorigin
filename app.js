/**
 * nameorigin.io — Vanilla JS
 * Form handling, client-side name lookup, FAQ accordion.
 * No frameworks. Minimal DOM.
 */

(function () {
  'use strict';
  var nameorigin = window.nameorigin || {};

  var RESULTS_SECTION = document.getElementById('results-section');
  var RESULT_CARD = document.getElementById('result-card');
  var RESULT_NAME = document.getElementById('result-name');
  var RESULT_META = document.getElementById('result-meta');
  var RESULT_MEANING = document.getElementById('result-meaning');
  var RESULT_LINKS = document.getElementById('result-links');
  var NAME_SEARCH_FORM = document.getElementById('name-search-form');
  var NAME_QUERY = document.getElementById('name-query');

  var TRENDING_COUNTRY_LABELS = { USA: 'USA', Canada: 'Canada', UK: 'UK', India: 'India' };

  function getCountryFromLocale() {
    var lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : '';
    var parts = (lang || 'en').split('-');
    var region = parts[1] ? parts[1].toUpperCase() : (parts[0] || 'US').toUpperCase();
    var langCode = (parts[0] || 'en').toLowerCase();
    if (region === 'CA' || (langCode === 'fr' && region === 'CA')) return 'Canada';
    if (region === 'GB' || region === 'UK') return 'UK';
    if (region === 'IN') return 'India';
    if (region === 'US' || region === '') return 'USA';
    return 'USA';
  }

  function initTrending() {
    var subtitleEl = document.getElementById('trending-country');
    var listEl = document.getElementById('trending-list');
    if (!subtitleEl || !listEl) return;
    var country = getCountryFromLocale();
    var label = TRENDING_COUNTRY_LABELS[country] || country;
    subtitleEl.textContent = label;
    var loadNamesIndex = nameorigin.loadNamesIndex;
    var buildNameCard = nameorigin.buildNameCard;
    if (!loadNamesIndex || !buildNameCard) return;
    Promise.all([
      fetch('/data/popularity.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      new Promise(function (resolve) { nameorigin.loadNamesIndex(resolve); })
    ]).then(function (results) {
      var popularity = results[0];
      var names = results[1];
      var byCountry = popularity.filter(function (p) { return p.country === country; });
      if (byCountry.length === 0) {
        byCountry = popularity.filter(function (p) { return p.country === 'USA'; });
        if (subtitleEl) subtitleEl.textContent = 'USA';
      }
      var latest = byCountry.filter(function (p) { return p.year === 2023; }).concat(byCountry.filter(function (p) { return p.year !== 2023; }));
      latest.sort(function (a, b) { return (a.rank || 99) - (b.rank || 99); });
      var seen = {};
      var nameIds = [];
      for (var i = 0; i < latest.length && nameIds.length < 10; i++) {
        var id = latest[i].name_id;
        if (!seen[id]) { seen[id] = true; nameIds.push(id); }
      }
      var nameMap = {};
      names.forEach(function (n) { nameMap[n.id] = n; });
      listEl.innerHTML = '';
      nameIds.forEach(function (id) {
        var n = nameMap[id];
        if (!n) return;
        var li = document.createElement('li');
        li.appendChild(buildNameCard(n, names, popularity));
        listEl.appendChild(li);
      });
    });
  }

  /**
   * Render result card and show section.
   */
  function showResult(record) {
    if (!record) return;
    RESULT_NAME.textContent = record.name;
    var badgesEl = document.getElementById('result-badges');
    if (nameorigin.renderOriginBadges) nameorigin.renderOriginBadges(badgesEl, record);
    var meta = [record.origin_country || record.origin, record.language, record.gender].filter(Boolean).join(' · ');
    RESULT_META.textContent = meta || '—';
    RESULT_MEANING.textContent = record.meaning || 'No meaning listed.';
    RESULT_LINKS.innerHTML = '';

    var links = [];
    if (record.gender) links.push({ href: '/names/' + record.gender, text: 'More ' + record.gender + ' names' });
    links.push({ href: '/names', text: 'Browse all names' });
    links.push({ href: '/name/' + (nameorigin.normalizeKey ? nameorigin.normalizeKey(record.name) : record.name.toLowerCase()), text: 'Full page for ' + record.name });
    links.forEach(function (item) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.text;
      li.appendChild(a);
      RESULT_LINKS.appendChild(li);
    });

    lastResultRecord = record;
    var moreWrap = document.getElementById('result-more-wrap');
    var moreTrigger = document.getElementById('result-more-trigger');
    var moreContent = document.getElementById('result-more-content');
    if (moreWrap && moreTrigger && moreContent) {
      moreWrap.hidden = false;
      moreWrap.classList.remove('is-open');
      moreTrigger.setAttribute('aria-expanded', 'false');
      moreContent.innerHTML = '';
      moreContent.removeAttribute('data-filled');
      moreTrigger.onclick = function () {
        moreWrap.classList.toggle('is-open');
        moreTrigger.setAttribute('aria-expanded', moreWrap.classList.contains('is-open'));
        if (moreWrap.classList.contains('is-open') && !moreContent.dataset.filled) {
          moreContent.dataset.filled = '1';
          nameorigin.loadPopularity && nameorigin.loadPopularity(function (popularity) {
            var pop = (popularity || []).filter(function (p) { return p.name_id === record.id; }).sort(function (a, b) { return (b.year || 0) - (a.year || 0); }).slice(0, 3);
            var popHtml = pop.length ? pop.map(function (p) { return p.year + ': rank ' + (p.rank || '—'); }).join(' · ') : '—';
            nameorigin.loadNamesIndex && nameorigin.loadNamesIndex(function (names) {
              var similar = nameorigin.getSimilarNames ? nameorigin.getSimilarNames(record, names || [], 5) : [];
              var similarHtml = similar.length ? similar.map(function (s) {
                return '<a href="/name/' + (nameorigin.slugify ? nameorigin.slugify(s.name) : s.name) + '">' + (nameorigin.escapeHtml ? nameorigin.escapeHtml(s.name) : s.name) + '</a>';
              }).join('') : '—';
              moreContent.innerHTML = '<dl><dt>Popularity trend</dt><dd>' + (nameorigin.escapeHtml ? nameorigin.escapeHtml(popHtml) : popHtml) + '</dd><dt>Similar names</dt><dd><span class="similar-names">' + similarHtml + '</span></dd></dl>';
            });
          });
        }
      };
    }
    var saveBtn = document.getElementById('result-save-btn');
    if (saveBtn) {
      var saved = (nameorigin.getSavedNames && nameorigin.getSavedNames()) || [];
      var isSaved = saved.some(function (s) { return s.id === record.id || (s.slug && s.slug === (nameorigin.slugify ? nameorigin.slugify(record.name) : record.name.toLowerCase())); });
      saveBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
      saveBtn.textContent = isSaved ? '❤️ Saved' : '❤️ Save';
      saveBtn.onclick = function () {
        saved = (nameorigin.getSavedNames && nameorigin.getSavedNames()) || [];
        var idx = saved.findIndex(function (s) { return s.id === record.id || (s.slug && s.slug === (nameorigin.slugify ? nameorigin.slugify(record.name) : record.name.toLowerCase())); });
        if (idx >= 0) {
          saved.splice(idx, 1);
        } else {
          saved.push({ id: record.id, name: record.name, slug: (nameorigin.slugify ? nameorigin.slugify(record.name) : record.name.toLowerCase()), savedAt: new Date().toISOString() });
        }
        if (nameorigin.saveSavedNames) nameorigin.saveSavedNames(saved);
        if (nameorigin.renderSavedNamesSection) nameorigin.renderSavedNamesSection();
        saveBtn.setAttribute('aria-pressed', saved.some(function (s) { return s.id === record.id || (s.slug && s.slug === (nameorigin.slugify ? nameorigin.slugify(record.name) : record.name.toLowerCase())); }) ? 'true' : 'false');
        saveBtn.textContent = saveBtn.getAttribute('aria-pressed') === 'true' ? '❤️ Saved' : '❤️ Save';
      };
    }
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

    nameorigin.loadNamesIndex && nameorigin.loadNamesIndex(function (index) {
      var record = nameorigin.findName ? nameorigin.findName(q, index) : null;
      if (record) {
        showResult(record);
      } else {
        // No client-side match: go to canonical name page (server or static will 404 until generated)
        window.location.href = '/name/' + encodeURIComponent(nameorigin.normalizeKey ? nameorigin.normalizeKey(q) : q.toLowerCase());
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

  /**
   * Name Personality Quiz (Phase 0.5)
   * 5 questions → style tag + matching names. Store in localStorage.nameStyle.
   */
  var QUIZ_STORAGE_KEY = 'nameStyle';
  var QUIZ_QUESTIONS = [
    { id: 'era', title: 'Classic or modern?', options: [{ label: 'Classic', value: 0 }, { label: 'Modern', value: 1 }] },
    { id: 'length', title: 'Short or long names?', options: [{ label: 'Short', value: 0 }, { label: 'Long', value: 1 }] },
    { id: 'roots', title: 'Cultural roots important?', options: [{ label: 'Not really', value: 0 }, { label: 'Yes', value: 1 }] },
    { id: 'popularity', title: 'Rare or popular?', options: [{ label: 'Rare', value: 0 }, { label: 'Popular', value: 1 }] },
    { id: 'sound', title: 'Soft sounding or strong sounding?', options: [{ label: 'Soft', value: 0 }, { label: 'Strong', value: 1 }] },
  ];
  var QUIZ_STYLES = [
    { id: 'modern-nordic', label: 'Modern Nordic', description: 'Short, strong names with clear roots and broad appeal.', profile: [1, 0, 1, 1, 1], nameIds: [1, 5] },
    { id: 'classic-british', label: 'Classic British', description: 'Timeless, refined names with deep cultural heritage.', profile: [0, 0, 1, 1, 0], nameIds: [2, 4] },
    { id: 'nature-inspired', label: 'Nature Inspired', description: 'Earthy, gentle names that feel connected to the natural world.', profile: [1, 1, 1, 0, 0], nameIds: [2, 3] },
    { id: 'timeless-traditional', label: 'Timeless Traditional', description: 'Enduring, familiar names that never go out of style.', profile: [0, 1, 1, 1, 0], nameIds: [2, 4, 5] },
    { id: 'bold-rare', label: 'Bold & Rare', description: 'Distinctive, memorable names that stand out.', profile: [1, 0, 0, 0, 1], nameIds: [1, 3] },
    { id: 'global-explorer', label: 'Global Explorer', description: 'Names from around the world with rich meanings.', profile: [1, 0, 1, -1, -1], nameIds: [3, 5] },
  ];

  function getQuizAnswers() {
    try {
      var raw = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return data.answers && data.answers.length === 5 ? data : null;
    } catch (e) {
      return null;
    }
  }

  function computeQuizStyle(answers) {
    var best = { score: -1, style: QUIZ_STYLES[0] };
    for (var s = 0; s < QUIZ_STYLES.length; s++) {
      var profile = QUIZ_STYLES[s].profile;
      var score = 0;
      for (var i = 0; i < 5; i++) {
        if (profile[i] === -1 || profile[i] === answers[i]) score++;
      }
      if (score > best.score) {
        best.score = score;
        best.style = QUIZ_STYLES[s];
      }
    }
    return best.style;
  }

  function saveQuizResult(style, answers) {
    try {
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
        styleId: style.id,
        styleLabel: style.label,
        answers: answers,
        completedAt: new Date().toISOString(),
      }));
    } catch (e) {}
  }

  function initQuiz() {
    var quizSection = document.getElementById('quiz-section');
    var quizStart = document.getElementById('quiz-start');
    var quizStartBtn = document.getElementById('quiz-start-btn');
    var quizQuestions = document.getElementById('quiz-questions');
    var quizResult = document.getElementById('quiz-result');
    var quizProgressBar = document.getElementById('quiz-progress-bar');
    var quizProgressText = document.getElementById('quiz-progress-text');
    var quizQuestionTitle = document.getElementById('quiz-question-title');
    var quizChoices = document.getElementById('quiz-choices');
    var quizBack = document.getElementById('quiz-back');
    var quizStyleTag = document.getElementById('quiz-style-tag');
    var quizStyleDesc = document.getElementById('quiz-style-desc');
    var quizMatchingNames = document.getElementById('quiz-matching-names');
    var quizCta = document.getElementById('quiz-cta');
    if (!quizSection || !quizStartBtn || !quizQuestions || !quizResult) return;

    var currentStep = 0;
    var answers = [];

    function showStart() {
      quizStart.hidden = false;
      quizQuestions.hidden = true;
      quizResult.hidden = true;
    }
    function showQuestions() {
      quizStart.hidden = true;
      quizQuestions.hidden = true;
      quizResult.hidden = true;
      quizQuestions.hidden = false;
      renderStep();
    }
    function showResult(style, namesList) {
      quizStart.hidden = true;
      quizQuestions.hidden = true;
      quizResult.hidden = false;
      quizStyleTag.textContent = style.label;
      quizStyleDesc.textContent = style.description;
      quizMatchingNames.innerHTML = '';
      namesList.forEach(function (n) {
        var a = document.createElement('a');
        a.href = '/name/' + n.name.toLowerCase().replace(/\s+/g, '-');
        a.textContent = n.name;
        quizMatchingNames.appendChild(a);
      });
      var collectionPath = '/names';
      if (style.id === 'modern-nordic' || style.id === 'bold-rare') collectionPath = '/names/boy';
      if (style.id === 'classic-british' || style.id === 'nature-inspired') collectionPath = '/names/girl';
      quizCta.href = collectionPath;
    }

    function renderStep() {
      var q = QUIZ_QUESTIONS[currentStep];
      quizQuestionTitle.textContent = q.title;
      quizChoices.innerHTML = '';
      q.options.forEach(function (opt, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-choice';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', answers[currentStep] === opt.value);
        btn.textContent = opt.label;
        btn.dataset.value = opt.value;
        btn.addEventListener('click', function () {
          answers[currentStep] = opt.value;
          q.options.forEach(function (_, i) {
            quizChoices.children[i].setAttribute('aria-checked', 'false');
          });
          btn.setAttribute('aria-checked', 'true');
          if (currentStep < QUIZ_QUESTIONS.length - 1) {
            currentStep++;
            renderStep();
          } else {
            var style = computeQuizStyle(answers);
            saveQuizResult(style, answers);
            (nameorigin.loadNamesIndex && nameorigin.loadNamesIndex(function (names) {
              var nameIds = style.nameIds || [];
              var namesList = names.filter(function (n) { return nameIds.indexOf(n.id) !== -1; });
              if (namesList.length === 0) namesList = names.slice(0, 3);
              showResult(style, namesList);
            }));
          }
        });
        quizChoices.appendChild(btn);
      });
      var pct = ((currentStep + 1) / QUIZ_QUESTIONS.length) * 100;
      if (quizProgressBar) quizProgressBar.style.setProperty('--quiz-progress-pct', pct + '%');
      quizProgressText.textContent = 'Question ' + (currentStep + 1) + ' of 5';
      quizBack.hidden = currentStep === 0;
      quizBack.onclick = function () {
        if (currentStep > 0) {
          currentStep--;
          renderStep();
        }
      };
    }

    quizStartBtn.addEventListener('click', function () {
      currentStep = 0;
      answers = [];
      showQuestions();
    });

    var quizRetake = document.getElementById('quiz-retake');
    if (quizRetake) {
      quizRetake.addEventListener('click', function () {
        try { localStorage.removeItem(QUIZ_STORAGE_KEY); } catch (e) {}
        currentStep = 0;
        answers = [];
        showStart();
      });
    }

    var saved = getQuizAnswers();
    if (saved && saved.styleId) {
      var style = QUIZ_STYLES.filter(function (s) { return s.id === saved.styleId; })[0];
      if (style && nameorigin.loadNamesIndex) {
        nameorigin.loadNamesIndex(function (names) {
          var nameIds = style.nameIds || [];
          var namesList = names.filter(function (n) { return nameIds.indexOf(n.id) !== -1; });
          if (namesList.length === 0) namesList = names.slice(0, 3);
          showResult(style, namesList);
          quizStart.hidden = true;
          quizQuestions.hidden = true;
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuiz);
  } else {
    initQuiz();
  }

  var lastResultRecord = null;

  function getFavorites() {
    return nameorigin.getSavedNames ? nameorigin.getSavedNames() : [];
  }
  function saveFavorites(list) {
    if (nameorigin.saveSavedNames) nameorigin.saveSavedNames(list);
    if (nameorigin.renderSavedNamesSection) nameorigin.renderSavedNamesSection();
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function initSwipe() {
    var section = document.getElementById('swipe-section');
    var deck = document.getElementById('swipe-deck');
    var startBlock = document.getElementById('swipe-start');
    var startBtn = document.getElementById('swipe-start-btn');
    var emptyBlock = document.getElementById('swipe-empty');
    var againBtn = document.getElementById('swipe-again');
    var shortlistBlock = document.getElementById('swipe-shortlist');
    var cardInner = document.getElementById('swipe-card-inner');
    var swipeName = document.getElementById('swipe-name');
    var swipeMeta = document.getElementById('swipe-meta');
    var swipeMeaning = document.getElementById('swipe-meaning');
    var swipeSkip = document.getElementById('swipe-skip');
    var swipeLike = document.getElementById('swipe-like');
    var swipeSave = document.getElementById('swipe-save');
    var swipeCounter = document.getElementById('swipe-counter');
    var shortlistLikes = document.getElementById('swipe-shortlist-likes');
    var shortlistFaves = document.getElementById('swipe-faves-empty');
    var shortlistFavesList = document.getElementById('swipe-shortlist-faves');
    if (!section || !deck || !startBtn) return;

    var deckNames = [];
    var index = 0;
    var likedThisSession = [];
    var touchStartX = 0;

    function showStart() {
      startBlock.hidden = false;
      deck.hidden = true;
      emptyBlock.hidden = true;
      shortlistBlock.hidden = true;
      var faves = getFavorites();
      var viewFaves = document.getElementById('swipe-view-faves');
      var viewFavesLink = document.getElementById('swipe-view-faves-link');
      var favesCountEl = document.getElementById('swipe-faves-count');
      if (viewFaves && favesCountEl) {
        viewFaves.hidden = faves.length === 0;
        favesCountEl.textContent = faves.length;
      }
      if (viewFavesLink) {
        viewFavesLink.onclick = function (e) {
          e.preventDefault();
          if (shortlistBlock) {
            shortlistBlock.hidden = false;
            renderShortlist();
            shortlistBlock.scrollIntoView({ behavior: 'smooth' });
          }
        };
      }
    }
    function showDeck() {
      startBlock.hidden = true;
      emptyBlock.hidden = true;
      deck.hidden = false;
      shortlistBlock.hidden = false;
      renderShortlist();
    }
    function showEmpty() {
      startBlock.hidden = true;
      deck.hidden = true;
      emptyBlock.hidden = false;
      shortlistBlock.hidden = false;
      renderShortlist();
    }

    function renderCard(record) {
      if (!record) return;
      swipeName.textContent = record.name;
      var swipeBadges = document.getElementById('swipe-badges');
      if (nameorigin.renderOriginBadges) nameorigin.renderOriginBadges(swipeBadges, record);
      swipeMeta.textContent = [record.origin_country || record.origin, record.language, record.gender].filter(Boolean).join(' · ') || '—';
      swipeMeaning.textContent = record.meaning || '—';
      var faves = getFavorites();
      var isSaved = faves.some(function (f) { return f.id === record.id || (f.slug && f.slug === (nameorigin.slugify ? nameorigin.slugify(record.name) : record.name.toLowerCase())); });
      swipeSave.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
    }

    function nextCard(action) {
      if (action === 'like' && deckNames[index]) {
        likedThisSession.push(deckNames[index]);
      }
      if (action === 'save' && deckNames[index]) {
        var r = deckNames[index];
        var faves = getFavorites();
        if (!faves.some(function (f) { return f.id === r.id; })) {
          faves.push({ id: r.id, name: r.name, slug: (nameorigin.slugify ? nameorigin.slugify(r.name) : r.name.toLowerCase()), savedAt: new Date().toISOString() });
          saveFavorites(faves);
        }
        swipeSave.setAttribute('aria-pressed', 'true');
      }
      index++;
      if (index >= deckNames.length) {
        showEmpty();
        return;
      }
      renderCard(deckNames[index]);
      swipeCounter.textContent = (index + 1) + ' of ' + deckNames.length;
      renderShortlist();
    }

    function renderShortlist() {
      var faves = getFavorites();
      if (shortlistLikes) {
        shortlistLikes.innerHTML = '';
        likedThisSession.forEach(function (r) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '/name/' + (nameorigin.slugify ? nameorigin.slugify(r.name) : r.name.toLowerCase());
          a.textContent = r.name;
          li.appendChild(a);
          shortlistLikes.appendChild(li);
        });
      }
      if (shortlistFavesList) {
        shortlistFavesList.innerHTML = '';
        faves.forEach(function (f) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '/name/' + (f.slug || (nameorigin.slugify ? nameorigin.slugify(f.name) : f.name));
          a.textContent = f.name;
          li.appendChild(a);
          shortlistFavesList.appendChild(li);
        });
      }
      if (shortlistFaves) shortlistFaves.hidden = faves.length > 0;
    }

    function startDeck() {
      (nameorigin.loadNamesIndex && nameorigin.loadNamesIndex(function (names) {
        deckNames = shuffleArray(names);
        index = 0;
        likedThisSession = [];
        if (deckNames.length === 0) {
          showEmpty();
          return;
        }
        showDeck();
        renderCard(deckNames[0]);
        swipeCounter.textContent = '1 of ' + deckNames.length;
      }));
    }

    startBtn.addEventListener('click', startDeck);
    if (againBtn) againBtn.addEventListener('click', startDeck);
    showStart();

    if (swipeSkip) swipeSkip.addEventListener('click', function () { nextCard('skip'); });
    if (swipeLike) swipeLike.addEventListener('click', function () { nextCard('like'); });
    if (swipeSave) {
      swipeSave.addEventListener('click', function () {
        nextCard('save');
      });
    }

    if (cardInner) {
      cardInner.addEventListener('touchstart', function (e) {
        touchStartX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      }, { passive: true });
      cardInner.addEventListener('touchend', function (e) {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        var endX = e.changedTouches[0].clientX;
        var delta = endX - touchStartX;
        if (Math.abs(delta) < 50) return;
        if (delta > 0) nextCard('like');
        else nextCard('skip');
      }, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSwipe();
      if (nameorigin.renderSavedNamesSection) nameorigin.renderSavedNamesSection();
      initTrending();
    });
  } else {
    initSwipe();
    if (nameorigin.renderSavedNamesSection) nameorigin.renderSavedNamesSection();
    initTrending();
  }

  /**
   * Phonetic Compatibility Visualizer (Phase 0.5)
   * Rule-based: syllable balance, sound flow, ending match. No AI.
   */
  function countSyllables(str) {
    if (!str || !str.trim()) return 0;
    var s = str.toLowerCase().replace(/[^a-z]/g, '');
    if (!s) return 0;
    var matches = s.match(/[aeiouy]+/g);
    if (!matches) return 1;
    return matches.length;
  }

  function isVowel(c) {
    return /[aeiou]/.test((c || '').toLowerCase());
  }

  function scoreLengthHarmony(firstSyl, lastSyl) {
    if (firstSyl < 1 || lastSyl < 1) return 50;
    var ratio = firstSyl / lastSyl;
    var score = 100;
    if (ratio < 0.33 || ratio > 3) score -= 40;
    else if (ratio < 0.5 || ratio > 2) score -= 20;
    var total = firstSyl + lastSyl;
    if (total > 6) score -= 15;
    if (total < 2) score -= 10;
    return Math.max(0, Math.min(100, score));
  }

  function scoreSoundRhythm(first, last) {
    var combined = (first + ' ' + last).toLowerCase().replace(/\s/g, '');
    var runs = [];
    var current = null;
    for (var i = 0; i < combined.length; i++) {
      var c = combined[i];
      var v = isVowel(c);
      if (current === null || current.v !== v) {
        runs.push({ v: v, len: 1 });
        current = runs[runs.length - 1];
      } else {
        current.len++;
      }
    }
    var maxV = 0, maxC = 0;
    runs.forEach(function (r) {
      if (r.v && r.len > maxV) maxV = r.len;
      if (!r.v && r.len > maxC) maxC = r.len;
    });
    var score = 100;
    if (maxV > 2) score -= (maxV - 2) * 15;
    if (maxC > 2) score -= (maxC - 2) * 15;
    return Math.max(0, Math.min(100, score));
  }

  function scoreEndingMatch(first, last) {
    if (!first || !last) return 50;
    var f = first.toLowerCase().replace(/\s/g, '');
    var l = last.toLowerCase().replace(/\s/g, '');
    var firstEnd = f.charAt(f.length - 1);
    var lastStart = l.charAt(0);
    if (firstEnd === lastStart) {
      if (isVowel(firstEnd)) return 75;
      return 55;
    }
    if (isVowel(firstEnd) && isVowel(lastStart)) return 60;
    if (isVowel(firstEnd) && !isVowel(lastStart)) return 95;
    if (!isVowel(firstEnd) && isVowel(lastStart)) return 95;
    return 85;
  }

  function getScoreDesc(overall) {
    if (overall >= 85) return 'Flows very naturally.';
    if (overall >= 70) return 'Good flow with a balanced sound.';
    if (overall >= 55) return 'Decent flow; a few bumps.';
    if (overall >= 40) return 'Some clashing sounds or length imbalance.';
    return 'Names may feel awkward together.';
  }

  function initPhonetic() {
    var form = document.getElementById('phonetic-form');
    var resultEl = document.getElementById('phonetic-result');
    var resultNames = document.getElementById('phonetic-result-names');
    var scoreValue = document.getElementById('phonetic-score-value');
    var scoreDesc = document.getElementById('phonetic-score-desc');
    var barLength = document.getElementById('phonetic-bar-length');
    var barRhythm = document.getElementById('phonetic-bar-rhythm');
    var barEnding = document.getElementById('phonetic-bar-ending');
    var numLength = document.getElementById('phonetic-num-length');
    var numRhythm = document.getElementById('phonetic-num-rhythm');
    var numEnding = document.getElementById('phonetic-num-ending');
    var metaEl = document.getElementById('phonetic-meta');
    if (!form || !resultEl) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = (document.getElementById('phonetic-first') && document.getElementById('phonetic-first').value) || '';
      var last = (document.getElementById('phonetic-last') && document.getElementById('phonetic-last').value) || '';
      first = first.trim();
      last = last.trim();
      if (!last) return;
      var firstOnly = !first.trim();
      if (firstOnly) first = '—';
      var firstSyl = firstOnly ? 1 : countSyllables(first);
      var lastSyl = countSyllables(last);
      var lenScore = scoreLengthHarmony(firstOnly ? 1 : firstSyl, lastSyl);
      var rhythmScore = firstOnly ? 50 : scoreSoundRhythm(first, last);
      var endScore = firstOnly ? 50 : scoreEndingMatch(first, last);
      var overall = firstOnly ? lenScore : Math.round((lenScore + rhythmScore + endScore) / 3);
      overall = Math.max(0, Math.min(100, overall));

      resultNames.textContent = firstOnly ? last : first + ' ' + last;
      scoreValue.textContent = overall + '%';
      scoreValue.setAttribute('aria-label', overall + ' percent');
      scoreDesc.textContent = firstOnly ? 'Enter a first name for full "flows naturally" score.' : getScoreDesc(overall);
      barLength.style.width = lenScore + '%';
      barRhythm.style.width = rhythmScore + '%';
      barEnding.style.width = endScore + '%';
      numLength.textContent = lenScore;
      numRhythm.textContent = rhythmScore;
      numEnding.textContent = endScore;
      metaEl.textContent = (firstOnly ? 'Last name syllables: ' + lastSyl : 'Syllables: ' + firstSyl + ' + ' + lastSyl) + '. Rule-based scoring only.';
      resultEl.hidden = false;
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhonetic);
  } else {
    initPhonetic();
  }
})();
