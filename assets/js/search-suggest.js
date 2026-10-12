/**
 * search-suggest.js — live suggestions below every search field (header, search page,
 * appliance-number panel) from the search index (assets/data/search-index.json).
 *
 * Needs a web server (the index is fetched); when the page is opened from the file system the
 * fields keep working without suggestions. The index is loaded on first focus.
 *
 * Keyboard: ArrowDown / ArrowUp move, Enter opens the highlighted entry, Escape closes.
 */
(function (ns) {
  'use strict';

  var e = ns.escapeHtml;
  var MIN = 3;
  var index = null;
  var loading = null;

  function norm(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-./]+/g, '');
  }

  function load() {
    if (!loading) {
      loading = fetch('/assets/data/search-index.json').then(function (r) {
        if (!r.ok) {
          throw new Error(r.status);
        }
        return r.json();
      }).then(function (data) {
        data.products.forEach(function (p) { p.hay = norm(p[0] + '|' + p[1] + '|' + p[2] + '|' + p[3]); });
        data.appliances.forEach(function (a) { a.hay = norm(a[0] + '|' + a[2]); });
        data.pages.forEach(function (p) { p.hay = norm(p[0]); });
        index = data;
        return data;
      });
    }
    return loading;
  }

  function search(query, appliancesOnly) {
    var words = query.toLowerCase().split(/\s+/).map(norm).filter(Boolean);
    var all = function (entry) { return words.every(function (w) { return entry.hay.indexOf(w) !== -1; }); };
    var out = [];
    var appliances = index.appliances.filter(all);
    out.push({ title: 'Geräte', total: appliances.length, rows: appliances.slice(0, appliancesOnly ? 8 : 4).map(function (a) { return { label: a[0], meta: a[2], href: a[1] }; }) });
    if (!appliancesOnly) {
      var products = index.products.filter(all);
      out.push({ title: 'Artikel', total: products.length, rows: products.slice(0, 5).map(function (p) { return { label: p[0], meta: p[1] + (p[4] == null ? '' : ' · CHF ' + p[4].toFixed(2)), href: p[5], image: p[6] }; }) });
      var pages = index.pages.filter(all).filter(function (p) { return p[1] !== '/'; });
      out.push({ title: 'Kategorien und Ratgeber', total: pages.length, rows: pages.slice(0, 3).map(function (p) { return { label: p[0], href: p[1] }; }) });
    }
    return out.filter(function (group) { return group.rows.length; });
  }

  function attach(input, id) {
    var appliancesOnly = input.id === 'appliance-number';
    var host = input.closest('form') || input.parentElement;
    var box = document.createElement('div');
    box.className = 'suggest';
    box.id = 'suggest-' + id;
    box.setAttribute('role', 'listbox');
    box.hidden = true;
    host.appendChild(box);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-controls', box.id);
    input.setAttribute('aria-expanded', 'false');

    var timer = null;
    var active = -1;

    function links() {
      return ns.qsa('.suggest__link', box);
    }

    function close() {
      box.hidden = true;
      active = -1;
      input.setAttribute('aria-expanded', 'false');
    }

    function highlight(next) {
      var list = links();
      if (!list.length) {
        return;
      }
      active = (next + list.length) % list.length;
      list.forEach(function (link, i) {
        link.classList.toggle('is-active', i === active);
        link.setAttribute('aria-selected', String(i === active));
      });
      list[active].scrollIntoView({ block: 'nearest' });
    }

    function render() {
      var query = input.value.trim();
      if (query.length < MIN || !index) {
        close();
        return;
      }
      var groups = search(query, appliancesOnly);
      var html = groups.map(function (group) {
        return '<p class="suggest__title">' + group.title + ' <span>(' + group.total + ')</span></p><ul class="suggest__list">' +
          group.rows.map(function (row) {
            return '<li><a class="suggest__link" role="option" aria-selected="false" href="' + e(row.href) + '">' +
              (row.image ? '<img src="' + e(row.image) + '" alt="" width="40" height="40" loading="lazy">' : '') +
              '<span class="suggest__text"><span class="suggest__label">' + e(row.label) + '</span>' +
              (row.meta ? '<span class="suggest__meta">' + e(row.meta) + '</span>' : '') + '</span></a></li>';
          }).join('') + '</ul>';
      }).join('');
      html = html || '<p class="suggest__empty">Keine Treffer für „' + e(query) + '“.</p>';
      html += '<a class="suggest__all" href="/search?search=' + encodeURIComponent(query) + '">Alle Ergebnisse für „' + e(query) + '“ anzeigen</a>';
      box.innerHTML = html;
      box.hidden = false;
      active = -1;
      input.setAttribute('aria-expanded', 'true');
    }

    input.addEventListener('focus', function () {
      load().then(function () { if (input.value.trim().length >= MIN) { render(); } }, function () { /* no index: no suggestions */ });
    });
    input.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { load().then(render, close); }, 120);
    });
    input.addEventListener('keydown', function (event) {
      if (box.hidden) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        highlight(active + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        highlight(active - 1);
      } else if (event.key === 'Enter' && active > -1) {
        event.preventDefault();
        links()[active].click();
      } else if (event.key === 'Escape') {
        close();
      }
    });
    document.addEventListener('click', function (event) {
      if (!host.contains(event.target)) {
        close();
      }
    });
  }

  ns.register('searchSuggest', function () {
    if (window.location.protocol === 'file:') {
      return;
    }
    ns.qsa('[data-search-form] input[type="search"], #search-page-input').forEach(attach);
  });
})(window.ArtisanShop = window.ArtisanShop || {});
