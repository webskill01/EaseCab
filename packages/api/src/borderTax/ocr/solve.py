"""Reads captchas offline (ddddocr). stdin: "<length> <png base64>" per line (length 0 = unknown).
stdout: the text per line.

Decodes the model output itself instead of ddddocr.classification():
- the model's charset is ~8k mostly-CJK glyphs; classification() picks the winner and THEN drops
  non-ASCII, so a position a CJK glyph won simply vanished (2026-11-06: "suad3" for a 6-char code).
  Here the argmax is taken over the captcha alphabet only (a-z A-Z 0-9 # @, '井' read as '#').
- a read one char too long (noise read as a char, e.g. "ssju7#M") drops its least-confident char.
"""
import base64
import io
import sys

import ddddocr
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')  # Windows console default (cp1252)
LOOKALIKE = {'井': '#'}
# The model never outputs '@': it reads one as a round glyph it can't settle on (2026-11-07 declaration
# captchas: "as4@c8" → '0' at 0.35, "@J8BA5" → 'a' at 0.27). A clear 0/o/a reads >0.9.
ROUND, AT_BELOW = set('0oOaQD'), 0.5

engine = ddddocr.DdddOcr(show_ad=False).ocr_engine
if not engine.is_initialized:  # model + charset load lazily on the first classification()
    engine.initialize()
charset = engine.charset_manager.get_charset()
# index 0 is the CTC blank
ALLOWED = np.array([0] + [i for i, c in enumerate(charset)
                          if i and c and (c in LOOKALIKE or (c.isascii() and (c.isalnum() or c in '#@')))])
INPUT = engine.session.get_inputs()[0].name


def read(png):
    """[(char, confidence)] via greedy CTC over the allowed alphabet."""
    x = engine._preprocess_image(Image.open(io.BytesIO(png)), False)  # ponytail: private API, pinned ddddocr 1.6.1
    out = engine.session.run(None, {INPUT: x})[0]
    logits = (out[:, 0, :] if out.shape[1] == 1 else out[0])[:, ALLOWED]
    p = np.exp(logits - logits.max(1, keepdims=True))
    p /= p.sum(1, keepdims=True)
    chars, prev = [], 0
    for t, k in enumerate(p.argmax(1)):
        if k and k != prev:
            chars.append([LOOKALIKE.get(charset[ALLOWED[k]], charset[ALLOWED[k]]), p[t, k]])
        elif k and k == prev:
            chars[-1][1] = max(chars[-1][1], p[t, k])
        prev = k
    # ponytail: confidence threshold, not a retrained model; misses keep landing in easecab-ocr-misses for tuning
    return [['@', p] if c in ROUND and p < AT_BELOW else [c, p] for c, p in chars]


FLAT = set('csuvwxzo')  # lowercase = uppercase shape, shorter (no ascender)
XHIGH = set('aemnr')    # lowercase other shape, but no ascender: reaching the cap line = uppercase
DESC = set('pyg')       # lowercase hangs below the baseline (not q: a serif Q's tail dips too)
WIDE_TOP = set('bdh')   # both ascend; B/D/H are wide across the top, b/d/h only a stem


def glyphs(ink):
    """8-connected ink blobs as [(ys, xs)], left to right; i/j dots merged into their stem."""
    seen, blobs = np.zeros_like(ink), []
    for y0, x0 in zip(*np.nonzero(ink)):
        if seen[y0, x0]:
            continue
        seen[y0, x0], stack, px = True, [(y0, x0)], []
        while stack:
            y, x = stack.pop()
            px.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    v, u = y + dy, x + dx
                    if 0 <= v < ink.shape[0] and 0 <= u < ink.shape[1] and ink[v, u] and not seen[v, u]:
                        seen[v, u] = True
                        stack.append((v, u))
        if len(px) > 3:  # specks
            blobs.append(tuple(np.array(px).T))
    blobs.sort(key=lambda b: b[1].min())
    out = []
    for b in blobs:  # a blob inside the previous one's columns is a dot
        if out and b[1].max() <= out[-1][1].max() + 1 and b[1].min() >= out[-1][1].min() - 1:
            out[-1] = (np.concatenate([out[-1][0], b[0]]), np.concatenate([out[-1][1], b[1]]))
        else:
            out.append(b)
    return out


def fix_case(png, chars):
    """Declaration captcha (clean text on white, case-sensitive): OCR mixes up c/C, k/K, w/W, x/X…
    (2026-11-12: 6yspCT read 6yspcT, Ny9Kqv read Ny9kqv). Glyph height settles it. Vahan's noisy
    captcha is case-insensitive, so it is left alone."""
    im = Image.open(io.BytesIO(png)).convert('RGBA')
    flat = Image.new('RGBA', im.size, 'white')
    flat.alpha_composite(im)
    grey = np.asarray(flat.convert('L'))
    if (grey > 200).mean() < 0.5:  # not the white canvas (Vahan: ~2% white)
        return chars
    ink = grey < 128
    blobs = glyphs(ink)
    if len(blobs) != len(chars):  # touching / broken glyphs: can't line them up, keep the read
        return chars
    cap = min(ys.min() for ys, _ in blobs)
    base = float(np.median([ys.max() for (ys, _), (c, _) in zip(blobs, chars) if c not in 'gjpqyQJ']))
    tall = 0.12 * (base - cap)  # x-height sits ~0.2 below the cap line
    out = []
    for (ys, xs), (c, p) in zip(blobs, chars):
        low = c.lower()
        if low in FLAT or low in XHIGH:
            c = c.upper() if ys.min() - cap < tall else low
        elif low in WIDE_TOP:  # 2026-11-12: vknY6B read vknY6b
            top = ys <= ys.min() + 0.2 * (ys.max() - ys.min())
            c = c.upper() if np.ptp(xs[top]) > 0.55 * np.ptp(xs) else low
        elif low == 'k':  # k has an ascender too: K's arm reaches the cap line, k's stops at x-height
            arm = xs >= xs.min() + 0.7 * (xs.max() - xs.min())
            c = 'K' if ys[arm].min() - cap < tall else 'k'
        elif low in DESC:
            c = low if ys.max() - base > tall else c.upper()
        out.append([c, p])
    return out


def fit(chars, length):
    """One char too many → drop the least confident. Any other mismatch stays (caller refreshes)."""
    if length and len(chars) == length + 1:
        chars = [c for i, c in enumerate(chars) if i != min(range(len(chars)), key=lambda j: chars[j][1])]
    return ''.join(c for c, _ in chars)


if __name__ == '__main__':
    for line in sys.stdin:
        try:
            length, b64 = line.split(' ', 1) if ' ' in line else ('0', line)
            png = base64.b64decode(b64.strip())
            print(fit(fix_case(png, read(png)), int(length)), flush=True)
        except Exception as e:  # bad image -> empty answer; the caller refreshes / asks the driver
            print('', flush=True)
            print(f'ocr error: {e}', file=sys.stderr, flush=True)
