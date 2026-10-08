/**
 * slider.js — review carousel.
 *
 * The track is a horizontally scrolling list with CSS scroll snapping, so it
 * already works with touch, trackpad and the scrollbar. This module adds the
 * previous/next buttons, keyboard arrows and keeps the disabled state of the
 * buttons in sync with the scroll position.
 *
 * Markup contract:
 *   <div data-slider>
 *     <ul data-slider-track><li class="slider__slide">…</li></ul>
 *     <button data-slider-prev> <button data-slider-next>
 */
(function (ns) {
  'use strict';

  ns.register('slider', function () {
    ns.qsa('[data-slider]').forEach(function (slider) {
      var track = ns.qs('[data-slider-track]', slider);
      var prev = ns.qs('[data-slider-prev]', slider);
      var next = ns.qs('[data-slider-next]', slider);
      var slides = track ? ns.qsa('.slider__slide', track) : [];
      if (!track || !prev || !next || !slides.length) {
        return;
      }

      /** Width of one slide including the gap */
      function step() {
        var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
        return slides[0].getBoundingClientRect().width + gap;
      }

      /** Number of fully visible slides */
      function perView() {
        return Math.max(1, Math.round(track.clientWidth / step()));
      }

      function update() {
        var max = track.scrollWidth - track.clientWidth;
        prev.disabled = track.scrollLeft <= 1;
        next.disabled = track.scrollLeft >= max - 1;
      }

      function scrollBySlides(direction) {
        track.scrollBy({ left: direction * step() * perView(), behavior: 'smooth' });
      }

      prev.addEventListener('click', function () {
        scrollBySlides(-1);
      });
      next.addEventListener('click', function () {
        scrollBySlides(1);
      });

      track.setAttribute('tabindex', '0');
      track.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          scrollBySlides(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          scrollBySlides(-1);
        }
      });

      track.addEventListener('scroll', function () {
        window.requestAnimationFrame(update);
      }, { passive: true });
      window.addEventListener('resize', update);

      update();
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
