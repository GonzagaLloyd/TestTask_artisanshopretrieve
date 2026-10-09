/**
 * generate.js — builds the static site into dist/: copies the home page and assets,
 * renders one page per archived URL from content/*.json at its original path, the
 * shop function pages (search, cart, checkout, account) and the search index.
 * Sub pages inline the partials at build time. No dependencies.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const readJson = (file) => (fs.existsSync(path.join(ROOT, file)) ? JSON.parse(read(file)) : {});

const pages = readJson('content/pages.json');
const products = readJson('content/products.json');
const SHIPPING = 8.95;
const PAGE_SIZE = 24;

const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chf = (value) => (typeof value === 'number' ? 'CHF ' + value.toFixed(2) : 'Preis auf Anfrage');
const media = (src) => (src && fs.existsSync(path.join(ROOT, src)) ? src : '');
const PLACEHOLDER = '/assets/images/placeholder-product.svg';
const productImage = (p) => media((p.images || [])[0]) || PLACEHOLDER;

// Root-relative asset paths: sub pages live in nested folders.
const partial = (name) => read(`partials/${name}.html`).replace(/(src|href)="assets\//g, '$1="/assets/');

const SCRIPTS = [
  'js/utils.js', 'data/navigation.js', 'data/reviews.js', 'js/navigation.js', 'js/reviews.js',
  'js/offcanvas.js', 'js/drilldown-menu.js', 'js/flyout-menu.js', 'js/header-search.js', 'js/dropdown.js',
  'js/collapse.js', 'js/list-filter.js', 'js/slider.js', 'js/appliance-search.js', 'js/scroll-top.js',
  'js/cookie-consent.js', 'js/cart.js', 'js/account.js', 'js/product-listing.js', 'js/product-detail.js',
  'js/search-page.js', 'js/checkout.js', 'js/main.js'
];

function layout({ title, description, bodyClass, content, robots }) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  ${description ? `<meta name="description" content="${esc(description)}">` : ''}
  ${robots ? `<meta name="robots" content="${robots}">` : ''}
  <meta name="theme-color" content="#2b6649">
  <link rel="icon" href="/assets/images/logo-artisanshop.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,600;0,700;1,400&display=swap">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/layout.css">
  <link rel="stylesheet" href="/assets/css/components.css">
  <link rel="stylesheet" href="/assets/css/pages.css">
  ${bodyClass.includes('page-step') ? '<link rel="stylesheet" href="/assets/css/home.css">' : ''}
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#main">Zum Hauptinhalt springen</a>
${partial('icons')}
${partial('header')}
  <main id="main" class="page-main">
${content}
  </main>
${partial('footer')}
  <button class="scroll-top" type="button" aria-label="Zurück zum Anfang der Seite springen" data-scroll-top>
    <svg class="icon"><use href="#icon-arrow-up"></use></svg>
  </button>
${partial('offcanvas')}
${partial('cookie-consent')}
${SCRIPTS.map((src) => `  <script src="/assets/${src}" defer></script>`).join('\n')}
</body>
</html>
`;
}

function breadcrumb(crumbs) {
  if (!crumbs || !crumbs.length) return '';
  const items = crumbs.map((c, i) => {
    const last = i === crumbs.length - 1;
    const name = esc(c.name);
    return `<li class="breadcrumb__item">${last || !c.path ? `<span${last ? ' aria-current="page"' : ''}>${name}</span>` : `<a href="${esc(c.path)}">${name}</a>`}</li>`;
  });
  return `<nav class="container breadcrumb" aria-label="Brotkrumen-Navigation"><ol class="breadcrumb__list">${items.join('')}</ol></nav>`;
}

// Drop images and unlink pages that were never archived.
// Product references become product cards; call-to-action links become buttons.
const prose = (html) => `<div class="prose">${html
  .replace(/<img [^>]*src="([^"]+)"[^>]*>/g, (tag, src) => (media(src) ? tag : ''))
  .replace(/<a href="(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (tag, href, inner) => (exists(href) ? tag : inner))
  .replace(/(?:<product-ref number="([^"]+)"><\/product-ref>\s*)+/g, (refs) => {
    const cards = [...refs.matchAll(/number="([^"]+)"/g)].map((m) => products[m[1]]).filter((p) => p && p.path).map(productCard);
    return cards.length ? `<ul class="product-list">${cards.join('')}</ul>` : '';
  })
  .replace(/<a href="#appliance-search">([\s\S]*?)<\/a>/g, '<button class="btn btn--secondary" type="button" data-offcanvas-open="offcanvas-appliance" aria-controls="offcanvas-appliance" aria-expanded="false">$1</button>')
  .replace(/<a href="#matchingSpareParts">/g, '<a class="btn btn--outline" href="#matchingSpareParts">')}</div>`;

const generated = new Set([...Object.keys(pages), ...Object.values(products).map((p) => p.path)]);
function exists(href) {
  const target = href.split(/[?#]/)[0];
  return target === '/' || target.startsWith('/assets/') || target.startsWith('/search') || target.startsWith('/account') ||
    target.startsWith('/checkout') || generated.has(target) || generated.has(target + '/') || generated.has(target.replace(/\/$/, ''));
}

function cartPayload(p) {
  return esc(JSON.stringify({ number: p.number, name: p.name, price: p.price, image: productImage(p), path: p.path }));
}

function productCard(p) {
  return `<li class="product-card" data-name="${esc(p.name)}" data-price="${p.price == null ? '' : p.price}" data-manufacturer="${esc(p.manufacturer || '')}" data-category="${esc(p.listedIn || '')}" data-number="${esc([p.number, p.mpn].filter(Boolean).join(' '))}" data-position="${esc(p.position || '')}">
  <a class="product-card__image" href="${esc(p.path)}" tabindex="-1" aria-hidden="true"><img src="${productImage(p)}" alt="${esc(p.name)}" width="160" height="160" loading="lazy"></a>
  <div class="product-card__body">
    <a class="product-card__name" href="${esc(p.path)}">${esc(p.name)}</a>
    ${p.badge ? `<span class="tag-badge">${esc(p.badge)}</span>` : ''}
    ${p.position ? `<span class="tag-badge tag-badge--position">${esc(p.position)}</span>` : ''}
    ${p.compatible ? `<span class="badge-compatible">Passend für Ihr Gerät</span>` : ''}
    <p class="product-card__meta">${esc(p.number)}${p.mpn ? ' - ' + esc(p.mpn) : ''}</p>
  </div>
  <div class="product-card__buy">
    <p class="product-card__price">${p.price == null ? '' : `CHF ${p.price.toFixed(2)}*`}</p>
    ${p.delivery ? `<p class="delivery-badge">${esc(p.delivery.replace(/^✓\s*Lieferzeit:\s*/, ''))}</p>` : ''}
    ${p.price != null ? `<button class="btn btn--primary btn--sm" type="button" data-add-to-cart="${cartPayload(p)}">In den Warenkorb</button>` : ''}
  </div>
</li>`;
}

const filterGroup = (key, title, values) => (values.length ? `<fieldset class="listing-filters__group">
        <legend class="listing-filters__legend">${esc(title)}</legend>
        ${values.map((v) => `<label class="checkbox"><input type="checkbox" value="${esc(v)}" data-listing-filter="${key}"> <span>${esc(v)}</span></label>`).join('\n        ')}
      </fieldset>` : '');

// Sidebar filter, sorting and pagination: assets/js/product-listing.js. Filter values are those
// of the archived page plus any of the listed products; `finder` adds the selector row of the
// category landing pages.
function productListing(list, id, { filters = [], finder = false, category = '', positions = null } = {}) {
  const archived = (title) => (filters.find((f) => f.title === title) || { values: [] }).values;
  const values = (key, title) => [...new Set([...archived(title), ...list.map((p) => p[key]).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'de'));
  const finderRow = finder ? `<div class="listing-finder" data-appliance-search data-preset-category="${esc(category)}">
      <label class="visually-hidden" for="${id}-category">Geräte wählen</label>
      <select class="form-select" id="${id}-category" data-select-category hidden><option value="">Geräte wählen</option></select>
      <label class="visually-hidden" for="${id}-manufacturer">Hersteller wählen</label>
      <select class="form-select" id="${id}-manufacturer" disabled data-select-manufacturer><option value="">Hersteller wählen</option></select>
      <label class="visually-hidden" for="${id}-model">Modell wählen</label>
      <select class="form-select" id="${id}-model" disabled data-select-model><option value="">Modell wählen</option></select>
      <span class="listing-finder__or">ODER</span>
      <form class="listing-finder__number" data-listing-search>
        <label class="visually-hidden" for="${id}-number">Produkt-Nummer</label>
        <input class="form-control" id="${id}-number" type="search" placeholder="Produkt-Nummer" autocomplete="off">
        <button class="btn btn--primary" type="submit">Suchen</button>
      </form>
      <p class="appliance-search__note" role="status" aria-live="polite" data-criteria-note></p>
    </div>` : '';
  return `<section class="product-listing" aria-label="Produkte" data-product-listing data-page-size="${PAGE_SIZE}" id="${id}">
  <aside class="listing-filters" aria-label="Filter">
    <p class="listing-filters__title">Filter</p>
    <button class="btn btn--outline listing-filters__toggle" type="button" data-collapse-toggle="${id}-filters" aria-controls="${id}-filters" aria-expanded="false">Filter</button>
    <div class="collapse listing-filters__body" id="${id}-filters">
      ${filterGroup('category', 'Kategorien', values('listedIn', 'Kategorien'))}
      ${filterGroup('manufacturer', 'Hersteller', values('manufacturer', 'Hersteller'))}
    </div>
  </aside>
  <div class="product-listing__main">
    ${finderRow}
    <div class="product-listing__toolbar">
      <p class="visually-hidden" role="status" aria-live="polite" data-listing-count></p>
      <label class="visually-hidden" for="${id}-sort">Sortierung</label>
      <select class="form-select product-listing__sort" id="${id}-sort" data-listing-sort>
        <option value="relevance">Relevanz</option>
        <option value="name-asc">Name A-Z</option>
        <option value="name-desc">Name Z-A</option>
        <option value="price-asc">Preis aufsteigend</option>
        <option value="price-desc">Preis absteigend</option>
      </select>
    </div>
    <div class="search-hint">
      <p>Ihnen wird hier nur eine Auswahl angezeigt. Jetzt Gerätenummer eingeben und passendes Ersatzteil finden</p>
      <div class="search-hint__actions">
        <button class="btn btn--primary" type="button" data-offcanvas-open="offcanvas-appliance" aria-controls="offcanvas-appliance" aria-expanded="false">Zum Such-Assistent</button>
        <a class="btn btn--secondary" href="https://wa.me/15557010703" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">Senden Sie uns eine Whatsapp</a>
      </div>
    </div>
    ${positions ? `<form class="appliance-parts-search" data-listing-search role="search">
      <label class="visually-hidden" for="${id}-text">Suchen</label>
      <input class="form-control" id="${id}-text" type="search" autocomplete="off">
      <button class="btn btn--primary" type="submit" aria-label="Suchen">Suchen</button>
      ${positions.length ? `<label class="visually-hidden" for="${id}-position">Positionsnummer...</label>
      <select class="form-select" id="${id}-position" data-listing-position><option value="">Positionsnummer...</option>${positions.map((o) => `<option>${esc(o)}</option>`).join('')}</select>` : ''}
    </form>` : ''}
    <ul class="product-list" data-listing-items>
${list.map(productCard).join('\n')}
    </ul>
    <div class="product-listing__empty" data-listing-empty${list.length ? ' hidden' : ''}>${positions
      ? '<p>Zu Ihrer Suche haben wir leider keine Ersatzteile für dieses Gerät gefunden.</p><p>Versuchen Sie einen allgemeineren Suchbegriff.</p>'
      : '<p>Keine Produkte gefunden.</p>'}</div>
    <nav class="pagination" aria-label="Seiten" data-listing-pagination></nav>
  </div>
</section>`;
}

// Products shown on a listing: its own products plus those of every listing below it,
// each tagged with the part category of the listing it came from (filter "Kategorien").
const listed = {};
for (const page of Object.values(pages)) {
  const ids = page.products || (page.blocks || []).filter((b) => b.type === 'products').flatMap((b) => b.items);
  if (ids && ids.length && !page.path.startsWith('/geraet/')) listed[page.path] = ids;
}
for (const p of Object.values(products)) {
  const crumbs = p.breadcrumb || [];
  const last = crumbs.length && crumbs[crumbs.length - 1].path;
  if (last) (listed[last] = listed[last] || []).push(p.number);
}
function partCategory(listingPath) {
  const page = pages[listingPath];
  const crumbs = (page && page.breadcrumb) || [];
  return (crumbs[3] || crumbs[crumbs.length - 1] || {}).name || '';
}
function productsBelow(pagePath) {
  const found = new Map();
  for (const [other, list] of Object.entries(listed)) {
    if (!other.startsWith(pagePath)) continue;
    list.forEach((id) => {
      if (products[id] && !found.has(id)) found.set(id, Object.assign({}, products[id], { listedIn: partCategory(other) }));
    });
  }
  return [...found.values()];
}

const applianceLink = (a) => (exists(a.path) ? `<a href="${esc(a.path)}">${esc(a.name)}</a>` : `<span>${esc(a.name)}</span>`);

let uid = 0;
const BLOCKS = {
  hero: (b) => `<section class="category-hero">
  ${media(b.image) ? `<img class="category-hero__image" src="${b.image}" alt="" width="1280" height="420">` : ''}
  <div class="container category-hero__inner">
    <h1 class="category-hero__title">${b.title.map((t) => `<span>${esc(t)}</span>`).join(' ')}</h1>
    ${b.usps.length ? `<ul class="category-hero__usps">${b.usps.map(([t, s]) => `<li><strong>${esc(t)}</strong>${s ? `<span>${esc(s)}</span>` : ''}</li>`).join('')}</ul>` : ''}
  </div>
</section>`,
  manufacturers: (b) => {
    const id = 'brand-directory-' + ++uid;
    const tiles = b.logos.map((m) => `<li><a class="tile tile--brand" href="${esc(m.path)}" title="${esc(m.name)}">${media(m.image) ? `<img src="${m.image}" alt="${esc(m.name)}" width="300" height="63" loading="lazy">` : `<span class="tile__label">${esc(m.name)}</span>`}</a></li>`).join('\n');
    const all = b.all.length ? `<p class="section__actions">
    <button class="btn btn--secondary btn--wide" type="button" data-collapse-toggle="${id}" aria-controls="${id}" aria-expanded="false">
      <span data-collapse-label-closed>Mehr anzeigen</span><span data-collapse-label-open hidden>Weniger anzeigen</span>
    </button>
  </p>
  <div class="collapse brand-directory" id="${id}">
    <h3 class="brand-directory__title">Nach Hersteller suchen</h3>
    <div class="brand-directory__search" role="search">
      <label class="visually-hidden" for="${id}-filter">Nach Hersteller suchen</label>
      <input class="form-control" id="${id}-filter" type="search" placeholder="Nach Hersteller suchen..." autocomplete="off" data-filter-list="${id}-list">
    </div>
    <ul class="brand-list" id="${id}-list">${b.all.map((m) => `<li><a href="${esc(m.path)}">${esc(m.name)}</a></li>`).join('')}</ul>
    <p class="brand-list__empty" role="status" aria-live="polite" hidden>Kein Hersteller gefunden.</p>
  </div>` : '';
    return `<section class="section container">
  ${b.title ? `<h2 class="section__title">${esc(b.title)}</h2>` : ''}
  ${b.text ? `<p class="section__lead">${esc(b.text)}</p>` : ''}
  <ul class="tile-grid tile-grid--brands">${tiles}</ul>
  ${all}
</section>`;
  },
  subcategories: (b) => `<section class="section container">
  ${b.title ? `<h2 class="section__title">${esc(b.title)}</h2>` : ''}
  <ul class="tile-grid tile-grid--categories">${b.items.map((c) => `<li><a class="tile tile--category" href="${esc(c.path)}"><span class="tile__label">${esc(c.name)}</span>${media(c.image) ? `<img class="tile__image" src="${c.image}" alt="Bild für ${esc(c.name)}" width="65" height="49" loading="lazy">` : ''}</a></li>`).join('\n')}</ul>
</section>`,
  // Same selects as the "Gerätenummer" panel (assets/js/appliance-search.js), preset to this category
  'appliance-finder': (b, page) => {
    const id = 'finder-' + ++uid;
    const category = ((page.breadcrumb || [])[2] || {}).name || '';
    return `<section class="section container appliance-finder" data-appliance-search data-preset-category="${esc(category)}">
  <h2 class="section__title">${esc(b.title)}</h2>
  <div class="appliance-finder__form">
    <label class="visually-hidden" for="${id}-category">Geräte wählen</label>
    <select class="form-select" id="${id}-category" data-select-category><option value="">Geräte wählen</option></select>
    <label class="visually-hidden" for="${id}-manufacturer">Hersteller wählen</label>
    <select class="form-select" id="${id}-manufacturer" disabled data-select-manufacturer><option value="">Hersteller wählen</option></select>
    <label class="visually-hidden" for="${id}-model">Modell wählen</label>
    <select class="form-select" id="${id}-model" disabled data-select-model><option value="">Modell wählen</option></select>
    <p class="appliance-search__note" role="status" aria-live="polite" data-criteria-note></p>
  </div>
  <form class="appliance-finder__search" action="/search" method="get" role="search">
    <label class="visually-hidden" for="${id}-search">Nach Gerätenummer suchen...</label>
    <input class="form-control" id="${id}-search" type="search" name="search" placeholder="Nach Gerätenummer suchen..." autocomplete="off" required minlength="3">
    <button class="btn btn--primary" type="submit">Suchen</button>
  </form>
  ${b.info ? `<p class="appliance-finder__info"><em>${esc(b.info)}</em></p>` : ''}
  ${(b.items || []).length ? `<ul class="appliance-grid">${b.items.map((a) => `<li>${applianceLink(a)}</li>`).join('')}</ul>` : ''}
</section>`;
  },
  reviews: () => `<div class="container">${partial('reviews')}</div>`,
  contact: () => `<div class="container">${partial('contact')}</div>`,
  partners: () => `<div class="container">${partial('partners')}</div>`,
  appliances: (b) => {
    if (!b.items.length) return '';
    const id = 'appliance-list-' + ++uid;
    return `<section class="section container">
  <h2 class="section__title">${esc(b.title)}</h2>
  <div class="brand-directory__search" role="search">
    <label class="visually-hidden" for="${id}-filter">${esc(b.title)}</label>
    <input class="form-control" id="${id}-filter" type="search" autocomplete="off" data-filter-list="${id}">
  </div>
  <ul class="appliance-grid" id="${id}">${b.items.map((a) => `<li>${applianceLink(a)}</li>`).join('')}</ul>
  <p class="brand-list__empty" role="status" aria-live="polite" hidden></p>
</section>`;
  },
  html: (b) => `<section class="section container">${prose(b.html)}</section>`
};

function categoryPage(page) {
  const hasHero = page.blocks.some((b) => b.type === 'hero');
  const body = page.blocks.map((b) => {
    if (b.type === 'products') {
      const category = ((page.breadcrumb || [])[2] || {}).name || '';
      return `<div class="section container">${productListing(productsBelow(page.path), 'listing', { filters: b.filters, finder: b.finder, category })}</div>`;
    }
    return (BLOCKS[b.type] || (() => ''))(b, page);
  }).join('\n');
  const h1 = hasHero || !page.h1 ? '' : `<div class="container"><h1 class="page-title">${esc(page.h1)}</h1></div>`;
  return { bodyClass: 'page-category', content: breadcrumb(page.breadcrumb) + h1 + body };
}

function listingPage(page) {
  return {
    bodyClass: 'page-listing',
    content: `${breadcrumb(page.breadcrumb)}
<div class="container">
  <h1 class="page-title">${esc(page.h1)}</h1>
  ${page.intro ? prose(page.intro) : ''}
  ${productListing(productsBelow(page.path), 'listing', { filters: page.filters })}
</div>`
  };
}

function relatedDevices(items, key) {
  const link = (a) => (a.path && exists(a.path) ? `<a class="btn btn--outline btn--sm" href="${esc(a.path)}">${esc(a.name)}</a>` : `<span class="btn btn--outline btn--sm">${esc(a.name)}</span>`);
  const shown = items.filter((a) => !a.hidden);
  const more = items.filter((a) => a.hidden);
  const id = 'related-' + key;
  return `<div class="related-devices">${shown.map(link).join('')}${more.length ? `<button class="btn btn--outline btn--sm" type="button" data-collapse-toggle="${id}" aria-controls="${id}" aria-expanded="false">Alle anzeigen...</button><span class="collapse related-devices__more" id="${id}">${more.map(link).join('')}</span>` : ''}</div>`;
}

function appliancePage(page) {
  const positions = page.positions || {};
  const list = page.products.map((id) => products[id]).filter(Boolean)
    .map((p) => Object.assign({}, p, { position: positions[p.number] || '', compatible: true }));
  const drawings = (page.drawings || []).filter((d) => media(d.src));
  return {
    bodyClass: 'page-appliance',
    content: `${breadcrumb(page.breadcrumb)}
<div class="container appliance-layout">
  <div class="appliance-main">
  <header class="appliance-header">
    <h1 class="page-title">${esc(page.h1)}</h1>
    ${media(page.logo) ? `<img class="appliance-header__logo" src="${page.logo}" alt="" width="200" height="42">` : ''}
    ${page.badge ? `<p class="tag-badge tag-badge--success">${esc(page.badge)}</p>` : ''}
    ${(page.infos || []).length ? `<table class="appliance-header__infos"><tbody>${page.infos.map(([k, v], i) => (Array.isArray(v)
      ? `<tr><th scope="row" colspan="2">${esc(k)}</th></tr><tr><td colspan="2">${relatedDevices(v, i)}</td></tr>`
      : `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`)).join('')}</tbody></table>` : ''}
  </header>
  ${(page.nav || []).length ? `<p class="appliance-nav">${page.nav.map((n) => (n.path && exists(n.path) ? `<a class="btn btn--outline btn--sm" href="${esc(n.path)}">${esc(n.name)}</a>` : `<span class="btn btn--primary btn--sm" aria-current="page">${esc(n.name)}</span>`)).join(' ')}</p>` : ''}
  ${drawings.length ? `<div class="gallery appliance-drawings" data-gallery>
    <div class="gallery__stage"><img class="gallery__image" src="${drawings[0].src}" alt="${esc(drawings[0].alt)}" width="800" height="800" data-gallery-image></div>
    ${drawings.length > 1 ? `<ul class="gallery__thumbs">${drawings.map((d, i) => `<li><button class="gallery__thumb${i ? '' : ' is-active'}" type="button" data-gallery-thumb="${d.src}" aria-label="${esc(d.alt)} ${i + 1}"><img src="${d.src}" alt="" width="64" height="64" loading="lazy"></button></li>`).join('')}</ul>` : ''}
    <a class="btn btn--primary" href="${drawings[0].src}" target="_blank" rel="noopener" title="Explosionszeichnung vergrößern" data-gallery-zoom>Explosionszeichnung vergrößern</a>
  </div>` : ''}
  ${page.h2 ? `<h2 class="section__title">${esc(page.h2)}</h2>` : ''}
  ${page.intro ? `<p class="section__lead">${esc(page.intro)}</p>` : ''}
  ${productListing(list, 'listing', { positions: page.positionOptions || [] })}
  </div>
  <div class="appliance-aside">
    ${contactBox()}
    ${partial('reviews')}
  </div>
</div>`
  };
}

// Theme assets of the original product page (payment icons, trust icons)
const theme = readJson('content/theme.json');
const USPS = [
  ['usp-uhr.svg', 'Versand innerhalb von 24 Stunden'],
  ['usp-daumen-hoch.svg', '30 Tage Geld-Zurück-Garantie'],
  ['usp-burger-bar.svg', 'Über 300.000 Ersatzteile Sofort ab Lager lieferbar'],
  ['usp-telefon-nachricht.svg', 'Schnelle unkomplizierte Beratungüber Whatsapp'],
  ['', 'Direkt vom Hersteller']
];
const RATINGS = ['Perfekt', 'Sehr gut', 'Gut', 'Akzeptierbar', 'Unbefriedigend'];

function contactBox() {
  const icon = (key) => media((theme[key] || {}).src);
  return `<aside class="product-section product-contact" aria-labelledby="product-contact-title">
      <h2 class="product-contact__title" id="product-contact-title">Sie haben Fragen zu diesem Produkt?</h2>
      <p>Ihr persönlicher Ansprechpartner hilft Ihnen gerne weiter.</p>
      <div class="product-contact__person">
        <img src="/assets/images/contact-avatar-paul.webp" alt="Paul Bartsch" width="80" height="80" loading="lazy">
        <div>
          <strong>Name: Paul Bartsch</strong>
          <p>Email: <a href="mailto:info@artisanshop.ch">info@artisanshop.ch</a></p>
          <p>Whatsapp: <a href="https://wa.me/15557010703">+1555 7010 703</a></p>
        </div>
      </div>
      <ul class="product-contact__trust">
        <li>${icon('lock') ? `<img src="${icon('lock')}" alt="sperren" width="32" height="32" loading="lazy">` : ''}<span>Abgesichert durch Käuferschutz von PayPal oder  Klarna</span></li>
        <li>${icon('box') ? `<img src="${icon('box')}" alt="box" width="32" height="32" loading="lazy">` : ''}<span>Nur 8,95CHF Versand, unkomplizierter Rückversand</span></li>
      </ul>
      ${icon('trustpilot') ? `<a class="product-contact__badge" href="https://de.trustpilot.com/review/artisanshop.de" target="_blank" rel="noopener"><img src="${icon('trustpilot')}" alt="trustpilot_certified" width="85" height="37" loading="lazy"></a>` : ''}
    </aside>`;
}

function productPage(p) {
  const images = (p.images || []).map(media).filter(Boolean);
  if (!images.length) images.push(PLACEHOLDER);
  const specs = p.specs && p.specs.length ? p.specs : [
    ['Hersteller', p.manufacturer], ['Ersatzteilenummer', p.mpn], ['Produktnummer:', p.number]
  ].filter(([, v]) => v);
  const crumbs = p.breadcrumb || [{ name: 'Home', path: '/' }, { name: p.name, path: '' }];
  const appliances = p.appliances || [];
  const delivery = p.delivery ? (p.delivery.startsWith('✓') ? p.delivery : `✓ Lieferzeit: ${p.delivery}`) : '';
  const gallery = `<div class="gallery" data-gallery>
      <div class="gallery__stage"><img class="gallery__image" src="${images[0]}" alt="${esc(p.name)}" width="600" height="600" data-gallery-image></div>
      ${images.length > 1 ? `<ul class="gallery__thumbs">${images.map((src, i) => `<li><button class="gallery__thumb${i ? '' : ' is-active'}" type="button" data-gallery-thumb="${src}" aria-label="${esc(p.name)} ${i + 1}"><img src="${src}" alt="" width="64" height="64" loading="lazy"></button></li>`).join('')}</ul>` : ''}
    </div>`;
  const table = appliances.length ? `<section class="product-section">
    <h2 class="product-section__title">Passende Geräte</h2>
    ${(p.applianceNote || []).length ? `<p class="product-section__hint"><em>${p.applianceNote.map(esc).join('<br>')}</em></p>` : ''}
    ${p.compatibleBadge ? `<p class="tag-badge tag-badge--success">${esc(p.compatibleBadge)}</p>` : ''}
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th scope="col">Marke</th><th scope="col">Model</th><th scope="col">Modelnummer</th><th scope="col">Passend?</th></tr></thead>
        <tbody>${appliances.map((a) => `<tr><td>${esc(a.brand)}</td><td>${esc(a.model)}</td><td>${a.path && exists(a.path) ? `<a href="${esc(a.path)}">${esc(a.number)}</a>` : esc(a.number)}</td><td class="is-success"><strong>Passend</strong></td></tr>`).join('')}</tbody>
      </table>
    </div>
  </section>` : '';
  const reviewForm = `<form class="review-form" data-review-form="${esc(p.number)}" hidden novalidate>
        <fieldset class="review-form__rating">
          <legend>Ihre Bewertung*</legend>
          ${RATINGS.map((label, i) => `<label class="review-form__star"><input type="radio" name="points" value="${5 - i}"${i ? '' : ' checked'}> <span>${label}</span></label>`).join('\n          ')}
        </fieldset>
        <label class="form-field"><span>Ihr Name oder Spitzname*</span><input class="form-control" type="text" name="name" required></label>
        <label class="form-field"><span>Ihre E-Mail-Adresse*</span><input class="form-control" type="email" name="email" required></label>
        <label class="form-field"><span>Titel*</span><input class="form-control" type="text" name="title" required></label>
        <label class="form-field"><span>Ihre Erfahrungen*</span><textarea class="form-control" name="content" rows="5" required></textarea></label>
        <p class="review-form__required">Die mit einem Stern (*) markierten Felder sind Pflichtfelder.</p>
        <p class="form-error" role="alert" data-form-error></p>
        <div class="review-form__actions">
          <button class="btn btn--outline" type="button" data-review-cancel>Abbrechen</button>
          <button class="btn btn--primary" type="submit">Abschicken</button>
        </div>
      </form>`;
  return {
    title: p.title || `${p.name} | Schweizer Onlineshop`,
    description: p.metaDescription || '',
    bodyClass: 'page-product',
    content: `${breadcrumb(crumbs)}
<div class="container product-detail">
  <div class="product-detail__main">
    ${p.badge ? `<span class="tag-badge product-detail__badge">${esc(p.badge)}</span>` : ''}
    ${gallery}
    <div class="product-detail__summary">
      <h1 class="product-detail__name">${esc(p.name)}</h1>
      ${(p.shortSpecs || []).length ? `<dl class="spec-list">${p.shortSpecs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      <p class="product-detail__more-link"><a href="#product-information">↓↓ Komplette Produktbeschreibung anzeigen ↓↓</a></p>
    </div>
  </div>
  <aside class="buy-box" aria-label="${esc(p.name)}">
    ${p.price != null ? `<p class="buy-box__price">${esc(p.priceText || `CHF ${p.price.toFixed(2)}*`)}</p>
    <p class="buy-box__tax"><a href="/service/versand-zahlung/" title="Preise inkl. MwSt. zzgl. Versandkosten">(Preise inkl. MwSt. zzgl. Versandkosten)</a></p>` : ''}
    ${delivery ? `<p class="tag-badge tag-badge--success">${esc(delivery)}</p>` : ''}
    <table class="buy-box__facts"><tbody>
      ${p.manufacturer ? `<tr><th scope="row">Hersteller</th><td>${esc(p.manufacturer)}</td></tr>` : ''}
      ${p.mpn ? `<tr><th scope="row">Ersatzteilenummer</th><td>${esc(p.mpn)}</td></tr>` : ''}
    </tbody></table>
    ${p.price != null ? `<button class="btn btn--primary btn--block" type="button" data-add-to-cart="${cartPayload(p)}">In den Warenkorb</button>` : ''}
    ${(theme.payments || []).length ? `<ul class="buy-box__payments">${theme.payments.filter((i) => media(i.src)).map((i) => `<li><img src="${i.src}" alt="${esc(i.alt)}" width="48" height="30" loading="lazy"></li>`).join('')}</ul>` : ''}
  </aside>
</div>
<div class="container">
  <ul class="usp-bar__list product-usps">${USPS.map(([img, label]) => `<li class="usp-bar__item">${img ? `<img src="/assets/images/${img}" alt="" width="35" height="35" loading="lazy">` : ''}<span>${label}</span></li>`).join('')}</ul>
</div>
<div class="container product-detail__more">
  <div class="product-detail__columns">
    <section class="product-section" id="product-information">
      <h2 class="product-section__title">Produktinformationen</h2>
      <dl class="spec-list spec-list--full">${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${p.description ? prose(p.description) : ''}
    </section>
    ${contactBox()}
  </div>
  ${table}
  <section class="product-section product-reviews" data-product-reviews="${esc(p.number)}">
    <h2 class="product-section__title">Produktbewertungen</h2>
    <div class="product-reviews__layout">
      <div class="product-reviews__summary">
        <p class="product-reviews__count" data-review-count>0 von 0 Bewertungen</p>
        <p class="product-reviews__teaser-title">Bewerten Sie dieses Produkt!</p>
        <p>Teilen Sie Ihre Erfahrungen mit anderen Kunden.</p>
        <button class="btn btn--primary" type="button" data-review-toggle aria-expanded="false">Bewertung schreiben</button>
      </div>
      <div class="product-reviews__main">
        ${reviewForm}
        <div data-review-list><p class="product-reviews__empty">Keine Bewertungen gefunden. Teilen Sie Ihre Erfahrungen mit anderen.</p></div>
      </div>
    </div>
  </section>
  ${partial('reviews')}
</div>`
  };
}

function contentPage(page) {
  const nav = (page.nav || []).filter((n) => n.links.length);
  const aside = nav.length ? `<aside class="content-nav" aria-label="${esc(nav.map((n) => n.title).join(', '))}">${nav.map((n) => `
    <h2 class="content-nav__title">${esc(n.title)}</h2>
    <ul>${n.links.map((l) => `<li><a href="${esc(l.path)}"${l.path === page.path ? ' aria-current="page"' : ''}>${esc(l.name)}</a></li>`).join('')}</ul>`).join('')}
  </aside>` : '';
  return {
    bodyClass: 'page-content' + (aside ? ' has-sidebar' : ''),
    content: `${breadcrumb(page.breadcrumb)}
<div class="container content-layout">
  ${aside}
  <article class="content-main">${prose(page.html)}</article>
</div>`
  };
}

// /diagnose and /guidance: the home banner (search + steps, no headline) with the step active
function stepPage(page) {
  const step = page.path === '/diagnose' ? 0 : 2;
  let hero = partial('hero').replace(/ is-active"/, '"').replace(/ aria-current="page"/, '')
    .replace(/\s*<h1 class="hero__title"[\s\S]*?<\/h1>/, '').replace(/\s*<p class="hero__lead">[\s\S]*?<\/p>/, '')
    .replace(' aria-labelledby="hero-title"', ' aria-label="Nach Gerät, Modell oder Typennummer suchen"');
  let n = -1;
  hero = hero.replace(/<li class="hero-steps__item">/g, (m) => (++n === step ? '<li class="hero-steps__item is-active">' : m));
  return { bodyClass: 'page-home page-step', content: `${hero}\n<div class="container section">${prose(page.html)}</div>` };
}

const accountNav = (current) => `<nav class="account-nav" aria-label="Mein Konto">
  <h2 class="account-nav__title">Mein Konto</h2>
  <ul>${[['/account', 'Übersicht'], ['/account/profile', 'Persönliches Profil'], ['/account/address', 'Adressen'], ['/account/payment', 'Zahlungsarten'], ['/account/order', 'Bestellungen'], ['/account/mollie/subscriptions', 'Abonnements']]
    .map(([href, label]) => `<li><a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}
    <li><button class="link-btn" type="button" data-logout>Abmelden</button></li></ul>
</nav>`;

const accountShell = (pagePath, title, inner) => ({
  title: `${title} | artisanshop.ch`, robots: 'noindex', bodyClass: 'page-account',
  content: `${breadcrumb([{ name: 'Home', path: '/' }, { name: 'Mein Konto', path: '/account' }, { name: title, path: '' }])}
<div class="container account-layout" data-account-page="${pagePath}" data-requires-login>
  ${accountNav(pagePath)}
  <section class="account-main">
    <h1 class="page-title">${title}</h1>
    ${inner}
  </section>
</div>`
});

const PAYMENT_METHODS = [['paypal', 'PayPal'], ['twint', 'Twint'], ['creditcard', 'Kreditkarte'], ['applepay', 'Apple Pay'], ['klarna', 'Klarna']];
const REQUIRED_NOTE = '<p class="form-note">Die mit einem Stern (*) markierten Felder sind Pflichtfelder.</p>';
// Labels and placeholders of the archived registration form (/account/login)
const addressFields = (prefix = '', extra = false) => `
      <div class="form-row">
        <label class="form-field form-field--sm"><span>Anrede</span><select class="form-select" name="${prefix}salutation"><option>Keine Angabe</option><option>Herr</option><option>Frau</option></select></label>
      </div>
      <div class="form-row">
        <label class="form-field"><span>Vorname*</span><input class="form-control" type="text" name="${prefix}firstName" placeholder="Vornamen eingeben ..." required autocomplete="given-name"></label>
        <label class="form-field"><span>Nachname*</span><input class="form-control" type="text" name="${prefix}lastName" placeholder="Nachnamen eingeben ..." required autocomplete="family-name"></label>
      </div>
      ${extra ? `<div class="form-row">
        <label class="form-field"><span>Firma</span><input class="form-control" type="text" name="${prefix}company" placeholder="Firma eingeben ..." autocomplete="organization"></label>
        <label class="form-field"><span>Abteilung</span><input class="form-control" type="text" name="${prefix}department" placeholder="Abteilung eingeben ..."></label>
      </div>` : ''}
      <label class="form-field"><span>Straße und Hausnummer*</span><input class="form-control" type="text" name="${prefix}street" placeholder="Straße und Hausnummer eingeben ..." required autocomplete="address-line1"></label>
      <div class="form-row">
        <label class="form-field"><span>Ort*</span><input class="form-control" type="text" name="${prefix}city" placeholder="Ort eingeben ..." required autocomplete="address-level2"></label>
        <label class="form-field form-field--sm"><span>PLZ</span><input class="form-control" type="text" name="${prefix}zip" placeholder="PLZ eingeben ..." inputmode="numeric" autocomplete="postal-code"></label>
      </div>
      <label class="form-field"><span>Land*</span><select class="form-select" name="${prefix}country" required><option>Schweiz</option></select></label>`;

const SHOP_PAGES = {
  '/search': () => ({
    title: 'artisanshop.ch', robots: 'noindex', bodyClass: 'page-search',
    content: `${breadcrumb([{ name: 'Home', path: '/' }, { name: 'Suchen', path: '' }])}
<div class="container" data-search-page>
  <h1 class="page-title" data-search-title>Suchen</h1>
  <form class="search-page__form" action="/search" method="get" role="search">
    <label class="visually-hidden" for="search-page-input">Suchbegriff eingeben ...</label>
    <input class="form-control" id="search-page-input" type="search" name="search" placeholder="Suchbegriff eingeben ..." autocomplete="off">
    <button class="btn btn--primary" type="submit">Suchen</button>
  </form>
  <p class="search-page__status" role="status" aria-live="polite" data-search-status></p>
  <div data-search-results></div>
</div>`
  }),
  '/checkout/cart': () => ({
    title: 'Warenkorb | artisanshop.ch', robots: 'noindex', bodyClass: 'page-cart',
    content: `${breadcrumb([{ name: 'Home', path: '/' }, { name: 'Warenkorb', path: '' }])}
<div class="container">
  <h1 class="page-title">Warenkorb</h1>
  <div class="cart-page" data-cart-view="page"></div>
</div>`
  }),
  '/checkout/confirm': () => ({
    title: 'Bestellung abschließen | artisanshop.ch', robots: 'noindex', bodyClass: 'page-checkout',
    content: `${breadcrumb([{ name: 'Home', path: '/' }, { name: 'Warenkorb', path: '/checkout/cart' }, { name: 'Bestellung abschließen', path: '' }])}
<div class="container">
  <h1 class="page-title">Bestellung abschließen</h1>
  <form class="checkout" data-checkout-form novalidate>
    <div class="checkout__main">
      <fieldset class="checkout__step">
        <legend class="checkout__legend">Rechnungsadresse</legend>
        <p class="checkout__login" data-checkout-login><a href="/account/login?redirectTo=/checkout/confirm">Ich bin bereits Kunde</a></p>
        <label class="form-field"><span>Ihre E-Mail-Adresse*</span><input class="form-control" type="email" name="email" placeholder="E-Mail-Adresse eingeben ..." required autocomplete="email"></label>
        ${addressFields()}
      </fieldset>
      <fieldset class="checkout__step">
        <legend class="checkout__legend">Versandart</legend>
        <label class="choice"><input type="radio" name="shipping" value="post" checked> <span>Schweizer Post</span></label>
      </fieldset>
      <fieldset class="checkout__step">
        <legend class="checkout__legend">Zahlungsart</legend>
        ${PAYMENT_METHODS.map(([v, l], i) => `<label class="choice"><input type="radio" name="payment" value="${v}"${i ? '' : ' checked'}> <span>${l}</span></label>`).join('\n        ')}
      </fieldset>
      <div class="checkout__step">
        <label class="checkbox"><input type="checkbox" name="tos" required> <span>Ich habe die <a href="/service/datenschutz/" target="_blank">Datenschutzbestimmungen</a> zur Kenntnis genommen und die <a href="/service/agb/" target="_blank">AGB</a> gelesen und bin mit ihnen einverstanden.</span></label>
        ${REQUIRED_NOTE}
      </div>
      <p class="form-error" role="alert" data-form-error></p>
    </div>
    <div class="checkout__summary">
      <h2 class="checkout__legend">Warenkorb</h2>
      <div data-cart-view="summary"></div>
      <button class="btn btn--primary btn--block" type="submit">Zahlungspflichtig bestellen</button>
      <p class="checkout__demo">Demo: Es wird keine echte Bestellung ausgelöst und keine Zahlung ausgeführt.</p>
    </div>
  </form>
</div>`
  }),
  '/checkout/finish': () => ({
    title: 'Vielen Dank für Ihre Bestellung | artisanshop.ch', robots: 'noindex', bodyClass: 'page-checkout',
    content: `<div class="container checkout-finish" data-checkout-finish>
  <h1 class="page-title">Vielen Dank für Ihre Bestellung bei artisanshop.ch!</h1>
  <div data-order-details><p><a href="/">Home</a></p></div>
</div>`
  }),
  // Copy of the archived page https://www.artisanshop.ch/account/login
  '/account/login': () => ({
    title: 'Registrierung | artisanshop.ch', robots: 'noindex', bodyClass: 'page-login',
    content: `${breadcrumb([{ name: 'Home', path: '/' }, { name: 'Registrierung', path: '' }])}
<div class="container login-layout" data-login-page>
  <section class="login-box">
    <h1 class="page-title">Ich bin bereits Kunde</h1>
    <p>Einloggen mit E-Mail-Adresse und Passwort</p>
    <form class="form-stack" data-login-form novalidate>
      <label class="form-field"><span>Ihre E-Mail-Adresse</span><input class="form-control" type="email" name="email" placeholder="E-Mail-Adresse eingeben ..." required autocomplete="username"></label>
      <label class="form-field"><span>Ihr Passwort</span><input class="form-control" type="password" name="password" placeholder="Passwort eingeben ..." required autocomplete="current-password"></label>
      <p><a href="/service/kundenservice/">Ich habe mein Passwort vergessen.</a></p>
      <p class="form-error" role="alert" data-form-error></p>
      <button class="btn btn--primary" type="submit">Anmelden</button>
    </form>
  </section>
  <section class="login-box">
    <h1 class="page-title">Ich bin Neukunde!</h1>
    <form class="form-stack" data-register-form novalidate>
      <fieldset class="form-stack">
        <legend class="visually-hidden">Persönliche Informationen</legend>
        ${addressFields().split('<label class="form-field"><span>Straße')[0]}
        <label class="form-field"><span>Neue E-Mail-Adresse*</span><input class="form-control" type="email" name="email" placeholder="Neue E-Mail-Adresse eingeben ..." required autocomplete="email"></label>
        <label class="form-field"><span>Passwort*</span><input class="form-control" type="password" name="password" placeholder="Passwort eingeben ..." required minlength="8" autocomplete="new-password">
          <small>Das Passwort muss mindestens 8 Zeichen lang sein.</small></label>
      </fieldset>
      <fieldset class="form-stack">
        <legend class="account-form__title">Ihre Adresse</legend>
        <label class="form-field"><span>Straße und Hausnummer*</span><input class="form-control" type="text" name="street" placeholder="Straße und Hausnummer eingeben ..." required autocomplete="address-line1"></label>
        <div class="form-row">
          <label class="form-field"><span>Ort*</span><input class="form-control" type="text" name="city" placeholder="Ort eingeben ..." required autocomplete="address-level2"></label>
          <label class="form-field form-field--sm"><span>PLZ</span><input class="form-control" type="text" name="zip" placeholder="PLZ eingeben ..." inputmode="numeric" autocomplete="postal-code"></label>
        </div>
        <label class="form-field"><span>Land*</span><select class="form-select" name="country" required><option>Schweiz</option></select></label>
        <label class="choice"><input type="radio" name="differentShipping" value="" checked data-collapse-close="register-shipping"> <span>An die oben angegebene Rechnungsadresse</span></label>
        <label class="choice"><input type="radio" name="differentShipping" value="1" data-collapse-open="register-shipping"> <span>An eine abweichende Lieferadresse</span></label>
      </fieldset>
      <fieldset class="form-stack collapse" id="register-shipping" disabled>
        <legend class="account-form__title">Abweichende Lieferadresse</legend>
        ${addressFields('shipping_', true)}
      </fieldset>
      <div class="privacy-notice">
        <strong>Datenschutz</strong>
        <p>Ich habe die <a href="/service/datenschutz/" target="_blank">Datenschutzbestimmungen</a> zur Kenntnis genommen und die <a href="/service/agb/" target="_blank">AGB</a> gelesen und bin mit ihnen einverstanden.</p>
      </div>
      ${REQUIRED_NOTE}
      <p class="form-error" role="alert" data-form-error></p>
      <button class="btn btn--primary" type="submit">Weiter</button>
    </form>
  </section>
</div>`
  }),
  '/account': () => accountShell('/account', 'Übersicht', `<div class="account-cards" data-account-overview></div>`),
  '/account/profile': () => accountShell('/account/profile', 'Persönliches Profil', `
    <form class="form-stack account-form" data-profile-form novalidate>
      <h2 class="account-form__title">Persönliche Daten</h2>
      <div class="form-row">
        <label class="form-field"><span>Vorname*</span><input class="form-control" type="text" name="firstName" required autocomplete="given-name"></label>
        <label class="form-field"><span>Nachname*</span><input class="form-control" type="text" name="lastName" required autocomplete="family-name"></label>
      </div>
      <label class="form-field"><span>E-Mail-Adresse*</span><input class="form-control" type="email" name="email" required autocomplete="email"></label>
      <p class="form-error" role="alert" data-form-error></p>
      <button class="btn btn--primary" type="submit">Änderungen speichern</button>
    </form>
    <form class="form-stack account-form" data-password-form novalidate>
      <h2 class="account-form__title">Passwort ändern</h2>
      <label class="form-field"><span>Aktuelles Passwort*</span><input class="form-control" type="password" name="current" required autocomplete="current-password"></label>
      <label class="form-field"><span>Neues Passwort* (mindestens 8 Zeichen)</span><input class="form-control" type="password" name="password" required minlength="8" autocomplete="new-password"></label>
      <p class="form-error" role="alert" data-form-error></p>
      <button class="btn btn--primary" type="submit">Passwort ändern</button>
    </form>`),
  '/account/address': () => accountShell('/account/address', 'Adressen', `
    <div class="address-list" data-address-list></div>
    <details class="account-form">
      <summary class="btn btn--secondary">Neue Adresse hinzufügen</summary>
      <form class="form-stack" data-address-form novalidate>${addressFields('', true)}
        ${REQUIRED_NOTE}
        <p class="form-error" role="alert" data-form-error></p>
        <button class="btn btn--primary" type="submit">Adresse speichern</button>
      </form>
    </details>`),
  '/account/payment': () => accountShell('/account/payment', 'Zahlungsarten', `
    <form class="form-stack account-form" data-payment-form>
      <fieldset><legend class="account-form__title">Standard-Zahlungsart</legend>
        ${PAYMENT_METHODS.map(([v, l]) => `<label class="choice"><input type="radio" name="payment" value="${v}"> <span>${l}</span></label>`).join('\n        ')}
      </fieldset>
      <p class="form-error" role="alert" data-form-error></p>
      <button class="btn btn--primary" type="submit">Speichern</button>
    </form>`),
  '/account/order': () => accountShell('/account/order', 'Bestellungen', `<div data-order-list></div>`),
  '/account/mollie/subscriptions': () => accountShell('/account/mollie/subscriptions', 'Abonnements', `<p class="empty-state">Sie haben keine aktiven Abonnements.</p>`)
};

function outFile(urlPath) {
  const clean = urlPath.replace(/^\/+/, '');
  if (!clean) return path.join(DIST, 'index.html');
  if (clean.endsWith('/')) return path.join(DIST, clean, 'index.html');
  if (clean.endsWith('.html')) return path.join(DIST, clean);
  return path.join(DIST, clean, 'index.html');
}

function write(urlPath, page, data) {
  const file = outFile(urlPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, layout({
    title: page.title || data.title || 'artisanshop.ch',
    description: page.description || data.metaDescription || '',
    robots: page.robots,
    bodyClass: page.bodyClass,
    content: page.content
  }).replace(/[ \t]+$/gm, ''));
}

const RENDER = { category: categoryPage, listing: listingPage, appliance: appliancePage, content: contentPage, step: stepPage };

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const item of ['index.html', '404.html', 'assets']) {
  fs.cpSync(path.join(ROOT, item), path.join(DIST, item), { recursive: true });
}

let count = 0;
for (const page of Object.values(pages)) {
  const render = RENDER[page.type];
  if (!render || page.path === '/') continue;
  write(page.path, render(page), page);
  count++;
}
for (const p of Object.values(products)) {
  if (!p.path || !p.name) continue;
  write(p.path, productPage(p), p);
  count++;
}
for (const [urlPath, render] of Object.entries(SHOP_PAGES)) {
  write(urlPath, render(), {});
  count++;
}

const index = {
  products: Object.values(products).filter((p) => p.path && p.name)
    .map((p) => [p.name, p.number, p.mpn || '', p.manufacturer || '', p.price == null ? null : p.price, p.path, productImage(p)]),
  appliances: Object.values(pages).filter((p) => p.type === 'appliance').map((p) => [p.h1.replace(/ Ersatzteile$/, ''), p.path, (p.breadcrumb[p.breadcrumb.length - 2] || {}).name || '']),
  pages: Object.values(pages).filter((p) => p.type !== 'appliance').map((p) => [p.title.split(' | ')[0], p.path])
};
fs.mkdirSync(path.join(DIST, 'assets', 'data'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'assets', 'data', 'search-index.json'), JSON.stringify(index));

console.log(`Wrote dist/: ${count} pages, search index with ${index.products.length} products and ${index.appliances.length} appliances`);
