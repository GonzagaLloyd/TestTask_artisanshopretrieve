# artisanshop.ch – home page (front-end recreation)

Static recreation of the home page of **artisanshop.ch**, the Swiss online shop for household
appliance spare parts. The original site is no longer online (the domain now serves unrelated
content). This rebuild is based on the last complete snapshot in the Internet Archive from
**25 August 2025**:

https://web.archive.org/web/20250825132536/https://www.artisanshop.ch/

The original shop ran on **Shopware 6** with a custom theme on Bootstrap 5. This delivery does not
copy the compiled Shopware CSS/JS; it is a clean re-implementation of the layout, structure and
front-end behaviour in **plain HTML, CSS and JavaScript** – no framework, no dependencies.

## Running it

Open `index.html` directly in a browser. It is ready to use; no server, install or build is needed.
If you prefer serving it over HTTP:

```
npx serve .
# or
python -m http.server 8080
```

The *Figtree* webfont is loaded from Google Fonts; without an internet connection the system
font is used instead.

## Project structure

```
TestTask/
├── index.html                 Page outline: <head>, landmarks, one placeholder per section, scripts
├── partials/                  One HTML file per page section (plain, editable markup)
│   ├── icons.html             Inline SVG sprite (every icon is used via <use href="#icon-…">)
│   ├── header.html            Logo, menu toggle, search, actions, flyout level 1
│   ├── hero.html              Hero banner, step navigation, sticky appliance-number bar
│   ├── categories.html        20 device category tiles
│   ├── manufacturers.html     16 brand tiles + collapsible directory of 75 manufacturers
│   ├── intro.html             "Haushaltsgeräte Reparatur leicht gemacht" (text + image)
│   ├── reviews.html           Review carousel container + Google/Trustpilot badges
│   ├── guides.html            "Reparaturanleitungen …" text
│   ├── find-parts.html        "Ersatzteile … online finden und bestellen" text
│   ├── benefits.html          Advantages list + team image
│   ├── contact.html           Personal contact with WhatsApp / e-mail / contact form
│   ├── partners.html          Payment and shipping logos
│   ├── advisor.html           "Symptome und Fehlermeldungen verstehen" text
│   ├── footer.html            USP bar, country switch, footer columns, social links
│   ├── offcanvas.html         Side panels: mobile menu, appliance search, cart
│   └── cookie-consent.html    Cookie dialog
├── build.js                   Bundles partials/ into assets/js/partials.generated.js (no dependencies)
├── package.json               `npm run build`, `npm run validate`
├── README.md
└── assets/
    ├── css/
    │   ├── base.css           Design tokens (colours, type, spacing), reset, typography,
    │   │                      buttons, form controls, utilities
    │   ├── layout.css         Header, flyout navigation, footer, off-canvas panels,
    │   │                      dropdowns, cookie dialog, scroll-to-top
    │   ├── components.css     Reusable content modules: tile grids, manufacturer directory,
    │   │                      text/image blocks, review slider, contact, partner logos,
    │   │                      appliance search, cart
    │   └── home.css           Page specific: hero banner, step navigation, sticky bar
    ├── data/
    │   ├── navigation.js      Category tree of the main menu (321 entries, 3 levels)
    │   └── reviews.js         Customer reviews for the carousel
    ├── js/
    │   ├── utils.js           Helpers + module registry (global namespace `ArtisanShop`)
    │   ├── partials.generated.js  GENERATED bundle of partials/ (do not edit)
    │   ├── include.js         Swaps the <div data-include> placeholders for the partials
    │   ├── navigation.js      Renders menu levels 2–3 from data/navigation.js
    │   ├── reviews.js         Renders the review cards from data/reviews.js
    │   ├── offcanvas.js       Side panels (menu, appliance search, cart)
    │   ├── drilldown-menu.js  Mobile navigation, level by level (built from the menu tree)
    │   ├── flyout-menu.js     Desktop mega menu (3 levels, hover, keyboard, touch)
    │   ├── header-search.js   Search field: mobile toggle, clear button, demo submit
    │   ├── dropdown.js        Account menu, country switch
    │   ├── collapse.js        "Show more", footer columns (mobile), hint boxes
    │   ├── list-filter.js     Live filter in the manufacturer directory
    │   ├── slider.js          Review carousel (scroll snap + buttons + arrow keys)
    │   ├── appliance-search.js Panel "Gerätenummer eingeben & Ersatzteil finden"
    │   ├── scroll-top.js      "Back to top" button, shadow of the sticky bar
    │   ├── cookie-consent.js  Cookie dialog with groups, choice stored in localStorage
    │   └── main.js            Entry point: starts every module after DOMContentLoaded
    └── images/                Logo, hero, category/brand images, icons (from the archive)
```

### How the pieces fit together

* **Page outline:** `index.html` holds the document head, the landmarks and one
  `<div data-include="…">` placeholder per section, so the page structure can be read at a
  glance.
* **Sections:** every section is a plain HTML file in `partials/`, mirroring the CMS sections
  of the original page. `include.js` replaces each placeholder with the matching markup before
  the behaviour modules start. The partials are bundled into `assets/js/partials.generated.js`
  by `build.js` because `fetch()` is blocked for `file://` URLs – bundling keeps the page working
  when it is opened straight from the file system.
* **Data vs. markup:** the two large, repetitive data sets – the 321-entry navigation tree and
  the 21 reviews – live in `assets/data/` and are rendered by `navigation.js` and `reviews.js`.
* **Behaviour:** classic scripts (no `type="module"`, so the page works via `file://`). Each
  file is one self-contained module with a documented markup contract (`data-*` attributes)
  that registers itself in `utils.js`; `main.js` starts them in order.
* **Styles:** mobile-first CSS with custom properties as design tokens, BEM naming, no inline
  styles, split by concern (base → layout → components → page).

## Editing it

Change the HTML in `partials/`, the styles in `assets/css/` or the scripts in `assets/js/`, then
regenerate the bundle:

```
node build.js        # or: npm run build
```

`build.js` is a dependency-free Node script. It also checks that every placeholder in
`index.html` has a partial and warns about partials that are not used.

## Scope

The complete home page was rebuilt, including every interaction that runs client-side in the
original:

| Area | Implementation |
|---|---|
| Header | Logo, "Navigation" mega menu (321 entries in 3 levels), search, appliance-number link, cart, account dropdown, register button |
| Mobile | Hamburger menu as drill-down, collapsible search, compact hero steps |
| Hero | Image, headline, search shortcut (mobile), step navigation "Diagnose – Bestellen – Reparieren" |
| Sticky bar | Opens the off-canvas panel "Gerätenummer eingeben & Ersatzteil finden" (search, photo upload, selection by criteria) |
| Device categories | 20 tiles, 1 / 2 / 3 / 4 columns depending on viewport width |
| Manufacturers | 16 logo tiles, "Mehr anzeigen" expands a directory of 75 manufacturers with a live filter |
| Reviews | 21 customer reviews as a carousel, Google and Trustpilot badges |
| Content | All SEO text blocks, benefits, personal contact (WhatsApp, e-mail, contact form), payment and shipping partners |
| Footer | USP bar, country switch, columns (collapsible on mobile), payment/shipping logos, social links |
| Cookie dialog | Shown on the first visit, settings per group, choice persisted in `localStorage` |

### Accessibility and code quality

* Semantic structure (`header`, `nav`, `main`, `section`, `article`, `footer`), a sensible
  heading hierarchy, skip link, visible focus styles, `<noscript>` notice.
* All controls are buttons or links with `aria-expanded`/`aria-controls`; off-canvas panels and
  the cookie dialog keep focus inside (focus trap, `Escape`, `inert`).
* Flyout menu and slider can be operated with the keyboard (arrow keys).
* Both `index.html` and the fully rendered document validate without errors in `html-validate`
  (including its WCAG rules); no console errors.

## Deliberate differences from the original

* **No backend:** search, type-plate scanner, model selection and cart show status messages
  instead of server requests. Links to sub pages (`/kueche/kuehlschrank/` etc.) keep the
  original paths, but only the home page exists.
* **JavaScript required:** sections, menu levels and reviews are inserted client-side (the
  original rendered them on the server). Without JavaScript the page shows a notice.
* **Font:** the original uses the commercial typeface *GT Eesti*; the free, similarly
  geometric *Figtree* is used here.
* **Readability tweaks:** text-only sections are capped at a readable line length on wide
  screens (the original ran full width), headings use balanced wrapping, and a soft shade sits
  behind the transparent header so its labels stay legible over light parts of the hero photo.
* **Tracking removed:** Google Tag Manager, Analytics, Bing, Sentry and YouTube embeds were
  not carried over; the cookie dialog is purely functional.
* **Images:** taken from the Internet Archive (some only exist as small thumbnails). The mobile
  hero image was not archived; the desktop image is used with `object-fit: cover`.
* Small typos of the original were corrected ("öffnen", "Beratung über Whatsapp").

## Tested with

Chrome (desktop 1366 px, tablet 820 px, mobile 390 px and 320 px), a headless run through all
interactions without console errors, `html-validate` 8 on the source and on the rendered DOM.
