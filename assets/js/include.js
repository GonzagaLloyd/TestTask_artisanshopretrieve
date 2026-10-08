/**
 * include.js — inserts the page sections into index.html.
 *
 * Each section is an ordinary HTML file in partials/. `node build.js` bundles
 * them into assets/js/partials.generated.js (so the page also works when it
 * is opened from the file system, where fetch() is not available). This
 * script replaces every placeholder with the matching markup:
 *
 *   <div data-include="header"></div>   →   contents of partials/header.html
 *
 * It runs before the behaviour modules (script order), so they always see
 * the complete document.
 */
(function (ns) {
  'use strict';

  var partials = ns.partials || {};

  Array.prototype.slice.call(document.querySelectorAll('[data-include]')).forEach(function (placeholder) {
    var name = placeholder.getAttribute('data-include');
    if (typeof partials[name] !== 'string') {
      if (window.console) {
        window.console.error('[ArtisanShop] missing partial "' + name + '" – run `node build.js`');
      }
      placeholder.remove();
      return;
    }
    placeholder.outerHTML = partials[name];
  });
})(window.ArtisanShop = window.ArtisanShop || {});
