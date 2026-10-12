/**
 * recently-viewed.js — "Zuletzt angesehen": the last products the visitor opened.
 *
 * Markup contract:
 *   <div data-track-product='{"number","name","price","image","path"}'>   on product pages: records the visit
 *   <section data-recently-viewed data-exclude="ART123">                  renders the strip (hidden when empty)
 */
(function (ns) {
  'use strict';

  var KEY = 'artisanshop.recentlyViewed';
  var MAX = 12;
  var e = ns.escapeHtml;

  function items() {
    var list = ns.storage.get(KEY);
    return Array.isArray(list) ? list : [];
  }

  ns.register('recentlyViewed', function () {
    var tracked = ns.qs('[data-track-product]');
    if (tracked) {
      try {
        var product = JSON.parse(tracked.getAttribute('data-track-product'));
        var list = items().filter(function (item) { return item.number !== product.number; });
        list.unshift(product);
        ns.storage.set(KEY, list.slice(0, MAX));
      } catch (error) { /* malformed payload: ignore */ }
    }

    ns.qsa('[data-recently-viewed]').forEach(function (section) {
      var exclude = section.getAttribute('data-exclude');
      var list = items().filter(function (item) { return item.number !== exclude; }).slice(0, 8);
      if (!list.length) {
        section.hidden = true;
        return;
      }
      ns.qs('[data-recently-viewed-list]', section).innerHTML = list.map(function (item) {
        return '<li class="recent-card"><a class="recent-card__link" href="' + e(item.path) + '">' +
          '<img src="' + e(item.image) + '" alt="" width="120" height="120" loading="lazy">' +
          '<span class="recent-card__name">' + e(item.name) + '</span>' +
          '<span class="recent-card__price">' + (item.price == null ? '' : ns.cart.chf(item.price)) + '</span></a></li>';
      }).join('');
      section.hidden = false;
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
