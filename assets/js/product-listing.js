/**
 * product-listing.js — manufacturer filter, sorting and pagination for product lists.
 *
 * Markup contract (rendered by generate.js / search-page.js):
 *   <section data-product-listing data-page-size="24">
 *     <p data-listing-count>   <input type="checkbox" data-listing-filter="manufacturer" value="Bosch">
 *     <select data-listing-sort>   <ul data-listing-items> <li data-name data-price data-manufacturer data-category>
 *     <nav data-listing-pagination>
 *
 * Checked values of one filter group are OR-ed, groups are AND-ed.
 *
 * All items are in the page; this only reorders and hides them. The current page is
 * kept in the URL hash (#p2) so the browser back button returns to it.
 */
(function (ns) {
  'use strict';

  function setup(root) {
    var list = ns.qs('[data-listing-items]', root);
    var items = ns.qsa(':scope > li', list);
    var original = items.slice();
    var sort = ns.qs('[data-listing-sort]', root);
    var filters = ns.qsa('[data-listing-filter]', root);
    var count = ns.qs('[data-listing-count]', root);
    var pager = ns.qs('[data-listing-pagination]', root);
    var empty = ns.qs('[data-listing-empty]', root);
    var search = ns.qs('[data-listing-search]', root);
    var position = ns.qs('[data-listing-position]', root);
    var term = '';
    var size = parseInt(root.getAttribute('data-page-size'), 10) || 24;
    var page = parseInt((window.location.hash.match(/^#p(\d+)$/) || [])[1], 10) || 1;

    var compare = {
      'name-asc': function (a, b) { return a.dataset.name.localeCompare(b.dataset.name, 'de'); },
      'name-desc': function (a, b) { return b.dataset.name.localeCompare(a.dataset.name, 'de'); },
      'price-asc': function (a, b) { return price(a) - price(b); },
      'price-desc': function (a, b) { return price(b) - price(a); }
    };

    function price(el) {
      return el.dataset.price === '' ? Infinity : parseFloat(el.dataset.price);
    }

    function render(scroll) {
      var active = {};
      filters.filter(function (f) { return f.checked; }).forEach(function (f) {
        var key = f.getAttribute('data-listing-filter');
        (active[key] = active[key] || []).push(f.value);
      });
      var sorted = compare[sort.value] ? original.slice().sort(compare[sort.value]) : original.slice();
      var visible = sorted.filter(function (el) {
        return Object.keys(active).every(function (key) { return active[key].indexOf(el.dataset[key]) !== -1; }) &&
          (!term || (el.dataset.number + el.dataset.name).toLowerCase().replace(/\s+/g, '').indexOf(term) !== -1) &&
          (!position || !position.value || el.dataset.position === position.value);
      });
      var pages = Math.max(1, Math.ceil(visible.length / size));
      page = Math.min(page, pages);

      sorted.forEach(function (el) {
        list.appendChild(el);
        el.hidden = true;
      });
      visible.slice((page - 1) * size, page * size).forEach(function (el) { el.hidden = false; });

      count.textContent = visible.length ? visible.length + ' / ' + original.length : 'Keine Produkte gefunden';
      if (empty) {
        empty.hidden = visible.length > 0;
      }
      renderPager(pages);
      if (scroll) {
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function renderPager(pages) {
      if (pages < 2) {
        pager.innerHTML = '';
        return;
      }
      var html = '<ul class="pagination__list">';
      html += button(page - 1, '‹', 'Vorherige Seite', page === 1);
      for (var i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 2) {
          html += '<li><button class="pagination__btn' + (i === page ? ' is-active' : '') + '" type="button" data-page="' + i + '"' + (i === page ? ' aria-current="page"' : '') + '>' + i + '</button></li>';
        } else if (Math.abs(i - page) === 3) {
          html += '<li class="pagination__gap" aria-hidden="true">…</li>';
        }
      }
      html += button(page + 1, '›', 'Nächste Seite', page === pages);
      pager.innerHTML = html + '</ul>';
    }

    function button(target, label, aria, disabled) {
      return '<li><button class="pagination__btn" type="button" data-page="' + target + '" aria-label="' + aria + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button></li>';
    }

    pager.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-page]');
      if (btn && !btn.disabled) {
        page = parseInt(btn.getAttribute('data-page'), 10);
        window.history.replaceState(null, '', page > 1 ? '#p' + page : window.location.pathname + window.location.search);
        render(true);
      }
    });
    if (search) {
      search.addEventListener('submit', function (event) {
        event.preventDefault();
        term = ns.qs('input', search).value.trim().toLowerCase().replace(/\s+/g, '');
        page = 1;
        render(false);
      });
    }
    if (position) {
      position.addEventListener('change', function () {
        page = 1;
        render(false);
      });
    }
    sort.addEventListener('change', function () {
      page = 1;
      render(false);
    });
    filters.forEach(function (f) {
      f.addEventListener('change', function () {
        page = 1;
        render(false);
      });
    });

    render(false);
  }

  ns.productListing = setup;

  ns.register('productListing', function () {
    ns.qsa('[data-product-listing]').forEach(setup);
  });
})(window.ArtisanShop = window.ArtisanShop || {});
