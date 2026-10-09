/**
 * account.js — customer account simulated in localStorage (no backend): login and
 * registration, header menu state, profile, addresses, payment method, orders.
 * Passwords are stored as SHA-256 hash. Exposes ns.account for checkout.js.
 */
(function (ns) {
  'use strict';

  var ACCOUNTS = 'artisanshop.accounts';
  var SESSION = 'artisanshop.session';
  var PAYMENT_LABELS = { paypal: 'PayPal', twint: 'Twint', creditcard: 'Kreditkarte', applepay: 'Apple Pay', klarna: 'Klarna' };
  var ADDRESS = ['salutation', 'firstName', 'lastName', 'company', 'department', 'street', 'zip', 'city', 'country'];
  var e = ns.escapeHtml;

  function accounts() {
    return ns.storage.get(ACCOUNTS) || {};
  }

  function current() {
    var email = ns.storage.get(SESSION);
    return email ? accounts()[email] || null : null;
  }

  function update(account) {
    var all = accounts();
    all[account.email] = account;
    ns.storage.set(ACCOUNTS, all);
  }

  function hash(password) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.resolve('plain:' + password); // ponytail: insecure contexts (http) lack crypto.subtle; demo only
    }
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)).then(function (buffer) {
      return Array.prototype.map.call(new Uint8Array(buffer), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  function formData(form) {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (field) {
      if (field.name && field.type !== 'submit') {
        data[field.name] = field.type === 'checkbox' ? field.checked : field.type === 'radio' ? (field.checked ? field.value : data[field.name]) : field.value.trim();
      }
    });
    return data;
  }

  function valid(form) {
    var error = ns.qs('[data-form-error]', form);
    var invalid = ns.qsa('input, select, textarea', form).filter(function (field) { return !field.checkValidity(); })[0];
    if (error) {
      error.textContent = invalid ? (invalid.closest('label').querySelector('span').textContent.replace('*', '') + ': ' + invalid.validationMessage) : '';
    }
    if (invalid) {
      invalid.focus();
    }
    return !invalid;
  }

  function fail(form, message) {
    ns.qs('[data-form-error]', form).textContent = message;
  }

  function redirectTarget() {
    var target = new URLSearchParams(window.location.search).get('redirectTo') || '/account';
    return target.charAt(0) === '/' && target.charAt(1) !== '/' ? target : '/account'; // same-site only
  }

  function login(email) {
    ns.storage.set(SESSION, email);
    window.location.href = redirectTarget();
  }

  function logout() {
    ns.storage.set(SESSION, null);
    window.location.href = '/';
  }

  function addressHtml(a) {
    return e(a.salutation && a.salutation !== 'Keine Angabe' ? a.salutation + ' ' : '') + e(a.firstName + ' ' + a.lastName) + '<br>' +
      (a.company ? e(a.company) + (a.department ? ' – ' + e(a.department) : '') + '<br>' : '') +
      e(a.street) + '<br>' + e(((a.zip || '') + ' ' + a.city).trim()) + '<br>' + e(a.country);
  }

  /** Address fields of a form, optionally with a name prefix ("shipping_") */
  function pickAddress(data, prefix) {
    var address = {};
    ADDRESS.forEach(function (key) {
      if (data[(prefix || '') + key]) {
        address[key] = data[(prefix || '') + key];
      }
    });
    return address;
  }

  function orderHtml(order) {
    return '<article class="order-card">' +
      '<header class="order-card__header"><h3>Bestellung ' + e(order.number) + '</h3><p>' + new Date(order.date).toLocaleDateString('de-CH') + ' · ' + e(order.status) + '</p></header>' +
      '<ul class="order-card__items">' + order.items.map(function (item) {
        return '<li><a href="' + e(item.path) + '">' + e(item.name) + '</a> <span>' + item.qty + ' × ' + ns.cart.chf(item.price) + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="order-card__total">Gesamtsumme: <strong>' + ns.cart.chf(order.total) + '</strong> · ' + e(PAYMENT_LABELS[order.payment] || order.payment) + '</p>' +
    '</article>';
  }

  ns.account = {
    current: current,
    paymentLabel: function (key) { return PAYMENT_LABELS[key] || key; },
    addressHtml: addressHtml,
    orderHtml: orderHtml,
    saveOrder: function (order) {
      var account = current();
      if (account) {
        account.orders = [order].concat(account.orders || []);
        update(account);
      }
    }
  };

  ns.register('account', function () {
    var user = current();
    var label = ns.qs('.site-header__action-label');
    if (user && label) {
      label.textContent = user.firstName;
      ns.qsa('[data-guest-only]').forEach(function (el) { el.hidden = true; });
      ns.qsa('[data-user-only]').forEach(function (el) { el.hidden = false; });
      var title = ns.qs('.account-menu__title');
      if (title) {
        title.textContent = 'Hallo ' + user.firstName + ' ' + user.lastName;
      }
    }
    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-logout]')) {
        logout();
      }
    });
    var page = ns.qs('[data-requires-login]');
    if (page && !user) {
      window.location.replace('/account/login?redirectTo=' + encodeURIComponent(window.location.pathname));
      return;
    }
    var loginForm = ns.qs('[data-login-form]');
    if (loginForm) {
      if (user) {
        window.location.replace(redirectTarget());
        return;
      }
      loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!valid(loginForm)) {
          return;
        }
        var data = formData(loginForm);
        var account = accounts()[data.email.toLowerCase()];
        hash(data.password).then(function (digest) {
          if (!account || account.password !== digest) {
            fail(loginForm, 'Die E-Mail-Adresse oder das Passwort ist nicht korrekt.');
            return;
          }
          login(account.email);
        });
      });
    }

    var registerForm = ns.qs('[data-register-form]');
    if (registerForm) {
      var shipping = ns.qs('#register-shipping', registerForm);
      ns.qsa('input[name="differentShipping"]', registerForm).forEach(function (radio) {
        radio.addEventListener('change', function () {
          var open = !!radio.value && radio.checked;
          shipping.classList.toggle('is-open', open);
          shipping.disabled = !open;
        });
      });
      registerForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!valid(registerForm)) {
          return;
        }
        var data = formData(registerForm);
        var email = data.email.toLowerCase();
        if (accounts()[email]) {
          fail(registerForm, 'Für diese E-Mail-Adresse besteht bereits ein Konto. Bitte melden Sie sich an.');
          return;
        }
        var addresses = [pickAddress(data)];
        if (data.differentShipping) {
          addresses.push(pickAddress(data, 'shipping_'));
        }
        hash(data.password).then(function (digest) {
          update({ email: email, firstName: data.firstName, lastName: data.lastName, password: digest, addresses: addresses, payment: 'paypal', orders: [] });
          login(email);
        });
      });
    }

    if (!user) {
      return;
    }
    var overview = ns.qs('[data-account-overview]');
    if (overview) {
      var address = (user.addresses || [])[0];
      var last = (user.orders || [])[0];
      overview.innerHTML =
        '<section class="account-card"><h2>Persönliches Profil</h2><p>' + e(user.firstName + ' ' + user.lastName) + '<br>' + e(user.email) + '</p><a href="/account/profile">Profil ändern</a></section>' +
        '<section class="account-card"><h2>Standard-Zahlungsart</h2><p>' + e(PAYMENT_LABELS[user.payment] || '–') + '</p><a href="/account/payment">Zahlungsart ändern</a></section>' +
        '<section class="account-card"><h2>Standard-Adresse</h2><p>' + (address ? addressHtml(address) : 'Noch keine Adresse hinterlegt.') + '</p><a href="/account/address">Adressen verwalten</a></section>' +
        '<section class="account-card account-card--wide"><h2>Letzte Bestellung</h2>' + (last ? orderHtml(last) : '<p>Sie haben noch keine Bestellungen.</p>') + '</section>';
    }
    var profileForm = ns.qs('[data-profile-form]');
    if (profileForm) {
      profileForm.elements.firstName.value = user.firstName;
      profileForm.elements.lastName.value = user.lastName;
      profileForm.elements.email.value = user.email;
      profileForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!valid(profileForm)) {
          return;
        }
        var data = formData(profileForm);
        var email = data.email.toLowerCase();
        if (email !== user.email && accounts()[email]) {
          fail(profileForm, 'Diese E-Mail-Adresse wird bereits verwendet.');
          return;
        }
        var all = accounts();
        delete all[user.email];
        ns.storage.set(ACCOUNTS, all);
        user.firstName = data.firstName;
        user.lastName = data.lastName;
        user.email = email;
        update(user);
        ns.storage.set(SESSION, email);
        fail(profileForm, 'Ihre Daten wurden gespeichert.');
      });
    }

    var passwordForm = ns.qs('[data-password-form]');
    if (passwordForm) {
      passwordForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!valid(passwordForm)) {
          return;
        }
        var data = formData(passwordForm);
        hash(data.current).then(function (digest) {
          if (digest !== user.password) {
            fail(passwordForm, 'Das aktuelle Passwort ist nicht korrekt.');
            return null;
          }
          return hash(data.password).then(function (next) {
            user.password = next;
            update(user);
            passwordForm.reset();
            fail(passwordForm, 'Ihr Passwort wurde geändert.');
          });
        });
      });
    }
    var addressList = ns.qs('[data-address-list]');
    var addressForm = ns.qs('[data-address-form]');
    function renderAddresses() {
      var list = user.addresses || [];
      addressList.innerHTML = list.length
        ? '<ul class="address-cards">' + list.map(function (a, i) {
            return '<li class="account-card"><p>' + addressHtml(a) + '</p>' +
              (i === 0 ? '<p class="tag-badge">Standard-Adresse</p>' : '<button class="link-btn" type="button" data-address-default="' + i + '">Als Standard festlegen</button>') +
              ' <button class="link-btn" type="button" data-address-delete="' + i + '">Löschen</button></li>';
          }).join('') + '</ul>'
        : '<p class="empty-state">Sie haben noch keine Adresse hinterlegt.</p>';
    }
    if (addressList && addressForm) {
      renderAddresses();
      addressForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!valid(addressForm)) {
          return;
        }
        user.addresses = (user.addresses || []).concat([pickAddress(formData(addressForm))]);
        update(user);
        addressForm.reset();
        addressForm.closest('details').open = false;
        renderAddresses();
      });
      addressList.addEventListener('click', function (event) {
        var del = event.target.closest('[data-address-delete]');
        var def = event.target.closest('[data-address-default]');
        if (del) {
          user.addresses.splice(+del.getAttribute('data-address-delete'), 1);
        } else if (def) {
          user.addresses.unshift(user.addresses.splice(+def.getAttribute('data-address-default'), 1)[0]);
        } else {
          return;
        }
        update(user);
        renderAddresses();
      });
    }
    var paymentForm = ns.qs('[data-payment-form]');
    if (paymentForm) {
      var radio = ns.qs('input[value="' + user.payment + '"]', paymentForm);
      if (radio) {
        radio.checked = true;
      }
      paymentForm.addEventListener('submit', function (event) {
        event.preventDefault();
        user.payment = formData(paymentForm).payment;
        update(user);
        fail(paymentForm, 'Ihre Standard-Zahlungsart wurde gespeichert.');
      });
    }
    var orderList = ns.qs('[data-order-list]');
    if (orderList) {
      orderList.innerHTML = (user.orders || []).length
        ? user.orders.map(orderHtml).join('')
        : '<p class="empty-state">Sie haben noch keine Bestellungen.</p>';
    }
  });
})(window.ArtisanShop = window.ArtisanShop || {});
