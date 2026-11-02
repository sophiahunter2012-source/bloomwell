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
