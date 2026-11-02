# bloomwell

## Website

A scroll-driven 3D landing page for Bloomwell. Static files only, so it works on any static host (GitHub Pages, Netlify, Vercel).

- `index.html`: page markup and copy
- `css/styles.css`: design tokens and layout
- `js/scene.js`: Three.js scene with the 3D logo heart and floating gummy hearts
- `js/main.js`: GSAP ScrollTrigger and Lenis scroll choreography
- `assets/img/products/`: product photos (WebP, full size and `-sm` thumbnails)
- `assets/vendor/`: pinned copies of three@0.160.0, gsap@3.12.5 and lenis@1.1.13

Run it locally. It needs a local server because ES modules don't load from `file://`:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

### Collection pages

`collections/` holds one page per collection (by type and by ritual) plus an index page. They are generated from the product list in `scripts/build_collections.py`. To add or change a product, edit that list and run:

```bash
python3 scripts/build_collections.py
```

## Shopify theme

`shopify-theme/` is the same site as a Shopify theme (Liquid), with real product pages, collections, bag and checkout. It is generated from the static site:

```bash
python3 scripts/build_collections.py   # optional, static collection pages
python3 scripts/build_shopify_theme.py # writes shopify-theme/
cd shopify-theme && zip -r ../bloomwell-shopify-theme.zip . -x '.*'
```

Upload `bloomwell-shopify-theme.zip` in Shopify admin → Online Store → Themes → Add theme → Upload zip file. Theme-only files live in `shopify/` (bag + product page script and styles).

Product, collection and handle names the theme expects are listed at the top of `scripts/build_shopify_theme.py`. Products are tagged `ritual:<glow|gut|rest|fuel>`, `type:<…>` and `tint:<hex>`; the collections are automatic collections based on those tags.
