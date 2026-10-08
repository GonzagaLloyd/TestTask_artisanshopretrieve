/**
 * reviews.js — renders the customer review cards from `assets/data/reviews.js`
 * into the carousel track. Runs before slider.js, which then wires up the
 * controls. Like the original shop, the carousel only appears with JavaScript.
 *
 * Markup contract:
 *   <ul data-reviews></ul>
 */
(function (ns) {
  'use strict';

  var STAR = '<svg class="icon" aria-hidden="true"><use href="#icon-star"></use></svg>';

  /** 2025-08-05 -> 05.08.2025 */
  function formatDate(iso) {
    var parts = iso.split('-');
    return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : iso;
  }

  function renderCard(review) {
    var rating = Math.max(0, Math.min(5, review.rating || 5));
    return '<li class="slider__slide">' +
      '<article class="review-card">' +
      '<header class="review-card__header">' +
      '<h3 class="review-card__name">' + ns.escapeHtml(review.name) + '</h3>' +
      '<time class="review-card__date" datetime="' + ns.escapeHtml(review.date) + '">Bewertung vom ' + formatDate(review.date) + '</time>' +
      '</header>' +
      '<div class="rating" role="img" aria-label="' + rating + ' von 5 Sternen">' + new Array(rating + 1).join(STAR) + '</div>' +
      '<p class="review-card__text">' + ns.escapeHtml(review.text) + '</p>' +
      '</article>' +
      '</li>';
  }

  ns.register('reviews', function () {
    var track = ns.qs('[data-reviews]');
    var list = ns.data && ns.data.reviews;
    if (!track || !list) {
      return;
    }
    track.innerHTML = list.map(renderCard).join('');
  });
})(window.ArtisanShop = window.ArtisanShop || {});
