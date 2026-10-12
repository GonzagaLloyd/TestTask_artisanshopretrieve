/**
 * product-detail.js — image galleries (product images, exploded drawings with
 * "Explosionszeichnung vergrößern") and product reviews.
 *
 *   <div data-gallery> <img data-gallery-image> <button data-gallery-thumb="src"> <a data-gallery-zoom>
 *   <section data-product-reviews="ART…"> <button data-review-toggle> <form data-review-form>
 *     <p data-review-count> <div data-review-list>
 *
 * Reviews are kept in localStorage (no backend), per product number.
 */
(function (ns) {
  'use strict';

  var KEY = 'artisanshop.reviews';
  var e = ns.escapeHtml;

  function stars(points) {
    return '<span class="review-stars" aria-label="Durchschnittliche Bewertung von ' + points + ' von 5 Sternen">' + '★★★★★'.slice(0, points) + '<span class="review-stars__off">' + '★★★★★'.slice(points) + '</span></span>';
  }

  function initReviews(root) {
    var number = root.getAttribute('data-product-reviews');
    var toggle = ns.qs('[data-review-toggle]', root);
    var form = ns.qs('[data-review-form]', root);
    var list = ns.qs('[data-review-list]', root);
    var count = ns.qs('[data-review-count]', root);
    var empty = list.innerHTML;

    function reviews() {
      return (ns.storage.get(KEY) || {})[number] || [];
    }

    function render() {
      var items = reviews();
      var average = items.length ? items.reduce(function (sum, r) { return sum + r.points; }, 0) / items.length : 0;
      count.innerHTML = items.length + ' von ' + items.length + ' Bewertungen' + (items.length ? ' ' + stars(Math.round(average)) : '');
      list.innerHTML = items.length
        ? items.map(function (r) {
            return '<article class="review-entry"><p class="review-entry__head">' + stars(r.points) + ' <strong>' + e(r.title) + '</strong></p>' +
              '<p class="review-entry__meta">' + e(r.name) + ' · ' + new Date(r.date).toLocaleDateString('de-CH') + '</p>' +
              '<p>' + e(r.content) + '</p></article>';
          }).join('')
        : empty;
    }

    function setOpen(open) {
      form.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Bewertungen anzeigen' : 'Bewertung schreiben';
      list.hidden = open;
      if (open) {
        form.elements.name.focus();
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(form.hidden);
    });
    ns.qs('[data-review-cancel]', form).addEventListener('click', function () {
      setOpen(false);
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var error = ns.qs('[data-form-error]', form);
      var invalid = ns.qsa('input, textarea', form).filter(function (field) { return !field.checkValidity(); })[0];
      if (invalid) {
        error.textContent = invalid.closest('label').querySelector('span').textContent + ' ' + invalid.validationMessage;
        invalid.focus();
        return;
      }
      error.textContent = '';
      var all = ns.storage.get(KEY) || {};
      all[number] = [{
        points: parseInt(ns.qs('input[name="points"]:checked', form).value, 10),
        name: form.elements.name.value.trim(),
        title: form.elements.title.value.trim(),
        content: form.elements.content.value.trim(),
        date: new Date().toISOString()
      }].concat(all[number] || []);
      ns.storage.set(KEY, all);
      form.reset();
      setOpen(false);
      render();
    });

    render();
  }

  ns.register('productDetail', function () {
    ns.qsa('[data-gallery]').forEach(function (gallery) {
      var image = ns.qs('[data-gallery-image]', gallery);
      var thumbs = ns.qsa('[data-gallery-thumb]', gallery);
      var zoom = ns.qs('[data-gallery-zoom]', gallery);
      thumbs.forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          image.src = thumb.getAttribute('data-gallery-thumb');
          if (zoom) {
            zoom.href = image.src;
          }
          thumbs.forEach(function (t) { t.classList.toggle('is-active', t === thumb); });
        });
      });
    });

    ns.qsa('[data-product-reviews]').forEach(initReviews);
  });
})(window.ArtisanShop = window.ArtisanShop || {});
