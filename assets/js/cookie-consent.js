/**
 * cookie-consent.js — consent dialog shown on the first visit.
 *
 * "Einstellungen" reveals the cookie groups, "Alle Cookies akzeptieren" and
 * "Speichern" store the choice in localStorage so the dialog is not shown
 * again. Like the original, the dialog cannot be dismissed without a choice.
 */
(function (ns) {
  'use strict';

  var STORAGE_KEY = 'artisanshop.cookieConsent';

  ns.register('cookieConsent', function () {
    var modal = ns.qs('[data-cookie-consent]');
    if (!modal || ns.storage.get(STORAGE_KEY)) {
      return;
    }

    var settings = ns.qs('[data-cookie-settings]', modal);
    var configure = ns.qs('[data-cookie-configure]', modal);
    var save = ns.qs('[data-cookie-save]', modal);
    var acceptAll = ns.qs('[data-cookie-accept-all]', modal);
    var optionalInputs = ns.qsa('input[name]', settings);
    var lastFocus = null;

    function collect() {
      var choices = {};
      optionalInputs.forEach(function (input) {
        choices[input.name] = input.checked;
      });
      return choices;
    }

    function open() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      ns.lockScroll(true);
      acceptAll.focus();
    }

    function close() {
      modal.hidden = true;
      ns.lockScroll(false);
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
    }

    function finish() {
      ns.storage.set(STORAGE_KEY, { savedAt: new Date().toISOString(), choices: collect() });
      close();
    }

    configure.addEventListener('click', function () {
      var expanded = !settings.classList.contains('is-open');
      settings.classList.toggle('is-open', expanded);
      configure.setAttribute('aria-expanded', String(expanded));
      save.hidden = !expanded;
    });

    // A group checkbox toggles all of its entries; entries update the group state.
    ns.qsa('[data-cookie-group]', settings).forEach(function (group) {
      var master = ns.qs('[data-cookie-group-input]', group);
      var entries = ns.qsa('input[name]', group);
      if (!master) {
        return;
      }
      master.addEventListener('change', function () {
        entries.forEach(function (entry) {
          entry.checked = master.checked;
        });
      });
      entries.forEach(function (entry) {
        entry.addEventListener('change', function () {
          var checked = entries.filter(function (e) { return e.checked; }).length;
          master.checked = checked === entries.length;
          master.indeterminate = checked > 0 && checked < entries.length;
        });
      });
    });

    acceptAll.addEventListener('click', function () {
      ns.qsa('input[type="checkbox"]:not([disabled])', settings).forEach(function (input) {
        input.checked = true;
        input.indeterminate = false;
      });
      finish();
    });

    save.addEventListener('click', finish);

    modal.addEventListener('keydown', function (event) {
      if (event.key === 'Tab') {
        ns.trapFocus(modal, event);
      }
    });

    open();
  });
})(window.ArtisanShop = window.ArtisanShop || {});
