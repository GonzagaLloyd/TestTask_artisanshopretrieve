/**
 * dropdown.js — small toggle menus (account menu, country switch).
 *
 * Markup contract:
 *   <div data-dropdown>
 *     <button data-dropdown-toggle aria-expanded="false" aria-controls="menu-id">
 *     <div class="dropdown__menu" id="menu-id" hidden>
 */
(function (ns) {
  'use strict';

  ns.register('dropdown', function () {
    var dropdowns = ns.qsa('[data-dropdown]');
    if (!dropdowns.length) {
      return;
    }

    function parts(dropdown) {
      return {
        toggle: ns.qs('[data-dropdown-toggle]', dropdown),
        menu: ns.qs('.dropdown__menu', dropdown)
      };
    }

    function close(dropdown) {
      var p = parts(dropdown);
      if (p.menu && !p.menu.hidden) {
        p.menu.hidden = true;
        p.toggle.setAttribute('aria-expanded', 'false');
      }
    }

    function open(dropdown) {
      dropdowns.forEach(function (other) {
        if (other !== dropdown) {
          close(other);
        }
      });
      var p = parts(dropdown);
      p.menu.hidden = false;
      p.toggle.setAttribute('aria-expanded', 'true');
    }

    dropdowns.forEach(function (dropdown) {
      var p = parts(dropdown);
      if (!p.toggle || !p.menu) {
        return;
      }

      p.toggle.addEventListener('click', function () {
        if (p.menu.hidden) {
          open(dropdown);
        } else {
          close(dropdown);
        }
      });

      dropdown.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !p.menu.hidden) {
          close(dropdown);
          p.toggle.focus();
        }
      });

      dropdown.addEventListener('focusout', function (event) {
        if (event.relatedTarget && !dropdown.contains(event.relatedTarget)) {
          close(dropdown);
        }
      });
    });

    document.addEventListener('click', function (event) {
      dropdowns.forEach(function (dropdown) {
        if (!dropdown.contains(event.target)) {
          close(dropdown);
        }
      });
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
