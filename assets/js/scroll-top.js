/**
 * scroll-top.js — "back to top" button and the shadow of the sticky
 * appliance-number bar, both driven by the scroll position.
 */
(function (ns) {
  'use strict';

  ns.register('scrollTop', function () {
    var button = ns.qs('[data-scroll-top]');
    var stickyBar = ns.qs('#appliance-bar');
    var ticking = false;

    function update() {
      ticking = false;
      if (button) {
        button.classList.toggle('is-visible', window.scrollY > 300);
      }
      if (stickyBar) {
        stickyBar.classList.toggle('is-stuck', stickyBar.getBoundingClientRect().top <= 0 && window.scrollY > 0);
      }
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    if (button) {
      button.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    update();
  });
})(window.ArtisanShop = window.ArtisanShop || {});
