/**
 * checkout.js — /checkout/confirm and /checkout/finish (demo checkout, no payment).
 *
 * The confirm form is prefilled from the logged-in account (name, e-mail, default
 * address and payment method). Submitting validates the form, stores the order
 * (in the account when logged in, always as "last order"), empties the cart and
 * opens /checkout/finish, which shows the order summary.
 */
(function (ns) {
  'use strict';

  var LAST_ORDER = 'artisanshop.lastOrder';
  var e = ns.escapeHtml;

  ns.register('checkout', function () {
    var form = ns.qs('[data-checkout-form]');
    if (form) {
      initConfirm(form);
    }
    var finish = ns.qs('[data-checkout-finish]');
    if (finish) {
      initFinish(finish);
    }
  });

  function initConfirm(form) {
    if (!ns.cart.items().length) {
      window.location.replace('/checkout/cart');
      return;
    }
    var user = ns.account.current();
    if (user) {
      ns.qs('[data-checkout-login]', form).hidden = true;
      var address = (user.addresses || [])[0] || { firstName: user.firstName, lastName: user.lastName };
      form.elements.email.value = user.email;
      ['salutation', 'firstName', 'lastName', 'street', 'zip', 'city', 'country'].forEach(function (name) {
        if (address[name] && form.elements[name]) {
          form.elements[name].value = address[name];
        }
      });
      var radio = ns.qs('input[name="payment"][value="' + user.payment + '"]', form);
      if (radio) {
        radio.checked = true;
      }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var error = ns.qs('[data-form-error]', form);
      var invalid = ns.qsa('input, select, textarea', form).filter(function (field) { return !field.checkValidity(); })[0];
      if (invalid) {
        var label = invalid.closest('label');
        error.textContent = (label ? label.textContent.trim().split('*')[0].trim() + ': ' : '') + invalid.validationMessage;
        invalid.focus();
        return;
      }
      var items = ns.cart.items();
      var t = ns.cart.totals(items);
      var f = form.elements;
      var order = {
        number: String(Date.now()).slice(-8),
        date: new Date().toISOString(),
        status: 'Offen',
        email: f.email.value.trim(),
        address: { salutation: f.salutation.value, firstName: f.firstName.value.trim(), lastName: f.lastName.value.trim(), street: f.street.value.trim(), zip: f.zip.value.trim(), city: f.city.value.trim(), country: f.country.value },
        payment: ns.qs('input[name="payment"]:checked', form).value,
        items: items,
        subtotal: t.subtotal,
        shipping: t.shipping,
        total: t.total
      };
      ns.account.saveOrder(order);
      ns.storage.set(LAST_ORDER, order);
      ns.cart.clear();
      window.location.href = '/checkout/finish';
    });
  }

  function initFinish(root) {
    var order = ns.storage.get(LAST_ORDER);
    if (!order) {
      return;
    }
    ns.qs('[data-order-details]', root).innerHTML =
      '<p class="checkout-finish__lead">Ihre Bestellnummer: <strong>#' + e(order.number) + '</strong></p>' +
      '<p class="checkout__demo">Demo: Es wurde keine echte Bestellung ausgelöst und keine Zahlung ausgeführt.</p>' +
      '<div class="checkout-finish__grid">' +
        '<section class="account-card"><h2>Rechnungsadresse</h2><p>' + ns.account.addressHtml(order.address) + '</p></section>' +
        '<section class="account-card"><h2>Zahlungsart</h2><p>' + e(ns.account.paymentLabel(order.payment)) + '</p><h2>Versandart</h2><p>Schweizer Post</p></section>' +
      '</div>' +
      ns.account.orderHtml(order) +
      '<p><a class="btn btn--primary" href="/">Weiter einkaufen</a> ' + (ns.account.current() ? '<a class="btn btn--secondary" href="/account/order">Bestellungen</a>' : '') + '</p>';
  }
})(window.ArtisanShop = window.ArtisanShop || {});
