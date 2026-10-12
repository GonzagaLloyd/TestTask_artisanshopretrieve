/**
 * order-tracking.js — order tracking ("Bestellung verfolgen") and re-ordering.
 *
 * Orders placed in this browser are logged under artisanshop.orders (checkout via
 * ns.account.saveOrder), so guests can look them up too. There is no shop backend, so the
 * shipping status is a demo: it advances with the age of the order.
 *
 * Markup contract:
 *   <form data-track-form> <input name="order"> <div data-track-result>
 *   <button data-reorder="ORDERNUMBER">   puts all items of the order back into the cart
 */
(function (ns) {
  'use strict';

  var LOG = 'artisanshop.orders';
  var e = ns.escapeHtml;
  var HOUR = 3600 * 1000;

  var STEPS = [
    { label: 'Bestellung eingegangen', after: 0 },
    { label: 'Zahlung bestätigt', after: 0.1 * HOUR },
    { label: 'In Bearbeitung im Lager', after: 2 * HOUR },
    { label: 'An die Schweizer Post übergeben', after: 24 * HOUR },
    { label: 'Zugestellt', after: 72 * HOUR }
  ];

  function allOrders() {
    var log = ns.storage.get(LOG);
    var user = ns.account && ns.account.current();
    var orders = (Array.isArray(log) ? log : []).concat(user && user.orders ? user.orders : []);
    var seen = {};
    return orders.filter(function (order) {
      return !seen[order.number] && (seen[order.number] = true);
    });
  }

  function find(number) {
    var wanted = String(number).replace(/[^0-9a-z]/gi, '').toLowerCase();
    return allOrders().filter(function (order) { return String(order.number).toLowerCase() === wanted; })[0];
  }

  function timeline(order) {
    var start = new Date(order.date).getTime();
    var reached = STEPS.filter(function (step) { return Date.now() - start >= step.after; }).length;
    return '<ol class="timeline">' + STEPS.map(function (step, i) {
      var done = i < reached;
      var date = new Date(start + step.after);
      var current = i === reached - 1;
      return '<li class="timeline__step' + (done ? ' is-done' : '') + (current ? ' is-current' : '') + '"' + (current ? ' aria-current="step"' : '') + '>' +
        '<span class="timeline__label">' + e(step.label) + '</span>' +
        '<span class="timeline__date">' + (done ? date.toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' }) : 'voraussichtlich ' + date.toLocaleDateString('de-CH')) + '</span></li>';
    }).join('') + '</ol>';
  }

  function show(root, order) {
    var result = ns.qs('[data-track-result]', root);
    if (!order) {
      result.innerHTML = '<p class="form-error" role="alert">Zu dieser Bestellnummer wurde in diesem Browser keine Bestellung gefunden. Bestellungen werden nur auf dem Gerät gespeichert, mit dem sie aufgegeben wurden.</p>';
      return;
    }
    result.innerHTML = '<section class="account-card account-card--wide"><h2>Bestellung #' + e(order.number) + '</h2>' +
      '<p>Bestellt am ' + new Date(order.date).toLocaleDateString('de-CH') + ' · ' + ns.cart.chf(order.total) + '</p>' +
      timeline(order) +
      '<p class="checkout__demo">Demo: Der Status wird aus dem Alter der Bestellung berechnet, es wurde nichts versendet.</p>' +
      '<p><button class="btn btn--outline" type="button" data-reorder="' + e(order.number) + '">Erneut bestellen</button></p></section>';
  }

  ns.register('orderTracking', function () {
    var form = ns.qs('[data-track-form]');
    if (form) {
      var param = new URLSearchParams(window.location.search).get('order');
      var run = function (number) { show(form.parentElement, find(number)); };
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        run(form.elements.order.value);
      });
      if (param) {
        form.elements.order.value = param;
        run(param);
      }
    }

    document.addEventListener('click', function (event) {
      var button = event.target.closest('[data-reorder]');
      if (!button) {
        return;
      }
      var order = find(button.getAttribute('data-reorder'));
      if (order) {
        order.items.forEach(function (item) { ns.cart.add(item, item.qty); });
        window.location.href = '/checkout/cart';
      }
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
