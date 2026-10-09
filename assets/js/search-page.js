/**
 * search-page.js — /search?search=… over the search index written by generate.js
 * (assets/data/search-index.json: products, appliances and content pages).
 *
 * Every word of the query must occur in the entry (name, product number, spare-part
 * number, manufacturer); spaces and dashes are ignored, so "00235759" and "0023 5759"
 * both match. Product hits are rendered as a normal product listing (filter, sort,
 * pagination via product-listing.js).
 */
(function (ns) {
  'use strict';

  var e = ns.escapeHtml;
  var LIMIT = 240;

  function norm(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-./]+/g, '');
  }

  function matcher(query) {
    var words = query.toLowerCase().split(/\s+/).map(norm).filter(Boolean);
    return function (fields) {
      var hay = fields.map(norm).join('|');
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    };
  }

  function card(p) {
    var payload = e(JSON.stringify({ number: p[1], name: p[0], price: p[4], image: p[6], path: p[5] }));
    return '<li class="product-card" data-name="' + e(p[0]) + '" data-price="' + (p[4] == null ? '' : p[4]) + '" data-manufacturer="' + e(p[3]) + '">' +
      '<a class="product-card__image" href="' + e(p[5]) + '" tabindex="-1" aria-hidden="true"><img src="' + e(p[6]) + '" alt="' + e(p[0]) + '" width="160" height="160" loading="lazy"></a>' +
      '<div class="product-card__body"><a class="product-card__name" href="' + e(p[5]) + '">' + e(p[0]) + '</a>' +
      '<p class="product-card__meta">' + e(p[1]) + (p[2] ? ' - ' + e(p[2]) : '') + '</p></div>' +
      '<div class="product-card__buy"><p class="product-card__price">' + (p[4] == null ? '' : 'CHF ' + p[4].toFixed(2) + '*') + '</p>' +
      (p[4] == null ? '' : '<button class="btn btn--primary btn--sm" type="button" data-add-to-cart="' + payload + '">In den Warenkorb</button>') +
      '</div></li>';
  }

  function listing(hits) {
    var makers = hits.map(function (p) { return p[3]; }).filter(function (m, i, all) { return m && all.indexOf(m) === i; }).sort();
    return '<section class="product-listing" aria-label="Produkte" data-product-listing data-page-size="24">' +
      '<aside class="listing-filters" aria-label="Filter"><p class="listing-filters__title">Filter</p>' +
      '<button class="btn btn--outline listing-filters__toggle" type="button" data-collapse-toggle="search-filters" aria-controls="search-filters" aria-expanded="false">Filter</button>' +
      '<div class="collapse listing-filters__body" id="search-filters">' +
      (makers.length
        ? '<fieldset class="listing-filters__group"><legend class="listing-filters__legend">Hersteller</legend>' +
          makers.map(function (m) { return '<label class="checkbox"><input type="checkbox" value="' + e(m) + '" data-listing-filter="manufacturer"> <span>' + e(m) + '</span></label>'; }).join('') +
          '</fieldset>'
        : '') +
      '</div></aside><div class="product-listing__main"><div class="product-listing__toolbar">' +
      '<p class="visually-hidden" role="status" aria-live="polite" data-listing-count></p>' +
      '<label class="visually-hidden" for="search-sort">Sortierung</label><select class="form-select product-listing__sort" id="search-sort" data-listing-sort>' +
      '<option value="relevance">Relevanz</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option>' +
      '<option value="price-asc">Preis aufsteigend</option><option value="price-desc">Preis absteigend</option></select></div>' +
      '<ul class="product-list" data-listing-items>' + hits.map(card).join('') + '</ul>' +
      '<nav class="pagination" aria-label="Seiten" data-listing-pagination></nav></div></section>';
  }

  function linkList(title, entries) {
    return '<section class="search-group"><h2 class="section__title">' + title + '</h2><ul class="search-links">' +
      entries.map(function (x) { return '<li><a href="' + e(x.path) + '">' + e(x.label) + '</a>' + (x.meta ? ' <span>' + e(x.meta) + '</span>' : '') + '</li>'; }).join('') +
      '</ul></section>';
  }

  ns.register('searchPage', function () {
    var root = ns.qs('[data-search-page]');
    if (!root) {
      return;
    }
    var query = (new URLSearchParams(window.location.search).get('search') || '').trim();
    var status = ns.qs('[data-search-status]', root);
    var results = ns.qs('[data-search-results]', root);
    ns.qs('#search-page-input').value = query;
    ns.qsa('input[name="search"]').forEach(function (input) {
      if (!input.value) {
        input.value = query;
      }
    });

    if (query.length < 3) {
      status.textContent = query ? 'Bitte geben Sie mindestens 3 Zeichen ein.' : 'Suchen Sie nach Artikel, Ersatzteilnummer, Gerätenummer oder Hersteller.';
      return;
    }
    ns.qs('[data-search-title]', root).textContent = 'Suchergebnisse für „' + query + '“';
    document.title = 'Suche: ' + query + ' | artisanshop.ch';
    status.textContent = 'Suche läuft …';

    fetch('/assets/data/search-index.json').then(function (response) {
      if (!response.ok) {
        throw new Error(response.status);
      }
      return response.json();
    }).then(function (index) {
      var match = matcher(query);
      var products = index.products.filter(function (p) { return match([p[0], p[1], p[2], p[3]]); });
      var appliances = index.appliances.filter(function (a) { return match([a[0], a[1], a[2]]); }).slice(0, 30);
      var pages = index.pages.filter(function (p) { return match([p[0]]); }).slice(0, 30);
      var total = products.length + appliances.length + pages.length;

      status.textContent = total
        ? products.length + ' Artikel, ' + appliances.length + ' Geräte und ' + pages.length + ' Seiten gefunden.' + (products.length > LIMIT ? ' Es werden die ersten ' + LIMIT + ' Artikel angezeigt – verfeinern Sie die Suche.' : '')
        : 'Leider wurde nichts zu „' + query + '“ gefunden. Prüfen Sie die Schreibweise oder suchen Sie nach der Gerätenummer vom Typenschild.';

      results.innerHTML =
        (appliances.length ? linkList('Geräte', appliances.map(function (a) { return { label: a[0], path: a[1], meta: a[2] }; })) : '') +
        (products.length ? '<h2 class="section__title">Artikel</h2>' + listing(products.slice(0, LIMIT)) : '') +
        (pages.length ? linkList('Kategorien und Ratgeber', pages.map(function (p) { return { label: p[0], path: p[1] }; })) : '');
      var list = ns.qs('[data-product-listing]', results);
      if (list) {
        ns.productListing(list);
        // inserted after collapse.js ran, so the mobile "Filter" toggle is bound here
        var toggle = ns.qs('[data-collapse-toggle]', list);
        var panel = document.getElementById(toggle.getAttribute('data-collapse-toggle'));
        toggle.addEventListener('click', function () {
          var open = !panel.classList.contains('is-open');
          panel.classList.toggle('is-open', open);
          toggle.setAttribute('aria-expanded', String(open));
        });
      }
    }).catch(function () {
      status.textContent = 'Der Suchindex konnte nicht geladen werden. Bitte öffnen Sie die Seite über einen Webserver (npm run serve).';
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
