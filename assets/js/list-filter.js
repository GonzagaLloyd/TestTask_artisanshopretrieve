/**
 * list-filter.js — live text filter for a list (manufacturer directory).
 *
 * Markup contract:
 *   <input type="search" data-filter-list="list-id">
 *   <ul id="list-id"><li>…</li></ul>
 *   <p class="brand-list__empty" hidden>  (optional "no results" message, sibling of the list)
 */
(function (ns) {
  'use strict';

  ns.register('listFilter', function () {
    ns.qsa('[data-filter-list]').forEach(function (input) {
      var list = document.getElementById(input.getAttribute('data-filter-list'));
      if (!list) {
        return;
      }
      var items = ns.qsa('li', list);
      var empty = list.parentElement && ns.qs('[role="status"]', list.parentElement);
      var form = input.closest('form');

      // Case- and accent-insensitive comparison ("kuppersbusch" finds "Küppersbusch")
      function normalise(text) {
        return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      }

      function apply() {
        var query = normalise(input.value.trim());
        var visible = 0;
        items.forEach(function (item) {
          var match = !query || normalise(item.textContent).indexOf(query) !== -1;
          item.hidden = !match;
          if (match) {
            visible += 1;
          }
        });
        if (empty) {
          empty.hidden = visible > 0;
        }
      }

      input.addEventListener('input', apply);
      if (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
        });
      }
      apply();
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
