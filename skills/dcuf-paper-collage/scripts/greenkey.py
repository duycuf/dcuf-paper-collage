#!/usr/bin/env python3
"""greenkey: key a flat #00FF00 background to alpha, despill, split into connected components, write tight PNG crops.
Cross-platform twin of greenkey.swift (same thresholds, same split, same JSON).
usage: greenkey.py <in.png> <out_prefix> [minAreaFrac=0.002]
  -> <out_prefix>.png (1 piece) or <out_prefix>_1.png, _2.png ... (left->right, top->bottom); prints JSON
Reads/writes with Pillow when installed (any format it opens); otherwise a built-in PNG codec (8/16-bit, non-interlaced PNG only)."""
import json, struct, sys, zlib

try:
    from PIL import Image
except ImportError:
    Image = None


def png_read(path):
    """Minimal PNG decoder -> (W, H, RGBA bytearray). Colour types 0, 2, 3, 4, 6; bit depth 8 or 16 (palette: 8); no interlace."""
    with open(path, 'rb') as f:
        d = f.read()
    if d[:8] != b'\x89PNG\r\n\x1a\n':
        sys.exit(f'{path}: not a PNG (install Pillow for other formats: pip install pillow)')
    i, idat, plte, trns = 8, [], None, None
    while i < len(d):
        n, typ = struct.unpack('>I4s', d[i:i + 8]); body = d[i + 8:i + 8 + n]; i += 12 + n
        if typ == b'IHDR': W, H, bd, ct, _, _, il = struct.unpack('>IIBBBBB', body)
        elif typ == b'PLTE': plte = body
        elif typ == b'tRNS': trns = body
        elif typ == b'IDAT': idat.append(body)
        elif typ == b'IEND': break
    if il or bd not in (8, 16) or (ct == 3 and bd != 8):
        sys.exit(f'{path}: interlaced / low-bit PNG not supported without Pillow (pip install pillow)')
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]; bpp = ch * bd // 8; stride = W * bpp
    raw = zlib.decompress(b''.join(idat)); px = bytearray(H * stride); prev = bytearray(stride); p = 0
    for y in range(H):
        ft = raw[p]; line = bytearray(raw[p + 1:p + 1 + stride]); p += 1 + stride
        if ft == 1:
            for x in range(bpp, stride): line[x] = (line[x] + line[x - bpp]) & 255
        elif ft == 2:
            for x in range(stride): line[x] = (line[x] + prev[x]) & 255
        elif ft == 3:
            for x in range(stride): line[x] = (line[x] + ((line[x - bpp] if x >= bpp else 0) + prev[x]) // 2) & 255
        elif ft == 4:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0; b = prev[x]; c = prev[x - bpp] if x >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        px[y * stride:(y + 1) * stride] = line; prev = line
    if bd == 16: px = px[0::2]  # keep the high byte of each sample
    out = bytearray(W * H * 4)
    if ct == 6: out[:] = px
    elif ct == 2:
        out[0::4] = px[0::3]; out[1::4] = px[1::3]; out[2::4] = px[2::3]; out[3::4] = b'\xff' * (W * H)
    elif ct == 0:
        out[0::4] = px; out[1::4] = px; out[2::4] = px; out[3::4] = b'\xff' * (W * H)
    elif ct == 4:
        out[0::4] = px[0::2]; out[1::4] = px[0::2]; out[2::4] = px[0::2]; out[3::4] = px[1::2]
    else:
        alpha = (trns or b'') + b'\xff' * 256
        lut = [bytes(plte[k * 3:k * 3 + 3]) + alpha[k:k + 1] if k * 3 + 3 <= len(plte) else b'\0\0\0\xff' for k in range(256)]
        out = bytearray(b''.join(lut[v] for v in px))
    return W, H, out


def png_write(path, W, H, rgba):
    rows = b''.join(b'\0' + bytes(rgba[y * W * 4:(y + 1) * W * 4]) for y in range(H))
    chunk = lambda t, b: struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 6)) + chunk(b'IEND', b''))


def load(path):
    if Image:
        im = Image.open(path).convert('RGBA'); return im.width, im.height, bytearray(im.tobytes())
    return png_read(path)


def save(path, W, H, rgba):
    if Image: Image.frombytes('RGBA', (W, H), bytes(rgba)).save(path)
    else: png_write(path, W, H, rgba)


def main():
    a = sys.argv
    if len(a) < 3: sys.exit('usage: greenkey.py <in.png> <out_prefix> [minAreaFrac=0.002]')
    W, H, src = load(a[1]); min_frac = float(a[3]) if len(a) > 3 else 0.002
    px = bytearray(W * H * 4); alpha = bytearray(W * H)
    for i in range(W * H):
        o = i * 4; sa = src[o + 3]
        if sa == 255: r, g, b = src[o], src[o + 1], src[o + 2]
        else: k0 = sa / 255; r, g, b = int(src[o] * k0), int(src[o + 1] * k0), int(src[o + 2] * k0)  # Swift draws into a premultiplied context
        mx = r if r > b else b; gm = g - mx  # greenness
        al = 1.0
        if gm > 90: al = 0.0
        elif gm > 25: al = 1 - (gm - 25) / 65
        if g > 160 and r < 110 and b < 110: al = 0.0
        ng = mx + (g - mx) * 0.15 if g > mx else g  # despill
        A = int(max(0, min(255, al * 255)))
        alpha[i] = A
        if A:  # straight alpha (the Swift tool premultiplies, then the PNG encoder un-premultiplies)
            px[o] = r; px[o + 1] = int(ng); px[o + 2] = b; px[o + 3] = A
    # connected components on a 4x downscaled mask
    S = 4; w, h = W // S, H // S
    m = [0] * (w * h)
    for y in range(h):
        for x in range(w):
            on = False
            for dy in range(S):
                row = (y * S + dy) * W + x * S
                if max(alpha[row:row + S]) > 128: on = True; break
            if on: m[y * w + x] = -1
    comps = []  # [minx, miny, maxx, maxy, count]; label = index + 1
    label = 0
    for y in range(h):
        for x in range(w):
            if m[y * w + x] != -1: continue
            label += 1; st = [(x, y)]; m[y * w + x] = label; bb = [x, y, x, y, 0]
            while st:
                cx, cy = st.pop(); bb[4] += 1
                if cx < bb[0]: bb[0] = cx
                if cy < bb[1]: bb[1] = cy
                if cx > bb[2]: bb[2] = cx
                if cy > bb[3]: bb[3] = cy
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1), (cx + 1, cy + 1), (cx - 1, cy - 1), (cx + 1, cy - 1), (cx - 1, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and m[ny * w + nx] == -1: m[ny * w + nx] = label; st.append((nx, ny))
            comps.append(tuple(bb))
    min_count = int(w * h * min_frac)
    keep = [(c, li + 1) for li, c in enumerate(comps) if c[4] >= min_count]
    band = max(1, h // 3)
    keep.sort(key=lambda k: (k[0][1] // band, k[0][0]))
    outs = []
    for idx, (c, lab) in enumerate(keep):
        pad = 6
        x0, y0 = max(0, c[0] * S - pad), max(0, c[1] * S - pad)
        x1, y1 = min(W, (c[2] + 1) * S + pad), min(H, (c[3] + 1) * S + pad)
        cw, ch = x1 - x0, y1 - y0
        cp = bytearray(cw * ch * 4)
        for y in range(ch):
            my = min(h - 1, (y0 + y) // S)
            if len(keep) == 1:
                cp[y * cw * 4:(y + 1) * cw * 4] = px[((y0 + y) * W + x0) * 4:((y0 + y) * W + x1) * 4]; continue
            for x in range(cw):
                # keep only pixels belonging to this component's region (mask label at downscaled coords)
                l = m[my * w + min(w - 1, (x0 + x) // S)]
                if l == 0 or l == lab:
                    si = ((y0 + y) * W + (x0 + x)) * 4; di = (y * cw + x) * 4
                    cp[di:di + 4] = px[si:si + 4]
        path = a[2] + '.png' if len(keep) == 1 else f'{a[2]}_{idx + 1}.png'
        save(path, cw, ch, cp)
        outs.append({'file': path, 'w': cw, 'h': ch, 'x': x0, 'y': y0})
    print(json.dumps(outs, separators=(',', ':')))


if __name__ == '__main__':
    main()
