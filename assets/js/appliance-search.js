/**
 * appliance-search.js — "Gerätenummer eingeben & Ersatzteil finden" panel.
 *
 * Used by the off-canvas panel and the finder on category pages
 * (data-preset-category). Selection by criteria: device categories come from the menu tree
 * (assets/data/navigation.js); manufacturers and models come from the archived
 * appliance pages in the search index (assets/data/search-index.json, written by
 * generate.js). Choosing a model opens its spare-part page. The type-plate photo
 * scanner is not connected, so an upload shows the shop's original error message.
 */
(function (ns) {
  'use strict';

  var index = null;

  function loadIndex() {
    if (!index) {
      index = window.location.protocol === 'file:'
        ? Promise.reject(new Error('file'))
        : fetch('/assets/data/search-index.json').then(function (r) {
          if (!r.ok) {
            throw new Error(r.status);
          }
          return r.json();
        });
    }
    return index;
  }

  function brandName(slug) {
    return slug.length <= 3 ? slug.toUpperCase() : slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }

  function fill(select, entries, placeholder) {
    select.innerHTML = '';
    var first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    select.appendChild(first);
    entries.forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry[0];
      option.textContent = entry[1];
      select.appendChild(option);
    });
  }

  ns.register('applianceSearch', function () {
    ns.qsa('[data-appliance-search]').forEach(init);
  });

  function init(root) {

    /* ---- Selection by criteria ---- */
    var categorySelect = ns.qs('[data-select-category]', root);
    var manufacturerSelect = ns.qs('[data-select-manufacturer]', root);
    var modelSelect = ns.qs('[data-select-model]', root);
    var note = ns.qs('[data-criteria-note]', root);

    if (categorySelect && manufacturerSelect && modelSelect) {
      var categories = [];
      ((ns.data && ns.data.navigation) || []).slice(0, 2).forEach(function (group) {
        (group.children || []).forEach(function (c) {
          categories.push([c.name, c.name]);
        });
      });
      categories.sort(function (a, b) { return a[1].localeCompare(b[1], 'de'); });
      fill(categorySelect, categories, 'Geräte wählen');

      var appliancesOf = function (category) {
        return loadIndex().then(function (data) {
          return data.appliances.filter(function (a) { return a[2] === category; });
        });
      };

      categorySelect.addEventListener('change', function () {
        fill(manufacturerSelect, [], 'Hersteller wählen');
        fill(modelSelect, [], 'Modell wählen');
        manufacturerSelect.disabled = true;
        modelSelect.disabled = true;
        note.textContent = '';
        if (!categorySelect.value) {
          return;
        }
        appliancesOf(categorySelect.value).then(function (list) {
          var brands = {};
          list.forEach(function (a) { brands[a[1].split('/')[2]] = true; });
          var entries = Object.keys(brands).sort().map(function (slug) { return [slug, brandName(slug)]; });
          fill(manufacturerSelect, entries, 'Hersteller wählen');
          manufacturerSelect.disabled = !entries.length;
        }, function () {
          note.textContent = 'Leider ist etwas schief gelaufen';
        });
      });

      manufacturerSelect.addEventListener('change', function () {
        fill(modelSelect, [], 'Modell wählen');
        modelSelect.disabled = !manufacturerSelect.value;
        if (!manufacturerSelect.value) {
          return;
        }
        appliancesOf(categorySelect.value).then(function (list) {
          var models = list.filter(function (a) { return a[1].split('/')[2] === manufacturerSelect.value; })
            .map(function (a) { return [a[1], a[0]]; })
            .sort(function (a, b) { return a[1].localeCompare(b[1], 'de'); });
          fill(modelSelect, models, 'Modell wählen (' + models.length + ')');
        });
      });

      modelSelect.addEventListener('change', function () {
        if (modelSelect.value) {
          window.location.href = modelSelect.value;
        }
      });

      var preset = root.getAttribute('data-preset-category');
      if (preset && categories.some(function (c) { return c[0] === preset; })) {
        categorySelect.value = preset;
        categorySelect.dispatchEvent(new Event('change'));
      }
    }

    /* ---- Type-plate photo upload ---- */
    var trigger = ns.qs('[data-upload-trigger]', root);
    var fileInput = ns.qs('[data-upload-input]', root);
    var status = ns.qs('[data-upload-status]', root);

    if (trigger && fileInput && status) {
      trigger.addEventListener('click', function () {
        fileInput.click();
      });
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        status.textContent = file ? 'Leider ist etwas schief gelaufen' : '';
      });
    }
  }
})(window.ArtisanShop = window.ArtisanShop || {});
