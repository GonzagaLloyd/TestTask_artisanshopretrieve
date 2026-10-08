/**
 * main.js — entry point: runs every registered module once the DOM is ready.
 * A failing module is logged but never prevents the others from starting.
 */
(function (ns) {
  'use strict';

  function boot() {
    ns.modules.forEach(function (module) {
      try {
        module.init();
      } catch (error) {
        if (window.console) {
          window.console.error('[ArtisanShop] module "' + module.name + '" failed:', error);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.ArtisanShop = window.ArtisanShop || {});
