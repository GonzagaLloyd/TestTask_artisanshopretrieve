/**
 * my-appliances.js — "Meine Geräte": appliances the visitor saved, for quick access to their
 * spare-part page (kept in localStorage; no backend).
 *
 * Markup contract:
 *   <button data-save-appliance='{"name","path","category"}'><span>label</span></button>
 *   <ul data-my-appliances>   list; its closest [data-my-appliances-section] is hidden when empty
 */
(function (ns) {
  'use strict';

  var KEY = 'artisanshop.appliances';
  var e = ns.escapeHtml;

  function items() {
    var list = ns.storage.get(KEY);
    return Array.isArray(list) ? list : [];
  }

  function payload(button) {
    try {
      return JSON.parse(button.getAttribute('data-save-appliance'));
    } catch (error) {
      return null;
    }
  }

  function sync() {
    var list = items();
    ns.qsa('[data-save-appliance]').forEach(function (button) {
      var appliance = payload(button);
      var saved = !!appliance && list.some(function (item) { return item.path === appliance.path; });
      button.classList.toggle('is-active', saved);
      button.setAttribute('aria-pressed', String(saved));
      ns.qs('span', button).textContent = saved ? 'Gerät gespeichert' : 'Gerät speichern';
    });
    ns.qsa('[data-my-appliances]').forEach(function (ul) {
      ul.innerHTML = list.map(function (item) {
        return '<li class="my-appliances__item"><a href="' + e(item.path) + '"><strong>' + e(item.name) + '</strong>' +
          (item.category ? '<span>' + e(item.category) + '</span>' : '') + '</a>' +
          '<button class="my-appliances__remove" type="button" data-remove-appliance="' + e(item.path) + '" aria-label="' + e(item.name) + ' entfernen">×</button></li>';
      }).join('');
      var section = ul.closest('[data-my-appliances-section]');
      if (section) {
        section.hidden = !list.length;
      }
    });
  }

  ns.register('myAppliances', function () {
    document.addEventListener('click', function (event) {
      var save = event.target.closest('[data-save-appliance]');
      if (save) {
        var appliance = payload(save);
        if (appliance) {
          var list = items();
          var next = list.filter(function (item) { return item.path !== appliance.path; });
          if (next.length === list.length) {
            next.unshift(appliance);
          }
          ns.storage.set(KEY, next.slice(0, 20));
          sync();
        }
        return;
      }
      var remove = event.target.closest('[data-remove-appliance]');
      if (remove) {
        ns.storage.set(KEY, items().filter(function (item) { return item.path !== remove.getAttribute('data-remove-appliance'); }));
        sync();
      }
    });
    window.addEventListener('storage', function (event) {
      if (event.key === KEY) {
        sync();
      }
    });
    sync();
  });
})(window.ArtisanShop = window.ArtisanShop || {});
