/**
 * offcanvas.js — side panels (mobile menu, appliance search, cart).
 *
 * Markup contract:
 *   <button data-offcanvas-open="panel-id" aria-expanded="false">
 *   <aside class="offcanvas" id="panel-id" tabindex="-1" inert>
 *     <button data-offcanvas-close>
 *   <div data-offcanvas-backdrop hidden>
 *
 * Closed panels carry the `inert` attribute, which removes them from the tab
 * order and the accessibility tree while they are slid out of view.
 */
(function (ns) {
  'use strict';

  ns.register('offcanvas', function () {
    var backdrop = ns.qs('[data-offcanvas-backdrop]');
    if (!backdrop) {
      return;
    }

    var current = null;
    var lastTrigger = null;

    function setExpanded(id, state) {
      ns.qsa('[data-offcanvas-open="' + id + '"]').forEach(function (button) {
        button.setAttribute('aria-expanded', String(state));
      });
    }

    function open(panel, trigger) {
      if (current && current !== panel) {
        close(current, false);
      }
      current = panel;
      lastTrigger = trigger || null;

      panel.inert = false;
      panel.classList.add('is-open');
      setExpanded(panel.id, true);
      backdrop.hidden = false;
      ns.lockScroll(true);

      // Wait for the slide-in transition to start before moving focus.
      window.requestAnimationFrame(function () {
        var first = ns.getFocusable(panel)[0];
        (first || panel).focus();
      });
    }

    function close(panel, restoreFocus) {
      panel.classList.remove('is-open');
      panel.inert = true;
      setExpanded(panel.id, false);

      if (current === panel) {
        current = null;
        backdrop.hidden = true;
        ns.lockScroll(false);
      }
      if (restoreFocus !== false && lastTrigger) {
        lastTrigger.focus();
      }
    }

    document.addEventListener('click', function (event) {
      var opener = event.target.closest('[data-offcanvas-open]');
      if (opener) {
        var panel = document.getElementById(opener.getAttribute('data-offcanvas-open'));
        if (panel) {
          event.preventDefault();
          open(panel, opener);
        }
        return;
      }

      var closer = event.target.closest('[data-offcanvas-close]');
      if (closer) {
        var parent = closer.closest('.offcanvas');
        if (parent) {
          close(parent);
        }
      }
    });

    backdrop.addEventListener('click', function () {
      if (current) {
        close(current);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (!current) {
        return;
      }
      if (event.key === 'Escape') {
        close(current);
      } else if (event.key === 'Tab') {
        ns.trapFocus(current, event);
      }
    });

    // Public API for other modules
    ns.offcanvas = { open: open, close: close };
  });
})(window.ArtisanShop = window.ArtisanShop || {});
