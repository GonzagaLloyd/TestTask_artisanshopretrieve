/**
 * drilldown-menu.js — mobile navigation inside the menu off-canvas.
 *
 * The desktop flyout (#main-menu) already contains the full category tree as
 * nested lists. Instead of duplicating that markup, this module reads the
 * tree once and renders it level by level ("Kategorien → Küche → Kühlschrank").
 *
 * Markup contract:
 *   <nav data-drilldown data-drilldown-source="main-menu" data-drilldown-root-title="Kategorien">
 */
(function (ns) {
  'use strict';

  ns.register('drilldownMenu', function () {
    var root = ns.qs('[data-drilldown]');
    if (!root) {
      return;
    }
    var source = document.getElementById(root.getAttribute('data-drilldown-source'));
    var sourceList = source && ns.qs('[data-nav-root]', source);
    if (!sourceList) {
      return;
    }

    var rootTitle = root.getAttribute('data-drilldown-root-title') || 'Menü';

    /** Convert the nested <ul> into a plain object tree */
    function parse(list) {
      return ns.qsa(':scope > li', list)
        .map(function (item) {
          var link = ns.qs(':scope > a', item);
          var sublist = ns.qs(':scope > ul', item);
          if (!link || link.classList.contains('flyout__link--all')) {
            return null; // "Alle anzeigen" links are added automatically per level
          }
          var text = ns.qs('.flyout__link-text', link);
          return {
            label: (text || link).textContent.trim(),
            href: link.getAttribute('href'),
            children: sublist ? parse(sublist) : []
          };
        })
        .filter(Boolean);
    }

    var tree = parse(sourceList);
    var stack = []; // breadcrumb of opened nodes

    function icon(name) {
      return '<svg class="icon icon--sm" aria-hidden="true"><use href="#icon-' + name + '"></use></svg>';
    }

    function render() {
      var node = stack.length ? stack[stack.length - 1] : null;
      var items = node ? node.children : tree;
      var html = '';

      if (node) {
        html += '<button class="drilldown__link drilldown__link--back" type="button" data-drill-back>' +
          icon('chevron-left') + '<span>Zurück</span></button>';
      }

      html += '<p class="drilldown__headline">' + ns.escapeHtml(node ? node.label : rootTitle) + '</p>';
      html += '<ul class="drilldown__list">';

      if (node) {
        html += '<li><a class="drilldown__link drilldown__link--all" href="' + ns.escapeHtml(node.href) + '">' +
          '<span>Alle ' + ns.escapeHtml(node.label) + ' anzeigen</span></a></li>';
      }

      items.forEach(function (item, index) {
        if (item.children.length) {
          html += '<li><button class="drilldown__link" type="button" data-drill="' + index + '">' +
            '<span>' + ns.escapeHtml(item.label) + '</span>' + icon('chevron-right') + '</button></li>';
        } else {
          html += '<li><a class="drilldown__link" href="' + ns.escapeHtml(item.href) + '">' +
            '<span>' + ns.escapeHtml(item.label) + '</span></a></li>';
        }
      });

      html += '</ul>';
      root.innerHTML = html;
    }

    root.addEventListener('click', function (event) {
      var drill = event.target.closest('[data-drill]');
      if (drill) {
        var items = stack.length ? stack[stack.length - 1].children : tree;
        stack.push(items[Number(drill.getAttribute('data-drill'))]);
        render();
        ns.qs('[data-drill-back]', root).focus();
        return;
      }

      if (event.target.closest('[data-drill-back]')) {
        stack.pop();
        render();
        var first = ns.qs('.drilldown__link', root);
        if (first) {
          first.focus();
        }
      }
    });

    // Reset to the first level whenever the panel is closed
    var panel = root.closest('.offcanvas');
    if (panel) {
      panel.addEventListener('transitionend', function () {
        if (!panel.classList.contains('is-open') && stack.length) {
          stack = [];
          render();
        }
      });
    }

    render();
  });
})(window.ArtisanShop = window.ArtisanShop || {});
