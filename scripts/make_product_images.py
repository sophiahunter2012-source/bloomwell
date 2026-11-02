#!/usr/bin/env python3
"""Make 3 extra product images per product (4 in total with the main photo).

  <slug>-2.webp  close-up detail of the product photo
  <slug>-3.webp  benefits card (name + 3 facts from the label)
  <slug>-4.webp  how-to-use card (ritual + directions)

Text only repeats what is on each label. Run from the repo root:
  python3 scripts/make_product_images.py <fonts-dir>
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img" / "products"
FONTS = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "fonts"
S = 1200

INK = (31, 77, 63)
INK_SOFT = (62, 100, 87)
CREAM = (250, 245, 236)
CARD = (255, 253, 248)
LEAF = (125, 179, 107)
ORANGE = (242, 163, 94)

RITUALS = {"glow": "Glow", "gut": "Gut", "rest": "Rest", "fuel": "Fuel"}
HOW = {
    "gummies": "Chew the number of gummies shown on the label each day. Keep the jar somewhere you'll see it so it becomes part of your routine.",
    "protein": "Shake or blend one scoop with water, milk or plant milk. It also stirs into smoothies, overnight oats and coffee. See the label for the serving size.",
    "teas": "Steep in freshly boiled water for a few minutes, then sip slowly. The tin has the recommended amount and steeping time.",
    "powders": "Mix with water, juice, a smoothie or your morning coffee. Check the label for the serving size.",
    "body": "Apply a small amount and massage in whenever you need it. For external use only.",
    "home": "Follow the directions on the label. Never leave a lit candle unattended.",
}

# slug: (name, type, ritual, tint, three facts from the label)
P = {
    "daily-glow": ("Daily Glow", "gummies", "glow", "#DDE7CF", ["Adult multivitamin", "Helps fill daily nutrient gaps", "Heart-shaped gummies"]),
    "gut-glow": ("Gut Glow", "gummies", "gut", "#E4EBD6", ["Prebiotic + probiotic", "Supports healthy digestion", "Heart-shaped gummies"]),
    "belly-bloom": ("Belly Bloom", "gummies", "gut", "#F8DCD6", ["Gentle digestion gummies", "For days your belly needs a hug", "Heart-shaped gummies"]),
    "calm-bloom": ("Calm Bloom", "gummies", "rest", "#E4DDF4", ["Magnesium + ashwagandha", "Helps you feel relaxed", "Heart-shaped gummies"]),
    "rest-easy": ("Rest Easy", "gummies", "rest", "#D7E6EA", ["Sleep support gummies", "Gently helps you drift off", "For your evening wind-down"]),
    "defend-bloom": ("Defend Bloom", "gummies", "fuel", "#F5D5C4", ["Vitamin C + zinc", "Supports immune health", "Heart-shaped gummies"]),
    "defend-citrus": ("Defend Bloom Citrus", "gummies", "fuel", "#F8DCC4", ["Vitamin C, zinc & elderberry", "Bright citrus flavour", "Heart-shaped gummies"]),
    "bloom-protein": ("Bloom Protein Vanilla", "protein", "fuel", "#DDE7CF", ["Vanilla plant protein", "Creamy, gentle fuel", "Shakes, smoothies and oats"]),
    "protein-chocolate": ("Bloom Protein Chocolate", "protein", "fuel", "#E9D3C6", ["Chocolate plant protein", "Rich, smooth fuel", "Shakes, smoothies and oats"]),
    "protein-cookies": ("Bloom Protein Cookies & Cream", "protein", "fuel", "#EFEBE4", ["Cookies & cream plant protein", "Indulgent, gentle fuel", "Shakes, smoothies and oats"]),
    "protein-strawberry": ("Bloom Protein Strawberry", "protein", "fuel", "#F8DCDF", ["Strawberry plant protein", "Sweet, fruity fuel", "Shakes, smoothies and oats"]),
    "protein-lemon": ("Bloom Protein Lemon Sorbet", "protein", "fuel", "#F6F0C8", ["Lemon sorbet plant protein", "Bright, refreshing fuel", "Shakes, smoothies and oats"]),
    "calm-tea": ("Calm Tea", "teas", "rest", "#DFEBDD", ["Chamomile & lemon balm", "Herbal tea blend", "For slower evenings"]),
    "immune-tea": ("Immune Tea", "teas", "fuel", "#F3D7C3", ["Elderberry & ginger", "Daily defence tea", "Warming and bright"]),
    "focus-tea": ("Focus Tea", "teas", "fuel", "#F6F0C8", ["Peppermint & lemon", "Clear mind tea", "For the afternoon"]),
    "skin-sip": ("Skin Sip", "powders", "glow", "#F6D9D1", ["Collagen + hyaluronic acid", "Supports glowing skin", "Stirs into coffee or smoothies"]),
    "gut-greens": ("Gut Greens", "powders", "gut", "#DDE7CF", ["Superfood + gut powder", "Your greens in one scoop", "Mixes with water or smoothies"]),
    "hydrate-bloom": ("Hydrate Bloom", "powders", "fuel", "#F6D3C6", ["Electrolyte sticks", "Keeps you going on busy days", "Just add water"]),
    "lip-balm": ("Daily Nourish Lip Balm", "body", "glow", "#F7D8C8", ["Natural beeswax", "Soft, cared-for lips", "Pocket-sized"]),
    "hand-cream": ("Hand Cream", "body", "glow", "#F8DCD6", ["Shea butter & botanical oils", "Soft, nourished hands", "Bag and bedside friendly"]),
    "stretch-balm": ("Stretch Balm", "body", "fuel", "#F3D2C0", ["Magnesium & essential oils", "Soothing muscle balm", "For after the stretch"]),
    "sleep-mist": ("Sleep Well Mist", "home", "rest", "#E4DDF4", ["Lavender & chamomile", "Pillow & room spray", "Part of your wind-down"]),
    "bath-soak": ("Relax Bath Soak", "home", "rest", "#ECE8E1", ["Magnesium bath salts", "Lavender & chamomile", "For slow, warm evenings"]),
    "calm-candle": ("Calm Soy Candle", "home", "rest", "#F1EADD", ["Slow-burning natural wax", "Calm scented candle", "Light, breathe, unwind"]),
}


def font(name, size, weight):
    f = ImageFont.truetype(str(FONTS / name), size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def wrap(draw, text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=f) <= width:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def rounded(img, r):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], r, fill=255)
    out = img.convert("RGBA")
    out.putalpha(m)
    return out


def paste_shadow(base, img, xy, r=56, blur=40, offset=24, alpha=70):
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([xy[0], xy[1] + offset, xy[0] + img.size[0], xy[1] + img.size[1] + offset], r, fill=(31, 77, 63, alpha))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))
    base.alpha_composite(rounded(img, r), xy)


def heart(draw, cx, cy, w, color):
    # logo heart: two circles + triangle
    r = w * 0.27
    draw.ellipse([cx - w * 0.5, cy - r, cx - w * 0.5 + 2 * r * 1.0, cy + r], fill=color)
    draw.ellipse([cx + w * 0.5 - 2 * r, cy - r, cx + w * 0.5, cy + r], fill=color)
    draw.polygon([(cx - w * 0.49, cy + r * 0.25), (cx + w * 0.49, cy + r * 0.25), (cx, cy + w * 0.62)], fill=color)
    draw.ellipse([cx - w * 0.1, cy - w * 0.62, cx + w * 0.1, cy - w * 0.42], fill=ORANGE)


def leaf_dot(draw, x, y, s):
    draw.ellipse([x, y, x + s, y + s], fill=mix(LEAF, CARD, 0.55))
    draw.pieslice([x + s * 0.2, y + s * 0.2, x + s * 0.8, y + s * 0.8], 200, 380, fill=INK)


def detail(src, slug):
    w, h = src.size
    c = 0.56
    cw = int(w * c)
    cx, cy = w * 0.5, h * 0.58
    box = (int(cx - cw / 2), int(cy - cw / 2), int(cx + cw / 2), int(cy + cw / 2))
    im = src.crop(box).resize((S, S), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    im.save(IMG / f"{slug}-2.webp", "WEBP", quality=84)


def benefits(src, slug, name, kind, ritual, tint, facts):
    t = hexrgb(tint)
    bg = mix(t, CREAM, 0.25)
    im = Image.new("RGBA", (S, S), bg + (255,))
    d = ImageDraw.Draw(im)
    eyebrow = font("DMSans.ttf", 30, "SemiBold")
    title = font("Fraunces.ttf", 92, "Bold")
    body = font("DMSans.ttf", 44, "Medium")
    heart(d, 112, 118, 64, INK)
    d.text((170, 98), "B L O O M W E L L", font=eyebrow, fill=INK_SOFT)
    y = 210
    for line in wrap(d, name, title, 1040):
        d.text((80, y), line, font=title, fill=INK)
        y += 104
    y += 26
    for f in facts:
        leaf_dot(d, 80, y + 6, 46)
        d.text((150, y), f, font=body, fill=INK)
        y += 74
    size = max(380, min(560, S - 80 - (y + 24)))
    ph = src.resize((size, size), Image.LANCZOS)
    paste_shadow(im, ph, (S - size - 80, S - size - 80))
    pill = font("DMSans.ttf", 30, "Bold")
    label = f"{RITUALS[ritual].upper()} RITUAL"
    tw = d.textlength(label, font=pill)
    d.rounded_rectangle([80, S - 150, 80 + tw + 56, S - 86], 32, fill=INK)
    d.text((108, S - 140), label, font=pill, fill=CREAM)
    im.convert("RGB").save(IMG / f"{slug}-3.webp", "WEBP", quality=86)


def howto(src, slug, name, kind, ritual, tint):
    t = hexrgb(tint)
    im = Image.new("RGBA", (S, S), CREAM + (255,))
    d = ImageDraw.Draw(im)
    # soft tinted blob
    blob = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(blob).ellipse([520, 480, 1400, 1360], fill=t + (255,))
    im.alpha_composite(blob.filter(ImageFilter.GaussianBlur(6)))
    eyebrow = font("DMSans.ttf", 30, "SemiBold")
    title = font("Fraunces.ttf", 84, "Bold")
    body = font("DMSans.ttf", 40, "Regular")
    d.text((80, 96), "H O W   T O   U S E", font=eyebrow, fill=INK_SOFT)
    y = 160
    for line in wrap(d, "Make it part of your day", title, 1000):
        d.text((80, y), line, font=title, fill=INK)
        y += 96
    y += 30
    for line in wrap(d, HOW[kind], body, 640):
        d.text((80, y), line, font=body, fill=INK_SOFT)
        y += 58
    ph = src.resize((520, 520), Image.LANCZOS)
    # circular product photo
    m = Image.new("L", ph.size, 0)
    ImageDraw.Draw(m).ellipse([0, 0, 519, 519], fill=255)
    circ = ph.convert("RGBA")
    circ.putalpha(m)
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([620, 640, 1140, 1160], fill=(31, 77, 63, 70))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(36)))
    im.alpha_composite(circ, (600, 600))
    small = font("DMSans.ttf", 32, "SemiBold")
    d.text((80, S - 130), f"Part of the {RITUALS[ritual]} ritual", font=small, fill=INK)
    d.text((80, S - 84), "Always read the label before use.", font=font("DMSans.ttf", 26, "Regular"), fill=INK_SOFT)
    im.convert("RGB").save(IMG / f"{slug}-4.webp", "WEBP", quality=86)


def main():
    for slug, (name, kind, ritual, tint, facts) in P.items():
        src = Image.open(IMG / f"{slug}.webp").convert("RGB")
        detail(src, slug)
        benefits(src, slug, name, kind, ritual, tint, facts)
        howto(src, slug, name, kind, ritual, tint)
    print(f"Made {len(P) * 3} images in {IMG.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
