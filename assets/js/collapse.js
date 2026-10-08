/**
 * collapse.js — generic show/hide toggles ("Mehr anzeigen", footer columns
 * on small screens, hint boxes).
 *
 * Markup contract:
 *   <button data-collapse-toggle="target-id" aria-expanded="false" aria-controls="target-id">
 *     <span data-collapse-label-closed>Mehr anzeigen</span>
 *     <span data-collapse-label-open hidden>Weniger anzeigen</span>   (optional)
 *   <div class="collapse" id="target-id">
 *
 * The open state is a CSS class (`is-open`) rather than the hidden attribute
 * so stylesheets can force a target open on larger screens (footer columns).
 */
(function (ns) {
  'use strict';

  ns.register('collapse', function () {
    ns.qsa('[data-collapse-toggle]').forEach(function (button) {
      var target = document.getElementById(button.getAttribute('data-collapse-toggle'));
      if (!target) {
        return;
      }
      var labelOpen = ns.qs('[data-collapse-label-open]', button);
      var labelClosed = ns.qs('[data-collapse-label-closed]', button);

      function set(open) {
        target.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
        if (labelOpen) {
          labelOpen.hidden = !open;
        }
        if (labelClosed) {
          labelClosed.hidden = open;
        }
      }

      set(target.classList.contains('is-open'));

      button.addEventListener('click', function () {
        set(!target.classList.contains('is-open'));
      });
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
