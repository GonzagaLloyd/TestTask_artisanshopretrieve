/**
 * cart.js — shopping cart kept in localStorage (no backend in this recreation).
 *
 * Markup contract:
 *   <button data-add-to-cart='{"number","name","price","image","path"}'>   add one item
 *   <form data-buy-form> … <input name="qty"> <button data-add-to-cart=…>   add with quantity
 *   <span data-cart-count>                 number of items (header badge)
 *   <div data-cart-view="offcanvas|page|summary">   rendered cart
 *
 * Exposes ns.cart (items, add, setQty, remove, clear, totals, render) for checkout.js.
 */
(function (ns) {
  'use strict';

  var KEY = 'artisanshop.cart';
  var SHIPPING = 8.95;

  function items() {
    var list = ns.storage.get(KEY);
    return Array.isArray(list) ? list : [];
  }

  function save(list) {
    ns.storage.set(KEY, list);
    render();
  }

  function chf(value) {
    return 'CHF ' + value.toFixed(2);
  }

  function totals(list) {
    list = list || items();
    var subtotal = list.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
    var shipping = list.length ? SHIPPING : 0;
    return { count: list.reduce(function (n, item) { return n + item.qty; }, 0), subtotal: subtotal, shipping: shipping, total: subtotal + shipping };
  }

  ns.cart = {
    items: items,
    totals: totals,
    chf: chf,
    add: function (product, qty) {
      var list = items();
      var existing = list.filter(function (item) { return item.number === product.number; })[0];
      if (existing) {
        existing.qty = Math.min(99, existing.qty + qty);
      } else {
        list.push({ number: product.number, name: product.name, price: product.price, image: product.image, path: product.path, qty: qty });
      }
      save(list);
    },
    setQty: function (number, qty) {
      save(items().map(function (item) {
        if (item.number === number) {
          item.qty = Math.max(1, Math.min(99, qty));
        }
        return item;
      }));
    },
    remove: function (number) {
      save(items().filter(function (item) { return item.number !== number; }));
    },
    clear: function () {
      save([]);
    },
    render: render
  };

  function lineItem(item, editable) {
    var e = ns.escapeHtml;
    return '<li class="cart-item">' +
      '<img class="cart-item__image" src="' + e(item.image) + '" alt="" width="64" height="64">' +
      '<div class="cart-item__body">' +
        '<a class="cart-item__name" href="' + e(item.path) + '">' + e(item.name) + '</a>' +
        '<p class="cart-item__meta">' + e(item.number) + ' · ' + chf(item.price) + '</p>' +
        (editable
          ? '<div class="cart-item__actions">' +
              '<label class="cart-item__qty"><span class="visually-hidden">Menge</span>' +
              '<input class="form-control" type="number" min="1" max="99" value="' + item.qty + '" data-cart-qty="' + e(item.number) + '"></label>' +
              '<button class="link-btn" type="button" data-cart-remove="' + e(item.number) + '">Entfernen</button>' +
            '</div>'
          : '<p class="cart-item__meta">Menge: ' + item.qty + '</p>') +
      '</div>' +
      '<p class="cart-item__total">' + chf(item.price * item.qty) + '</p>' +
    '</li>';
  }

  function summary(t) {
    return '<dl class="cart-totals">' +
      '<div><dt>Zwischensumme</dt><dd>' + chf(t.subtotal) + '</dd></div>' +
      '<div><dt>Versandkosten</dt><dd>' + chf(t.shipping) + '</dd></div>' +
      '<div class="cart-totals__total"><dt>Gesamtsumme</dt><dd>' + chf(t.total) + '</dd></div>' +
      '<div class="cart-totals__tax"><dt>inkl. 8,1 % MwSt.</dt><dd>' + chf(t.total - t.total / 1.081) + '</dd></div>' +
    '</dl>';
  }

  function render() {
    var list = items();
    var t = totals(list);

    ns.qsa('[data-cart-count]').forEach(function (badge) {
      badge.textContent = t.count;
      badge.hidden = t.count === 0;
    });

    ns.qsa('[data-cart-view]').forEach(function (view) {
      var mode = view.getAttribute('data-cart-view');
      if (!list.length) {
        view.innerHTML = '<p class="cart__empty">Ihr Warenkorb ist leer.</p>' +
          (mode === 'summary' ? '' : '<a class="btn btn--primary" href="/">Weiter einkaufen</a>');
        return;
      }
      var editable = mode !== 'summary';
      view.innerHTML = '<ul class="cart-items">' + list.map(function (item) { return lineItem(item, editable); }).join('') + '</ul>' +
        summary(t) +
        (mode === 'offcanvas'
          ? '<div class="cart-actions"><a class="btn btn--primary btn--block" href="/checkout/confirm">Zur Kasse</a>' +
            '<a class="btn btn--secondary btn--block" href="/checkout/cart">Warenkorb anzeigen</a></div>'
          : mode === 'page'
            ? '<div class="cart-actions cart-actions--page"><a class="btn btn--secondary" href="/">Weiter einkaufen</a>' +
              '<a class="btn btn--primary" href="/checkout/confirm">Zur Kasse</a></div>'
            : '');
    });
  }

  ns.register('cart', function () {
    render();

    document.addEventListener('click', function (event) {
      var add = event.target.closest('[data-add-to-cart]');
      if (add && !add.closest('[data-buy-form]')) {
        ns.cart.add(JSON.parse(add.getAttribute('data-add-to-cart')), 1);
        openCart(add);
        return;
      }
      var remove = event.target.closest('[data-cart-remove]');
      if (remove) {
        ns.cart.remove(remove.getAttribute('data-cart-remove'));
      }
    });

    document.addEventListener('change', function (event) {
      var qty = event.target.closest('[data-cart-qty]');
      if (qty) {
        ns.cart.setQty(qty.getAttribute('data-cart-qty'), parseInt(qty.value, 10) || 1);
      }
    });

    ns.qsa('[data-buy-form]').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var button = ns.qs('[data-add-to-cart]', form);
        var qty = parseInt(form.elements.qty.value, 10) || 1;
        ns.cart.add(JSON.parse(button.getAttribute('data-add-to-cart')), Math.max(1, Math.min(99, qty)));
        openCart(button);
      });
    });

    window.addEventListener('storage', function (event) {
      if (event.key === KEY) {
        render();
      }
    });
  });

  function openCart(trigger) {
    var panel = document.getElementById('offcanvas-cart');
    if (panel && ns.offcanvas) {
      ns.offcanvas.open(panel, trigger);
    }
  }
})(window.ArtisanShop = window.ArtisanShop || {});
