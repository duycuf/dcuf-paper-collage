# /// script
# requires-python = ">=3.10"
# dependencies = ["rembg[cpu]>=2.0.60", "pillow>=10.1", "numpy", "scipy"]
# ///
"""cutout: any photo (stock, your own, a Pixabay PNG) -> a paper-collage sticker PNG, locally, no credits.
Replaces "generate on #00FF00 + greenkey": background removal with rembg, then the hand-cut white paper border
the engine expects baked in (collage.js draws only the drop shadow), optional B/W and print halftone.

  uv run cutout.py <in.jpg|png|webp> <out.png> [--model isnet-general-use] [--border 0.018] [--rough 1]
                   [--bw] [--halftone 0..1] [--max 1600] [--all] [--keep-alpha] [--no-border]

  --model     rembg model: isnet-general-use (default, ~180 MB, objects), birefnet-general (best edges, ~900 MB, slower),
              u2net (classic), birefnet-portrait / u2net_human_seg (people). First run downloads it to $U2NET_HOME (default ~/.u2net).
  --border    paper border width as a fraction of the object's longest side (default 0.018, like the generated set); --no-border = clean cut
  --rough     0 = even border, 1 = hand-cut wobble (default), 2 = very torn
  --bw        neutral black-and-white (rocks, clouds, archival photos)   --halftone  print dot screen strength (0.3 subtle … 1 strong)
  --all       keep every object piece (default keeps only the largest, which drops stray background bits)
  --keep-alpha  input already transparent (Pixabay --transparent PNG): skip rembg (auto when >5 % of pixels are transparent)
  --key sky   clouds on a blue sky: colour key (bright + unsaturated stays) instead of rembg, which also grabs the sky
  --key green an old #00FF00 generation (same thresholds as greenkey)
Prints JSON {file, w, h}. Check the result on a coloured background before using it (no halo, border clean).
"""
import argparse, json, sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

PAPER = np.array([244, 241, 234], np.float32)


def smooth_noise(shape, scale, rng):
    """Low-frequency noise in [-1, 1] with features about `scale` px wide."""
    sh = (max(2, int(shape[0] / scale) + 2), max(2, int(shape[1] / scale) + 2))
    n = ndimage.gaussian_filter(rng.standard_normal(sh), 1.0)
    n = ndimage.zoom(n, (shape[0] / sh[0] * 1.0001, shape[1] / sh[1] * 1.0001), order=3)[:shape[0], :shape[1]]
    return n / (np.abs(n).max() + 1e-6)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--model', default='isnet-general-use'); ap.add_argument('--border', type=float, default=0.018)
    ap.add_argument('--rough', type=float, default=1.0); ap.add_argument('--no-border', action='store_true')
    ap.add_argument('--bw', action='store_true'); ap.add_argument('--halftone', type=float, default=0.0)
    ap.add_argument('--max', type=int, default=1600); ap.add_argument('--all', action='store_true')
    ap.add_argument('--keep-alpha', action='store_true'); ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--key', choices=['sky', 'green'], help='colour key instead of rembg: sky = clouds on blue sky, green = #00FF00 sheet')
    a = ap.parse_args()
    rng = np.random.default_rng(a.seed)

    im = ImageOps.exif_transpose(Image.open(a.src))
    im.thumbnail((a.max, a.max), Image.LANCZOS)
    rgba = np.asarray(im.convert('RGBA')).astype(np.float32)
    has_alpha = im.mode in ('RGBA', 'LA', 'PA') or 'transparency' in im.info
    if a.keep_alpha or (has_alpha and (rgba[..., 3] < 128).mean() > 0.05):
        alpha = rgba[..., 3] / 255.0
    elif a.key == 'sky':    # clouds: keep bright, unsaturated pixels; blue sky -> transparent (saliency models grab the sky too)
        c = rgba[..., :3] / 255.0; mx, mn = c.max(2), c.min(2); s = (mx - mn) / np.maximum(mx, 1e-6)
        alpha = np.clip((0.40 - s) / 0.16, 0, 1) * np.clip((mx - 0.42) / 0.18, 0, 1)
        alpha = ndimage.gaussian_filter(alpha, 0.8)
    elif a.key == 'green':  # an old green-screen generation: same rule as greenkey (greenness g - max(r, b))
        c = rgba[..., :3]; gm = c[..., 1] - np.maximum(c[..., 0], c[..., 2])
        alpha = np.where(gm > 90, 0, np.where(gm > 25, 1 - (gm - 25) / 65, 1.0))
        rgba[..., 1] = np.where(gm > 0, np.maximum(c[..., 0], c[..., 2]) + gm * 0.15, c[..., 1])   # despill
    else:
        from rembg import new_session, remove
        cut = remove(im.convert('RGB'), session=new_session(a.model), post_process_mask=True)
        alpha = np.asarray(cut.convert('RGBA'))[..., 3].astype(np.float32) / 255.0
    rgb = rgba[..., :3]

    # keep the object, drop stray background bits
    lab, n = ndimage.label(alpha > 0.5)
    if n == 0:
        sys.exit('no object found: try --model birefnet-general, or a photo with a plainer background')
    sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if (s >= sizes.max() * 0.15 if a.all else s == sizes.max())]
    km = ndimage.binary_dilation(np.isin(lab, keep), iterations=3)
    alpha = alpha * km
    alpha[alpha < 0.04] = 0

    # object look: neutral B/W and/or a print dot screen
    if a.bw:
        l = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        lo, hi = np.percentile(l[alpha > 0.5], [1, 99]) if (alpha > 0.5).any() else (0, 255)
        l = 0.5 * l + 0.5 * np.clip((l - lo) / max(hi - lo, 1), 0, 1) * 245   # gentle stretch: open, not crushed
        l = np.clip(l * 0.94 + 12, 0, 255)                                      # milky toe, highlights below paper white
        rgb = np.repeat(l[..., None], 3, axis=2)
    if a.halftone > 0:
        H, W = alpha.shape; cell = max(4.0, max(H, W) / 260)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        u, v = (xx + yy) * 0.7071 / cell, (yy - xx) * 0.7071 / cell        # 45° screen
        d = np.hypot(u - np.round(u), v - np.round(v))                         # 0 at dot centre … 0.707
        l = (rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)) / 255
        r = 0.55 * np.sqrt(np.clip(1 - l, 0, 1))                               # darker -> bigger ink dot
        ink = np.clip((r - d) * cell, 0, 1)
        printed = rgb * (1 - 0.38 * ink[..., None]) + (255 - rgb) * 0.22 * (1 - ink[..., None])   # dots + lifted paper between them
        rgb = rgb * (1 - a.halftone) + np.clip(printed, 0, 255) * a.halftone

    # pad so the border fits, then the hand-cut white paper border
    ys, xs = np.nonzero(alpha > 0.5); side = max(np.ptp(ys), np.ptp(xs)) + 1
    bw = 0.0 if a.no_border else a.border * side
    P = int(bw * 2.2 + 8)
    alpha = np.pad(alpha, P); rgb = np.pad(rgb, ((P, P), (P, P), (0, 0)), mode='edge')
    out_a = alpha.copy(); out_rgb = rgb.copy()
    if bw > 0:
        dist = ndimage.distance_transform_edt(alpha < 0.5)                      # px outside the object
        wob = 1 + 0.38 * a.rough * smooth_noise(alpha.shape, max(8, side / 14), rng) \
                + 0.12 * a.rough * smooth_noise(alpha.shape, max(3, side / 60), rng)
        width = np.maximum(bw * 0.35, bw * wob)
        pa = np.clip(width - dist + 0.5, 0, 1)                                 # paper alpha, 1 px antialias
        fib = (rng.random(alpha.shape) < 0.18 * min(a.rough, 1.5)) & (np.abs(width - dist) < 1.2)
        pa[fib] *= 0.4                                                          # a few frayed fibres on the cut line
        tex = PAPER + rng.normal(0, 3.0, alpha.shape)[..., None]
        out_rgb = rgb * alpha[..., None] + tex * (1 - alpha[..., None])
        out_a = np.maximum(alpha, pa)

    # tight crop + 6 px pad
    ys, xs = np.nonzero(out_a > 0.02)
    y0, y1, x0, x1 = max(0, ys.min() - 6), min(out_a.shape[0], ys.max() + 7), max(0, xs.min() - 6), min(out_a.shape[1], xs.max() + 7)
    res = np.dstack([np.clip(out_rgb, 0, 255), out_a * 255])[y0:y1, x0:x1].round().astype(np.uint8)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(res, 'RGBA').save(a.out, optimize=True)
    print(json.dumps({'file': a.out, 'w': int(x1 - x0), 'h': int(y1 - y0)}))


if __name__ == '__main__':
    main()
