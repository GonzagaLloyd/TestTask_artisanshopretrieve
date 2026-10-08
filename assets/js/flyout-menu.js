/**
 * flyout-menu.js — desktop "Navigation" mega menu (three columns).
 *
 * Hover and :focus-within open the sub levels via CSS; this module handles
 * the toggle button, outside clicks, Escape, keyboard arrows and touch
 * devices (where the first tap on a parent item opens its sub level).
 */
(function (ns) {
  'use strict';

  ns.register('flyoutMenu', function () {
    var toggle = ns.qs('[data-flyout-toggle]');
    var menu = ns.qs('#main-menu');
    if (!toggle || !menu) {
      return;
    }
    var header = toggle.closest('.site-header') || document.body;

    function deactivate(scope) {
      ns.qsa('.flyout__item.is-active', scope || menu).forEach(function (item) {
        item.classList.remove('is-active');
        var link = ns.qs(':scope > .flyout__link--parent', item);
        if (link) {
          link.setAttribute('aria-expanded', 'false');
        }
      });
    }

    function activate(item) {
      deactivate(item.parentElement);
      item.classList.add('is-active');
      var link = ns.qs(':scope > .flyout__link--parent', item);
      if (link) {
        link.setAttribute('aria-expanded', 'true');
      }
    }

    function open() {
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      header.classList.add('is-flyout-open');
    }

    function close() {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      header.classList.remove('is-flyout-open');
      deactivate();
    }

    toggle.addEventListener('click', function () {
      if (menu.hidden) {
        open();
      } else {
        close();
      }
    });

    document.addEventListener('click', function (event) {
      if (!menu.hidden && !header.contains(event.target)) {
        close();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (!menu.hidden && event.key === 'Escape') {
        close();
        toggle.focus();
      }
    });

    // Touch devices have no hover: the first tap on a parent opens its children.
    menu.addEventListener('click', function (event) {
      var link = event.target.closest('.flyout__link--parent');
      if (!link || !ns.mq.noHover.matches) {
        return;
      }
      var item = link.parentElement;
      if (!item.classList.contains('is-active')) {
        event.preventDefault();
        activate(item);
      }
    });

    // Keyboard navigation between and into levels
    menu.addEventListener('keydown', function (event) {
      var link = event.target.closest('.flyout__link');
      if (!link) {
        return;
      }
      var item = link.parentElement;
      var target = null;

      switch (event.key) {
        case 'ArrowDown':
          target = item.nextElementSibling && ns.qs(':scope > .flyout__link', item.nextElementSibling);
          break;
        case 'ArrowUp':
          target = item.previousElementSibling && ns.qs(':scope > .flyout__link', item.previousElementSibling);
          break;
        case 'ArrowRight':
          if (link.classList.contains('flyout__link--parent')) {
            activate(item);
            target = ns.qs(':scope > ul > li > .flyout__link', item);
          }
          break;
        case 'ArrowLeft':
          var parentItem = item.parentElement.closest('.flyout__item');
          target = parentItem && ns.qs(':scope > .flyout__link', parentItem);
          if (parentItem) {
            deactivate(parentItem);
          }
          break;
        default:
          return;
      }

      if (target) {
        event.preventDefault();
        target.focus();
      }
    });

    // The flyout only exists on large screens
    ns.mq.lg.addEventListener('change', function (event) {
      if (!event.matches) {
        close();
      }
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
