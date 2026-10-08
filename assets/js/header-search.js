/**
 * header-search.js — header search field.
 *
 * - On small screens the field is collapsed and toggled by the search icon
 *   (and by the search shortcut inside the hero banner).
 * - The clear button appears as soon as the field has a value.
 * - There is no search backend in this static recreation, so submitting a
 *   query shows a status message instead of navigating to /search.
 */
(function (ns) {
  'use strict';

  ns.register('headerSearch', function () {
    var container = ns.qs('#header-search');
    var input = ns.qs('#header-search-input');
    var mainToggle = ns.qs('.site-header__search-toggle');

    if (container && input) {
      var setOpen = function (open) {
        container.classList.toggle('is-open', open);
        document.body.classList.toggle('is-search-open', open);
        if (mainToggle) {
          mainToggle.setAttribute('aria-expanded', String(open));
          mainToggle.setAttribute('aria-label', open ? 'Suche schließen' : 'Suche öffnen');
        }
        if (open) {
          input.focus();
        }
      };

      ns.qsa('[data-search-toggle]').forEach(function (button) {
        button.addEventListener('click', function () {
          var open = !container.classList.contains('is-open');
          setOpen(open);
          if (open) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !ns.mq.lg.matches && container.classList.contains('is-open')) {
          setOpen(false);
          if (mainToggle) {
            mainToggle.focus();
          }
        }
      });

      ns.mq.lg.addEventListener('change', function (event) {
        if (event.matches) {
          setOpen(false);
        }
      });
    }

    // Clear button + demo submit handling for every search form on the page
    ns.qsa('[data-search-form]').forEach(function (form) {
      var field = ns.qs('input[type="search"]', form);
      var clear = ns.qs('.search-form__clear', form);
      var hint = ns.qs('.search-form__hint', form);
      if (!field) {
        return;
      }

      if (clear) {
        var syncClear = function () {
          clear.hidden = field.value.length === 0;
        };
        field.addEventListener('input', syncClear);
        clear.addEventListener('click', function () {
          field.value = '';
          syncClear();
          field.focus();
        });
        syncClear();
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var query = field.value.trim();
        if (!hint) {
          return;
        }
        if (query.length < 3) {
          hint.textContent = 'Bitte mindestens 3 Zeichen eingeben.';
          field.focus();
          return;
        }
        hint.textContent = 'Die Suche nach „' + query + '“ ist in dieser statischen Demo nicht verfügbar.';
      });

      field.addEventListener('input', function () {
        if (hint) {
          hint.textContent = '';
        }
      });
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
