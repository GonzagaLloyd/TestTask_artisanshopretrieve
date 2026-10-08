/**
 * appliance-search.js — "Gerätenummer eingeben & Ersatzteil finden" panel.
 *
 * In the live shop the selects are filled from the appliance database and the
 * photo upload is sent to a type-plate scanner. This recreation fills the
 * category and manufacturer selects from the data already on the page and
 * explains the missing backend steps in status messages.
 */
(function (ns) {
  'use strict';

  ns.register('applianceSearch', function () {
    var root = ns.qs('[data-appliance-search]');
    if (!root) {
      return;
    }

    /* ---- Selection by criteria ---- */
    var categorySelect = ns.qs('[data-select-category]', root);
    var manufacturerSelect = ns.qs('[data-select-manufacturer]', root);
    var modelSelect = ns.qs('[data-select-model]', root);
    var note = ns.qs('[data-criteria-note]', root);

    function fill(select, values) {
      values.forEach(function (value) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    }

    if (categorySelect && manufacturerSelect && modelSelect) {
      fill(categorySelect, ns.qsa('.tile-grid--categories .tile__label').map(function (el) {
        return el.textContent.trim();
      }));
      fill(manufacturerSelect, ns.qsa('#brand-list li a').map(function (el) {
        return el.textContent.trim();
      }));

      categorySelect.addEventListener('change', function () {
        manufacturerSelect.disabled = !categorySelect.value;
        manufacturerSelect.value = '';
        modelSelect.disabled = true;
        modelSelect.value = '';
        note.textContent = '';
      });

      manufacturerSelect.addEventListener('change', function () {
        modelSelect.value = '';
        note.textContent = manufacturerSelect.value
          ? 'Die Modelle für ' + manufacturerSelect.value + ' (' + categorySelect.value + ') werden im Live-Shop aus der Gerätedatenbank geladen.'
          : '';
      });
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
        status.textContent = file
          ? 'Ausgewählt: ' + file.name + ' (' + Math.round(file.size / 1024) + ' KB). Der Typenschild-Scanner ist in dieser Demo nicht angebunden.'
          : '';
      });
    }
  });
})(window.ArtisanShop = window.ArtisanShop || {});
