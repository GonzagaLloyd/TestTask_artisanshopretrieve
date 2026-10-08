/**
 * utils.js — shared helpers and the tiny module registry used by all other
 * scripts. Every script file registers an `init` function on the global
 * `ArtisanShop` namespace; main.js runs them once the DOM is ready.
 *
 * Classic scripts (instead of ES modules) are used on purpose so the page
 * also works when index.html is opened directly from the file system.
 */
(function (ns) {
  'use strict';

  var FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  /** querySelector shorthand */
  ns.qs = function (selector, context) {
    return (context || document).querySelector(selector);
  };

  /** querySelectorAll shorthand returning a real array */
  ns.qsa = function (selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };

  /** Shared media queries (match the CSS breakpoints) */
  ns.mq = {
    md: window.matchMedia('(min-width: 768px)'),
    lg: window.matchMedia('(min-width: 992px)'),
    noHover: window.matchMedia('(hover: none)')
  };

  /** Visible, focusable descendants of `root` */
  ns.getFocusable = function (root) {
    return ns.qsa(FOCUSABLE, root).filter(function (el) {
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
    });
  };

  /** Keep Tab / Shift+Tab inside `root` (call from a keydown handler) */
  ns.trapFocus = function (root, event) {
    var focusable = ns.getFocusable(root);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  /** Prevent / allow page scrolling while an overlay is open */
  ns.lockScroll = function (locked) {
    document.body.classList.toggle('is-locked', locked);
  };

  /** localStorage wrapper that never throws (private mode, blocked storage, …) */
  ns.storage = {
    get: function (key) {
      try {
        return JSON.parse(window.localStorage.getItem(key));
      } catch (error) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        return false;
      }
    }
  };

  /** Escape text before inserting it into innerHTML */
  ns.escapeHtml = function (value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  };

  /** Module registry */
  ns.modules = [];
  ns.register = function (name, init) {
    ns.modules.push({ name: name, init: init });
  };
})(window.ArtisanShop = window.ArtisanShop || {});
