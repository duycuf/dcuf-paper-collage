/* collage.js — window.CL: the paper world (San Diego Zoo "Africa Rocks" torn-paper collage look), all in code.
 * Every frame is a pure function of t. Everything that does not depend on t (paper textures, torn outlines, halftone,
 * piece sprites with shadows, whole background layers, cut-out mips and shadows) is cached in module-level Maps.
 * Load order: engine.js (ENG) → … → collage.js. Cut-outs: ../cutouts/NAME.png (alpha, white paper border baked in).
 *
 *  materials : paper(color, seed, o) · watercolor(seed, o) · halftoneTile(color, cell, angle, r) · halftone(ctx, shape, color, o) · newsprint(ctx, shape, o)
 *  geometry  : torn(shape, seed, o) → Path2D(+meta) · piece(ctx, shape, fill, o) · strip(ctx, x0,y0,x1,y1, width, o)
 *  scenes    : page · diag · posters · cloudsky · desk · sky       (async (ctx, t, o))
 *  sprites   : sprite(ctx, name, x, y, o)                           (async)
 *  motion    : drop · pop · slap · bob · fly                        (pure (t, …) → transform numbers)
 *  overlay   : printGrain(ctx, t, amt)
 */
(function () {
  'use strict';
  const { W, H, clamp, lerp, prog, E } = ENG;
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const C = {
    sky: '#5BD3F3', skyLight: '#BDEBFA', sun: '#FFC21A', mustard: '#E9A21B', orange: '#F07A2E', red: '#E5231E',
    cobalt: '#1660DA', navy: '#1B2A6B', olive: '#8DB33A', lime: '#C8D84A', paper: '#FBF8F1', news: '#D9D6CF',
    ink: '#141414', pink: '#F8B9C6', earth: '#3A2A1E', rust: '#A8562A', teal: '#2BC3D6',
  };
  const CUT = '../cutouts/';

  /* ======================================================================= utils */
  // mulberry32 — deterministic, never stuck at 0 (ENG.rng(0) is constant 0)
  function R(seed) { let a = ((seed | 0) ^ 0x6D2B79F5) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const mod = (a, n) => ((a % n) + n) % n;
  let _id = 0; const IDS = new WeakMap();
  const idOf = (o) => { if (o && o._key) return o._key; if (!IDS.has(o)) IDS.set(o, '#' + (++_id)); return IDS.get(o); };
  const keyOf = (v) => JSON.stringify(v, (k, x) => (typeof x === 'function' ? 'fn' : (x && typeof x === 'object' && (x instanceof HTMLCanvasElement || x instanceof Path2D || x instanceof HTMLImageElement)) ? idOf(x) : x));
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
  const f12 = (t) => Math.floor(t * 12 + 1e-6); // stop-motion "on twos" frame index

  /* ======================================================================= value noise */
  const NZ = new Map();
  function noise(seed) {
    if (NZ.has(seed)) return NZ.get(seed);
    const r = R(seed * 31 + 7), p = new Uint16Array(512), v = new Float32Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; v[i] = r() * 2 - 1; }
    for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const q = p[i]; p[i] = p[j]; p[j] = q; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    const s3 = (x) => x * x * (3 - 2 * x);
    const n1 = (x) => { const i = Math.floor(x), f = x - i, a = v[p[i & 255]], b = v[p[(i + 1) & 255]]; return a + (b - a) * s3(f); };
    const n1l = (x) => { const i = Math.floor(x), f = x - i, a = v[p[i & 255]], b = v[p[(i + 1) & 255]]; return a + (b - a) * f; };
    const n2 = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), u = s3(x - xi), w = s3(y - yi), X = xi & 255, Y = yi & 255;
      const a = v[p[X + p[Y]]], b = v[p[X + 1 + p[Y]]], c = v[p[X + p[Y + 1]]], d = v[p[X + 1 + p[Y + 1]]];
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    };
    const n2p = (x, y, Px, Py) => { // periodic in x (Px cells) and y (Py cells) → tileable textures
      const xi = Math.floor(x), yi = Math.floor(y), u = s3(x - xi), w = s3(y - yi);
      const X0 = mod(xi, Px), X1 = (X0 + 1) % Px, Y0 = mod(yi, Py), Y1 = (Y0 + 1) % Py;
      const a = v[p[X0 + p[Y0]]], b = v[p[X1 + p[Y0]]], c = v[p[X0 + p[Y1]]], d = v[p[X1 + p[Y1]]];
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    };
    const fbm = (x, y, o = 4) => { let s = 0, a = 0.5, n = 0; for (let i = 0; i < o; i++) { s += a * n2(x + i * 17.31, y - i * 9.13); n += a; x *= 2.03; y *= 2.03; a *= 0.5; } return s / n; };
    const N = { n1, n1l, n2, n2p, fbm }; NZ.set(seed, N); return N;
  }

  /* ======================================================================= paper materials */
  // two tileable modulation maps per seed: "dark" (multiply: mottling, dark fibres, specks) + "light" (screen: light fibres, lifts)
  const MODS = new Map();
  function paperMods(seed, S, kind) {
    const key = kind + ':' + seed + ':' + S; if (MODS.has(key)) return MODS.get(key);
    const N = noise(seed * 7 + (kind === 'brush' ? 3 : 1)), r = R(seed * 131 + 5);
    const dk = mk(S, S), lt = mk(S, S), dx = dk.getContext('2d'), lx = lt.getContext('2d');
    const di = dx.createImageData(S, S), li = lx.createImageData(S, S), dd = di.data, ld = li.data;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u = i / S, v = j / S; let m;
      if (kind === 'brush') m = 0.42 * N.n2p(u * 4, v * 64, 4, 64) + 0.33 * N.n2p(u * 10 + 3, v * 150, 10, 150) + 0.25 * N.n2p(u * 3, v * 9, 3, 9);
      else m = 0.34 * N.n2p(u * 5, v * 5, 5, 5) + 0.36 * N.n2p(u * 14, v * 14, 14, 14) + 0.3 * N.n2p(u * 52, v * 52, 52, 52);
      const g = r() - 0.5, k = (j * S + i) * 4;
      const amp = kind === 'brush' ? 120 : 95;
      const dv = 255 - Math.max(0, -m) * amp - Math.max(0, g) * 30, lv = Math.max(0, m) * amp * 0.75 + Math.max(0, -g) * 26;
      dd[k] = dd[k + 1] = dd[k + 2] = clamp(dv, 0, 255); dd[k + 3] = 255;
      ld[k] = ld[k + 1] = ld[k + 2] = clamp(lv, 0, 255); ld[k + 3] = 255;
    }
    dx.putImageData(di, 0, 0); lx.putImageData(li, 0, 0);
    if (kind !== 'brush') { // fibres (wrapped so the tile stays seamless)
      const fib = (x, n, col, w0, w1, l0, l1) => {
        x.save(); x.strokeStyle = col; x.lineCap = 'round';
        for (let q = 0; q < n; q++) {
          const px = r() * S, py = r() * S, a = r() * TAU, l = l0 + Math.pow(r(), 2) * (l1 - l0), bend = (r() - 0.5) * l * 0.7;
          x.lineWidth = w0 + r() * (w1 - w0);
          for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
            const sx = px + ox, sy = py + oy; if (sx < -l1 || sx > S + l1 || sy < -l1 || sy > S + l1) continue;
            const ex = sx + Math.cos(a) * l, ey = sy + Math.sin(a) * l;
            x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo((sx + ex) / 2 - Math.sin(a) * bend, (sy + ey) / 2 + Math.cos(a) * bend, ex, ey); x.stroke();
          }
        }
        x.restore();
      };
      fib(dx, S * 0.9, 'rgba(120,110,100,0.22)', 0.4, 1.0, 4, 26);
      fib(lx, S * 1.1, 'rgba(255,255,255,0.30)', 0.4, 1.2, 4, 30);
      // specks
      dx.fillStyle = 'rgba(60,50,40,0.35)'; for (let q = 0; q < S / 6; q++) { dx.beginPath(); dx.arc(r() * S, r() * S, 0.4 + r() * 0.9, 0, TAU); dx.fill(); }
    }
    const res = { dark: dk, light: lt }; MODS.set(key, res); return res;
  }

  const PAPERS = new Map();
  /** paper(color, seed=1, o) → cached tileable canvas (o.size 512): flat colour + mottling, fibres, print grain.
   *  o.tex (0..1.5, default 1) texture strength · o.brush (true|0..1) painted horizontal brush streaks · o.speck extra dark specks */
  function paper(color, seed = 1, o = {}) {
    const key = keyOf([color, seed, o]); if (PAPERS.has(key)) return PAPERS.get(key);
    const S = o.size || 512, c = mk(S, S), x = c.getContext('2d'), tex = o.tex ?? 1;
    const M = paperMods(1 + (seed % 3), S, 'paper'), cc = color[0] === '#' && color.length === 7 ? rgb(color) : [128, 128, 128], lum = (0.3 * cc[0] + 0.59 * cc[1] + 0.11 * cc[2]) / 255;
    x.fillStyle = color; x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = clamp(0.55 * tex * (1 - 0.6 * Math.max(0, lum - 0.55) / 0.45)); x.drawImage(M.dark, 0, 0);
    x.globalCompositeOperation = 'screen'; x.globalAlpha = clamp(0.32 * tex); x.drawImage(M.light, 0, 0);
    if (o.brush) {
      const B = paperMods(1 + (seed % 2), S, 'brush'), a = o.brush === true ? 0.6 : o.brush;
      x.globalCompositeOperation = 'multiply'; x.globalAlpha = a * 0.36; x.drawImage(B.dark, 0, 0);
      x.globalCompositeOperation = 'screen'; x.globalAlpha = a * 0.26; x.drawImage(B.light, 0, 0);
    }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    if (o.speck) { const r = R(seed * 3 + 9); x.fillStyle = 'rgba(30,20,10,0.25)'; for (let q = 0; q < S * (o.speck === true ? 0.6 : o.speck); q++) { x.beginPath(); x.arc(r() * S, r() * S, 0.5 + r() * 1.6, 0, TAU); x.fill(); } }
    PAPERS.set(key, c); return c;
  }
  // a CanvasPattern from a tile, with offset/rotation/scale (pattern transforms are in user space)
  function pat(ctx, tile, o = {}) {
    const p = ctx.createPattern(tile, 'repeat');
    if (o.ox || o.oy || o.rot || (o.scale && o.scale !== 1)) p.setTransform(new DOMMatrix().translate(o.ox || 0, o.oy || 0).rotate(o.rot || 0).scale(o.scale || 1));
    return p;
  }

  /* ---------- watercolour sky ---------- */
  const WC = new Map();
  /** watercolor(seed, o) → cached canvas o.w×o.h (default 2048×1152): cyan wash with pigment-edged blooms, granulation, soft lifted clouds.
   *  o.base/o.light/o.deep colours · o.tone (0..1 how saturated, .72) · o.wash · o.bloom · o.clouds (0..1) · o.cloudY [y0,y1] band (0..1 of h)
   *  o.dots (0..1 sparse white halftone patches, like ref 0 s) · o.fine (0..1 fine light print dots everywhere, like ref 10 s) · o.vgrad */
  function watercolor(seed = 1, o = {}) {
    const key = keyOf([seed, o]); if (WC.has(key)) return WC.get(key);
    const Wd = o.w || 2048, Hd = o.h || 1152, rs = o.res || 0.4, w = Math.ceil(Wd * rs), h = Math.ceil(Hd * rs);
    const NA = noise(seed * 13 + 1), NB = noise(seed * 13 + 2), NC = noise(seed * 13 + 3);
    const base = rgb(o.base || C.sky), lite = rgb(o.light || '#C4EDFA'), deep = rgb(o.deep || '#1FA6DC'), wht = [249, 252, 252], grey = [196, 214, 224];
    const clouds = o.clouds ?? 0, bloom = o.bloom ?? 1, wash = o.wash ?? 1, tone = o.tone ?? 0.72, cy = o.cloudY || [0.05, 0.75];
    const sc = o.scale || 1;
    const CLS = []; // cumulus clusters (full-res coords): billow circles, flat-ish base
    if (clouds > 0) { const r = R(seed * 71 + 5), n = Math.round(1 + clouds * 6);
      for (let i = 0; i < n; i++) {
        const cw = (300 + r() * 420) * (0.7 + clouds * 0.5), ch = cw * (0.28 + r() * 0.14), cx = (i + 0.1 + r() * 0.8) / n * Wd, base = lerp(cy[0], cy[1], r()) * Hd + ch * 0.5, m = 7 + Math.floor(r() * 6), c = [];
        for (let j = 0; j < m; j++) { const t = j / (m - 1), rad = ch * (0.32 + 0.55 * Math.sin(Math.PI * (0.1 + t * 0.8))) * (0.7 + r() * 0.45); c.push([cx - cw / 2 + t * cw + (r() - 0.5) * cw * 0.06, base - rad * (0.75 + r() * 0.35), rad]); }
        for (let j = 0; j < 3; j++) { const rad = ch * (0.35 + r() * 0.25); c.push([cx - cw * 0.25 + r() * cw * 0.5, base - ch * 0.75 - rad * 0.2, rad]); }
        CLS.push({ c, base, top: base - ch * 1.25, x0: cx - cw / 2 - ch * 1.5, x1: cx + cw / 2 + ch * 1.5, y0: base - ch * 2.3, y1: base + 40 });
      } }
    const small = mk(w, h), sx = small.getContext('2d'), img = sx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x / rs / sc, Y = y / rs / sc;
      let k = clamp(tone + 0.55 * NA.fbm(X / 760, Y / 520, 3) + (o.vgrad || 0) * (y / h - 0.5));
      let cr = lite[0] + (base[0] - lite[0]) * k, cg = lite[1] + (base[1] - lite[1]) * k, cb = lite[2] + (base[2] - lite[2]) * k;
      let dk = 0, lt = 0;
      for (let i = 0; i < 2; i++) {
        const n = NB.fbm(X / (620 + i * 340) + i * 7.3, Y / (430 + i * 240) - i * 4.1, 4), th = 0.05 + i * 0.07;
        if (n > th) { const e = n - th; dk += wash * (0.045 + 0.12 * Math.exp(-e / 0.009)) * sstep(0, 0.006, e); }
      }
      const b = NC.fbm(X / 430 + 3.3, Y / 330 - 1.7, 4);
      if (b > 0.14) { const e = b - 0.14; lt += bloom * 0.2 * sstep(0, 0.1, e); dk += bloom * 0.1 * Math.exp(-e / 0.008) * sstep(0, 0.004, e); }
      // granulation (pigment settling in paper tooth)
      dk += 0.045 * NA.n2(X / 3.1, Y / 3.1) + 0.035;
      let cm = 0, csh = 0;
      for (let ci = 0; ci < CLS.length; ci++) {
        const cl = CLS[ci]; if (X < cl.x0 || X > cl.x1 || Y < cl.y0 || Y > cl.y1) continue;
        let D = 0; for (const [bx, by, br] of cl.c) { const q = ((X - bx) * (X - bx) + (Y - by) * (Y - by)) / (br * br); if (q < 4) D += Math.exp(-q * 1.3); }
        D += 0.5 * NC.fbm(X / 60 + ci * 3, Y / 60, 3);
        D *= sstep(cl.base + 14 + 16 * NA.n1(X / 90 + ci), cl.base - 34, Y);
        const a = sstep(0.4, 0.58, D);
        if (a > cm) { cm = a; csh = sstep(0.2, 1.05, (Y - cl.top) / (cl.base - cl.top)) * 0.75 * (1 - 0.4 * sstep(0.9, 1.7, D)); }
      }
      if (cm > 0) { dk = dk * (1 - cm) + 0.5 * cm * (1 - cm); lt += cm; cr = lerp(cr, grey[0], csh * cm); cg = lerp(cg, grey[1], csh * cm); cb = lerp(cb, grey[2], csh * cm); }
      dk = clamp(dk, 0, 0.7); lt = clamp(lt, 0, 1);
      cr = lerp(cr, deep[0], dk); cg = lerp(cg, deep[1], dk); cb = lerp(cb, deep[2], dk);
      const wl = lt * (1 - csh * cm); cr = lerp(cr, wht[0], wl); cg = lerp(cg, wht[1], wl); cb = lerp(cb, wht[2], wl);
      const q = (y * w + x) * 4; d[q] = cr; d[q + 1] = cg; d[q + 2] = cb; d[q + 3] = 255;
    }
    sx.putImageData(img, 0, 0);
    const c = mk(Wd, Hd), x = c.getContext('2d');
    x.imageSmoothingQuality = 'high'; x.drawImage(small, 0, 0, Wd, Hd);
    // paper tooth + fibres at full res
    const M = paperMods(4 + (seed % 2), 512, 'paper');
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.38; x.fillStyle = pat(x, M.dark, { ox: seed * 37 }); x.fillRect(0, 0, Wd, Hd);
    x.globalCompositeOperation = 'screen'; x.globalAlpha = 0.22; x.fillStyle = pat(x, M.light, { oy: seed * 53 }); x.fillRect(0, 0, Wd, Hd);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    if (o.fine) dotsGrid(x, [0, 0, Wd, Hd], { cell: 7, angle: 30, color: `rgba(255,255,255,${0.42 * o.fine})`, r: (X, Y) => 0.2 + 0.12 * NA.n2(X / 140, Y / 140) });
    if (o.dots) dotsGrid(x, [0, 0, Wd, Hd], { cell: 17, angle: 45, color: `rgba(255,255,255,${0.9 * o.dots})`, r: (X, Y) => 0.3 * sstep(0.12, 0.32, NB.fbm(X / 420 + 5, Y / 300, 3)) });
    WC.set(key, c); return c;
  }

  // small soft alpha-noise canvas, drawn scaled-up for cloudy mottling inside paper pieces
  const NCV = new Map();
  function noiseCanvas(seed, w, h, o = {}) {
    const key = keyOf([seed, w, h, o]); if (NCV.has(key)) return NCV.get(key);
    const c = mk(w, h), x = c.getContext('2d'), d = x.createImageData(w, h), N = noise(seed * 5 + 2), col = rgb(o.color || '#8FA9BD'), th = o.th ?? -0.05, k = o.k ?? 3.2, fq = o.freq ?? 0.22;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = N.fbm(i * fq, j * fq * 1.6, 3), q = (j * w + i) * 4; d.data[q] = col[0]; d.data[q + 1] = col[1]; d.data[q + 2] = col[2]; d.data[q + 3] = clamp((v - th) * k) * 255; }
    x.putImageData(d, 0, 0); NCV.set(key, c); return c;
  }

  /* ---------- halftone ---------- */
  // dots on a rotated grid inside bbox [x,y,w,h]. o: cell, angle (deg), color, r (fraction of cell | [r0,r1] along o.grad [x0,y0,x1,y1] | fn(X,Y)), jitter
  function dotsGrid(ctx, bb, o) {
    const cell = o.cell || 14, a = (o.angle ?? 45) * DEG, ca = Math.cos(a), sa = Math.sin(a);
    const [bx, by, bw, bh] = bb, rr = R(o.seed || 3);
    let umin = 1e9, umax = -1e9, vmin = 1e9, vmax = -1e9;
    for (const [px, py] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]]) { const u = px * ca + py * sa, v = -px * sa + py * ca; umin = Math.min(umin, u); umax = Math.max(umax, u); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); }
    let rf = o.r ?? 0.32;
    if (Array.isArray(rf)) {
      const [r0, r1] = rf, g = o.grad || [bx, by, bx + bw, by], gx = g[2] - g[0], gy = g[3] - g[1], gl = gx * gx + gy * gy || 1;
      rf = (X, Y) => lerp(r0, r1, clamp(((X - g[0]) * gx + (Y - g[1]) * gy) / gl));
    }
    const fn = typeof rf === 'function' ? rf : null, jit = o.jitter ?? 0.06;
    ctx.save(); ctx.fillStyle = o.color || '#000'; if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.beginPath();
    for (let v = Math.floor(vmin / cell) * cell; v <= vmax + cell; v += cell) for (let u = Math.floor(umin / cell) * cell; u <= umax + cell; u += cell) {
      const X = u * ca - v * sa, Y = u * sa + v * ca;
      if (X < bx - cell || X > bx + bw + cell || Y < by - cell || Y > by + bh + cell) continue;
      let r = (fn ? fn(X, Y) : rf) * cell * (1 + (rr() - 0.5) * jit * 2);
      if (r < 0.35) continue; r = Math.min(r, cell * 0.72);
      ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, TAU);
    }
    ctx.fill(); ctx.restore();
  }
  const HT = new Map();
  /** halftoneTile(color, cell=14, angle=45, r=0.34) → small canvas tile (one dot per cell); use with CL.pat(ctx, tile, {rot: angle}) for an angled screen */
  function halftoneTile(color, cell = 14, angle = 45, r = 0.34) {
    const key = keyOf([color, cell, r]); if (HT.has(key)) { const t = HT.get(key); t.angle = angle; return t; }
    const c = mk(cell, cell), x = c.getContext('2d'); x.fillStyle = color; x.beginPath(); x.arc(cell / 2, cell / 2, cell * r, 0, TAU); x.fill();
    c.angle = angle; HT.set(key, c); return c;
  }
  const bboxOf = (shape) => shape instanceof Path2D ? (shape.bbox || [0, 0, W, H]) : Array.isArray(shape) ? shape : shape.rect || [0, 0, W, H];
  /** halftone(ctx, shape, color, o) — coarse dots clipped to shape (Path2D from torn() | [x,y,w,h]). o: cell, angle, r | [r0,r1] + grad, alpha, jitter */
  function halftone(ctx, shape, color, o = {}) {
    const bb = o.bbox || bboxOf(shape); ctx.save();
    if (shape instanceof Path2D) ctx.clip(shape); else { ctx.beginPath(); ctx.rect(...bb); ctx.clip(); }
    dotsGrid(ctx, bb, Object.assign({}, o, { color })); ctx.restore();
  }

  /* ---------- newsprint (illegible fake print: word blobs in columns) ---------- */
  /** newsprint(ctx, shape, o) — faint grey columns of fake text, never real words. o: angle (deg), color, alpha (.55), x (x-height 4.2), lead (line spacing 10),
   *  col (column width 260), gutter (18), head (0..1 chance of a bold headline per column), seed */
  function newsprint(ctx, shape, o = {}) {
    const bb = o.bbox || bboxOf(shape), [bx, by, bw, bh] = bb, r = R(o.seed || 5);
    const a = (o.angle || 0) * DEG, xh = o.x || 4.2, lead = o.lead || xh * 2.4, colW = o.col || 260, gut = o.gutter || 18;
    const cx = bx + bw / 2, cy = by + bh / 2, ext = Math.hypot(bw, bh) / 2 + 20;
    ctx.save();
    if (shape instanceof Path2D) ctx.clip(shape); else { ctx.beginPath(); ctx.rect(...bb); ctx.clip(); }
    ctx.translate(cx, cy); ctx.rotate(a); ctx.fillStyle = o.color || '#3a3631'; ctx.globalAlpha *= o.alpha ?? 0.5;
    const path = new Path2D();
    for (let c0 = -ext + (r() * 40); c0 < ext; c0 += colW + gut) {
      let y = -ext + r() * lead * 3;
      if (r() < (o.head ?? 0.35)) { // headline: 1–2 lines of chunky blobs
        const hx = xh * 2.6; for (let l = 0; l < 1 + (r() < 0.4); l++) { let x = c0; while (x < c0 + colW * (0.5 + r() * 0.5)) { const wl = 3 + Math.floor(r() * 6); for (let q = 0; q < wl; q++) { const lw = hx * (0.5 + r() * 0.35); path.rect(x, y - hx * (r() < 0.25 ? 1.35 : 1), lw, hx * (r() < 0.25 ? 1.35 : 1)); x += lw + hx * 0.12; } x += hx * 0.6; } y += hx * 2; }
        y += lead * 0.5;
      }
      for (; y < ext; y += lead) {
        if (r() < 0.06) continue; // paragraph gap
        let x = c0 + (r() < 0.12 ? xh * 3 : 0); const end = c0 + colW * (r() < 0.1 ? 0.3 + r() * 0.5 : 1);
        while (x < end) {
          const wl = 2 + Math.floor(r() * 8);
          for (let q = 0; q < wl && x < end; q++) {
            const lw = xh * (0.45 + r() * 0.4), t = r();
            if (t < 0.18) path.rect(x, y - xh * 1.45, lw * 0.8, xh * 1.45); // ascender
            else if (t < 0.28) path.rect(x, y - xh, lw * 0.8, xh * 1.4); // descender
            else path.rect(x, y - xh, lw, xh);
            x += lw + xh * 0.18;
          }
          x += xh * 0.75;
        }
      }
    }
    ctx.fill(path); ctx.restore();
  }

  /* ======================================================================= torn geometry */
  // shape → polygon vertices [x, y, m] (m = tear multiplier of the edge that starts at this vertex)
  function shapePoly(s, seed = 1) {
    if (Array.isArray(s) && typeof s[0] === 'number') s = { rect: s };
    if (s.rect) { const [x, y, w, h] = s.rect, e = s.edges || [1, 1, 1, 1]; return { pts: [[x, y, e[0]], [x + w, y, e[1]], [x + w, y + h, e[2]], [x, y + h, e[3]]] }; }
    if (s.band) {
      // edges: 0 = side A (start→end), 1 = end cap, 2 = side B, 3 = start cap. Caps tear into sharp shards unless s.tips === false (or the cap edge multiplier is 0).
      const [x0, y0, x1, y1, w0, w1v] = s.band, w1 = w1v ?? w0, e = s.edges || [1, 1, 1, 1];
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, r = R(seed * 53 + 11);
      const A0 = [x0 + nx * w0 / 2, y0 + ny * w0 / 2], A1 = [x1 + nx * w1 / 2, y1 + ny * w1 / 2], B1 = [x1 - nx * w1 / 2, y1 - ny * w1 / 2], B0 = [x0 - nx * w0 / 2, y0 - ny * w0 / 2];
      const cap = (P, Q, w, dir, m) => { // shard points from P to Q (exclusive), pushed along dir·u
        const out = []; if (s.tips === false || !m) return out;
        const k = 2 + Math.floor(r() * 3), far = Math.floor(r() * (k - 1)) + 1, len = s.tipLen ?? 0.9;
        for (let j = 1; j < k; j++) { const t = j / k + (r() - 0.5) * 0.5 / k, ext = w * (j === far ? 0.35 + r() * len : 0.05 + r() * 0.4) * (s.tipLen === 0 ? 0 : 1); out.push([lerp(P[0], Q[0], t) + ux * dir * ext, lerp(P[1], Q[1], t) + uy * dir * ext, m]); }
        return out;
      };
      const ret = (P, w, dir, m) => (s.tips === false || !m) ? P : [P[0] - ux * dir * w * (0.1 + r() * 0.5), P[1] - uy * dir * w * (0.1 + r() * 0.5)]; // corners pulled back
      const a1 = ret(A1, w1, 1, e[1]), b1 = ret(B1, w1, 1, e[1]), b0 = ret(B0, w0, -1, e[3]), a0 = ret(A0, w0, -1, e[3]);
      return { pts: [[a0[0], a0[1], e[0]], [a1[0], a1[1], e[1]], ...cap(a1, b1, w1, 1, e[1]), [b1[0], b1[1], e[2]], [b0[0], b0[1], e[3]], ...cap(b0, a0, w0, -1, e[3])], wob: Math.min(Math.max(w0, w1) * 0.12, 26) };
    }
    if (s.circle || s.ellipse) { const [cx, cy, rx, ryv] = s.circle || s.ellipse, ry = ryv ?? rx, n = Math.max(24, Math.ceil((rx + ry) / 6)); const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 1]); } return { pts, curved: true }; }
    if (s.star) { const [cx, cy, r1, r0, n = 5, rot = -90] = s.star, pts = []; for (let i = 0; i < n * 2; i++) { const a = (rot + i * 180 / n) * DEG, rr = i % 2 ? r0 : r1; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1]); } return { pts, star: true }; }
    if (s.hill) { // [x0, x1, yLeft, yRight, yBottom] + amp, bumps, seed
      const [x0, x1, yl, yr, yb] = s.hill, N = noise(s.seed || 3), n = Math.max(6, Math.ceil((x1 - x0) / 36)), A = s.amp ?? 40, bumps = s.bumps ?? 2.2, pts = [];
      for (let i = 0; i <= n; i++) { const k = i / n, x = lerp(x0, x1, k); pts.push([x, lerp(yl, yr, k) - A * (0.6 * N.n1(k * bumps + 0.3) + 0.4 * Math.sin(k * Math.PI)), i === n ? 0 : 1]); }
      pts.push([x1, yb, 0], [x0, yb, 0]); return { pts };
    }
    if (s.ridge) { // smooth hill top through s.ridge [[x,y]..] (left→right), closed down to s.bottom (straight, untorn)
      const R_ = s.ridge, yb = s.bottom ?? H + 200, pts = [], st = 24;
      for (let i = 0; i < R_.length - 1; i++) {
        const p0 = R_[Math.max(0, i - 1)], p1 = R_[i], p2 = R_[i + 1], p3 = R_[Math.min(R_.length - 1, i + 2)], n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / st));
        for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), 1]); }
      }
      const L_ = R_[R_.length - 1]; pts.push([L_[0], L_[1], 0], [L_[0], yb, 0], [R_[0][0], yb, 0]); return { pts };
    }
    if (s.poly) return { pts: s.poly.map((p) => [p[0], p[1], p[2] ?? 1]) };
    throw new Error('CL.torn: unknown shape ' + JSON.stringify(s).slice(0, 80));
  }
  const rotPts = (pts, deg, cx, cy) => { if (!deg) return pts; const a = deg * DEG, c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y, m]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c, m]); };

  const TORN = new Map();
  /** torn(shape, seed, o) → Path2D of the torn OUTER outline (white paper edge), with meta:
   *  .inner (Path2D of the coloured face), .bbox [x,y,w,h], .cx/.cy, .outer/.innerPts/.normals (point arrays).
   *  shape: [x,y,w,h] | {rect, edges:[t,r,b,l]} | {band:[x0,y0,x1,y1,w0,w1], edges:[side0,end,side1,start]} | {poly:[[x,y,m]..]} | {circle:[cx,cy,r]} | {ellipse} | {star:[cx,cy,r1,r0,n,rot]} | {hill:[x0,x1,yL,yR,yBot],amp,bumps,seed} | {ridge:[[x,y]..], bottom}
   *  o: amp (tear amplitude px, 9) · white [min,max] edge band px ([2,14]) · bite (bites per 1000 px, 2.6) · wob (px, very-low-frequency wander; bands default ≈ .12·width) · rot (deg, baked, around centre or o.pivot) · step (px, 3) */
  function torn(shape, seed = 1, o = {}) {
    if (shape instanceof Path2D) return shape;
    const key = keyOf([shape, seed, o]); if (TORN.has(key)) return TORN.get(key);
    const P = shapePoly(shape, seed), N = noise(seed * 3 + 1), r = R(seed * 977 + 3), wob = o.wob ?? shape.wob ?? P.wob ?? 0;
    const amp = o.amp ?? shape.amp ?? 9, step = o.step || 3, wmin = (o.white || [2, 14])[0], wmax = (o.white || [2, 14])[1];
    let V = P.pts;
    { let sx = 0, sy = 0; V.forEach((p) => { sx += p[0]; sy += p[1]; }); const pv = o.pivot || [sx / V.length, sy / V.length]; V = rotPts(V, o.rot || 0, pv[0], pv[1]); }
    if (!P.curved) V = V.map((p) => [p[0] + (r() - 0.5) * amp * 1.3 * (p[2] ? 1 : 0), p[1] + (r() - 0.5) * amp * 1.3 * (p[2] ? 1 : 0), p[2]]);
    // densify, remembering the tear multiplier of each sample
    const pts = [], mul = [], wmul = [], ew = V.map(() => 0.5 + r() * 0.85);
    for (let i = 0; i < V.length; i++) {
      const a = V[i], b = V[(i + 1) % V.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / step));
      for (let j = 0; j < n; j++) { const k = j / n; pts.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]); mul.push(a[2]); wmul.push(a[2] ? ew[i] : 0); }
    }
    const n = pts.length; let cx = 0, cy = 0; pts.forEach((p) => { cx += p[0]; cy += p[1]; }); cx /= n; cy /= n;
    // normals (outward)
    const nr = pts.map((p, i) => { const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; });
    let sgn = 0; pts.forEach((p, i) => { sgn += nr[i][0] * (p[0] - cx) + nr[i][1] * (p[1] - cy); }); if (sgn < 0) nr.forEach((v) => { v[0] = -v[0]; v[1] = -v[1]; });
    // arc length + bites
    const S = [0]; for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = S[n - 1] + Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]);
    const bites = [], bd = (o.bite ?? 2.6) / 1000; for (let s = r() * 300; s < L && bd > 0; s += -Math.log(1 - r() * 0.999) / bd) bites.push([s, 18 + r() * 70, (r() < 0.65 ? -1 : 1) * amp * (0.5 + r() * 1.5), r() * 0.8 - 0.4]);
    const bite = (s) => { let d = 0; for (const [s0, w, dep, sk] of bites) { let u = (s - s0) / w; if (u < -1 || u > 1) continue; u = u < 0 ? u / (1 - sk) : u / (1 + sk); if (Math.abs(u) < 1) d += dep * (1 - u * u) * (1 - u * u); } return d; };
    const outer = [], inner = [];
    const curvedAmp = P.curved ? 0.7 : 1;
    for (let i = 0; i < n; i++) {
      const s = S[i], m = mul[i];
      let dsp = amp * curvedAmp * (0.5 * N.n1(s / 150) + 0.27 * N.n1(s / 41 + 50) + 0.15 * N.n1l(s / 11 + 100) + 0.08 * N.n1l(s / 3.4 + 200)) + bite(s) * curvedAmp + wob * N.n1(s / 560 + 700);
      dsp *= m;
      const ox = pts[i][0] + nr[i][0] * dsp, oy = pts[i][1] + nr[i][1] * dsp;
      outer.push([ox, oy]);
      const wv = m ? (lerp(wmin, wmax, Math.pow(clamp(0.5 + 1.0 * N.n1(s / 85 + 300) + 0.25 * N.n1(s / 23 + 350)), 1.25)) * wmul[i] + 1.3 * N.n1l(s / 2.6 + 400) + 0.6) : 0;
      const ww = Math.max(m ? 0.8 : 0, wv);
      inner.push([ox - nr[i][0] * ww, oy - nr[i][1] * ww]);
    }
    const path = new Path2D(), ip = new Path2D();
    path.moveTo(outer[0][0], outer[0][1]); for (let i = 1; i < n; i++) path.lineTo(outer[i][0], outer[i][1]); path.closePath();
    ip.moveTo(inner[0][0], inner[0][1]); for (let i = 1; i < n; i++) ip.lineTo(inner[i][0], inner[i][1]); ip.closePath();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; outer.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    Object.assign(path, { inner: ip, outer, innerPts: inner, normals: nr, mul, bbox: [x0, y0, x1 - x0, y1 - y0], cx, cy, _key: 'T' + hashStr(key) });
    TORN.set(key, path); return path;
  }

  /* ---------- fibres along a torn edge ---------- */
  function fibres(x, P, Nn, mul, r, amt, mode) {
    if (amt <= 0) return;
    const paths = [new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < P.length; i++) {
      if (!mul[i] || r() > 0.5 * amt) continue;
      const [px, py] = P[i], [nx, ny] = Nn[i];
      let a = Math.atan2(ny, nx) + (r() - 0.5) * 1.9; if (mode === 'in') a += Math.PI;
      const len = (mode === 'out' ? 1.4 : 1.2) + Math.pow(r(), 2.4) * (mode === 'out' ? 8 : 5.5);
      const back = mode === 'out' ? 0.5 + r() * 2.5 : -(0.3 + r() * 1.6);
      const sx = px - nx * back, sy = py - ny * back, ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len, bend = (r() - 0.5) * len * 0.7;
      const p = paths[(r() * 3) | 0]; p.moveTo(sx, sy); p.quadraticCurveTo((sx + ex) / 2 - Math.sin(a) * bend, (sy + ey) / 2 + Math.cos(a) * bend, ex, ey);
    }
    x.save(); x.lineCap = 'round';
    const al = mode === 'out' ? [0.95, 0.8, 0.55] : [0.75, 0.55, 0.35], lw = mode === 'out' ? [0.9, 0.65, 1.25] : [0.75, 0.55, 1.0];
    paths.forEach((p, k) => { x.strokeStyle = `rgba(255,254,250,${al[k]})`; x.lineWidth = lw[k]; x.stroke(p); });
    x.restore();
  }

  /* ---------- overlays drawn inside a piece's coloured face ---------- */
  const FX = {
    halftone: (x, bb, f) => dotsGrid(x, bb, f),
    dotgrid: (x, bb, f) => dotsGrid(x, bb, Object.assign({ cell: 22, r: 0.075, angle: 0, color: 'rgba(30,30,30,0.75)', jitter: 0.15 }, f)),
    news: (x, bb, f) => newsprint(x, bb, f),
    lines: (x, bb, f) => { // flowing contour lines along the piece's long axis (ref: cyan band with thin white lines)
      const r = R(f.seed || 9), [bx, by, bw, bh] = bb, n = f.n || 6; x.save(); x.strokeStyle = f.color || 'rgba(255,255,255,0.8)'; x.lineWidth = f.width || 1.6; x.lineCap = 'round';
      for (let i = 0; i < n; i++) { const y0 = by + bh * (i + 0.5 + (r() - 0.5) * 0.6) / n, A = 4 + r() * 14, L = 300 + r() * 500, ph = r() * TAU; x.beginPath(); for (let X = bx - 20; X <= bx + bw + 20; X += 12) { const Y = y0 + A * Math.sin(X / L * TAU + ph) + A * 0.4 * Math.sin(X / (L * 0.37) + ph * 2); X === bx - 20 ? x.moveTo(X, Y) : x.lineTo(X, Y); } x.stroke(); }
      x.restore();
    },
    memphis: (x, bb, f) => { // short sticks + dots confetti print
      const r = R(f.seed || 11), [bx, by, bw, bh] = bb, cols = f.colors || ['#38D3E6', '#1FB2C8', '#7FE7F2'], n = Math.floor(bw * bh / (f.density || 520));
      x.save(); x.lineCap = 'round';
      for (let i = 0; i < n; i++) { const px = bx + r() * bw, py = by + r() * bh, a = r() * TAU, l = 7 + r() * 12; x.strokeStyle = pick(r, cols); x.lineWidth = 2.2 + r() * 1.6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
      x.restore();
    },
    grunge: (x, bb, f) => { // darker blotches + light scratches (ref red bands)
      const r = R(f.seed || 13), [bx, by, bw, bh] = bb, N = noise(f.seed || 13); x.save();
      x.fillStyle = f.color || 'rgba(120,8,6,0.22)';
      for (let i = 0; i < bw * bh / 900; i++) { const px = bx + r() * bw, py = by + r() * bh; if (N.fbm(px / 160, py / 160, 2) < 0.02) continue; x.beginPath(); x.arc(px, py, 0.6 + r() * 2.6, 0, TAU); x.fill(); }
      x.strokeStyle = f.light || 'rgba(255,220,200,0.35)'; x.lineWidth = 0.8;
      for (let i = 0; i < bw * bh / 9000; i++) { const px = bx + r() * bw, py = by + r() * bh, a = r() * TAU, l = 4 + r() * 18; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
      x.restore();
    },
    checker: (x, bb, f) => { const [bx, by, bw, bh] = bb, c = f.cell || 34; x.save(); x.fillStyle = f.color || '#141414'; x.beginPath(); for (let j = 0; j * c < bh + c; j++) for (let i = j % 2; i * c < bw + c; i += 2) x.rect(bx + i * c, by + j * c, c, c); x.fill(); x.restore(); },
    stripes: (x, bb, f) => { const [bx, by, bw, bh] = bb, a = (f.angle ?? 45) * DEG, w = f.w || 18, g = f.gap || 18, cx = bx + bw / 2, cy = by + bh / 2, e = Math.hypot(bw, bh) / 2; x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = f.color || '#141414'; for (let u = -e; u < e; u += w + g) x.fillRect(u, -e, w, 2 * e); x.restore(); },
    zigzag: (x, bb, f) => { const [bx, by, bw, bh] = bb, n = f.n || 3, A = f.amp || 26, st = f.step || 40; x.save(); x.strokeStyle = f.color || C.sun; x.lineWidth = f.width || 12; x.lineJoin = 'miter'; for (let i = 0; i < n; i++) { const y = by + bh * (i + 1) / (n + 1); x.beginPath(); for (let X = bx - st, k = 0; X < bx + bw + st; X += st, k++) { const Y = y + (k % 2 ? A : -A); k === 0 ? x.moveTo(X, Y) : x.lineTo(X, Y); } x.stroke(); } x.restore(); },
    circle: (x, bb, f) => { x.save(); x.fillStyle = f.color || '#fff'; x.beginPath(); x.arc(f.x, f.y, f.r, f.a0 ?? 0, f.a1 ?? TAU); x.closePath(); x.fill(); x.restore(); },
    rings: (x, bb, f) => { x.save(); x.strokeStyle = f.color || '#141414'; x.lineWidth = f.width || 10; for (let i = 1; i <= (f.n || 4); i++) { x.beginPath(); x.arc(f.x, f.y, i * (f.gap || 34), 0, TAU); x.stroke(); } x.restore(); },
    glyph: (x, bb, f) => { x.save(); x.translate(f.x, f.y); x.rotate((f.rot || 0) * DEG); x.font = `${f.weight || 400} ${f.size || 600}px ${f.font || '"Ultra"'}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = f.color || C.red; x.fillText(f.ch, 0, 0); if (f.stroke) { x.lineWidth = f.strokeW || 8; x.strokeStyle = f.stroke; x.strokeText(f.ch, 0, 0); } x.restore(); },
    shade: (x, bb, f) => { const [bx, by, bw, bh] = bb, g = x.createLinearGradient(bx, by, bx, by + bh); g.addColorStop(0, f.top || 'rgba(255,255,255,0)'); g.addColorStop(1, f.bottom || 'rgba(0,0,0,0.15)'); x.fillStyle = g; x.fillRect(bx, by, bw, bh); },
    mottle: (x, bb, f) => { const [bx, by, bw, bh] = bb, nc = noiseCanvas(f.seed || 19, Math.max(8, Math.round(bw / (f.scale || 20))), Math.max(4, Math.round(bh / (f.scale || 20))), { color: f.color, th: f.th, k: f.k }); x.save(); x.imageSmoothingQuality = 'high'; x.filter = `blur(${f.blur ?? 4}px)`; x.globalAlpha *= f.alpha ?? 0.6; x.drawImage(nc, bx, by, bw, bh); x.restore(); },
    blobs: (x, bb, f) => { const r = R(f.seed || 17), [bx, by, bw, bh] = bb; x.save(); x.fillStyle = f.color || 'rgba(255,255,255,0.5)'; for (let i = 0; i < (f.n || 8); i++) { x.beginPath(); x.ellipse(bx + r() * bw, by + r() * bh, (f.r || 60) * (0.5 + r()), (f.r || 60) * (0.3 + r() * 0.5), r() * 3, 0, TAU); x.fill(); } x.restore(); },
  };
  function overlays(x, bb, o) {
    const list = (o.fx || []).slice();
    if (o.halftone) [].concat(o.halftone).forEach((h) => list.push(Object.assign({ type: 'halftone' }, h)));
    if (o.news) list.push(Object.assign({ type: 'news' }, o.news === true ? {} : o.news));
    if (o.dotgrid) list.push(Object.assign({ type: 'dotgrid' }, o.dotgrid === true ? {} : o.dotgrid));
    for (const f of list) { const fn = FX[f.type]; if (fn) { x.save(); if (f.alpha != null && f.type !== 'halftone') x.globalAlpha *= f.alpha; if (f.blend) x.globalCompositeOperation = f.blend; fn(x, f.bbox || bb, f); x.restore(); } }
  }

  /* ======================================================================= piece sprites */
  // a missing cut-out draws as a labelled grey paper card, so drafts render before any generation
  const STUBS = new Map();
  function stubCut(name) {
    if (STUBS.has(name)) return STUBS.get(name);
    const c = mk(640, 420), x = c.getContext('2d');
    x.fillStyle = '#FBF8F1'; x.fillRect(0, 0, 640, 420); x.fillStyle = '#C9C5BD'; x.fillRect(16, 16, 608, 388);
    x.strokeStyle = 'rgba(20,20,20,0.45)'; x.setLineDash([14, 10]); x.lineWidth = 4; x.strokeRect(30, 30, 580, 360);
    x.fillStyle = '#141414'; x.font = '900 56px "Inter Tight", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, 320, 190);
    x.font = '700 26px "JetBrains Mono", monospace'; x.fillText('cut-out missing', 320, 262);
    c.naturalWidth = c.width; c.naturalHeight = c.height; STUBS.set(name, c); return c;
  }
  window.CUT_STUB = stubCut;
  // background cut-outs the scene builders use by fixed names: OPTIONAL. A project without them simply gets fewer layers (no grey cards);
  // any other missing name still draws the labelled card so a draft shows what is left to source.
  const BG_CUTS = new Set(['rocks_a', 'rocks_b', 'rocks_c', 'tree_a', 'tree_b', 'grass_strip', 'cloud_1', 'cloud_2', 'cloud_3', 'cloud_4', 'cassette']);
  const EMPTY = (() => { const c = mk(2, 2); c.naturalWidth = 0; c.naturalHeight = 0; c.empty = true; return c; })();
  const img = (name) => ENG.Frames.img(CUT + name + '.png').catch(() => { if (BG_CUTS.has(name)) return EMPTY; console.warn('missing cut-out ' + name); return stubCut(name); });
  // fill resolver: '#hex' → paper texture · canvas → pattern · {color, brush, tex, speck, flat} → paper · {img, crop, filter, scale} → cut-out image · fn(ctx, bbox) → drawer
  async function paintFill(x, T, fill, o, bb) {
    if (typeof fill === 'function') { x.save(); x.clip(T.inner); await fill(x, bb); x.restore(); return; }
    if (fill && fill.img) {
      const im = await img(fill.img);
      if (im.empty) { x.save(); x.clip(T.inner); x.fillStyle = pat(x, paper(fill.base || C.olive, 3, { tex: 1.2 })); x.fillRect(bb[0], bb[1], bb[2], bb[3]); x.restore(); return; }   // optional cut-out absent: plain paper in its place
      const cr = fill.crop || [0, 0, im.naturalWidth, im.naturalHeight];
      x.save(); x.clip(T.inner);
      const [bx, by, bw, bh] = bb, sc = fill.scale || (fill.tile ? 0.6 : Math.max(bw / cr[2], bh / cr[3]) * 1.02), dw = cr[2] * sc, dh = cr[3] * sc;
      if (fill.tile === 'x') {
        if (fill.base) { x.fillStyle = pat(x, paper(fill.base, 3, { tex: 1.2 })); x.fillRect(bx, by, bw, bh); }
        if (fill.filter) x.filter = fill.filter;
        const rowAt = (cx, X0, Y, flip) => { let k = 0; for (let X = X0; X < bx + bw; X += dw - 2, k++) { cx.save(); cx.translate(X + (k % 2 ? dw : 0), Y + (flip ? dh : 0)); cx.scale(k % 2 ? -1 : 1, flip ? -1 : 1); cx.drawImage(im, cr[0], cr[1], cr[2], cr[3], 0, 0, dw, dh); cx.restore(); } };
        const Y0 = by + (fill.oy || 0);
        for (let row = 1, Y = Y0 + dh * 0.62; Y < by + bh && row < (fill.rows || 3); Y += dh - 1, row++) rowAt(x, bx - (fill.ox || 0) - row * dw * 0.31, Y, row % 2 === 1);
        { // first row (with the grass tips) feathered at its bottom so the seam disappears
          const tc = mk(bw + 4, dh), tx = tc.getContext('2d'); tx.filter = x.filter; tx.translate(-bx, -Y0); rowAt(tx, bx - (fill.ox || 0), Y0, false); tx.setTransform(1, 0, 0, 1, 0, 0); tx.filter = 'none';
          const g = tx.createLinearGradient(0, 0, 0, dh); g.addColorStop(0, '#000'); g.addColorStop(0.6, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); tx.globalCompositeOperation = 'destination-in'; tx.fillStyle = g; tx.fillRect(0, 0, tc.width, dh);
          x.filter = 'none'; x.drawImage(tc, bx, Y0);
        }
      } else if (fill.tile) { if (fill.filter) x.filter = fill.filter; let row = 0; for (let Y = by + (fill.oy || 0); Y < by + bh; Y += dh - 3, row++) for (let X = bx - (fill.ox || 0) - (row % 2) * dw * 0.37; X < bx + bw; X += dw - 3) x.drawImage(im, cr[0], cr[1], cr[2], cr[3], X, Y, dw, dh); }
      else { if (fill.filter) x.filter = fill.filter; x.drawImage(im, cr[0], cr[1], cr[2], cr[3], bx + (bw - dw) / 2 + (fill.ox || 0), by + (bh - dh) / 2 + (fill.oy || 0), dw, dh); }
      x.restore(); return;
    }
    let tile = null;
    if (fill instanceof HTMLCanvasElement) tile = fill;
    else if (typeof fill === 'string') tile = o.flat ? null : paper(fill, (o.seed || 1) % 7 + 1, { tex: o.tex ?? 1, brush: o.brush, speck: o.speck });
    else if (fill && fill.color) tile = fill.flat ? null : paper(fill.color, fill.seed || (o.seed || 1) % 7 + 1, { tex: fill.tex ?? 1, brush: fill.brush, speck: fill.speck });
    x.save();
    x.fillStyle = tile ? pat(x, tile, { ox: (o.seed || 0) * 97 % 512, oy: (o.seed || 0) * 61 % 512, rot: (fill && fill.texRot) || o.texRot || 0 }) : (typeof fill === 'string' ? fill : fill.color);
    x.shadowColor = 'rgba(0,0,0,0.16)'; x.shadowBlur = 1.8 * (o.res || 1); x.shadowOffsetX = 0.5 * (o.res || 1); x.shadowOffsetY = 1 * (o.res || 1);
    x.fill(T.inner); x.restore();
  }
  async function renderPiece(T, fill, o) {
    const sh = o.shadow === false ? null : Object.assign({ dx: 5, dy: 8, blur: 12, alpha: 0.3 }, o.shadow || {});
    const res = o.res || 1, [bx, by, bw, bh] = T.bbox;
    const m = Math.ceil((sh ? Math.max(Math.abs(sh.dx), Math.abs(sh.dy)) + sh.blur * 1.8 : 0) + 12);
    const c = mk((bw + 2 * m) * res, (bh + 2 * m) * res), x = c.getContext('2d');
    x.scale(res, res); x.translate(m - bx, m - by);
    const seed = o.seed || 1, r = R(seed * 17 + 1);
    // 1. white paper (edge band) + soft drop shadow + tight contact shadow
    x.fillStyle = pat(x, paper(o.edge || C.paper, seed % 5 + 1, { tex: 0.8 }), { ox: seed * 13 });
    if (sh) { x.shadowColor = `rgba(16,26,40,${sh.alpha})`; x.shadowBlur = sh.blur * res; x.shadowOffsetX = sh.dx * res; x.shadowOffsetY = sh.dy * res; x.fill(T); }
    x.shadowColor = `rgba(10,16,26,${o.contact ?? 0.3})`; x.shadowBlur = 2.4 * res; x.shadowOffsetX = 0.6 * res; x.shadowOffsetY = 1.3 * res; x.fill(T);
    x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetX = x.shadowOffsetY = 0;
    // a hint of grey in the torn white core (paper thickness)
    x.save(); x.clip(T); x.strokeStyle = 'rgba(150,150,145,0.18)'; x.lineWidth = 1.6; x.stroke(T.inner); x.restore();
    // 2. fibres sticking out of the white edge
    fibres(x, T.outer, T.normals, T.mul, r, o.fibres ?? 1, 'out');
    // 3. coloured face
    if (fill != null && fill !== 'none') {
      await paintFill(x, T, fill, o, T.bbox);
      x.save(); x.clip(T.inner); overlays(x, T.bbox, o); if (o.draw) await o.draw(x, T.bbox); x.restore();
      // 4. white fibres crossing from the torn core into the colour
      fibres(x, T.innerPts, T.normals, T.mul, r, (o.fibres ?? 1) * 0.9, 'in');
    }
    return { canvas: c, x: bx - m, y: by - m, w: bw + 2 * m, h: bh + 2 * m, res, cx: T.cx, cy: T.cy };
  }
  const SPR = new Map();
  /** pieceSprite(shape, fill, o) → Promise<{canvas, x, y, w, h, res, cx, cy}> cached (o.key or auto key) unless o.cache === false */
  function pieceSprite(shape, fill, o = {}) {
    const T = torn(shape, o.seed || 1, { amp: o.amp, white: o.white, bite: o.bite, rot: o.rot, pivot: o.pivot, step: o.step, wob: o.wob });
    if (o.cache === false || ((typeof fill === 'function' || o.draw) && !o.key)) return renderPiece(T, fill, o); // live drawers re-render unless keyed
    const key = o.key || keyOf([T._key, fill, o.seed, o.shadow, o.contact, o.fx, o.halftone, o.news, o.dotgrid, o.edge, o.fibres, o.res, o.flat, o.tex, o.brush, o.speck, o.texRot]);
    if (!SPR.has(key)) SPR.set(key, renderPiece(T, fill, o));
    return SPR.get(key);
  }
  function drawSprite(ctx, s, o = {}) {
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(o.x || 0, o.y || 0);
    if (o.spin || (o.sc != null && o.sc !== 1) || o.sx || o.sy) { const px = o.px ?? s.cx, py = o.py ?? s.cy; ctx.translate(px, py); ctx.rotate((o.spin || 0) * DEG); ctx.scale((o.sc ?? 1) * (o.sx ?? 1), (o.sc ?? 1) * (o.sy ?? 1)); ctx.translate(-px, -py); }
    ctx.drawImage(s.canvas, s.x, s.y, s.w, s.h);
    ctx.restore();
  }
  /** piece(ctx, shape, fill, o) — async. Draws a torn paper piece: shadow + white fibrous edge + textured colour face + overlays.
   *  fill: '#hex' | texture canvas | {color, brush, tex, speck, flat} | {img:'grass_strip', crop, filter, scale, tile} | async fn(ctx, bbox)
   *  o (cached in sprite): seed, rot (deg, baked), amp, white [min,max], bite, shadow {dx,dy,blur,alpha}|false, contact, fx [{type:'halftone'|'dotgrid'|'news'|'lines'|'memphis'|'grunge'|'stripes'|'zigzag'|'circle'|'rings'|'glyph'|'shade'|'blobs', …}],
   *    halftone {color, cell, angle, r | [r0,r1], grad}, news true|{…}, dotgrid true|{…}, edge (edge paper colour), fibres (0..2), res (sprite resolution), tex, brush, speck, flat, key, cache,
   *    draw async (ctx, bbox) extra drawing inside the face (function fills / draw are re-rendered every call unless o.key is set)
   *  o (per draw, free to animate): x, y (translate), spin (deg), sc, sx, sy, px/py (pivot, default centroid), alpha */
  async function piece(ctx, shape, fill, o = {}) { const s = await pieceSprite(shape, fill, o); drawSprite(ctx, s, o); return s; }
  /** strip(ctx, x0,y0,x1,y1, width, o) — torn diagonal strip; o.fill (default red), o.w1 taper, o.edges, + piece options */
  function strip(ctx, x0, y0, x1, y1, width, o = {}) { return piece(ctx, { band: [x0, y0, x1, y1, width, o.w1 ?? width], edges: o.edges }, o.fill || C.red, o); }

  /* ======================================================================= cut-out sprites */
  const MIPS = new Map(), CLEAN = new Map();
  function cleaned(im) { // photo clouds (cloud_*): keying haze removed (alpha < 48 zeroed) + brightened grey; falls back to the image if pixels are unreadable
    if (!/\/cloud_\d\.png/.test(im.src)) return im; if (CLEAN.has(im)) return CLEAN.get(im);
    let out = im; try { const c = mk(im.naturalWidth, im.naturalHeight), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 3; i < a.length; i += 4) {
      if (a[i] < 48) a[i] = 0; else if (a[i] < 96) a[i] = (a[i] - 48) * 2;
      const v = clamp(((0.3 * a[i - 3] + 0.59 * a[i - 2] + 0.11 * a[i - 1]) / 255 * 1.3 - 0.5) * 0.85 + 0.5), w = (v * 0.65 + 0.35) * 255; a[i - 3] = a[i - 2] = a[i - 1] = w; // grayscale(1) brightness(1.3) contrast(.85) + .35 white screen: no storm clouds
    } x.putImageData(d, 0, 0); out = c; } catch (e) { out = im; }
    CLEAN.set(im, out); return out;
  }
  function mipFor(im0, tw) {
    const im = cleaned(im0), nw = im.naturalWidth || im.width; if (tw >= nw * 0.55) return im;
    let list = MIPS.get(im); if (!list) { list = []; MIPS.set(im, list); }
    let src = im, w = nw, h = im.naturalHeight || im.height, l = 0;
    while (tw < w * 0.55 && w > 96) { const w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2); if (!list[l]) { const c = mk(w2, h2), x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w2, h2); list[l] = c; } src = list[l]; w = w2; h = h2; l++; }
    return src;
  }
  const SIL = new Map();
  function silhouette(name, im, blurRel) {
    const q = Math.max(1, Math.round(blurRel * 300)), key = name + '|' + q; if (SIL.has(key)) return SIL.get(key);
    const SH = 300, nw = im.naturalWidth, nh = im.naturalHeight, k = SH / nh, sw = nw * k, b = q / 300 * SH, pad = Math.ceil(b * 2.2 + 4);
    const c = mk(sw + 2 * pad, SH + 2 * pad), x = c.getContext('2d');
    x.filter = `blur(${b}px)`; x.drawImage(mipFor(im, sw), pad, pad, sw, SH); x.filter = 'none';
    x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgb(12,20,34)'; x.fillRect(0, 0, c.width, c.height);
    const s = { c, pad, SH }; SIL.set(key, s); return s;
  }
  /** sprite(ctx, name, x, y, o) — async. Draws cutouts/NAME.png. o: ax, ay (anchor 0..1, default .5/.5), h | w (target px) | scale (default .5),
   *  rot (deg), sx, sy (squash), alpha, shadow {dx,dy,blur,alpha} | false (default {dx:7,dy:11,blur:12,alpha:.38}, offsets in screen px),
   *  boil (amp, true = 1) + t (time) → tiny jitter re-seeded every 2 frames, seed, clip (Path2D in current coords: only inside is drawn), flipX.
   *  Returns {w, h} of the drawn sprite. */
  async function sprite(ctx, name, x, y, o = {}) {
    const im = await img(name), nw = im.naturalWidth, nh = im.naturalHeight;
    if (im.empty) return { w: 0, h: 0 };   // optional background cut-out not in this project
    const sc = o.h ? o.h / nh : o.w ? o.w / nw : (o.scale ?? 0.5), w = nw * sc, h = nh * sc;
    if (w < 1 || h < 1 || (o.alpha ?? 1) <= 0) return { w, h };
    const ax = o.ax ?? 0.5, ay = o.ay ?? 0.5; let rot = (o.rot || 0) * DEG, dx = 0, dy = 0;
    if (o.boil) { const amp = o.boil === true ? 1 : o.boil, r = R(hashStr(name) + f12(o.t || 0) * 7919 + (o.seed || 0) * 131); dx = (r() - 0.5) * 2.4 * amp; dy = (r() - 0.5) * 2.4 * amp; rot += (r() - 0.5) * 1.1 * amp * DEG; }
    const sx = (o.sx ?? 1) * (o.flipX ? -1 : 1), sy = o.sy ?? 1;
    ctx.save();
    if (o.clip) ctx.clip(o.clip);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(x + dx, y + dy); ctx.rotate(rot); ctx.scale(sx, sy);
    if (o.shadow !== false) {
      const s = Object.assign({ dx: 7, dy: 11, blur: 12, alpha: 0.38 }, o.shadow || {}), S = silhouette(name, im, s.blur / Math.max(h, 1)), k = h / S.SH;
      const c = Math.cos(-rot), si = Math.sin(-rot), ox = (s.dx * c - s.dy * si) / sx, oy = (s.dx * si + s.dy * c) / sy;
      ctx.save(); ctx.globalAlpha *= s.alpha; ctx.drawImage(S.c, -ax * w - S.pad * k + ox, -ay * h - S.pad * k + oy, S.c.width * k, S.c.height * k); ctx.restore();
    }
    ctx.drawImage(mipFor(im, w), -ax * w, -ay * h, w, h);
    ctx.restore();
    return { w, h };
  }

  /* ======================================================================= motion helpers (pure) */
  const tbl = (T, f) => { // piecewise-linear table lookup by fractional frame
    if (f <= 0) return T[0]; if (f >= T.length - 1) return T[T.length - 1];
    const i = Math.floor(f), k = f - i; return T[i].map((v, j) => lerp(v, T[i + 1][j], k));
  };
  /** drop(t, t0, o) → {dy, rot, sx, sy, on, k} — falls from above in o.dur (4 frames, near-linear like the ref) with a slight tilt, lands at t0+dur with squash
   *  (sy .9, sx 1.06), one small bounce, settled by +0.3 s. Anchor the sprite at its bottom (ay: 1) so it squashes onto the ground; set o.h ≈ landing y
   *  so frame 1 shows the bottom edge entering from the top. o: h (fall px, 900), tilt (deg, 7), bounce (px, 22), squash (1), dur (s). k: 0→.5 falling, .5→1 settling */
  function drop(t, t0, o = {}) {
    const h = o.h ?? 900, dur = o.dur ?? 4 / 24, tilt = o.tilt ?? 7, bo = o.bounce ?? 22, sq = o.squash ?? 1;
    if (t < t0) return { dy: -h * 1.25, rot: tilt, sx: 1, sy: 1, on: false, k: 0 };
    const lt = t - t0;
    if (lt < dur) { const k = lt / dur; return { dy: -h * Math.pow(1 - k, 1.15), rot: tilt * (1 - k * 0.85), sx: 1 - 0.03 * sq, sy: 1 + 0.05 * sq, on: true, k: k * 0.5 }; }
    //            dy(×bounce)  rot(×tilt)  sx-1    sy-1
    const T = [[0, 0.15, 0.06, -0.10], [0, -0.06, 0.03, -0.05], [-0.7, -0.04, -0.015, 0.03], [-1, 0.02, -0.005, 0.012], [-0.55, 0.02, 0, 0], [0, 0, 0.02, -0.03], [0, 0, 0, 0.005], [0, 0, 0, 0]];
    const v = tbl(T, (lt - dur) * 24);
    return { dy: v[0] * bo, rot: v[1] * tilt, sx: 1 + v[2] * sq, sy: 1 + v[3] * sq, on: true, k: clamp(0.5 + (lt - dur) / 0.6) };
  }
  /** pop(t, t0, o) → {dy, sx, sy, on} — rises from behind a layer (use o.clip on the sprite) with overshoot in o.frames (3) frames. o: h (rise px, 300), over (overshoot px, .12*h) */
  function pop(t, t0, o = {}) {
    const h = o.h ?? 300, fr = o.frames ?? 3, ov = o.over ?? h * 0.12;
    if (t < t0) return { dy: h, sx: 1, sy: 1, on: false };
    const f = (t - t0) * 24;
    if (f < fr) { const k = f / fr; return { dy: lerp(h, -ov, E.out3(k)), sx: 0.95, sy: 1.07, on: true }; }
    const T = [[-ov, 0.97, 1.05], [-ov * 0.35, 1.03, 0.95], [ov * 0.1, 1.01, 0.985], [0, 1, 1]];
    const v = tbl(T, f - fr); return { dy: v[0], sx: v[1], sy: v[2], on: true };
  }
  /** slap(t, t0, o) → {s, rot, on, shadow} — sticker/card slaps onto the page: scale 1.35→1 in 3 frames, tiny overshoot. o: from (1.35), rot0 (deg offset at start, -6) */
  function slap(t, t0, o = {}) {
    const fr = o.from ?? 1.35, r0 = o.rot0 ?? -6;
    if (t < t0) return { s: 0, rot: r0, on: false, shadow: 2 };
    const f = (t - t0) * 24, T = [[fr, r0, 2.2], [lerp(fr, 1, 0.55), r0 * 0.4, 1.6], [1, 0, 1], [0.965, 0.6, 0.9], [1.01, -0.2, 1], [1, 0, 1]];
    const v = tbl(T, f); return { s: v[0], rot: v[1], on: true, shadow: v[2] };
  }
  /** bob(t, i, amp=5) → {dx, dy, rot} — idle bob on twos (stop-motion), i = per-object index */
  function bob(t, i = 0, amp = 5) { const f = f12(t), r = R(i * 7919 + f * 31 + 1); return { dx: (r() - 0.5) * amp * 0.5, dy: amp * Math.sin(f * 0.95 + i * 1.7) * 0.7 + (r() - 0.5) * amp * 0.5, rot: (r() - 0.5) * amp * 0.25 }; }
  /** fly(t, t0, t1, o) → {x, y, s, k, on} — approach-the-camera path: linear depth → accelerating scale; positions interpolate in perspective.
   *  o: from {x,y,s}, to {x,y,s}, cx/cy (vanishing point, frame centre), ease (fn on k) */
  function fly(t, t0, t1, o = {}) {
    const a = o.from || { x: W / 2, y: H * 0.4, s: 0.15 }, b = o.to || { x: W / 2, y: H * 0.6, s: 3 }, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
    const k = (o.ease || ((v) => v))(prog(t, t0, t1)), iz = lerp(1 / a.s, 1 / b.s, k), s = 1 / iz;
    const wx = lerp((a.x - cx) / a.s, (b.x - cx) / b.s, k), wy = lerp((a.y - cy) / a.s, (b.y - cy) / b.s, k);
    return { x: cx + wx * s, y: cy + wy * s, s, k, on: t >= t0 && t <= t1 };
  }

  /* ======================================================================= layer machinery */
  const BL = 150; // bleed around every full-frame layer canvas
  const LAY = new Map();
  /** layer(key, build, o) → Promise<canvas> (W+2·bleed)×(H+2·bleed), cached; build(ctx) draws in frame coords (0..W, 0..H) */
  function layer(key, build, o = {}) {
    if (LAY.has(key)) return LAY.get(key);
    const b = o.bleed ?? BL, res = o.res || 1;
    const p = (async () => { const c = mk((W + 2 * b) * res, (H + 2 * b) * res), x = c.getContext('2d'); x.scale(res, res); x.translate(b, b); await build(x); c.bleed = b; c.res = res; return c; })();
    LAY.set(key, p); return p;
  }
  function camXf(ctx, cam, d) {
    const z = 1 + ((cam.zoom ?? 1) - 1) * d, fx = cam.fx ?? W / 2, fy = cam.fy ?? H / 2;
    ctx.translate(fx, fy); ctx.rotate((cam.rot || 0) * DEG * d); ctx.scale(z, z); ctx.translate(-fx - (cam.x || 0) * d, -fy - (cam.y || 0) * d);
  }
  async function drawLayers(ctx, t, layers, o) {
    const cam = o.cam || {}, boil = o.boil ?? 0.5, f = f12(t);
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i];
      if (!L) { if (o.insert && o.insert[i]) { ctx.save(); camXf(ctx, cam, page.depths[i] ?? 1); await o.insert[i](ctx, t, cam); ctx.restore(); } continue; }
      const cv = await L.canvas; const r = R(f * 31 + i * 7 + 1);
      ctx.save(); camXf(ctx, cam, L.d);
      const bx = L.d > 0.3 ? (r() - 0.5) * boil * 2 : 0, by = L.d > 0.3 ? (r() - 0.5) * boil * 2 : 0;
      ctx.drawImage(cv, -cv.bleed + bx, -cv.bleed + by, cv.width / cv.res, cv.height / cv.res);
      if (o.insert && o.insert[i]) await o.insert[i](ctx, t, cam);
      ctx.restore();
    }
  }
  const dropShadowSmall = { dx: 4, dy: 7, blur: 10, alpha: 0.32 };

  /* ======================================================================= scene: PAGE (opening collage) */
  const GRASS = { img: 'grass_strip', crop: [60, 175, 2380, 300], filter: 'saturate(1.6) brightness(1.24) hue-rotate(3deg) contrast(1.04)', tile: 'x', scale: 0.62, base: '#A9B13A', oy: -6 };
  const pc = (x, shape, fill, o) => piece(x, shape, fill, Object.assign({ cache: false }, o));
  function pageLayers(seed, res = 1) {
    const k = 'page' + seed + (res !== 1 ? '@' + res : ''), lay = (key, fn) => layer(key, fn, { res });
    return [
      { d: 0.22, canvas: lay(k + 'L0', async (x) => { // sky
        x.drawImage(watercolor(seed + 10, { w: W + 2 * BL, h: H + 2 * BL, tone: 0.86, clouds: 0, dots: 0.85, bloom: 0.7 }), -BL, -BL);
      }) },
      { d: 0.42, canvas: lay(k + 'L1', async (x) => { // upper diagonal strips
        // white dotted paper band across the middle (the L0 watercolour sky shows above it on the left and between the strips, ≈ ref 35 % sky)
        await pc(x, { band: [-80, 560, 2020, 360, 170, 150] }, C.paper, { seed: 3, dotgrid: { cell: 21, r: 0.085, angle: 12, color: 'rgba(25,25,25,0.8)' }, amp: 12 });
        // light cyan slivers + yellow strips in the white
        await pc(x, { band: [-60, 700, 900, 600, 54, 30] }, '#A9E6F8', { seed: 4, amp: 7 });
        await pc(x, { band: [1050, 730, 2000, 600, 60, 44] }, '#8EDDF6', { seed: 5, amp: 8 });
        await pc(x, { band: [-60, 650, 760, 590, 44, 26] }, C.sun, { seed: 6, amp: 6 });
        await pc(x, { band: [1180, 560, 2010, 420, 120, 70] }, C.sun, { seed: 7, amp: 10, brush: 0.5 });
        // torn paper sun peeking between strips
        await pc(x, { circle: [1530, 250, 150] }, C.sun, { seed: 8, amp: 10, halftone: { color: 'rgba(240,122,46,0.95)', cell: 15, angle: 30, r: [0.05, 0.42], grad: [1430, 150, 1650, 380] } });
        // newsprint scrap under the mustard strip
        await pc(x, { band: [-60, 250, 420, 300, 120, 90] }, C.paper, { seed: 9, news: { alpha: 0.5, angle: -6, x: 4.4 }, amp: 8 });
        // big mustard strip on the left
        await pc(x, { band: [-80, 330, 1060, 255, 250, 150] }, { color: C.mustard, brush: 0.75 }, { seed: 10, amp: 13, news: { alpha: 0.14, angle: -4, x: 4.5, col: 300 } });
        // huge red strip rising to the right + the halftone red-orange piece + newsprint corner
        await pc(x, { band: [360, 360, 2040, -60, 200, 300] }, { color: C.red, speck: 0.3 }, { seed: 11, amp: 14, fx: [{ type: 'grunge', color: 'rgba(130,10,8,0.18)', seed: 4 }], halftone: { color: '#FBEFE4', cell: 20, angle: 20, r: [0.0, 0.48], grad: [760, 300, 1900, 20] } }); // red → cream halftone (ref)
        await pc(x, { band: [1230, 250, 2040, 30, 150, 230] }, '#EC3B27', { seed: 12, amp: 11, halftone: { color: '#FBEFE4', cell: 22, angle: 20, r: [0.06, 0.46], grad: [1250, 0, 1980, 0] } });
        await pc(x, { band: [1560, 70, 2040, -40, 66, 80] }, C.paper, { seed: 13, news: { alpha: 0.55, angle: -14 }, amp: 7 });
        await pc(x, { band: [-60, 120, 520, 60, 40, 26] }, C.paper, { seed: 14, news: { alpha: 0.5, angle: -5 }, amp: 6 });
      }) },
      { d: 0.6, canvas: lay(k + 'L2', async (x) => { // far hills
        await pc(x, { band: [-60, 770, 1000, 715, 40, 24] }, '#9FE3F7', { seed: 20, amp: 6 });
        await pc(x, { ridge: [[-90, 770], [120, 715], [330, 690], [560, 730], [820, 800], [1060, 850]] }, { color: C.sun, brush: 0.6 }, { seed: 21, amp: 9 });
        await pc(x, { ridge: [[820, 860], [1100, 780], [1380, 690], [1600, 655], [1820, 680], [2060, 720]] }, GRASS, { seed: 22, amp: 9 });
        await sprite(x, 'rocks_b', 1590, 700, { h: 250, ay: 0.9, shadow: dropShadowSmall });
      }) },
      { d: 0.8, canvas: lay(k + 'L3', async (x) => { // mid grass
        await pc(x, { ridge: [[-90, 880], [200, 840], [520, 815], [860, 850], [1120, 905], [1320, 950]] }, GRASS, { seed: 31, amp: 10 });
        await pc(x, { ridge: [[980, 990], [1250, 905], [1560, 870], [1820, 885], [2060, 910]] }, { color: '#F6C929', brush: 0.6 }, { seed: 32, amp: 9 });
        await pc(x, { band: [1240, 935, 2040, 905, 30, 22] }, '#A9E6F8', { seed: 35, amp: 6 });
        await pc(x, { band: [470, 1005, 1080, 980, 110, 90] }, { color: C.rust }, { seed: 33, amp: 9, halftone: { color: 'rgba(60,30,12,0.55)', cell: 11, angle: 15, r: 0.22 } });
        await pc(x, { ridge: [[1150, 1010], [1450, 975], [1750, 965], [2060, 985]] }, GRASS, { seed: 34, amp: 8 });
      }) },
      { d: 1.0, canvas: lay(k + 'L4', async (x) => { // foreground
        await pc(x, { band: [-80, 1075, 2040, 1060, 70, 80] }, { color: C.earth }, { seed: 41, amp: 10 });
        await sprite(x, 'grass_strip', 1060, 1150, { w: 1250, ay: 1, shadow: { dx: 4, dy: -6, blur: 12, alpha: 0.3 } });
        await sprite(x, 'rocks_a', 190, 1100, { h: 400, ay: 1, shadow: { dx: 8, dy: 10, blur: 16, alpha: 0.4 } });
        await sprite(x, 'rocks_c', 1800, 1110, { h: 260, ay: 1, shadow: { dx: 8, dy: 10, blur: 16, alpha: 0.4 }, flipX: true });
      }) },
    ];
  }
  /** page(ctx, t, o) — async. The opening collage page (5 layers: sky · upper strips · far hills · mid grass · foreground).
   *  o.cam {x, y, zoom, fx, fy, rot}: camera (zoom about fx/fy; per-layer parallax d = .22/.42/.6/.8/1.0) · o.boil (px, .5 layer jitter on twos)
   *  o.insert {i: async (ctx, t, cam) => {}}: draw after layer i in that layer's camera space (e.g. things behind the hills) · o.seed
   *  o.only [layer indices] draw a subset (inserts still run) · o.res (layer render scale, 1; use 1.5 for pushes beyond zoom ≈1.3) */
  async function page(ctx, t, o = {}) { const L = pageLayers(o.seed || 1, o.res || 1); await drawLayers(ctx, t, o.only ? L.map((l, i) => (o.only.includes(i) ? l : null)) : L, o); }
  page.depths = [0.22, 0.42, 0.6, 0.8, 1.0];

  /* ======================================================================= scene: DIAG (race-car bands) */
  const DIAG_KINDS = {
    cyan: ['#5BD3F3', {}], cyanLines: ['#61D3F4', { fx: [{ type: 'lines', n: 7, color: 'rgba(255,255,255,0.75)', width: 1.7 }] }],
    red: [{ color: C.red, speck: 0.3 }, { fx: [{ type: 'grunge', seed: 2 }] }], redG: [{ color: '#E1201C', speck: 0.5 }, { fx: [{ type: 'grunge', seed: 5, color: 'rgba(110,6,4,0.3)' }] }],
    memphis: ['#151A2C', { fx: [{ type: 'memphis' }] }], white: [C.paper, { news: { alpha: 0.35, x: 4 } }], whiteDots: [C.paper, { dotgrid: { cell: 18, r: 0.1 } }],
    navyDots: [C.navy, { halftone: { color: '#4C8EF2', cell: 13, angle: 30, r: 0.36 } }], cobaltDots: [C.cobalt, { halftone: { color: '#0B3A92', cell: 16, angle: 10, r: [0.08, 0.38] } }],
    yellow: [{ color: C.sun, brush: 0.6 }, {}], orange: [{ color: C.orange, brush: 0.5 }, {}], pink: [C.pink, { halftone: { color: '#F07A9A', cell: 12, r: 0.3 } }],
    checker: [C.paper, { fx: [{ type: 'checker', cell: 34, color: '#121212' }] }], // torn black / white racing checks
  };
  const DIAG_DEF = [
    ['cyan', -900, 260, 0.5], ['redG', -700, 260, 0.62], ['memphis', -560, 80, 0.78], ['checker', -505, 68, 0.85], ['cyanLines', -330, 340, 0.55],
    ['navyDots', -140, 100, 0.72], ['whiteDots', -80, 56, 0.9], ['cyanLines', 70, 280, 0.6], ['checker', 225, 58, 0.95], ['red', 390, 320, 0.7],
    ['memphis', 560, 86, 0.9], ['cobaltDots', 660, 150, 0.8], ['cyan', 840, 240, 0.58], ['yellow', 960, 90, 0.85],
  ];
  const DL = 3700, DP = 3380;
  function diagBand(i, angle) {
    const [kind, y, h, d] = DIAG_DEF[i], [fill, extra] = DIAG_KINDS[kind], a = -angle * DEG;
    const sdx = 6 * Math.cos(a) - 10 * Math.sin(a), sdy = 6 * Math.sin(a) + 10 * Math.cos(a); // screen-space shadow (6,10) in band space
    return pieceSprite({ band: [-DL / 2, y, DL / 2, y + (i % 2 ? 6 : -6), h, h * (0.85 + (i % 3) * 0.1)], edges: [1, 0.8, 1, 0.8] }, fill,
      Object.assign({ seed: 100 + i, amp: 11, shadow: { dx: sdx, dy: sdy, blur: 12, alpha: 0.3 } }, extra));
  }
  const DIAG_ROCKS = (() => { const r = R(55), A = []; const names = ['rocks_a', 'rocks_b', 'rocks_c', 'cassette', 'rocks_b']; for (let i = 0; i < 9; i++) A.push({ x: i * 380 + r() * 160, y: pick(r, [-610, -360, -120, 230, 520, 700]) + (r() - 0.5) * 60, n: names[i % names.length], h: 150 + r() * 120, d: 1.1 + r() * 0.25, rot: (r() - 0.5) * 30 }); return A; })();
  const DIAG_CONF = (() => { const r = R(66), A = []; const cols = ['#38D3E6', '#FFFFFF', C.red, C.sun, '#38D3E6', C.cobalt]; for (let i = 0; i < 40; i++) A.push({ x: r() * 2600, y: (r() - 0.5) * 1760, s: 14 + r() * 24, c: pick(r, cols), d: 1.25 + r() * 0.6, rot: r() * 360, sp: (r() - 0.5) * 70 }); return A; })();
  /** diag(ctx, t, o) — async. Full-frame diagonal torn bands (red/cobalt/white/cyan, halftone, memphis, contour lines) sliding along the diagonal with parallax,
   *  grey rock cut-outs and confetti triangles. o.angle (deg, -24) · o.speed (px/s at depth 1, 1100) · o.offset (px) · o.rocks (true) · o.confetti (true)
   *  o.mid async (ctx, t) => {} drawn between bands and rocks (screen space) */
  async function diag(ctx, t, o = {}) {
    const ang = o.angle ?? -24, u = (o.offset || 0) + t * (o.speed ?? 1100), f = f12(t);
    ctx.save(); ctx.fillStyle = pat(ctx, paper(C.sky, 2)); ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2); ctx.rotate(ang * DEG);
    for (let i = 0; i < DIAG_DEF.length; i++) {
      const s = await diagBand(i, ang), d = DIAG_DEF[i][3], sh = mod(-u * d + i * 517, DP);
      for (let k = 0; k < 3; k++) drawSprite(ctx, s, { x: sh + (k - 1.5) * DP + DP / 2 });
    }
    ctx.restore();
    if (o.mid) { ctx.save(); await o.mid(ctx, t); ctx.restore(); }
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang * DEG);
    if (o.rocks !== false) for (const rk of DIAG_ROCKS) {
      const PR = 3420, X = mod(rk.x - u * rk.d, PR) - PR / 2;
      if (Math.abs(X) > 1350) continue;
      await sprite(ctx, rk.n, X, rk.y, { h: rk.h, rot: rk.rot, boil: 0.8, t, seed: rk.x | 0, shadow: { dx: 12, dy: 18, blur: 14, alpha: 0.42 } });
    }
    if (o.confetti !== false) for (const c of DIAG_CONF) {
      const PC = 2600, X = mod(c.x - u * c.d, PC) - PC / 2; if (Math.abs(X) > 1250) continue;
      const rot = (c.rot + f * c.sp) * DEG;
      ctx.save(); ctx.translate(X, c.y); ctx.rotate(rot); ctx.fillStyle = 'rgba(10,20,40,0.25)'; tri(ctx, 3, 5, c.s); ctx.fillStyle = c.c; tri(ctx, 0, 0, c.s); ctx.restore();
    }
    ctx.restore();
  }
  const tri = (ctx, x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y - s * 0.6); ctx.lineTo(x + s * 0.55, y + s * 0.4); ctx.lineTo(x - s * 0.55, y + s * 0.4); ctx.closePath(); ctx.fill(); };

  /* ======================================================================= scene: POSTERS (torn poster wall) */
  function posterLayers(seed) {
    const k = 'post' + seed;
    return [
      { d: 0.6, canvas: layer(k + 'A', async (x) => {
        x.fillStyle = pat(x, paper(C.navy, 3, { tex: 1.3 })); x.fillRect(-BL, -BL, W + 2 * BL, H + 2 * BL);
        await pc(x, [-90, -80, 780, 700], { color: C.sun, brush: 0.4 }, { seed: 201, rot: -4, halftone: { color: '#141414', cell: 30, angle: 45, r: [0.05, 0.44], grad: [0, 600, 700, 0] } });
        await pc(x, [620, -110, 720, 520], { color: C.cobalt }, { seed: 202, rot: 3, fx: [{ type: 'circle', x: 980, y: 420, r: 230, a0: Math.PI, a1: TAU, color: C.paper }, { type: 'stripes', color: 'rgba(255,255,255,0.9)', w: 10, gap: 22, angle: 0, bbox: [620, 330, 720, 90] }] });
        await pc(x, [1260, -90, 760, 600], C.paper, { seed: 203, rot: 5, news: { alpha: 0.5, x: 4.6, head: 0.6 }, fx: [{ type: 'glyph', ch: 'R', x: 1690, y: 330, size: 820, color: C.red, font: '"Ultra"', rot: -8 }] });
        await pc(x, [-70, 560, 640, 620], { color: C.pink }, { seed: 204, rot: 6, fx: [{ type: 'rings', x: 260, y: 900, n: 6, gap: 46, width: 16, color: C.red }] });
        await pc(x, [1420, 520, 620, 640], { color: C.red }, { seed: 205, rot: -6, fx: [{ type: 'zigzag', n: 4, amp: 28, step: 48, width: 13, color: C.sun }] });
      }) },
      { d: 1.0, canvas: layer(k + 'B', async (x) => {
        await pc(x, [480, 330, 760, 560], { color: C.red, speck: 0.3 }, { seed: 211, rot: -3, halftone: { color: '#FFEDE2', cell: 34, angle: 30, r: [0.42, 0.04], grad: [480, 330, 1240, 890] } });
        await pc(x, { band: [-60, 470, 900, 300, 120, 90] }, { color: C.orange, brush: 0.6 }, { seed: 212, amp: 10 });
        await pc(x, [1080, 760, 560, 400], C.paper, { seed: 213, rot: 4, fx: [{ type: 'glyph', ch: 'K', x: 1360, y: 1040, size: 640, color: '#141414', font: '"Bungee"', rot: 6 }] });
        await pc(x, [90, 820, 420, 300], { color: '#5BD3F3' }, { seed: 214, rot: -8, halftone: { color: '#141414', cell: 18, angle: 15, r: 0.28 } });
        await pc(x, { band: [1150, 330, 2020, 180, 90, 70] }, { color: C.sun, brush: 0.5 }, { seed: 215, amp: 8 });
        await pc(x, [1700, 300, 300, 260], { color: C.lime }, { seed: 216, rot: 12, fx: [{ type: 'glyph', ch: '&', x: 1860, y: 420, size: 330, color: C.cobalt, font: '"Abril Fatface"' }] });
        await pc(x, [300, 40, 300, 240], { color: C.paper }, { seed: 217, rot: -10, fx: [{ type: 'glyph', ch: 'Q', x: 520, y: 250, size: 520, color: C.red, font: '"Bevan"', rot: 10 }] });
        await pc(x, [760, 870, 300, 260], { color: C.cobalt }, { seed: 218, rot: 9, fx: [{ type: 'glyph', ch: 'M', x: 960, y: 1060, size: 520, color: C.sun, font: '"Anton"', rot: -12 }] });
        await pc(x, [1580, 20, 240, 200], { color: C.red }, { seed: 219, rot: -14, fx: [{ type: 'glyph', ch: 'S', x: 1650, y: 90, size: 420, color: C.paper, font: '"Rubik"', weight: 900, rot: 20 }] });
      }) },
    ];
  }
  /** posters(ctx, t, o) — async. Wall of layered torn posters (red/yellow/cobalt/black/white, big halftone, abstract shapes, torn glyph fragments that never spell words).
   *  o.cam {x,y,zoom} with 2 depths (.6 / 1.0) · o.drift (px/s slow pan, 0) · o.boil · o.insert {0|1: fn} · o.seed */
  async function posters(ctx, t, o = {}) {
    const cam = Object.assign({ x: (o.drift || 0) * t, y: 0, zoom: 1 }, o.cam || {});
    await drawLayers(ctx, t, posterLayers(o.seed || 1), Object.assign({}, o, { cam }));
  }

  /* ======================================================================= scene: CLOUDSKY (fly-through) */
  const CLOUD_EL = (() => {
    const r = R(77), A = [];
    for (let i = 0; i < 26; i++) {
      const strip = i % 3 !== 0, side = i % 2 ? 1 : -1; // only 1 in 3 is a photo cloud
      A.push({ strip, name: 'cloud_' + (1 + (i % 4)), wx: side * (260 + r() * 1100), wy: -460 + r() * 520 + (strip ? 120 : 0), z: 0.7 + i * 0.27 + r() * 0.2, h: strip ? 70 + r() * 50 : 260 + r() * 160, len: 700 + r() * 800, seed: 300 + i, flip: r() < 0.5 });
    }
    return A.sort((a, b) => b.z - a.z);
  })();
  function cloudStrip(e) {
    return pieceSprite({ band: [0, 0, e.len, (e.seed % 2 ? 10 : -10), e.h, e.h * 0.7], edges: [1, 1, 1, 1] }, { color: '#FAFCFD', tex: 1.2 },
      { seed: e.seed, amp: 8, res: 1.5, shadow: { dx: 4, dy: 8, blur: 12, alpha: 0.22 }, fx: [{ type: 'mottle', color: '#9DB6CA', alpha: 0.55, seed: e.seed, scale: 14 }], news: e.seed % 4 === 0 ? { alpha: 0.3 } : null });
  }
  // ground strips tilted into a V that rises to both sides (ref 8.5 s), with a grass ridge and an earth band; each V = two torn halves meeting low in the middle
  const groundLayer = (seed) => layer('cloudGround' + seed, async (x) => {
    const V = async (yl, yc, yr, w0, w1, fill, o) => { await pc(x, { band: [-110, yl, 1010, yc, w0, w1] }, fill, Object.assign({}, o, { seed: o.seed })); await pc(x, { band: [900, yc + 6, 2050, yr, w1, w0] }, fill, Object.assign({}, o, { seed: o.seed + 50 })); };
    await V(735, 905, 705, 120, 70, { color: C.sun, brush: 0.7 }, { seed: 351, amp: 11 });
    await pc(x, { band: [-110, 800, 760, 870, 38, 24] }, C.paper, { seed: 354, amp: 6, news: { alpha: 0.4 } });
    await pc(x, { band: [1240, 860, 2050, 760, 42, 28] }, C.red, { seed: 355, amp: 6 });
    await pc(x, { ridge: [[-100, 788], [260, 822], [620, 885], [960, 928], [1300, 885], [1680, 815], [2030, 762]], bottom: H + 220 }, GRASS, { seed: 356, amp: 10 });
    await V(935, 1040, 910, 120, 86, { color: C.orange, brush: 0.6 }, { seed: 352, amp: 12 });
    await V(1008, 1072, 990, 46, 34, { color: C.earth }, { seed: 357, amp: 8 });
    await pc(x, { band: [-110, 1090, 2050, 1075, 90, 84] }, { color: C.mustard, brush: 0.7 }, { seed: 353, amp: 10, halftone: { color: 'rgba(200,70,20,0.6)', cell: 14, r: [0.05, 0.35], grad: [0, 0, 1900, 0] } });
  });
  /** cloudsky(ctx, t, o) — async. Watercolour sky + cloud_1..4 cut-outs + torn white paper cloud strips flying toward camera (o.fly 0..1) over
   *  yellow/orange torn strips in the lower third. o.ground (true) · o.depth (camera travel in z, 5) · o.mid async (ctx, t) => {} drawn before the nearest third of elements */
  async function cloudsky(ctx, t, o = {}) {
    const fly = o.fly ?? 0, camZ = fly * (o.depth ?? 5), f = f12(t);
    const sky = watercolor(31, { w: W + 2 * BL, h: H + 2 * BL, clouds: 0.45, tone: 0.8, cloudY: [0.08, 0.55], bloom: 0.5 });
    const zs = 1 + fly * 0.06; ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zs, zs); ctx.drawImage(sky, -W / 2 - BL, -H / 2 - BL); ctx.restore();
    if (o.ground !== false) { const g = await groundLayer(1), gs = 1 + fly * 0.35; ctx.save(); ctx.translate(W / 2, H); ctx.scale(gs, gs); ctx.drawImage(g, -W / 2 - g.bleed, -H - g.bleed); ctx.restore(); }
    let midDone = !o.mid;
    for (const e of CLOUD_EL) {
      const dz = e.z - camZ; if (dz < 0.22) continue;
      if (!midDone && dz < 1.0) { await o.mid(ctx, t); midDone = true; }
      const s = 1 / dz, x = W / 2 + e.wx * s, y = H * 0.42 + e.wy * s, a = clamp((7.5 - dz) / 1.5);
      if (a <= 0) continue;
      const b = R(e.seed + f * 13), jx = (b() - 0.5) * 1.6, jy = (b() - 0.5) * 1.6;
      if (e.strip) { const sp = await cloudStrip(e), w = e.len * s; if (x + w / 2 < -50 || x - w / 2 > W + 50) continue; drawSprite(ctx, sp, { x: x - sp.cx * s + jx, y: y - sp.cy * s + jy, alpha: a, sc: s, px: 0, py: 0 }); }
      else { const hh = e.h * s; if (x + hh * 2 < -50 || x - hh * 2 > W + 50 || y - hh > H) continue; await sprite(ctx, e.name, x + jx, y + jy, { h: hh, alpha: a, flipX: e.flip, shadow: { dx: 6, dy: 10, blur: 14, alpha: 0.22 } }); }
    }
    if (!midDone) await o.mid(ctx, t);
  }

  /* ======================================================================= scene: DESK (how it's done) */
  const STARS = (() => { const r = R(88), A = []; const cols = [C.cobalt, C.paper, C.sun, C.red, '#5BD3F3', C.pink, C.orange]; const spots = [[130, 120], [420, 70], [880, 60], [1460, 90], [1800, 160], [1840, 520], [1790, 930], [1380, 1010], [980, 1030], [560, 1000], [150, 940], [90, 560], [300, 330], [1650, 360]]; spots.forEach(([x, y], i) => A.push({ x: x + (r() - 0.5) * 40, y: y + (r() - 0.5) * 40, r: 22 + r() * 26, c: cols[i % cols.length], rot: r() * 72, seed: 400 + i })); return A; })();
  const deskLayer = (seed) => layer('desk' + seed, async (x) => {
    x.drawImage(watercolor(41, { w: W + 2 * BL, h: H + 2 * BL, tone: 0.65, bloom: 1.2 }), -BL, -BL);
    await pc(x, [-90, -90, 860, 470], { color: '#9FE2F7' }, { seed: 501, rot: -3, fx: [{ type: 'lines', n: 5, color: 'rgba(255,255,255,0.6)', width: 1.4 }] });
    await pc(x, [700, -100, 640, 330], { color: C.pink }, { seed: 502, rot: 2, halftone: { color: '#F38FA8', cell: 13, r: 0.3 } });
    await pc(x, [1240, -80, 780, 600], C.paper, { seed: 503, rot: 5, news: { alpha: 0.45, head: 0.5 }, halftone: { color: 'rgba(20,20,20,0.85)', cell: 20, angle: 45, r: [0.02, 0.36], grad: [1240, 520, 2000, -80] } });
    await pc(x, [-100, 360, 760, 820], { color: C.pink }, { seed: 504, rot: 4, halftone: { color: 'rgba(255,255,255,0.9)', cell: 26, r: [0.4, 0.05], grad: [-100, 1100, 600, 400] } });
    await pc(x, [1180, 560, 920, 620], { color: C.red, speck: 0.3 }, { seed: 505, rot: -6, fx: [{ type: 'grunge', seed: 9 }] });
    await pc(x, { band: [-80, 980, 900, 1060, 90, 70] }, C.paper, { seed: 506, news: { alpha: 0.5 }, amp: 8 });
    await pc(x, { band: [1320, 470, 2040, 380, 70, 50] }, { color: C.orange, brush: 0.6 }, { seed: 507, amp: 8 });
    await pc(x, [470, 200, 990, 690], { color: C.sun, brush: 0.85 }, { seed: 508, rot: -1.5, amp: 12 });
    await pc(x, { poly: [[1560, 760], [1760, 700], [1700, 900]] }, C.cobalt, { seed: 509, amp: 6 });
  });
  /** desk(ctx, t, o) — async. Top-down desk of torn papers (sun-yellow centre sheet ≈ [470,200,990,690], pink, red, cyan, white halftone, newsprint) + cut paper stars boiling on twos.
   *  o.cam {x,y,zoom} · o.stars (true) · o.insert {0: fn} (after the papers, before the stars) */
  async function desk(ctx, t, o = {}) {
    const cv = await deskLayer(1), cam = o.cam || {}, f = f12(t);
    ctx.save(); camXf(ctx, cam, 1); ctx.drawImage(cv, -cv.bleed, -cv.bleed);
    if (o.insert && o.insert[0]) await o.insert[0](ctx, t, cam);
    if (o.stars !== false) for (const s of STARS) {
      const sp = await pieceSprite({ star: [0, 0, s.r, s.r * 0.45, 5, -90] }, s.c, { seed: s.seed, amp: 2.5, white: [2, 6], bite: 0, shadow: dropShadowSmall, res: 1.5 });
      const b = R(s.seed + f * 7); drawSprite(ctx, sp, { x: s.x + (b() - 0.5) * 2, y: s.y + (b() - 0.5) * 2, spin: s.rot + (b() - 0.5) * 6, px: 0, py: 0 });
    }
    ctx.restore();
  }

  /* ======================================================================= scene: SKY (rocket / title) */
  // 14 strips, each tilted ±3–9° with varied length / thickness, so a camera tilt reads as parallax (not a scroll of identical lines)
  const SKY_STRIPS = (() => { const r = R(99), A = [], RG = 1500, n = 14; for (let i = 0; i < n; i++) { const left = i % 2 === 0, d = 0.5 + r() * 0.65, u = (i + 0.2 + r() * 0.6) / n, len = (i % 3 === 0 ? 1100 : 450) + r() * 900, tl = (3 + r() * 6) * (r() < 0.5 ? -1 : 1) * DEG; A.push({ y: lerp(H + 40, -RG * d - 60, u), x0: left ? -160 - r() * 120 : W + 160 - len + r() * 120, len, dy: Math.tan(tl) * len, h: 26 + r() * 74, d, seed: 600 + i, kind: i % 5 === 2 ? 'cyan' : i % 3 === 0 ? 'cloud' : 'white', news: i % 4 === 3 }); } return A.sort((a, b) => a.d - b.d); })();
  function skyStrip(s) {
    const fill = s.kind === 'cyan' ? { color: '#A6E5F8' } : { color: '#F9FBFB', tex: 1.2 };
    return pieceSprite({ band: [s.x0, s.y, s.x0 + s.len, s.y + s.dy, s.h, s.h * 0.6] }, fill,
      { seed: s.seed, amp: 8, shadow: { dx: 4, dy: 8, blur: 12, alpha: 0.2 }, news: s.news ? { alpha: 0.4 } : null, fx: s.kind !== 'cyan' ? [{ type: 'mottle', color: s.kind === 'cloud' ? '#8EA8BE' : '#A9C0D2', alpha: s.kind === 'cloud' ? 0.75 : 0.45, seed: s.seed, scale: 12 }] : null });
  }
  // big torn-paper cloud banks along the bottom (ref 9.75 s "clouds part"): [centre x, top y, width, side −1|1, seed, shift px] — back pair first
  const BANKS = [[150, 845, 860, -1, 621, 560], [1790, 855, 860, 1, 622, 560], [560, 790, 1100, -1, 623, 680], [1370, 800, 1100, 1, 624, 680]];
  function bankSprite(b) {
    const [cx, top, w, , seed] = b, r = R(seed), n = 6 + Math.floor(r() * 3), bumps = [], base = top + w * 0.3;
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, sn = Math.sin(Math.PI * u), rad = w * (0.13 + r() * 0.07) * (0.7 + 0.5 * sn); bumps.push([cx - w / 2 + u * w + (r() - 0.5) * w * 0.05, base - rad * (0.25 + 0.75 * sn) - w * 0.06 * sn, rad]); }
    const x0 = cx - w / 2 - w * 0.06, x1 = cx + w / 2 + w * 0.06, pts = [];
    for (let x = x0; x <= x1; x += 9) { let y = base + w * 0.04; for (const [bx, by, br] of bumps) { const d = x - bx; if (Math.abs(d) < br) y = Math.min(y, by - Math.sqrt(br * br - d * d)); } pts.push([x, y, 1]); }
    pts.push([x1, top + 760, 0], [x0, top + 760, 1]);
    return pieceSprite({ poly: pts }, { color: '#F7FAFC', tex: 1.1 }, { seed, amp: 9, bite: 1.5, shadow: { dx: 8, dy: 10, blur: 18, alpha: 0.3 },
      fx: [{ type: 'mottle', color: '#93ABC0', alpha: 0.6, seed, scale: 16 }, { type: 'shade', top: 'rgba(255,255,255,0)', bottom: 'rgba(70,105,140,0.32)', bbox: [x0, top, x1 - x0, 420] }] });
  }
  /** sky(ctx, t, o) — async. Cyan print-dotted sky with long tilted torn white paper cloud strips (ref 10–12.5 s) + 4 cloud banks at the bottom.
   *  o.tilt (0..1): camera tilts up through 1500 px at depth 1 (strips depth .5–1.15, sky .25, banks .22; strips are laid out for range 1500) · o.mid async (ctx,t) between back and front strips
   *  o.part (0..1): the cloud banks slide apart to the corners (0 = closed across the bottom) · o.banks false hides them */
  async function sky(ctx, t, o = {}) {
    const tilt = o.tilt ?? 0, RG = o.range ?? 1500, f = f12(t);
    const bg = watercolor(51, { w: W + 2 * BL, h: H + 2 * BL + Math.ceil(RG * 0.25), tone: 0.8, fine: 1, clouds: 0.25, cloudY: [0.1, 0.9], bloom: 0.6 });
    ctx.drawImage(bg, -BL, -BL - RG * 0.25 + tilt * RG * 0.25);
    let midDone = !o.mid;
    for (const s of SKY_STRIPS) {
      if (!midDone && s.d > 0.85) { await o.mid(ctx, t); midDone = true; }
      const yo = tilt * RG * s.d, sp = await skyStrip(s); if (sp.y + yo > H + 40 || sp.y + sp.h + yo < -40) continue;
      const b = R(s.seed + f * 3); drawSprite(ctx, sp, { x: (b() - 0.5) * 1.2, y: yo + (b() - 0.5) * 1.2 });
    }
    if (!midDone) await o.mid(ctx, t);
    if (o.banks !== false) for (const bk of BANKS) {
      const sp = await bankSprite(bk), b = R(bk[4] + f * 5), part = o.part ?? 0;
      drawSprite(ctx, sp, { x: bk[3] * bk[5] * part + (b() - 0.5) * 2, y: tilt * RG * 0.22 + (b() - 0.5) * 2 });
    }
  }

  /* ======================================================================= overlay: print grain */
  const GT = []; function grainTile(i) { if (GT[i]) return GT[i]; const S = 256, c = mk(S, S), x = c.getContext('2d'), d = x.createImageData(S, S), r = R(i * 97 + 3); for (let k = 0; k < d.data.length; k += 4) { const v = 128 + (r() - 0.5) * 200; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; } x.putImageData(d, 0, 0); return (GT[i] = c); }
  /** printGrain(ctx, t, amt=0.06) — light paper tooth (static) + print grain re-seeded every 2 frames */
  function printGrain(ctx, t, amt = 0.06) {
    const f = f12(t), r = R(f + 5), M = paperMods(2, 512, 'paper');
    ctx.save();
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = clamp(amt * 2.2); ctx.fillStyle = pat(ctx, M.dark); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = clamp(amt * 1.6); ctx.fillStyle = pat(ctx, grainTile(f % 4), { ox: -Math.floor(r() * 256), oy: -Math.floor(r() * 256) }); ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /** preload(names?) — warm caches (cut-outs + all scene layers) so the first captured frame is not slow */
  async function preload(names) {
    const list = [...new Set([...(names || []), ...BG_CUTS])];   // the scene's own cut-outs + the optional background set
    await Promise.all(list.map(img));
  }

  window.CL = Object.assign(window.CL || {}, {
    C, R, noise, hashStr, mk, pat, keyOf,
    paper, watercolor, halftoneTile, halftone, dotsGrid, newsprint,
    torn, piece, pieceSprite, drawSprite, strip,
    page, diag, posters, cloudsky, desk, sky,
    sprite, img, drop, pop, slap, bob, fly, f12,
    layer, camXf, printGrain, preload, BLEED: BL,
    clearCache() { [TORN, SPR, LAY, PAPERS, WC].forEach((m) => m.clear()); },
  });
})();
