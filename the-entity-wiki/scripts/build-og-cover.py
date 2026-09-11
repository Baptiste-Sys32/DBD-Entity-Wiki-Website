#!/usr/bin/env python3

# Generates web/assets/og-cover.png (1200x630 Discord/link embed card).
# Usage: python3 scripts/build-og-cover.py
# Counts are read from content/database.json so regenerating refreshes them.

import json
import math
import os

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, 'web')
BITTER = os.path.join(WEB, 'assets', 'fonts', 'bitter-var.woff2')
TALLY = os.path.join(WEB, 'assets', 'loading', 'dbd-logo-static.png')
OUT = os.path.join(WEB, 'assets', 'og-cover.png')

W, H = 1200, 630
BG = (12, 11, 10)
BONE = (232, 229, 223)
DIM = (143, 138, 128)
RED = (224, 45, 35)


def font(size, bold=True):
    f = ImageFont.truetype(BITTER, size)
    if bold:
        try:
            names = [n.decode() if isinstance(n, bytes) else n for n in f.get_variation_names()]
            for target in ('Bold', 'ExtraBold', 'Black'):
                if target in names:
                    f.set_variation_by_name(target)
                    break
        except Exception:
            pass
    return f


def tracked_text(draw, xy, text, font_obj, fill, tracking=0):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font_obj, fill=fill)
        x += int(draw.textlength(ch, font=font_obj) + tracking)
    return x


def main():
    db = json.load(open(os.path.join(ROOT, 'content', 'database.json'), encoding='utf-8'))
    counts = [
        (len(db.get('killers', [])), 'Killers'),
        (len(db.get('survivors', [])), 'Survivors'),
        (len(db.get('perks', [])), 'Perks'),
    ]

    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # subtle top-to-bottom lift
    for y in range(H):
        t = y / H
        shade = int(12 + 10 * t)
        draw.line([(0, y), (W, y)], fill=(shade, shade - 1, shade - 2))

    # faint red glow, right side
    glow = Image.new('L', (W, H), 0)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([(W - 620, H - 560), (W + 180, H + 240)], fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    red_layer = Image.new('RGB', (W, H), RED)
    img = Image.composite(red_layer, img, glow.point(lambda v: v // 6))
    draw = ImageDraw.Draw(img)

    # tally mark, right side (autocrop the asset's black padding first).
    # NOTE: the source art is white-on-black with no alpha, so the red
    # channel doubles as the luminance mask (alpha is fully opaque).
    from PIL import ImageChops
    tally_src = Image.open(TALLY).convert('RGBA')
    bbox = ImageChops.difference(tally_src.convert('L'), Image.new('L', tally_src.size, 0)).getbbox()
    if bbox:
        pad = 12
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                min(tally_src.width, bbox[2] + pad), min(tally_src.height, bbox[3] + pad))
        tally_src = tally_src.crop(bbox)
    tally = tally_src
    white = Image.new('RGBA', tally.size, (240, 237, 231, 255))
    tally = Image.composite(white, Image.new('RGBA', tally.size, (0, 0, 0, 0)), tally.split()[0])
    tw = 470
    th = int(tally.height * tw / tally.width)
    tally = tally.resize((tw, th), Image.LANCZOS)
    img.paste(tally, (W - tw - 56, (H - th) // 2 - 10), tally)

    # left text block
    x0 = 80
    tracked_text(draw, (x0, 118), 'DEAD BY DAYLIGHT  -  FAN-MADE DATABASE', font(30, bold=False), DIM, tracking=4)
    draw.text((x0, 168), "The Entity's", font=font(100), fill=BONE)
    draw.text((x0, 282), 'Wiki', font=font(100), fill=BONE)
    draw.rectangle([(x0, 428), (x0 + 130, 436)], fill=RED)
    stats = '  -  '.join(f'{n} {label}' for n, label in counts)
    draw.text((x0, 462), stats, font=font(33, bold=False), fill=DIM)

    img.save(OUT)
    print(f'build-og-cover: wrote assets/og-cover.png ({W}x{H})')


main()
