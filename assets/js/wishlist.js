/**
 * wishlist.js — "Merkliste": products saved with the heart button (localStorage, no backend).
 *
 * Markup contract:
 *   <button data-wishlist='{"number","name","price","image","path"}' aria-pressed="false">   toggle
 *   <span data-wishlist-count>                  number of saved products (header badge)
 *   <div data-wishlist-view>                    the /wishlist page content
 *
 * Exposes ns.wishlist (items, has, toggle, remove) and keeps all hearts on the page in sync,
 * also across browser tabs (storage event).
 */
(function (ns) {
  'use strict';

  var KEY = 'artisanshop.wishlist';
  var e = ns.escapeHtml;

  function items() {
    var list = ns.storage.get(KEY);
    return Array.isArray(list) ? list : [];
  }

  function save(list) {
    ns.storage.set(KEY, list);
    sync();
  }

  function has(number) {
    return items().some(function (item) { return item.number === number; });
  }

  ns.wishlist = {
    items: items,
    has: has,
    toggle: function (product) {
      var list = items();
      var next = list.filter(function (item) { return item.number !== product.number; });
      if (next.length === list.length) {
        next.unshift({ number: product.number, name: product.name, price: product.price, image: product.image, path: product.path });
      }
      save(next);
      return has(product.number);
    },
    remove: function (number) {
      save(items().filter(function (item) { return item.number !== number; }));
    }
  };

  function payload(button) {
    try {
      return JSON.parse(button.getAttribute('data-wishlist'));
    } catch (error) {
      return null;
    }
  }

  function sync() {
    var count = items().length;
    ns.qsa('[data-wishlist-count]').forEach(function (badge) {
      badge.textContent = count;
      badge.hidden = count === 0;
    });
    ns.qsa('[data-wishlist]').forEach(function (button) {
      var product = payload(button);
      var active = !!product && has(product.number);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? 'Von der Merkliste entfernen' : 'Auf die Merkliste setzen');
      button.title = active ? 'Von der Merkliste entfernen' : 'Auf die Merkliste setzen';
    });
    renderView();
  }

  function renderView() {
    var view = ns.qs('[data-wishlist-view]');
    if (!view) {
      return;
    }
    var list = items();
    if (!list.length) {
      view.innerHTML = '<p class="empty-state">Ihre Merkliste ist leer. Setzen Sie Artikel mit dem Herz-Symbol auf die Merkliste, um sie später wiederzufinden.</p>' +
        '<p><a class="btn btn--primary" href="/">Ersatzteile finden</a></p>';
      return;
    }
    view.innerHTML = '<ul class="wishlist-list">' + list.map(function (item) {
      var buy = e(JSON.stringify({ number: item.number, name: item.name, price: item.price, image: item.image, path: item.path }));
      return '<li class="wishlist-item">' +
        '<a class="wishlist-item__image" href="' + e(item.path) + '"><img src="' + e(item.image) + '" alt="" width="96" height="96" loading="lazy"></a>' +
        '<div class="wishlist-item__body"><a class="wishlist-item__name" href="' + e(item.path) + '">' + e(item.name) + '</a>' +
        '<p class="wishlist-item__meta">' + e(item.number) + '</p></div>' +
        '<p class="wishlist-item__price">' + (item.price == null ? '' : ns.cart.chf(item.price)) + '</p>' +
        '<div class="wishlist-item__actions">' +
        (item.price == null ? '' : '<button class="btn btn--primary btn--sm" type="button" data-add-to-cart="' + buy + '">In den Warenkorb</button>') +
        '<button class="btn btn--outline btn--sm" type="button" data-wishlist-remove="' + e(item.number) + '">Entfernen</button></div></li>';
    }).join('') + '</ul>' +
      '<p class="wishlist-actions"><button class="btn btn--secondary" type="button" data-wishlist-clear>Merkliste leeren</button></p>';
  }

  ns.register('wishlist', function () {
    document.addEventListener('click', function (event) {
      var heart = event.target.closest('[data-wishlist]');
      if (heart) {
        event.preventDefault();
        var product = payload(heart);
        if (product) {
          ns.wishlist.toggle(product);
        }
        return;
      }
      var remove = event.target.closest('[data-wishlist-remove]');
      if (remove) {
        ns.wishlist.remove(remove.getAttribute('data-wishlist-remove'));
        return;
      }
      if (event.target.closest('[data-wishlist-clear]')) {
        save([]);
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
