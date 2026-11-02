#!/usr/bin/env python3
"""Generate Bloomwell collection pages from one product catalogue.

Run from the repo root:  python3 scripts/build_collections.py
Writes collections/index.html plus one page per collection.
Edit PRODUCTS / COLLECTIONS below, then re-run.
"""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "collections"

# slug, name, type, ritual, short line, description, tint
PRODUCTS = [
    ("daily-glow", "Daily Glow", "gummies", "glow", "Adult multivitamin gummies", "Heart-shaped multivitamin gummies that help fill daily nutrient gaps.", "#DDE7CF"),
    ("gut-glow", "Gut Glow", "gummies", "gut", "Prebiotic + probiotic gummies", "A daily prebiotic and probiotic gummy that supports healthy digestion.", "#E4EBD6"),
    ("belly-bloom", "Belly Bloom", "gummies", "gut", "Gentle digestion gummies", "Gentle digestion gummies for the days your belly needs a hug.", "#F8DCD6"),
    ("calm-bloom", "Calm Bloom", "gummies", "rest", "Magnesium + ashwagandha gummies", "Magnesium and ashwagandha gummies that help you feel relaxed.", "#E4DDF4"),
    ("rest-easy", "Rest Easy", "gummies", "rest", "Sleep support gummies", "Soft blue sleep support gummies that gently help you drift off.", "#D7E6EA"),
    ("defend-bloom", "Defend Bloom", "gummies", "fuel", "Vitamin C + zinc gummies", "Vitamin C and zinc gummies that support immune health.", "#F5D5C4"),
    ("defend-citrus", "Defend Bloom Citrus", "gummies", "fuel", "Vitamin C, zinc &amp; elderberry", "Citrus immune gummies with vitamin C, zinc and elderberry.", "#F8DCC4"),
    ("bloom-protein", "Bloom Protein Vanilla", "protein", "fuel", "Vanilla plant protein", "Creamy, gentle fuel. Vanilla plant protein for shakes and smoothies.", "#DDE7CF"),
    ("protein-chocolate", "Bloom Protein Chocolate", "protein", "fuel", "Chocolate plant protein", "Rich, smooth fuel. Chocolate plant protein for shakes and smoothies.", "#E9D3C6"),
    ("protein-cookies", "Bloom Protein Cookies &amp; Cream", "protein", "fuel", "Cookies &amp; cream plant protein", "Indulgent, gentle fuel with cookie pieces in every scoop.", "#EFEBE4"),
    ("protein-strawberry", "Bloom Protein Strawberry", "protein", "fuel", "Strawberry plant protein", "Sweet, fruity fuel. Strawberry plant protein that blends pink.", "#F8DCDF"),
    ("protein-lemon", "Bloom Protein Lemon Sorbet", "protein", "fuel", "Lemon sorbet plant protein", "Bright, refreshing fuel with a lemon sorbet taste.", "#F6F0C8"),
    ("calm-tea", "Calm Tea", "teas", "rest", "Chamomile &amp; lemon balm", "An herbal tea blend of chamomile and lemon balm for slower evenings.", "#DFEBDD"),
    ("immune-tea", "Immune Tea", "teas", "fuel", "Elderberry &amp; ginger", "A daily defence tea with elderberry and ginger.", "#F3D7C3"),
    ("focus-tea", "Focus Tea", "teas", "fuel", "Peppermint &amp; lemon", "A clear mind tea with peppermint and lemon for the afternoon.", "#F6F0C8"),
    ("skin-sip", "Skin Sip", "powders", "glow", "Collagen + hyaluronic acid", "Collagen and hyaluronic acid powder that supports glowing skin.", "#F6D9D1"),
    ("gut-greens", "Gut Greens", "powders", "gut", "Superfood + gut powder", "Superfood and gut powder. Your greens in one easy scoop.", "#DDE7CF"),
    ("hydrate-bloom", "Hydrate Bloom", "powders", "fuel", "Electrolyte sticks", "Electrolyte sticks to keep you going on busy days.", "#F6D3C6"),
    ("lip-balm", "Daily Nourish Lip Balm", "body", "glow", "Natural beeswax", "A natural beeswax lip balm for soft, cared-for lips.", "#F7D8C8"),
    ("hand-cream", "Hand Cream", "body", "glow", "Shea butter &amp; botanical oils", "Shea butter and botanical oils for soft, nourished hands.", "#F8DCD6"),
    ("stretch-balm", "Stretch Balm", "body", "fuel", "Magnesium &amp; essential oils", "A soothing muscle balm with magnesium and essential oils.", "#F3D2C0"),
    ("sleep-mist", "Sleep Well Mist", "home", "rest", "Pillow &amp; room spray", "A pillow and room spray with lavender and chamomile.", "#E4DDF4"),
    ("bath-soak", "Relax Bath Soak", "home", "rest", "Magnesium bath salts", "Magnesium bath salts with lavender and chamomile.", "#ECE8E1"),
    ("calm-candle", "Calm Soy Candle", "home", "rest", "Slow-burning natural wax", "A slow-burning natural wax candle for your wind-down.", "#F1EADD"),
]

# key, group, name, field, accent (3D heart), page background, intro
COLLECTIONS = [
    ("gummies", "type", "Gummies", "type", "#E8937A", "#FBEAE4",
     "Heart-shaped, sugar-dusted and genuinely nice to take. Daily support you will actually remember."),
    ("protein", "type", "Protein powders", "type", "#A6C78B", "#EEF3E4",
     "Bloom Protein in five flavours. Plant protein that blends creamy for shakes and smoothies."),
    ("teas", "type", "Herbal teas", "type", "#E2B54A", "#FBF5DF",
     "Three herbal blends in counter-worthy tins, for calm evenings, everyday defence and clear afternoons."),
    ("powders", "type", "Powders &amp; drinks", "type", "#F0AE9C", "#FBEDE6",
     "Collagen, greens and electrolytes. Stir, sip and get on with your day."),
    ("body", "type", "Body care", "type", "#E8937A", "#FCE9DE",
     "Balms and creams for lips, hands and muscles that worked hard."),
    ("home", "type", "Home &amp; relaxation", "type", "#B7A6E4", "#EFEBF8",
     "A pillow mist, a bath soak and a slow-burning candle to soften your evenings."),
    ("glow", "ritual", "Glow", "ritual", "#F0AE9C", "#FBEAE4",
     "Collagen you sip, vitamins you look forward to, and balms for your lips and hands. Beauty starts on the inside."),
    ("gut", "ritual", "Gut", "ritual", "#A6C78B", "#EEF3E4",
     "A scoop of greens, a daily pre and probiotic, and gentle gummies for days you need them."),
    ("rest", "ritual", "Rest", "ritual", "#B7A6E4", "#EFEBF8",
     "Magnesium and ashwagandha to unwind, calm tea, a mist for your pillow and gummies to drift off."),
    ("fuel", "ritual", "Fuel", "ritual", "#E8937A", "#FCE9DE",
     "Electrolytes, plant protein in five flavours, immune and focus teas, and a balm for after the stretch."),
]

RITUAL_LABEL = {"glow": "Glow", "gut": "Gut", "rest": "Rest", "fuel": "Fuel"}
GROUP_LABEL = {"type": "By type", "ritual": "By ritual"}


def items_for(key, field):
    i = 2 if field == "type" else 3
    return [p for p in PRODUCTS if p[i] == key]


LOGO = """<svg class="brand-mark" viewBox="0 0 100 112" aria-hidden="true">
          <path d="M50 108C22 87 6 70 6 48 6 33 16 23 29 23c9 0 16 5 21 13 5-8 12-13 21-13 13 0 23 10 23 25 0 22-16 39-44 60Z" fill="#316B58"/>
          <circle cx="50" cy="14" r="10" fill="#F2A35E"/>
          <path d="M57 6c1-5 6-7 12-7-1 6-5 10-12 11Z" fill="#7DB36B"/>
        </svg>"""


def head(title, desc, bg):
    return f"""<!doctype html>
<html lang="en" style="--bg:{bg}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="{bg}">
  <link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/collections.css">
  <script type="importmap">
    {{ "imports": {{ "three": "../assets/vendor/three.module.min.js" }} }}
  </script>
</head>"""


def header():
    return f"""  <a class="skip-link" href="#main">Skip to content</a>
  <canvas id="stage" aria-hidden="true"></canvas>
  <div class="grain" aria-hidden="true"></div>

  <header class="site-header">
    <a class="brand" href="../index.html" aria-label="Bloomwell home">
        {LOGO}
      <span class="brand-word">Bloomwell</span>
    </a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open menu">
      <span></span><span></span>
    </button>
    <nav class="nav" id="primary-nav" aria-label="Primary">
      <a href="../index.html#rituals">Rituals</a>
      <a href="index.html">Collections</a>
      <a href="../index.html#shop-all">Shop all</a>
      <a href="../index.html#bundles">Bundles</a>
      <a href="../index.html#subscribe">Subscribe &amp; save</a>
      <a href="../index.html#reviews">Reviews</a>
    </nav>
    <a class="btn btn-small" href="../index.html#shop">Shop now</a>
  </header>"""


def footer():
    links = "\n".join(f'        <a href="{k}.html">{n}</a>' for k, _, n, *_ in COLLECTIONS)
    return f"""  <footer class="site-footer">
    <div class="footer-top">
      <a class="brand brand-footer" href="../index.html" aria-label="Bloomwell home">
        {LOGO}
        <span class="brand-word">Bloomwell</span>
      </a>
      <nav class="footer-nav" aria-label="Collections">
        <a href="index.html">All collections</a>
{links}
      </nav>
    </div>
    <p class="disclaimer">*These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease. Consult your healthcare provider before starting any supplement, especially if you are pregnant, nursing or taking medication.</p>
    <p class="copyright">© <span id="year">2026</span> Bloomwell. Health · Wellness.</p>
  </footer>

  <script src="../assets/vendor/gsap.min.js"></script>
  <script src="../assets/vendor/ScrollTrigger.min.js"></script>
  <script src="../assets/vendor/lenis.min.js"></script>
  <script type="module" src="../js/collection.js"></script>
</body>
</html>
"""


def tile(c):
    key, group, name, field, accent, bg, _ = c
    items = items_for(key, field)
    imgs = "".join(
        f'<img src="../assets/img/products/{p[0]}-sm.webp" alt="" width="600" height="600" loading="lazy">'
        for p in items[:3])
    n = len(items)
    return f"""          <li class="c-tile" style="--tint:{bg};--accent:{accent}">
            <a href="{key}.html">
              <div class="tile-stack" aria-hidden="true">{imgs}</div>
              <div class="tile-body">
                <span class="tile-group">{GROUP_LABEL[group]}</span>
                <h3>{name}</h3>
                <span class="tile-count">{n} product{'s' if n != 1 else ''}</span>
              </div>
            </a>
          </li>"""


def product_card(p):
    slug, name, _type, ritual, short, desc, tint = p
    return f"""          <li class="p-card" style="--tint:{tint}">
            <div class="p-inner">
              <div class="p-media"><img src="../assets/img/products/{slug}-sm.webp" alt="{name}" width="600" height="600" loading="lazy"></div>
              <div class="p-body">
                <a class="tag tag-link" href="{ritual}.html">{RITUAL_LABEL[ritual]}</a>
                <h2>{name}</h2>
                <p class="p-short">{short}</p>
                <p class="p-desc">{desc}</p>
                <a class="card-link" href="../index.html#shop">Shop {name.replace('Bloom Protein ', '')}</a>
              </div>
            </div>
          </li>"""


def switcher(current):
    out = []
    for group in ("type", "ritual"):
        cur = ' aria-current="page"'
        chips = "".join(
            f'<a class="c-chip" href="{k}.html"{cur if k == current else ""}>{n}</a>'
            for k, g, n, *_ in COLLECTIONS if g == group)
        out.append(f'<div class="c-switch-row"><span class="c-switch-label">{GROUP_LABEL[group]}</span>{chips}</div>')
    return "\n          ".join(out)


def collection_page(c):
    key, group, name, field, accent, bg, intro = c
    items = items_for(key, field)
    cards = "\n".join(product_card(p) for p in items)
    others = [o for o in COLLECTIONS if o[0] != key and o[1] == group][:3]
    more = "\n".join(tile(o) for o in others)
    plain = name.replace("&amp;", "&")
    return f"""{head(f"{name} — Bloomwell", escape(intro.replace('&amp;', '&')), bg)}
<body data-accent="{accent}">
{header()}

  <main id="main">
    <section class="c-hero" aria-labelledby="c-title">
      <div class="c-hero-copy">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="../index.html">Home</a><span aria-hidden="true">/</span><a href="index.html">Collections</a><span aria-hidden="true">/</span><span aria-current="page">{name}</span>
        </nav>
        <p class="eyebrow">{'Collection' if group == 'type' else 'Ritual'}</p>
        <h1 id="c-title" class="display c-title"><span class="line"><span>{name}</span></span></h1>
        <p class="lede">{intro}</p>
        <p class="c-count">{len(items)} product{'s' if len(items) != 1 else ''}</p>
      </div>
    </section>

    <section class="c-products" aria-label="{plain} products">
      <div class="c-switch" aria-label="Browse collections">
          {switcher(key)}
      </div>
      <ul class="c-grid" role="list">
{cards}
      </ul>
    </section>

    <section class="c-sub" aria-labelledby="c-sub-title">
      <div class="c-sub-inner">
        <div>
          <p class="eyebrow">Subscribe &amp; save</p>
          <h2 id="c-sub-title" class="h2">Save 20% on every order</h2>
        </div>
        <a class="btn btn-light" href="../index.html#subscribe">How it works</a>
      </div>
    </section>

    <section class="c-more" aria-labelledby="c-more-title">
      <div class="section-head">
        <p class="eyebrow">Keep exploring</p>
        <h2 id="c-more-title" class="h2">More collections</h2>
      </div>
      <ul class="c-tiles" role="list">
{more}
      </ul>
      <p class="c-all"><a class="btn btn-ghost" href="index.html">See all collections</a></p>
    </section>
  </main>

{footer()}"""


def index_page():
    sections = []
    for group in ("type", "ritual"):
        tiles = "\n".join(tile(c) for c in COLLECTIONS if c[1] == group)
        title = "Shop by type" if group == "type" else "Shop by ritual"
        sections.append(f"""    <section class="c-more c-index-group" aria-labelledby="g-{group}">
      <div class="section-head">
        <h2 id="g-{group}" class="h2">{title}</h2>
      </div>
      <ul class="c-tiles" role="list">
{tiles}
      </ul>
    </section>""")
    body = "\n\n".join(sections)
    return f"""{head("Collections — Bloomwell", "Browse every Bloomwell collection: gummies, protein powders, herbal teas, body care and more.", "#FAF5EC")}
<body data-accent="#316B58">
{header()}

  <main id="main">
    <section class="c-hero" aria-labelledby="c-title">
      <div class="c-hero-copy">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="../index.html">Home</a><span aria-hidden="true">/</span><span aria-current="page">Collections</span>
        </nav>
        <p class="eyebrow">Shop</p>
        <h1 id="c-title" class="display c-title"><span class="line"><span>Collections</span></span></h1>
        <p class="lede">Every Bloomwell product, sorted by what it is or by the ritual it belongs to.</p>
        <p class="c-count">{len(PRODUCTS)} products · {len(COLLECTIONS)} collections</p>
      </div>
    </section>

{body}
  </main>

{footer()}"""


def main():
    OUT.mkdir(exist_ok=True)
    for c in COLLECTIONS:
        (OUT / f"{c[0]}.html").write_text(collection_page(c))
    (OUT / "index.html").write_text(index_page())
    print(f"Wrote {len(COLLECTIONS) + 1} pages to {OUT.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
