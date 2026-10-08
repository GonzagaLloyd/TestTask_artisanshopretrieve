/**
 * navigation.js — renders levels 2 and 3 of the main menu.
 *
 * Level 1 (Küche, Haushalt, …) is part of the HTML so the menu works without
 * JavaScript and search engines see the entry points. The sub levels come from
 * `assets/data/navigation.js` and are attached to the matching level-1 item,
 * producing the same nested <ul> structure the flyout CSS and the mobile
 * drill-down menu expect.
 *
 * Markup contract:
 *   <ul data-nav-root>
 *     <li class="flyout__item"><a class="flyout__link" href="/kueche/">…</a></li>
 */
(function (ns) {
  'use strict';

  var CHEVRON = '<svg class="icon flyout__link-chevron" aria-hidden="true"><use href="#icon-chevron-right"></use></svg>';

  function renderItem(item, level) {
    var children = item.children || [];
    var html = '<li class="flyout__item">';
    if (children.length) {
      html += '<a class="flyout__link flyout__link--parent" href="' + ns.escapeHtml(item.href) + '" aria-expanded="false">' +
        '<span class="flyout__link-text">' + ns.escapeHtml(item.name) + '</span>' + CHEVRON + '</a>' +
        renderList(item, level + 1);
    } else {
      html += '<a class="flyout__link" href="' + ns.escapeHtml(item.href) + '">' +
        '<span class="flyout__link-text">' + ns.escapeHtml(item.name) + '</span></a>';
    }
    return html + '</li>';
  }

  /** Sub list of `node`, ending with a "show all" link to the node itself */
  function renderList(node, level) {
    return '<ul class="flyout__list flyout__list--l' + level + '">' +
      node.children.map(function (child) { return renderItem(child, level); }).join('') +
      '<li class="flyout__item"><a class="flyout__link flyout__link--all" href="' + ns.escapeHtml(node.href) + '">' +
      '<span class="flyout__link-text">Alle anzeigen</span></a></li>' +
      '</ul>';
  }

  ns.register('navigation', function () {
    var root = ns.qs('[data-nav-root]');
    var tree = ns.data && ns.data.navigation;
    if (!root || !tree) {
      return;
    }

    var level1 = ns.qsa(':scope > li', root);

    tree.forEach(function (section) {
      if (!section.children || !section.children.length) {
        return;
      }
      var item = level1.filter(function (li) {
        var link = ns.qs(':scope > a', li);
        return link && link.getAttribute('href') === section.href;
      })[0];

      if (item) {
        var link = ns.qs(':scope > a', item);
        link.classList.add('flyout__link--parent');
        link.setAttribute('aria-expanded', 'false');
        if (!ns.qs('.flyout__link-chevron', link)) {
          link.insertAdjacentHTML('beforeend', CHEVRON);
        }
        item.insertAdjacentHTML('beforeend', renderList(section, 2));
      } else {
        root.insertAdjacentHTML('beforeend', renderItem(section, 1));
      }
    });
  });
})(window.ArtisanShop = window.ArtisanShop || {});
