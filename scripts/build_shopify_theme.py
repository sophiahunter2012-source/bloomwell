#!/usr/bin/env python3
"""Build the Bloomwell Shopify theme from the static site.

Run from the repo root:  python3 scripts/build_shopify_theme.py
Output: shopify-theme/  (zip it and upload in Shopify admin, or let Claude push it)

Static home-page sections are converted from index.html so the design stays
identical; shopping parts (product pages, collections, cart, bundles,
newsletter) are real Shopify Liquid.
"""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "shopify-theme"

# Static-site slug -> Shopify product handle
HANDLES = {
    "daily-glow": "daily-glow-adult-multivitamin-gummies",
    "gut-glow": "gut-glow-prebiotic-probiotic-gummies",
    "belly-bloom": "belly-bloom-gentle-digestion-gummies",
    "calm-bloom": "calm-bloom-magnesium-ashwagandha-gummies",
    "rest-easy": "rest-easy-sleep-support-gummies",
    "defend-bloom": "defend-bloom-vitamin-c-zinc-gummies",
    "defend-citrus": "defend-bloom-citrus",
    "bloom-protein": "bloom-protein",
    "protein-chocolate": "bloom-protein-chocolate",
    "protein-cookies": "bloom-protein-cookies-cream",
    "protein-strawberry": "bloom-protein-strawberry",
    "protein-lemon": "bloom-protein-lemon-sorbet",
    "skin-sip": "skin-sip-collagen-hyaluronic-acid",
    "gut-greens": "gut-greens-superfood-gut-powder",
    "hydrate-bloom": "hydrate-bloom-electrolyte-sticks",
    "calm-tea": "calm-tea",
    "immune-tea": "immune-tea",
    "focus-tea": "focus-tea",
    "lip-balm": "daily-nourish-lip-balm",
    "hand-cream": "hand-cream",
    "stretch-balm": "stretch-balm",
    "sleep-mist": "sleep-well-mist",
    "bath-soak": "relax-bath-soak",
    "calm-candle": "calm-soy-candle",
}
# Static collection key -> Shopify collection handle
COLL = {
    "gummies": "gummies", "protein": "protein-powders", "teas": "herbal-teas",
    "powders": "powders-drinks", "body": "body-care", "home": "home-relaxation",
    "glow": "glow", "gut": "gut", "rest": "rest", "fuel": "fuel",
}
# Shopify collection handle -> (accent for 3D heart, page background, eyebrow)
PALETTE = {
    "gummies": ("#E8937A", "#FBEAE4", "Collection"),
    "protein-powders": ("#A6C78B", "#EEF3E4", "Collection"),
    "herbal-teas": ("#E2B54A", "#FBF5DF", "Collection"),
    "powders-drinks": ("#F0AE9C", "#FBEDE6", "Collection"),
    "body-care": ("#E8937A", "#FCE9DE", "Collection"),
    "home-relaxation": ("#B7A6E4", "#EFEBF8", "Collection"),
    "glow": ("#F0AE9C", "#FBEAE4", "Ritual"),
    "gut": ("#A6C78B", "#EEF3E4", "Ritual"),
    "rest": ("#B7A6E4", "#EFEBF8", "Ritual"),
    "fuel": ("#E8937A", "#FCE9DE", "Ritual"),
}
TYPE_COLLS = ["gummies", "protein-powders", "herbal-teas", "powders-drinks", "body-care", "home-relaxation"]
RITUAL_COLLS = ["glow", "gut", "rest", "fuel"]

FILES = {}


def put(path, text):
    FILES[path] = text


def purl(slug):
    return "{{ routes.root_url | append: 'products/" + HANDLES[slug] + "' | replace: '//', '/' }}"


def curl(handle):
    return "{{ routes.collections_url }}/" + handle


def convert(html):
    """Static index.html markup -> Liquid."""
    # product card links in the horizontal gallery
    def card(m):
        li = m.group(0)
        slug = re.search(r"products/([a-z-]+?)(-sm)?\.webp", li).group(1)
        return li.replace('href="#shop"', f'href="{purl(slug)}"', 1)
    html = re.sub(r'<li class="card[^"]*"[^\n]*</li>', card, html)

    # Shop all cards become links to the product page
    def sacard(m):
        li = m.group(0)
        slug = re.search(r"products/([a-z-]+?)-sm\.webp", li).group(1)
        li = li.replace('<div class="sa-link">', f'<a class="sa-link" href="{purl(slug)}">', 1)
        i = li.rfind("</div></li>")
        return li[:i] + "</a></li>"
    html = re.sub(r'<li class="sa-card"[^\n]*</li>', sacard, html)

    html = re.sub(r'href="collections/index\.html"', 'href="{{ routes.collections_url }}"', html)
    html = re.sub(r'href="collections/([a-z]+)\.html"', lambda m: f'href="{curl(COLL[m.group(1)])}"', html)
    html = re.sub(r'assets/img/products/([a-z0-9-]+\.webp)', r"{{ '\1' | asset_url }}", html)
    html = html.replace('href="#shop">Shop the collection', f'href="{{{{ routes.all_products_collection_url }}}}">Shop the collection')
    return html


def schema(name, extra=None):
    s = {"name": name, "tag": "div", "class": "bw-section"}
    if extra:
        s.update(extra)
    return "\n{% schema %}\n" + json.dumps(s, indent=2) + "\n{% endschema %}\n"


# --------------------------------------------------------------------------
# Home page sections, converted from index.html
# --------------------------------------------------------------------------
src = (ROOT / "index.html").read_text()
main = src[src.index('<main id="main">') + len('<main id="main">'): src.index("</main>")]
chunks = re.split(r"\n    <!-- ", main)
by_class = {}
for ch in chunks[1:]:
    body = ch[ch.index("<section"):].rstrip()
    cls = re.match(r'<section class="([a-z-]+)', body).group(1)
    by_class[cls] = body

for cls, file, name in [
    ("hero", "bw-hero", "Hero"), ("manifesto", "bw-manifesto", "Manifesto"),
    ("rituals", "bw-rituals", "Rituals"), ("shop", "bw-gallery", "Product gallery"),
    ("shop-all", "bw-shop-all", "Shop all"), ("subscribe", "bw-subscribe", "Subscribe & save"),
    ("day", "bw-day", "A day in bloom"), ("promise", "bw-promise", "Promise"),
]:
    put(f"sections/{file}.liquid", convert(by_class[cls]) + "\n" + schema(name, {"presets": [{"name": name}]}))

# Subscribe & save: build-your-own box (pick products, see how long it lasts)
BOX_TYPES = [("gummies", "Gummies", 30), ("protein", "Protein", 30), ("teas", "Teas", 20),
             ("powders", "Powders", 30), ("body", "Body care", 60), ("home", "Home", 45)]
box_days_case = "\n".join(f"      when 'type:{k}'\n        assign kind = '{k}'\n        assign days = section.settings.days_{k}" for k, _, _ in BOX_TYPES)
box_chips = "\n".join(f'        <button type="button" class="box-chip" data-box-filter="{k}" aria-pressed="false">{n}</button>' for k, n, _ in BOX_TYPES)
put("sections/bw-subscribe.liquid", """<section class="subscribe" id="subscribe" aria-labelledby="subscribe-title">
  <div class="subscribe-inner box-inner">
    <div class="box-head">
      <div class="subscribe-copy">
        <p class="eyebrow">Subscribe &amp; save</p>
        <h2 id="subscribe-title" class="h2">Never run out of your ritual</h2>
        <p class="lede">Build your own box: pick your products, see how long they'll last, and we'll suggest how often to deliver.</p>
      </div>
      <ol class="steps steps-tight">
        <li><span class="step-num">1</span><div><h3>Pick your products</h3><p>Any mix, any flavour.</p></div></li>
        <li><span class="step-num">2</span><div><h3>See how long it lasts</h3><p>We work it out as you go.</p></div></li>
        <li><span class="step-num">3</span><div><h3>Choose your rhythm</h3><p>Every 30, 60 or 90 days.</p></div></li>
      </ol>
    </div>

    {%- liquid
      assign rest_pct = 100
      if settings.sale_enabled
        assign rest_pct = 100 | minus: settings.sale_percent
      endif
      assign has_plans = false
    -%}
    <div class="box" data-box data-sale="{{ rest_pct }}" data-sub="{{ settings.subscribe_percent }}">
      <div class="box-pick">
        <div class="box-chips" role="group" aria-label="Filter products">
          <button type="button" class="box-chip" data-box-filter="all" aria-pressed="true">All</button>
""" + box_chips + """
        </div>
        <ul class="box-grid" role="list">
          {%- for p in collections.all.products limit: 60 -%}
            {%- liquid
              assign v = p.selected_or_first_available_variant
              assign kind = 'other'
              assign days = 30
              for t in p.tags
                case t
""" + box_days_case + """
                endcase
              endfor
              assign mf_servings = p.metafields.bloomwell.servings.value | plus: 0
              if mf_servings > 0
                assign days = mf_servings
              endif
              assign plan = p.selling_plan_groups.first.selling_plans.first
              if plan
                assign has_plans = true
              endif
            -%}
            {%- if v.available -%}
            <li class="box-item" data-kind="{{ kind }}" data-id="{{ v.id }}" data-price="{{ v.price }}" data-days="{{ days }}" data-name="{{ p.title | split: ' — ' | first | escape }}"{% if plan %} data-plan="{{ plan.id }}"{% endif %}>
              <div class="box-img">{%- if p.featured_image -%}{{ p.featured_image | image_url: width: 240 | image_tag: alt: '', loading: 'lazy', width: 120, height: 120 }}{%- endif -%}</div>
              <div class="box-meta">
                <p class="box-name">{{ p.title | split: ' — ' | first }}</p>
                <p class="box-price">{{ v.price | money }}<span> · ~{{ days }} days</span></p>
              </div>
              <div class="qty box-qty">
                <button type="button" data-box-step="-1" aria-label="Remove one {{ p.title | split: ' — ' | first | escape }}">−</button>
                <output aria-live="polite">0</output>
                <button type="button" data-box-step="1" aria-label="Add one {{ p.title | split: ' — ' | first | escape }}">+</button>
              </div>
            </li>
            {%- endif -%}
          {%- endfor -%}
        </ul>
      </div>

      <aside class="box-summary" aria-labelledby="box-title">
        <h3 id="box-title">Your box</h3>
        <p class="box-empty" data-box-empty>Tap + on anything you'd like.</p>
        <ul class="box-lines" role="list" data-box-lines></ul>
        <div class="box-lasts" data-box-lasts hidden>
          <span class="box-ring" aria-hidden="true"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19"/><circle class="box-ring-fill" cx="22" cy="22" r="19" pathLength="100"/></svg></span>
          <p>Lasts about <strong data-box-days>0</strong> days<small>Based on one serving a day. Check each label for the exact serving.</small></p>
        </div>
        <fieldset class="box-rhythm">
          <legend>Deliver every</legend>
          <label><input type="radio" name="box-rhythm" value="30" checked><span>30 days</span></label>
          <label><input type="radio" name="box-rhythm" value="60"><span>60 days</span></label>
          <label><input type="radio" name="box-rhythm" value="90"><span>90 days</span></label>
        </fieldset>
        <p class="box-hint" data-box-hint></p>
        <dl class="box-totals">
          <div><dt>Box total</dt><dd data-box-total>{{ 0 | money }}</dd></div>
          {%- if settings.sale_enabled -%}<div class="box-save"><dt>Includes {{ settings.sale_percent }}% sale</dt><dd data-box-was></dd></div>{%- endif -%}
          {%- if has_plans -%}<div class="box-save"><dt>When you subscribe ({{ settings.subscribe_percent }}% off)</dt><dd data-box-sub></dd></div>{%- endif -%}
        </dl>
        <button type="button" class="btn btn-block box-add" data-box-add disabled>Add my box to bag</button>
        <p class="box-note">{% if has_plans %}Subscribe and save {{ settings.subscribe_percent }}% on every delivery. Skip, swap or cancel any time.{% else %}Subscriptions are coming soon. For now your box is added to your bag as a one-off order.{% endif %}</p>
      </aside>
    </div>
  </div>
</section>
""" + schema("Subscribe & save box", {
    "settings": [{"type": "paragraph", "content": "How many days each product type lasts, used when a product has no servings metafield (bloomwell.servings)."}]
    + [{"type": "number", "id": f"days_{k}", "label": f"{n}: days per pack", "default": d} for k, n, d in BOX_TYPES],
    "presets": [{"name": "Subscribe & save box"}],
}))

# Press strip with editable blocks
put("sections/bw-press.liquid", """<section class="press" aria-labelledby="press-title">
  <p id="press-title" class="press-label">{{ section.settings.label }}{% if section.settings.example %} <span class="example-tag">Example</span>{% endif %}</p>
  <div class="press-marquee">
    <ul class="press-track" role="list">
      {%- for pass in (1..2) -%}
        {%- for block in section.blocks -%}
          <li class="press-logo pl-{{ forloop.index | modulo: 5 | plus: 1 }}"{% if pass == 2 %} aria-hidden="true"{% endif %} {{ block.shopify_attributes }}>
            {%- if block.settings.logo -%}{{ block.settings.logo | image_url: height: 64 | image_tag: alt: block.settings.name, height: 32, class: 'press-img' }}{%- else -%}{{ block.settings.name }}{%- endif -%}
          </li>
        {%- endfor -%}
      {%- endfor -%}
    </ul>
  </div>
</section>
""" + schema("Press strip", {
    "settings": [
        {"type": "text", "id": "label", "label": "Label", "default": "As featured in"},
        {"type": "checkbox", "id": "example", "label": "Show Example tag", "info": "Turn off once real press is added.", "default": True},
    ],
    "blocks": [{"type": "logo", "name": "Publication", "settings": [
        {"type": "text", "id": "name", "label": "Publication name", "default": "Your Magazine"},
        {"type": "image_picker", "id": "logo", "label": "Logo (optional)"},
    ]}],
    "presets": [{"name": "Press strip", "blocks": [
        {"type": "logo", "settings": {"name": n}} for n in ["Your Magazine", "PUBLICATION", "the journal", "Wellness Weekly", "EDITORIAL"]]}],
}))

# Bundles: real prices from Shopify, real add-to-bag
BUNDLES = [
    ("The Glow Ritual", "#FBE2DA", ["skin-sip", "daily-glow", "lip-balm", "hand-cream"], "Skin Sip, Daily Glow, Lip Balm &amp; Hand Cream"),
    ("The Sleep Ritual", "#E9E2F6", ["calm-bloom", "rest-easy", "calm-tea", "sleep-mist"], "Calm Bloom, Rest Easy, Calm Tea &amp; Sleep Well Mist"),
    ("The Gut Reset", "#E5EEDA", ["gut-greens", "gut-glow", "belly-bloom"], "Gut Greens, Gut Glow &amp; Belly Bloom"),
    ("The Daily Defence", "#FBE3D3", ["defend-bloom", "immune-tea", "hydrate-bloom", "defend-citrus"], "Defend Bloom, Defend Bloom Citrus, Immune Tea &amp; Hydrate Bloom"),
]


def price_logic(slugs):
    handles = ",".join(HANDLES[s] for s in slugs)
    return f"""{{%- liquid
  assign total = 0
  assign ids = ''
  assign handles = '{handles}' | split: ','
  for h in handles
    assign p = all_products[h]
    if p.id
      assign v = p.selected_or_first_available_variant
      assign total = total | plus: v.price
      assign ids = ids | append: v.id | append: ','
    endif
  endfor
  assign d = section.settings.discount
  if settings.sale_enabled and settings.sale_percent > d
    assign d = settings.sale_percent
  endif
  assign now = total
  if d > 0
    assign off = total | times: d | divided_by: 100
    assign now = total | minus: off
  endif
-%}}"""


bundle_html = []
for name, tint, slugs, items in BUNDLES:
    imgs = "".join(f"<img src=\"{{{{ '{s}-sm.webp' | asset_url }}}}\" alt=\"\" width=\"600\" height=\"600\" loading=\"lazy\">" for s in slugs)
    bundle_html.append(f"""      {price_logic(slugs)}
      <article class="bundle" style="--tint:{tint}">
        <div class="bundle-stack n{len(slugs)}" aria-hidden="true">{imgs}</div>
        <div class="bundle-body">
          {{%- if d > 0 -%}}<span class="save-pill">Save {{{{ d }}}}%</span>{{%- endif -%}}
          <h3>{name}</h3>
          <p class="bundle-items">{items}</p>
          <p class="price"><span class="price-now">{{{{ now | money }}}}</span>{{% if d > 0 %}} <s class="price-was">{{{{ total | money }}}}</s>{{% endif %}}</p>
          <button type="button" class="btn btn-block" data-add-items="{{{{ ids }}}}">Add bundle to bag</button>
        </div>
      </article>""")
put("sections/bw-bundles.liquid", """<section class="bundles" id="bundles" data-preset="bundles" aria-labelledby="bundles-title">
  <div class="section-head">
    <p class="eyebrow">Bundle &amp; save</p>
    <h2 id="bundles-title" class="h2">{{ section.settings.heading }}</h2>
    <p class="lede">{{ section.settings.text }}</p>
  </div>
  <div class="bundle-grid">
""" + "\n".join(bundle_html) + """
  </div>
</section>
""" + schema("Bundles", {
    "settings": [
        {"type": "text", "id": "heading", "label": "Heading", "default": "Rituals, ready-made"},
        {"type": "text", "id": "text", "label": "Text", "default": "Our favourite routines in one box."},
        {"type": "range", "id": "discount", "label": "Bundle discount shown", "info": "Create a matching automatic discount in Shopify first.", "min": 0, "max": 50, "step": 1, "unit": "%", "default": 0},
    ],
    "presets": [{"name": "Bundles"}],
}))

PAIRS = [("calm-bloom", "Calm Bloom", "calm-tea", "Calm Tea", "The evening wind-down"),
         ("bloom-protein", "Bloom Protein", "hydrate-bloom", "Hydrate Bloom", "After the workout"),
         ("skin-sip", "Skin Sip", "hand-cream", "Hand Cream", "Glow, inside and out")]
pair_html = []
for a, an, b, bn, t in PAIRS:
    pair_html.append(f"""      {price_logic([a, b])}
      <li class="pair">
        <div class="pair-visual">
          <figure><a href="{purl(a)}"><img src="{{{{ '{a}-sm.webp' | asset_url }}}}" alt="{an}" width="600" height="600" loading="lazy"></a><figcaption>{an}</figcaption></figure>
          <span class="plus" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></svg></span>
          <figure><a href="{purl(b)}"><img src="{{{{ '{b}-sm.webp' | asset_url }}}}" alt="{bn}" width="600" height="600" loading="lazy"></a><figcaption>{bn}</figcaption></figure>
        </div>
        <div class="pair-body">
          <h3>{t}</h3>
          <p>{an} + {bn}{{% if d > 0 %}}. Save {{{{ d }}}}% when you buy them together{{% endif %}}. <strong>{{{{ now | money }}}}</strong></p>
          <button type="button" class="card-link btn-reset" data-add-items="{{{{ ids }}}}">Add both to bag</button>
        </div>
      </li>""")
put("sections/bw-pairs.liquid", """<section class="pairs" id="pairs" aria-labelledby="pairs-title">
  <div class="section-head">
    <p class="eyebrow">Better together</p>
    <h2 id="pairs-title" class="h2">Perfect pairs</h2>
  </div>
  <ul class="pair-list" role="list">
""" + "\n".join(pair_html) + """
  </ul>
</section>
""" + schema("Perfect pairs", {
    "settings": [{"type": "range", "id": "discount", "label": "Pair discount shown", "info": "Create a matching automatic discount in Shopify first.", "min": 0, "max": 50, "step": 1, "unit": "%", "default": 0}],
    "presets": [{"name": "Perfect pairs"}],
}))

STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>'
put("sections/bw-reviews.liquid", """<section class="reviews" id="reviews" data-preset="reviews" aria-labelledby="reviews-title">
  <div class="section-head reviews-head">
    <div>
      <p class="eyebrow">Reviews</p>
      <h2 id="reviews-title" class="h2">{{ section.settings.heading }}</h2>
      {%- if section.settings.note != blank -%}<p class="reviews-note">{{ section.settings.note }}</p>{%- endif -%}
    </div>
    <div class="review-nav">
      <button type="button" class="round-btn" data-dir="-1" aria-label="Previous reviews"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <button type="button" class="round-btn" data-dir="1" aria-label="Next reviews"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>
  </div>
  <ul class="review-track" role="list" tabindex="0" aria-label="Customer reviews">
    {%- for block in section.blocks -%}
      <li class="review" {{ block.shopify_attributes }}>
        <div class="review-top"><span class="stars" role="img" aria-label="{{ block.settings.rating }} out of 5 stars">{%- for i in (1..block.settings.rating) -%}""" + STAR + """{%- endfor -%}</span>{% if block.settings.example %}<span class="example-tag">Example</span>{% endif %}</div>
        <blockquote>“{{ block.settings.quote }}”</blockquote>
        <p class="review-meta"><span class="review-name">{{ block.settings.name }}</span> {% if block.settings.product != blank %}<span class="review-product">on {{ block.settings.product }}</span>{% endif %}</p>
      </li>
    {%- endfor -%}
  </ul>
</section>
""" + schema("Reviews", {
    "settings": [
        {"type": "text", "id": "heading", "label": "Heading", "default": "Loved by the Bloomwell community"},
        {"type": "text", "id": "note", "label": "Note", "info": "Clear this once reviews are real.", "default": "These are example reviews to show the layout. Real customer reviews will appear here."},
    ],
    "blocks": [{"type": "review", "name": "Review", "settings": [
        {"type": "range", "id": "rating", "label": "Stars", "min": 1, "max": 5, "step": 1, "default": 5},
        {"type": "textarea", "id": "quote", "label": "Review", "default": "Write the customer's review here."},
        {"type": "text", "id": "name", "label": "Customer name", "default": "Sample customer"},
        {"type": "text", "id": "product", "label": "Product"},
        {"type": "checkbox", "id": "example", "label": "Mark as example", "default": True},
    ]}],
    "presets": [{"name": "Reviews"}],
}))
EXAMPLE_REVIEWS = [
    ("Calm Bloom", "My evening routine finally feels like something I look forward to. The gummies taste great."),
    ("Skin Sip", "Dissolves easily in my morning coffee. The jar looks so pretty on my counter."),
    ("Rest Easy", "I love the little heart gummies. Part of my wind-down every night now."),
    ("Bloom Protein", "The strawberry flavour is my favourite. Smooth, not chalky at all."),
    ("Gut Greens", "Easiest way I have found to get my greens in. Mixes well with water."),
    ("Sleep Well Mist", "Smells calming without being too strong. I spray it on my pillow every night."),
]

put("sections/bw-newsletter.liquid", """<section class="cta" data-preset="cta" aria-labelledby="cta-title">
  <div class="cta-inner">
    <div class="cta-heart" aria-hidden="true"></div>
    <h2 id="cta-title" class="display display-sm">{{ section.settings.heading }}</h2>
    <p class="lede">{{ section.settings.text }}</p>
    {%- form 'customer', class: 'signup', id: 'newsletter-form' -%}
      <input type="hidden" name="contact[tags]" value="newsletter">
      <label class="sr-only" for="email">Email address</label>
      <input id="email" name="contact[email]" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
      <button class="btn" type="submit">Sign up</button>
      <p class="form-msg{% if form.errors %} is-error{% endif %}" role="status" aria-live="polite">
        {%- if form.posted_successfully? -%}Thank you! You're on the list.{%- elsif form.errors -%}{{ form.errors.messages['email'] | default: 'Please enter a valid email address.' }}{%- endif -%}
      </p>
    {%- endform -%}
  </div>
</section>
""" + schema("Newsletter", {
    "settings": [
        {"type": "text", "id": "heading", "label": "Heading", "default": "Join the bloom."},
        {"type": "text", "id": "text", "label": "Text", "default": "New rituals, restocks and gentle reminders to take care of yourself. No spam, just good things."},
    ],
    "presets": [{"name": "Newsletter"}],
}))

# --------------------------------------------------------------------------
# Header / footer
# --------------------------------------------------------------------------
LOGO = """<svg class="brand-mark" viewBox="0 0 100 112" aria-hidden="true">
        <path d="M50 108C22 87 6 70 6 48 6 33 16 23 29 23c9 0 16 5 21 13 5-8 12-13 21-13 13 0 23 10 23 25 0 22-16 39-44 60Z" fill="#316B58"/>
        <circle cx="50" cy="14" r="10" fill="#F2A35E"/>
        <path d="M57 6c1-5 6-7 12-7-1 6-5 10-12 11Z" fill="#7DB36B"/>
      </svg>"""
BAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>'

put("sections/bw-header.liquid", """{%- liquid
  assign base = routes.root_url
  if template.name == 'index'
    assign base = ''
  endif
-%}
<header class="site-header" id="top">
  <a class="brand" href="{{ routes.root_url }}" aria-label="{{ shop.name }} home">
    """ + LOGO + """
    <span class="brand-word">Bloomwell</span>
  </a>
  <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open menu">
    <span></span><span></span>
  </button>
  <nav class="nav" id="primary-nav" aria-label="Primary">
    <a href="{{ base }}#rituals">Rituals</a>
    <a href="{{ routes.collections_url }}">Collections</a>
    <a href="{{ base }}#shop-all">Shop all</a>
    <a href="{{ base }}#bundles">Bundles</a>
    <a href="{{ base }}#subscribe">Subscribe &amp; save</a>
    <a href="{{ base }}#reviews">Reviews</a>
    <a href="{{ routes.cart_url }}" class="nav-bag"{% if template.name == 'cart' %} aria-current="page"{% endif %}>Bag{% if cart.item_count > 0 %} <span class="nav-bag-count" data-cart-count>{{ cart.item_count }}</span>{% endif %}</a>
  </nav>
  <a class="cart-link" href="{{ routes.cart_url }}" aria-label="Bag, {{ cart.item_count }} items">""" + BAG + """<span class="cart-count" data-cart-count{% if cart.item_count == 0 %} hidden{% endif %}>{{ cart.item_count }}</span></a>
</header>
""" + schema("Header"))

def flinks(hs):
    return "\n".join(f'          {{%- assign c = collections["{h}"] -%}}{{%- if c.id -%}}<li><a href="{{{{ c.url }}}}">{{{{ c.title }}}}</a></li>{{%- endif -%}}' for h in hs)


put("sections/bw-footer.liquid", """<footer class="site-footer">
  <div class="footer-grid">
    <div class="footer-brand">
      <a class="brand brand-footer" href="{{ routes.root_url }}" aria-label="{{ shop.name }} home">
        """ + LOGO + """
        <span class="brand-word">Bloomwell</span>
      </a>
      <p class="footer-tag">{{ section.settings.tagline }}</p>
      <ul class="footer-perks" role="list">
        <li>Free UK delivery over £35</li>
        <li>30-day returns on unopened items</li>
        <li>Secure checkout</li>
      </ul>
    </div>
    <nav class="footer-col" aria-labelledby="f-shop">
      <h2 id="f-shop" class="footer-h">Shop</h2>
      <ul role="list">
        <li><a href="{{ routes.all_products_collection_url }}">Shop all</a></li>
""" + flinks(TYPE_COLLS) + """
      </ul>
    </nav>
    <nav class="footer-col" aria-labelledby="f-rituals">
      <h2 id="f-rituals" class="footer-h">Rituals</h2>
      <ul role="list">
""" + flinks(RITUAL_COLLS) + """
        <li><a href="{{ routes.root_url }}#bundles">Bundles</a></li>
        <li><a href="{{ routes.root_url }}#subscribe">Build a box</a></li>
      </ul>
    </nav>
    <nav class="footer-col" aria-labelledby="f-help">
      <h2 id="f-help" class="footer-h">Help</h2>
      <ul role="list">
        {%- assign dp = pages['delivery'] -%}{%- if dp.id -%}<li><a href="{{ dp.url }}">Delivery</a></li>{%- endif -%}
        {%- assign rp = pages['refund-policy'] -%}{%- if rp.id -%}<li><a href="{{ rp.url }}">Refunds &amp; returns</a></li>{%- endif -%}
        <li><a href="{{ routes.cart_url }}">Your bag</a></li>
        {%- if shop.customer_accounts_enabled -%}<li><a href="{{ routes.account_url }}">Your account</a></li>{%- endif -%}
        {%- if shop.email != blank -%}<li><a href="mailto:{{ shop.email }}">Contact us</a></li>{%- endif -%}
        {%- for link in linklists.footer.links -%}<li><a href="{{ link.url }}">{{ link.title }}</a></li>{%- endfor -%}
      </ul>
    </nav>
    <nav class="footer-col" aria-labelledby="f-legal">
      <h2 id="f-legal" class="footer-h">Policies</h2>
      <ul role="list">
        {%- for policy in shop.policies -%}{%- unless policy.title contains 'Refund' and rp.id -%}<li><a href="{{ policy.url }}">{{ policy.title }}</a></li>{%- endunless -%}{%- endfor -%}
      </ul>
    </nav>
  </div>
  <div class="footer-bottom">
    <p class="disclaimer">{{ section.settings.disclaimer }}</p>
    <p class="copyright">© <span id="year">{{ 'now' | date: '%Y' }}</span> {{ shop.name }}. Health · Wellness.</p>
  </div>
</footer>
""" + schema("Footer", {"settings": [
    {"type": "text", "id": "tagline", "label": "Tagline", "default": "Everyday rituals for your gut, skin, sleep and energy."},
    {"type": "textarea", "id": "disclaimer", "label": "Disclaimer",
    "default": "Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle. Do not exceed the recommended daily dose. Our products are not intended to diagnose, treat, cure or prevent any disease. Speak to your GP or pharmacist before starting a supplement, especially if you are pregnant, breastfeeding or taking medication."}]}))

# --------------------------------------------------------------------------
# Layout
# --------------------------------------------------------------------------
palette_case = "\n".join(
    f"    when '{h}'\n      assign accent = '{a}'\n      assign bg = '{b}'\n      assign eyebrow = '{e}'" for h, (a, b, e) in PALETTE.items())
ritual_case = "\n".join(
    f"      when 'ritual:{h}'\n        assign accent = '{PALETTE[h][0]}'\n        assign bg = '{PALETTE[h][1]}'" for h in RITUAL_COLLS)
PALETTE_LIQUID = f"""{{%- liquid
  assign accent = '#316B58'
  assign bg = '#FAF5EC'
  assign eyebrow = 'Collection'
  if template.name == 'collection'
    case collection.handle
{palette_case}
    endcase
  elsif template.name == 'product'
    for t in product.tags
      case t
{ritual_case}
      endcase
    endfor
  endif
-%}}"""

put("layout/theme.liquid", PALETTE_LIQUID + """
<!doctype html>
<html lang="{{ request.locale.iso_code }}" class="{% if settings.sale_enabled %}has-sale{% endif %}" style="--bg:{{ bg }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ page_title }}{% unless page_title contains shop.name %} — {{ shop.name }}{% endunless %}</title>
  {%- if page_description -%}<meta name="description" content="{{ page_description | escape }}">{%- endif -%}
  <link rel="canonical" href="{{ canonical_url }}">
  <meta name="theme-color" content="{{ bg }}">
  <link rel="icon" href="{{ 'favicon.svg' | asset_url }}" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet">
  {{ 'styles.css' | asset_url | stylesheet_tag }}
  {{ 'collections.css' | asset_url | stylesheet_tag }}
  {{ 'shopify.css' | asset_url | stylesheet_tag }}
  <script type="importmap">
    { "imports": { "three": "{{ 'three.module.min.js' | asset_url }}" } }
  </script>
  {{ content_for_header }}
</head>
<body class="template-{{ template.name }}" data-accent="{{ accent }}"{% if template.name == 'product' or template.name == 'cart' %} data-pose="corner"{% endif %}>
  <a class="skip-link" href="#main">Skip to content</a>
  {%- if settings.sale_enabled -%}
    <div class="announce" role="region" aria-label="Sale">
      <p class="sr-only">{{ settings.sale_message }}</p>
      <div class="announce-track" aria-hidden="true">
        {%- for i in (1..6) -%}<span>{{ settings.sale_message }}</span><span class="announce-dot">✦</span>{%- endfor -%}
      </div>
    </div>
  {%- endif -%}
  <canvas id="stage" aria-hidden="true"></canvas>
  <div class="grain" aria-hidden="true"></div>
  {% section 'bw-header' %}
  {%- unless template.name == 'index' or template.name == 'password' -%}
    <button type="button" class="bw-back" data-back aria-label="Go back to the previous page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Back</button>
  {%- endunless -%}
  <main id="main">
    {{ content_for_layout }}
  </main>
  {% section 'bw-footer' %}
  <script src="{{ 'gsap.min.js' | asset_url }}" defer></script>
  <script src="{{ 'ScrollTrigger.min.js' | asset_url }}" defer></script>
  <script src="{{ 'lenis.min.js' | asset_url }}" defer></script>
  <script>window.BW = { cartUrl: {{ routes.cart_url | json }}, cartAddUrl: {{ routes.cart_add_url | json }}, root: {{ routes.root_url | json }}, currency: {{ cart.currency.iso_code | json }} };</script>
  {%- if template.name == 'index' -%}
    <script type="module" src="{{ 'main.js' | asset_url }}"></script>
  {%- else -%}
    <script type="module" src="{{ 'collection.js' | asset_url }}"></script>
  {%- endif -%}
  <script type="module" src="{{ 'shop.js' | asset_url }}"></script>
</body>
</html>
""")

put("layout/password.liquid", """<!doctype html>
<html lang="{{ request.locale.iso_code }}">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ shop.name }}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500&family=Fraunces:opsz,wght@9..144,700&display=swap" rel="stylesheet">
  {{ 'styles.css' | asset_url | stylesheet_tag }}
  {{ 'shopify.css' | asset_url | stylesheet_tag }}
  {{ content_for_header }}
</head>
<body class="template-password">
  <main id="main">{{ content_for_layout }}</main>
</body>
</html>
""")

# --------------------------------------------------------------------------
# Collection, collections list, product, cart and utility pages
# --------------------------------------------------------------------------
switch_rows = []
for label, hs in (("By type", TYPE_COLLS), ("By ritual", RITUAL_COLLS)):
    chips = "".join(
        f'{{%- assign c = collections["{h}"] -%}}{{%- if c.id -%}}<a class="c-chip" href="{{{{ c.url }}}}"{{% if c.handle == collection.handle %}} aria-current="page"{{% endif %}}>{{{{ c.title }}}}</a>{{%- endif -%}}'
        for h in hs)
    switch_rows.append(f'<div class="c-switch-row"><span class="c-switch-label">{label}</span>{chips}</div>')

PCARD = """<li class="p-card" style="--tint:{{ tint }}">
  <div class="p-inner">
    <a class="p-media" href="{{ p.url }}">{%- if p.featured_image -%}{{ p.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', widths: '350,500,700', sizes: '(max-width: 900px) 50vw, 280px', alt: p.featured_image.alt | default: p.title }}{%- endif -%}</a>
    <div class="p-body">
      {%- for t in p.tags -%}{%- if t contains 'ritual:' -%}{%- assign r = t | remove: 'ritual:' -%}<a class="tag tag-link" href="{{ routes.collections_url }}/{{ r }}">{{ r | capitalize }}</a>{%- endif -%}{%- endfor -%}
      {%- assign parts = p.title | split: ' — ' -%}
      <h2><a href="{{ p.url }}">{{ parts[0] }}</a></h2>
      {%- if parts[1] -%}<p class="p-short">{{ parts[1] }}</p>{%- endif -%}
      <p class="p-desc">{{ p.description | strip_html | truncatewords: 18 }}</p>
      {%- render 'bw-price', price: p.price, from: p.price_varies, cls: 'p-price', show_sub: true -%}
      <a class="card-link" href="{{ p.url }}">Shop {{ parts[0] }}</a>
    </div>
  </div>
</li>"""
TINT = """{%- liquid
  assign tint = '#F1EADD'
  for t in p.tags
    if t contains 'tint:'
      assign tint = t | remove: 'tint:'
    endif
  endfor
-%}"""

put("sections/main-collection.liquid", PALETTE_LIQUID + """
<section class="c-hero" aria-labelledby="c-title">
  <div class="c-hero-copy">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="{{ routes.root_url }}">Home</a><span aria-hidden="true">/</span><a href="{{ routes.collections_url }}">Collections</a><span aria-hidden="true">/</span><span aria-current="page">{{ collection.title }}</span>
    </nav>
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1 id="c-title" class="display c-title"><span class="line"><span>{{ collection.title }}</span></span></h1>
    {%- if collection.description != blank -%}<div class="lede">{{ collection.description }}</div>{%- endif -%}
    <p class="c-count">{{ collection.products_count }} product{% if collection.products_count != 1 %}s{% endif %}</p>
  </div>
</section>

<section class="c-products" aria-label="{{ collection.title | escape }} products">
  <div class="c-switch" aria-label="Browse collections">
    """ + "\n    ".join(switch_rows) + """
  </div>
  {%- paginate collection.products by 48 -%}
    <ul class="c-grid" role="list">
      {%- for p in collection.products -%}
        """ + TINT + PCARD + """
      {%- else -%}
        <li class="c-empty">No products here yet.</li>
      {%- endfor -%}
    </ul>
    {%- if paginate.pages > 1 -%}<nav class="c-pages" aria-label="Pagination">{{ paginate | default_pagination }}</nav>{%- endif -%}
  {%- endpaginate -%}
</section>

<section class="c-sub" aria-labelledby="c-sub-title">
  <div class="c-sub-inner">
    <div>
      <p class="eyebrow">Subscribe &amp; save</p>
      <h2 id="c-sub-title" class="h2">Never run out of your ritual</h2>
    </div>
    <a class="btn btn-light" href="{{ routes.root_url }}#subscribe">How it works</a>
  </div>
</section>
""" + schema("Collection"))

TILE = """{%- if c.id -%}
<li class="c-tile" style="--tint:{{ tbg }}">
  <a href="{{ c.url }}">
    <div class="tile-stack" aria-hidden="true">
      {%- for p in c.products limit: 3 -%}{%- if p.featured_image -%}{{ p.featured_image | image_url: width: 400 | image_tag: loading: 'lazy', alt: '' }}{%- endif -%}{%- endfor -%}
    </div>
    <div class="tile-body">
      <span class="tile-group">{{ group }}</span>
      <h3>{{ c.title }}</h3>
      <span class="tile-count">{{ c.products_count }} product{% if c.products_count != 1 %}s{% endif %}</span>
    </div>
  </a>
</li>
{%- endif -%}"""


def tiles(hs, group):
    out = []
    for h in hs:
        out.append(f"{{%- assign c = collections['{h}'] -%}}{{%- assign tbg = '{PALETTE[h][1]}' -%}}{{%- assign group = '{group}' -%}}" + TILE)
    return "\n".join(out)


put("sections/main-list-collections.liquid", """<section class="c-hero" aria-labelledby="c-title">
  <div class="c-hero-copy">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="{{ routes.root_url }}">Home</a><span aria-hidden="true">/</span><span aria-current="page">Collections</span></nav>
    <p class="eyebrow">Shop</p>
    <h1 id="c-title" class="display c-title"><span class="line"><span>Collections</span></span></h1>
    <p class="lede">Every Bloomwell product, sorted by what it is or by the ritual it belongs to.</p>
  </div>
</section>
<section class="c-more c-index-group" aria-labelledby="g-type">
  <div class="section-head"><h2 id="g-type" class="h2">Shop by type</h2></div>
  <ul class="c-tiles" role="list">
""" + tiles(TYPE_COLLS, "By type") + """
  </ul>
</section>
<section class="c-more c-index-group" aria-labelledby="g-ritual">
  <div class="section-head"><h2 id="g-ritual" class="h2">Shop by ritual</h2></div>
  <ul class="c-tiles" role="list">
""" + tiles(RITUAL_COLLS, "By ritual") + """
  </ul>
</section>
""" + schema("Collections list"))

SWATCH = {"Vanilla": "#CFE0B8", "Chocolate": "#8A5A44", "Cookies & Cream": "#F1ECE3", "Strawberry": "#F3BFC6", "Lemon Sorbet": "#F2E7A0"}
swatch_case = "\n".join(f"        when '{k}'\n          assign sw = '{v}'" for k, v in SWATCH.items())
put("sections/main-product.liquid", """{%- liquid
  assign v = product.selected_or_first_available_variant
  assign parts = product.title | split: ' — '
  assign ritual = ''
  for t in product.tags
    if t contains 'ritual:'
      assign ritual = t | remove: 'ritual:'
    endif
  endfor
-%}
{%- assign rest_pct = 100 | minus: settings.sale_percent -%}{%- unless settings.sale_enabled -%}{%- assign rest_pct = 100 -%}{%- endunless -%}
<section class="pdp c-hero" aria-labelledby="pdp-title">
  <div class="pdp-grid">
    <div class="pdp-media" data-gallery>
      {%- assign start = v.featured_media | default: product.featured_media -%}
      <div class="pdp-main" aria-roledescription="carousel" aria-label="{{ product.title | escape }} images">
        <div class="pdp-slides" data-slides>
          {%- for m in product.media -%}
            {%- assign active = false -%}{%- if m.id == start.id -%}{%- assign active = true -%}{%- endif -%}
            {%- assign lz = 'lazy' -%}{%- if active -%}{%- assign lz = 'eager' -%}{%- endif -%}
            <figure class="pdp-slide{% if active %} is-active{% endif %}" data-media-id="{{ m.id }}" role="group" aria-roledescription="slide" aria-label="{{ forloop.index }} of {{ product.media.size }}"{% unless active %} aria-hidden="true"{% endunless %}>
              {{ m.preview_image | image_url: width: 1200 | image_tag: widths: '600,900,1200', sizes: '(max-width: 900px) 100vw, 50vw', alt: m.alt | default: product.title, loading: lz }}
            </figure>
          {%- else -%}
            <figure class="pdp-slide is-active"></figure>
          {%- endfor -%}
        </div>
        {%- if product.media.size > 1 -%}
          <button type="button" class="pdp-arrow pdp-prev" data-gallery-step="-1" aria-label="Previous image"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
          <button type="button" class="pdp-arrow pdp-next" data-gallery-step="1" aria-label="Next image"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
          <p class="pdp-count" aria-hidden="true"><span data-gallery-index>1</span> / {{ product.media.size }}</p>
        {%- endif -%}
      </div>
      {%- if product.media.size > 1 -%}
        <ul class="pdp-thumbs" role="list">
          {%- for m in product.media -%}
            <li><button type="button" class="pdp-thumb" data-goto="{{ forloop.index0 }}" aria-label="Show image {{ forloop.index }}" aria-current="{% if m.id == start.id %}true{% else %}false{% endif %}">{{ m.preview_image | image_url: width: 200 | image_tag: alt: '', loading: 'lazy' }}</button></li>
          {%- endfor -%}
        </ul>
      {%- endif -%}
    </div>
    <div class="pdp-info">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="{{ routes.root_url }}">Home</a><span aria-hidden="true">/</span>
        {%- if collection -%}<a href="{{ collection.url }}">{{ collection.title }}</a>{%- elsif ritual != '' -%}<a href="{{ routes.collections_url }}/{{ ritual }}">{{ ritual | capitalize }}</a>{%- else -%}<a href="{{ routes.collections_url }}">Collections</a>{%- endif -%}
        <span aria-hidden="true">/</span><span aria-current="page">{{ parts[0] }}</span>
      </nav>
      {%- if ritual != '' -%}<a class="tag tag-link" href="{{ routes.collections_url }}/{{ ritual }}">{{ ritual | capitalize }}</a>{%- endif -%}
      <h1 id="pdp-title" class="pdp-title">{{ parts[0] }}</h1>
      {%- if parts[1] -%}<p class="pdp-sub">{{ parts[1] }}</p>{%- endif -%}
      {%- render 'bw-price', price: v.price, cls: 'pdp-price', show_sub: true -%}

      {%- form 'product', product, class: 'pdp-form', id: 'pdp-form' -%}
        <input type="hidden" name="id" value="{{ v.id }}" data-variant-input>
        {%- unless product.has_only_default_variant -%}
          {%- for option in product.options_with_values -%}
            <fieldset class="pdp-option">
              <legend>{{ option.name }}: <strong data-option-label>{{ option.selected_value }}</strong></legend>
              <div class="pdp-values">
                {%- for value in option.values -%}
                  {%- liquid
                    assign sw = ''
                    case value
""" + swatch_case + """
                    endcase
                    assign vv = product.variants | where: 'title', value | first
                  -%}
                  <button type="button" class="pdp-value{% if sw != '' %} has-swatch{% endif %}" style="{% if sw != '' %}--sw:{{ sw }}{% endif %}"
                    aria-pressed="{% if value == option.selected_value %}true{% else %}false{% endif %}"
                    data-variant="{{ vv.id }}" data-price="{{ vv.price | money }}" data-sale-price="{{ vv.price | times: 100 | minus: 0 | times: rest_pct | divided_by: 10000.0 | round | money }}" data-available="{{ vv.available }}"
                    data-media="{{ vv.featured_media.id }}" data-value="{{ value | escape }}">
                    {%- if sw != '' -%}<span class="pdp-dot" aria-hidden="true"></span>{%- endif -%}{{ value }}
                  </button>
                {%- endfor -%}
              </div>
            </fieldset>
          {%- endfor -%}
        {%- endunless -%}
        {%- if product.selling_plan_groups.size > 0 -%}
          <fieldset class="pdp-purchase">
            <legend class="sr-only">Purchase options</legend>
            <label class="pdp-plan"><input type="radio" name="bw-purchase" value="" checked><span><strong>One-time purchase</strong></span></label>
            {%- for g in product.selling_plan_groups -%}{%- for plan in g.selling_plans -%}
              <label class="pdp-plan"><input type="radio" name="bw-purchase" value="{{ plan.id }}"><span><strong>{{ plan.name }}</strong><small>Save {{ settings.subscribe_percent }}% on every order · skip or cancel any time</small></span></label>
            {%- endfor -%}{%- endfor -%}
            <input type="hidden" name="selling_plan" value="" data-selling-plan disabled>
          </fieldset>
        {%- endif -%}
        <div class="pdp-buy">
          <div class="qty">
            <button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>
            <input type="number" name="quantity" value="1" min="1" aria-label="Quantity">
            <button type="button" data-qty="1" aria-label="Increase quantity">+</button>
          </div>
          <button type="submit" class="btn pdp-add" data-add-button {% unless v.available %}disabled{% endunless %}>{% if v.available %}Add to bag{% else %}Sold out{% endif %}</button>
        </div>
        <p class="form-msg" role="status" aria-live="polite"></p>
      {%- endform -%}

      <ul class="pdp-trust" role="list">
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Secure checkout</li>
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/></svg>30-day returns on unopened items</li>
        {%- if settings.sale_enabled -%}<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12 12 20 4 12V4h8z"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>{{ settings.sale_percent }}% off taken off at checkout</li>{%- endif -%}
      </ul>

      <div class="pdp-desc">{{ product.description }}</div>

      {%- liquid
        assign mf = product.metafields.bloomwell
        assign kind = ''
        for t in product.tags
          if t contains 'type:'
            assign kind = t | remove: 'type:'
          endif
        endfor
      -%}
      <div class="pdp-details">
        <details class="c-faq-item" open>
          <summary><span>How to use</span><span class="c-faq-icon" aria-hidden="true"></span></summary>
          <div class="c-faq-answer rte">
            {%- if mf.how_to_use != blank -%}{{ mf.how_to_use.value }}
            {%- else -%}
              {%- case kind -%}
                {%- when 'protein' -%}<p>Shake or blend one scoop with water, milk or your favourite plant milk. It also stirs into smoothies, overnight oats and coffee. Check the label for the exact serving size.</p>
                {%- when 'gummies' -%}<p>Chew the number of gummies shown on the label each day. Don't exceed the recommended amount.</p>
                {%- when 'teas' -%}<p>Steep in freshly boiled water for a few minutes, then enjoy. The tin has the recommended amount and steeping time.</p>
                {%- when 'powders' -%}<p>Mix with water, juice, a smoothie or your morning coffee. Check the label for the serving size.</p>
                {%- when 'body' -%}<p>Apply a small amount and massage in whenever you need it. For external use only.</p>
                {%- when 'home' -%}<p>See the label for directions. Never leave a lit candle unattended.</p>
                {%- else -%}<p>See the label for directions.</p>
              {%- endcase -%}
            {%- endif -%}
          </div>
        </details>
        <details class="c-faq-item">
          <summary><span>{% if kind == 'protein' %}Nutrition per scoop{% else %}Ingredients &amp; nutrition{% endif %}</span><span class="c-faq-icon" aria-hidden="true"></span></summary>
          <div class="c-faq-answer rte">
            {%- if mf.serving_size != blank or mf.protein_per_serving != blank or mf.servings != blank or mf.net_weight != blank -%}
              <table class="pdp-nutrition">
                {%- if mf.serving_size != blank -%}<tr><th scope="row">Serving size</th><td>{{ mf.serving_size.value }}</td></tr>{%- endif -%}
                {%- if mf.protein_per_serving != blank -%}<tr><th scope="row">Protein per serving</th><td>{{ mf.protein_per_serving.value }}</td></tr>{%- endif -%}
                {%- if mf.calories_per_serving != blank -%}<tr><th scope="row">Energy per serving</th><td>{{ mf.calories_per_serving.value }}</td></tr>{%- endif -%}
                {%- if mf.servings != blank -%}<tr><th scope="row">Servings per pack</th><td>{{ mf.servings.value }}</td></tr>{%- endif -%}
                {%- if mf.net_weight != blank -%}<tr><th scope="row">Net weight</th><td>{{ mf.net_weight.value }}</td></tr>{%- endif -%}
              </table>
            {%- endif -%}
            {%- if mf.ingredients != blank -%}<p><strong>Ingredients:</strong> {{ mf.ingredients.value }}</p>{%- endif -%}
            <p>Full ingredients, allergens and nutrition information are printed on the pack. Food supplements should not replace a varied, balanced diet and healthy lifestyle.</p>
          </div>
        </details>
        <details class="c-faq-item">
          <summary><span>Delivery &amp; returns</span><span class="c-faq-icon" aria-hidden="true"></span></summary>
          <div class="c-faq-answer rte">
            <ul class="pdp-ship" role="list">
              <li><strong>Standard UK delivery</strong><span>£3.99 · free on orders over £35</span></li>
              <li><strong>Express delivery</strong><span>£5.99 · next working day when you order by 1pm</span></li>
              <li><strong>Returns</strong><span>Unopened items within 30 days</span></li>
            </ul>
            <p>{% assign dp = pages['delivery'] %}{% if dp.id %}<a href="{{ dp.url }}">Delivery info</a>{% endif %}{% assign rp = pages['refund-policy'] %}{% if rp.id %}{% if dp.id %} · {% endif %}<a href="{{ rp.url }}">Refund policy</a>{% endif %}</p>
          </div>
        </details>
      </div>
    </div>
  </div>
</section>

<div class="pdp-sticky" data-sticky-bar aria-hidden="true">
  <div class="pdp-sticky-info"><strong>{{ parts[0] }}</strong>{%- render 'bw-price', price: v.price, cls: 'pdp-sticky-price', show_sub: false -%}</div>
  <button type="button" class="btn" data-sticky-add tabindex="-1">Add to bag</button>
</div>

{%- if ritual != '' -%}
  {%- assign rc = collections[ritual] -%}
  {%- if rc.products_count > 1 -%}
  <section class="c-products pdp-more" aria-labelledby="pdp-more-title">
    <div class="section-head"><p class="eyebrow">Complete the ritual</p><h2 id="pdp-more-title" class="h2">Pairs well with</h2></div>
    <ul class="c-grid" role="list">
      {%- assign shown = 0 -%}
      {%- for p in rc.products -%}
        {%- if p.id != product.id and shown < 4 -%}
          {%- assign shown = shown | plus: 1 -%}
          """ + TINT + PCARD + """
        {%- endif -%}
      {%- endfor -%}
    </ul>
  </section>
  {%- endif -%}
{%- endif -%}
""" + schema("Product"))

put("sections/main-cart.liquid", """<section class="c-hero cart-page" aria-labelledby="cart-title">
  <div class="cart-wrap">
    <h1 id="cart-title" class="display c-title"><span class="line"><span>Your bag</span></span></h1>
    {%- if cart.item_count > 0 -%}
      <form action="{{ routes.cart_url }}" method="post" class="cart-form" id="cart-form">
        <ul class="cart-lines" role="list">
          {%- for item in cart.items -%}
            <li class="cart-line">
              <a class="cart-img" href="{{ item.url }}">{%- if item.image -%}{{ item.image | image_url: width: 240 | image_tag: alt: '' }}{%- endif -%}</a>
              <div class="cart-info">
                <a class="cart-title" href="{{ item.url }}">{{ item.product.title | split: ' — ' | first }}</a>
                {%- unless item.product.has_only_default_variant -%}<p class="cart-variant">{{ item.variant.title }}</p>{%- endunless -%}
                <p class="cart-price">{{ item.final_line_price | money }}</p>
              </div>
              <div class="qty">
                <button type="button" data-qty="-1" aria-label="Decrease quantity of {{ item.product.title | escape }}">−</button>
                <input type="number" name="updates[]" value="{{ item.quantity }}" min="0" aria-label="Quantity of {{ item.product.title | escape }}">
                <button type="button" data-qty="1" aria-label="Increase quantity of {{ item.product.title | escape }}">+</button>
              </div>
              <a class="cart-remove" href="{{ item.url_to_remove }}">Remove</a>
            </li>
          {%- endfor -%}
        </ul>
        <div class="cart-summary">
          <p class="cart-subtotal"><span>Subtotal</span><strong>{{ cart.total_price | money }}</strong></p>
          {%- if cart.total_discount > 0 -%}<p class="cart-saving">You're saving {{ cart.total_discount | money }}</p>{%- endif -%}
          <p class="cart-small">Taxes and shipping are calculated at checkout, where you can pay securely by card.</p>
          <div class="cart-actions">
            <a class="btn btn-ghost" href="{{ routes.root_url }}">Continue shopping</a>
            <button type="submit" name="checkout" class="btn">Checkout</button>
          </div>
        </div>
      </form>
    {%- else -%}
      <p class="lede">Your bag is empty. Let's fix that.</p>
      <div class="cart-actions cart-empty-actions">
        <a class="btn" href="{{ routes.root_url }}">Start shopping</a>
        <a class="btn btn-ghost" href="{{ routes.collections_url }}">Browse collections</a>
      </div>
    {%- endif -%}
  </div>
</section>
""" + schema("Cart"))

SIMPLE = """<section class="c-hero simple-page"><div class="simple-wrap">
  <h1 class="display c-title"><span class="line"><span>{TITLE}</span></span></h1>
  {BODY}
</div></section>
"""
put("sections/main-page.liquid", SIMPLE.replace("{TITLE}", "{{ page.title }}").replace("{BODY}", '<div class="rte">{{ page.content }}</div>') + schema("Page"))
put("sections/main-404.liquid", SIMPLE.replace("{TITLE}", "Page not found").replace("{BODY}", '<p class="lede">This page wandered off. Try one of our collections instead.</p><p><a class="btn" href="{{ routes.collections_url }}">Shop collections</a></p>') + schema("404"))
put("sections/main-search.liquid", SIMPLE.replace("{TITLE}", "Search").replace("{BODY}", """<form action="{{ routes.search_url }}" method="get" class="signup search-form"><label class="sr-only" for="q">Search</label><input id="q" type="search" name="q" value="{{ search.terms | escape }}" placeholder="Search products"><button class="btn">Search</button></form>
  {%- if search.performed -%}
    <ul class="c-grid" role="list">
      {%- for p in search.results -%}{%- if p.object_type == 'product' -%}""" + TINT + PCARD + """{%- endif -%}{%- else -%}<li class="c-empty">No results for “{{ search.terms }}”.</li>{%- endfor -%}
    </ul>
  {%- endif -%}""") + schema("Search"))
put("sections/main-blog.liquid", SIMPLE.replace("{TITLE}", "{{ blog.title }}").replace("{BODY}", '{%- for a in blog.articles -%}<article class="rte"><h2><a href="{{ a.url }}">{{ a.title }}</a></h2>{{ a.excerpt_or_content }}</article>{%- endfor -%}') + schema("Blog"))
put("sections/main-article.liquid", SIMPLE.replace("{TITLE}", "{{ article.title }}").replace("{BODY}", '<div class="rte">{{ article.content }}</div>') + schema("Article"))
put("sections/main-password.liquid", """<section class="c-hero simple-page"><div class="simple-wrap">
  <h1 class="display c-title">Bloomwell</h1>
  <p class="lede">{{ shop.password_message | default: 'Something lovely is blooming. Opening soon.' }}</p>
  {%- form 'storefront_password', class: 'signup' -%}
    <label class="sr-only" for="pw">Password</label>
    <input id="pw" type="password" name="password" placeholder="Store password">
    <button class="btn" type="submit">Enter</button>
    {%- if form.errors -%}<p class="form-msg is-error">Wrong password, try again.</p>{%- endif -%}
  {%- endform -%}
</div></section>
""" + schema("Password"))


FAQ_SECTION = """<section class="c-faq" aria-labelledby="faq-title-{{ section.id }}">
  <div class="c-faq-inner">
    <p class="eyebrow">{{ section.settings.eyebrow }}</p>
    <h2 id="faq-title-{{ section.id }}" class="h2">{{ section.settings.heading }}</h2>
    <div class="c-faq-list">
      {%- for block in section.blocks -%}
        <details class="c-faq-item" {{ block.shopify_attributes }}{% if forloop.first and section.settings.open_first %} open{% endif %}>
          <summary><span>{{ block.settings.question }}</span><span class="c-faq-icon" aria-hidden="true"></span></summary>
          <div class="c-faq-answer rte">{{ block.settings.answer }}</div>
        </details>
      {%- endfor -%}
    </div>
  </div>
</section>
"""
put("sections/bw-faq.liquid", FAQ_SECTION + schema("FAQs", {
    "settings": [
        {"type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Good to know"},
        {"type": "text", "id": "heading", "label": "Heading", "default": "Questions, answered"},
        {"type": "checkbox", "id": "open_first", "label": "Open the first question", "default": False},
    ],
    "blocks": [{"type": "faq", "name": "Question", "settings": [
        {"type": "text", "id": "question", "label": "Question", "default": "Your question"},
        {"type": "richtext", "id": "answer", "label": "Answer", "default": "<p>Your answer.</p>"},
    ]}],
    "presets": [{"name": "FAQs"}],
}))

PROTEIN_FAQS = [
    ("How do I use Bloom Protein?", "<p>Add a scoop to water, milk or your favourite plant milk and shake or blend. It also stirs into smoothies, overnight oats and coffee. Check the label on your tub for the serving size.</p>"),
    ("Which flavour should I choose?", "<p>Vanilla is creamy and goes with everything. Chocolate is rich and smooth, Cookies &amp; Cream is the indulgent one, Strawberry is sweet and fruity, and Lemon Sorbet is bright and refreshing. Can't decide? Try a few and rotate.</p>"),
    ("Is Bloom Protein plant-based?", "<p>Yes. Every Bloom Protein flavour is a plant protein. For the full ingredient list and allergen information, check the label on each tub.</p>"),
    ("What goes well with Bloom Protein?", "<p>After a workout, pair it with a Hydrate Bloom electrolyte stick and finish with Stretch Balm. You'll find them all in our Fuel ritual.</p>"),
]

PRICE_SNIPPET = """{%- comment -%} Price with sale + subscribe line. Params: price, from (bool), cls, show_sub (bool) {%- endcomment -%}
{%- liquid
  assign pct = settings.sale_percent | default: 15
  assign rest = 100 | minus: pct
  assign sale = price | times: rest | divided_by: 100.0 | round
-%}
<p class="bw-price {{ cls }}">
  {%- if from -%}<span class="from">From </span>{%- endif -%}
  {%- if settings.sale_enabled -%}
    <span class="price-sale" data-sale-price>{{ sale | money }}</span> <s class="price-orig" data-price>{{ price | money }}</s> <span class="sale-pill">{{ pct }}% off</span>
  {%- else -%}
    <span data-price>{{ price | money }}</span>
  {%- endif -%}
</p>
{%- if show_sub and settings.subscribe_line -%}
  <p class="sub-line"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15Z"/><path d="M5 19 14 10"/></svg><span>Subscribe for {{ settings.subscribe_percent | default: 20 }}% off all orders</span></p>
{%- endif -%}
"""
put("snippets/bw-price.liquid", PRICE_SNIPPET)

def tpl(section_type, settings=None, extra_sections=None):
    secs = {"main": {"type": section_type, "settings": settings or {}}}
    order = ["main"]
    return json.dumps({"sections": secs, "order": order}, indent=2)


put("templates/collection.json", tpl("main-collection"))
protein_tpl = {"sections": {
    "main": {"type": "main-collection", "settings": {}},
    "faq": {"type": "bw-faq", "settings": {"eyebrow": "Good to know", "heading": "Bloom Protein FAQs", "open_first": False},
            "blocks": {f"q{i}": {"type": "faq", "settings": {"question": q, "answer": a}} for i, (q, a) in enumerate(PROTEIN_FAQS)},
            "block_order": [f"q{i}" for i in range(len(PROTEIN_FAQS))]},
}, "order": ["main", "faq"]}
put("templates/collection.protein.json", json.dumps(protein_tpl, indent=2))

# FAQ templates for every other collection (copy lives in collection_copy.py)
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from collection_copy import FAQS as COLL_FAQS
FAQ_TITLES = {"gummies": "Gummies FAQs", "herbal-teas": "Herbal tea FAQs", "powders-drinks": "Powders & drinks FAQs",
              "body-care": "Body care FAQs", "home-relaxation": "Home & relaxation FAQs", "glow": "Glow ritual FAQs",
              "gut": "Gut ritual FAQs", "rest": "Rest ritual FAQs", "fuel": "Fuel ritual FAQs"}
for key, faqs in COLL_FAQS.items():
    t = {"sections": {
        "main": {"type": "main-collection", "settings": {}},
        "faq": {"type": "bw-faq", "settings": {"eyebrow": "Good to know", "heading": FAQ_TITLES[key], "open_first": False},
                "blocks": {f"q{i}": {"type": "faq", "settings": {"question": q, "answer": f"<p>{a}</p>"}} for i, (q, a) in enumerate(faqs)},
                "block_order": [f"q{i}" for i in range(len(faqs))]},
    }, "order": ["main", "faq"]}
    put(f"templates/collection.{key}.json", json.dumps(t, indent=2))
put("templates/list-collections.json", tpl("main-list-collections"))
put("templates/product.json", tpl("main-product"))
put("templates/cart.json", tpl("main-cart"))
put("templates/page.json", tpl("main-page"))
put("templates/404.json", tpl("main-404"))
put("templates/search.json", tpl("main-search"))
put("templates/blog.json", tpl("main-blog"))
put("templates/article.json", tpl("main-article"))
put("templates/password.json", json.dumps({"layout": "password", "sections": {"main": {"type": "main-password", "settings": {}}}, "order": ["main"]}, indent=2))
put("templates/gift_card.liquid", """<!doctype html><html><head><meta charset="utf-8"><title>Gift card</title>{{ 'styles.css' | asset_url | stylesheet_tag }}</head>
<body><main class="simple-wrap" style="padding:80px 24px"><h1 class="h2">Your {{ shop.name }} gift card</h1><p class="lede">Balance: {{ gift_card.balance | money }}</p><p>Code: <strong>{{ gift_card.code | format_code }}</strong></p></main></body></html>
""")

# Home page order
home_order = ["hero", "press", "manifesto", "rituals", "gallery", "shop_all", "bundles", "subscribe", "pairs", "day", "reviews", "promise", "newsletter"]
home_types = {"hero": "bw-hero", "press": "bw-press", "manifesto": "bw-manifesto", "rituals": "bw-rituals",
              "gallery": "bw-gallery", "shop_all": "bw-shop-all", "bundles": "bw-bundles", "subscribe": "bw-subscribe",
              "pairs": "bw-pairs", "day": "bw-day", "reviews": "bw-reviews", "promise": "bw-promise", "newsletter": "bw-newsletter"}
home = {"sections": {}, "order": home_order}
for k in home_order:
    home["sections"][k] = {"type": home_types[k], "settings": {}}
press_names = ["Your Magazine", "PUBLICATION", "the journal", "Wellness Weekly", "EDITORIAL"]
home["sections"]["press"]["blocks"] = {f"p{i}": {"type": "logo", "settings": {"name": n}} for i, n in enumerate(press_names)}
home["sections"]["press"]["block_order"] = [f"p{i}" for i in range(len(press_names))]
home["sections"]["reviews"]["blocks"] = {f"r{i}": {"type": "review", "settings": {"rating": 5, "quote": q, "name": "Sample customer", "product": pr, "example": True}} for i, (pr, q) in enumerate(EXAMPLE_REVIEWS)}
home["sections"]["reviews"]["block_order"] = [f"r{i}" for i in range(len(EXAMPLE_REVIEWS))]
put("templates/index.json", json.dumps(home, indent=2))

put("config/settings_schema.json", json.dumps([{
    "name": "theme_info", "theme_name": "Bloomwell", "theme_version": "1.1.0", "theme_author": "Bloomwell",
    "theme_documentation_url": "https://help.shopify.com/manual/online-store/themes",
    "theme_support_url": "https://help.shopify.com"}, {
    "name": "Sale & subscriptions",
    "settings": [
        {"type": "checkbox", "id": "sale_enabled", "label": "Show sale banner and sale prices", "default": True,
         "info": "Keep this matched to your automatic discount in Shopify Discounts."},
        {"type": "range", "id": "sale_percent", "label": "Sale percentage", "min": 5, "max": 50, "step": 1, "unit": "%", "default": 15},
        {"type": "text", "id": "sale_message", "label": "Sale banner text", "default": "Sale · 15% off everything, taken off automatically at checkout"},
        {"type": "checkbox", "id": "subscribe_line", "label": "Show subscribe line under prices", "default": True},
        {"type": "range", "id": "subscribe_percent", "label": "Subscribe discount", "min": 5, "max": 50, "step": 1, "unit": "%", "default": 20},
    ]}], indent=2))
put("config/settings_data.json", json.dumps({"current": "Default", "presets": {"Default": {}}}, indent=2))
put("locales/en.default.json", json.dumps({"general": {"password_page": {"login_form_heading": "Enter store using password"}}}, indent=2))

# --------------------------------------------------------------------------
# Assets
# --------------------------------------------------------------------------
def build_assets():
    a = OUT / "assets"
    a.mkdir(parents=True, exist_ok=True)
    for f in ["styles.css", "collections.css"]:
        shutil.copy(ROOT / "css" / f, a / f)
    shutil.copy(ROOT / "shopify" / "shopify.css", a / "shopify.css")
    shutil.copy(ROOT / "shopify" / "shop.js", a / "shop.js")
    for f in ["three.module.min.js", "gsap.min.js", "ScrollTrigger.min.js", "lenis.min.js", "RoomEnvironment.js", "BufferGeometryUtils.js"]:
        shutil.copy(ROOT / "assets" / "vendor" / f, a / f)
    shutil.copy(ROOT / "assets" / "img" / "favicon.svg", a / "favicon.svg")
    for img in (ROOT / "assets" / "img" / "products").glob("*.webp"):
        shutil.copy(img, a / img.name)
    # JS: flat asset folder in Shopify
    scene = (ROOT / "js" / "scene.js").read_text()
    scene = scene.replace("'../assets/vendor/RoomEnvironment.js'", "'./RoomEnvironment.js'").replace("'../assets/vendor/BufferGeometryUtils.js'", "'./BufferGeometryUtils.js'")
    (a / "scene.js").write_text(scene)
    shutil.copy(ROOT / "js" / "fx.js", a / "fx.js")
    main_js = (ROOT / "js" / "main.js").read_text()
    # Newsletter posts to Shopify for real: drop the front-end-only handler
    i = main_js.index("/* Newsletter")
    i = main_js.rfind("/* ----", 0, i)
    j = main_js.index("window.addEventListener('load'")
    main_js = main_js[:i] + main_js[j:]
    (a / "main.js").write_text(main_js)
    coll = (ROOT / "js" / "collection.js").read_text()
    coll = coll.replace("""const HERO = mobile""", """const corner = document.body.dataset.pose === 'corner';
const HERO = corner
  ? (flow ? { x: 0.72, y: 0.8, scale: 0.16, tilt: 0, turn: 0, color: accent, fruit: 1, gummies: 0.6 }
          : { x: 0.88, y: 0.66, scale: 0.24, tilt: 0.1, turn: 0, color: accent, fruit: 1, gummies: 0.7 })
  : mobile""")
    (a / "collection.js").write_text(coll)


if OUT.exists():
    shutil.rmtree(OUT)
for path, text in FILES.items():
    p = OUT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
build_assets()
print(f"Built {len(FILES)} theme files + assets in {OUT.relative_to(ROOT)}/")
