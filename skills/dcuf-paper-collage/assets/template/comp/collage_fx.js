/* collage_fx.js — window.CLX: the San Diego Zoo "Africa Rocks" signature devices, drawn in pure canvas code.
 * Self-sufficient (own torn-edge / paper-texture / halftone / sprite+shadow caches, exposed as CLX._); uses CL.posters if present.
 * Every frame is a pure function of t (ENG.rng with stable seeds; boil on twos = Math.floor(t*12)). ALL device calls are async → await them.
 *
 *  iris(ctx, cx, cy, r, k, t, o)            paper lens iris inside a circle; k 0→1 grows+opens. o: n(6) blades, spin, rot, open, grow, drawCenter(ctx,cx,cy,r,t), tris, bg
 *  kaleido(ctx, t, drawSrc, o)              mirror async drawSrc(ctx2,t) into o.segments(8) wedges + zoom tunnel of torn n-gons. o: rot, zoom(levels/s .55), ratio(.5), levels(6),
 *                                           srcScale, srcX, srcY, srcRot, rims[], twist (per-level turn in segments, .37; 0 = concentric rings), flyers[{name,t0,dur,angle,spin,scale,rot}], hole 0..1, drawNext(ctx,t), holeColor, holeSx, res
 *  rocket(ctx, t, t0, o) → {x,y}            torn strips shoot from bottom to vanishing point. o: vx, vy, by, bx, width(1000), narrow(.62), n(50), dur(.9), seed, rider, riderH, drawRider(ctx,x,y,t), sparks
 *  burst(ctx, t, t0, o)                     strips fly radially out. o: cx, cy, n(26), dur(.65), r, r0, width, seed, rot
 *  title(ctx, lines, cx, cy, t, t0, o)      Ultra slab, red face, white paper borders, cobalt extrusion to a vanishing point; 3-frame drop + squash, slow push.
 *                                           o: size | width(.6W), font, extrude 'vp'|'offset', depth(.15), vpx, vpy(1.1 em above), offset, zoom(.03/s), seed, inline, drop, alpha → {x,y,w,h,size}
 *  tear(ctx, k, drawOver, drawUnder, o)     band o.y0..o.y1 peels left→right (cobalt curl, white fibrous edges, shadow). draw* = async (ctx2)=>{} | canvas. o: seed, flapW
 *  logoBand(ctx, text, t, o)                torn white band + scraps + Chewy red spray-stencil logo. o: style 'band'|'glitter'|'posters'|'lime'|'orange'|'streak'|'pink', x, y, h(300), size, font, rot, lsx/lsy (letter squash), seed, boil, posters{}
 *  flashSeq(t, t0, styles?, frames=2)       → style name for the 2-frame flash sequence at t (null when over)
 *  ransom(ctx, str, cx, cy, t, t0, o)       letters on torn chips slap in every o.step(.125). o: size(140), seed, gap, align, spaceBeat, scale → total width
 *  play(ctx, cx, cy, size, t, o)            red paper ▶ button (size = width). o: press 0..1, t0 (4-frame drop), rot, alpha
 *  cursor(ctx, x, y, t, o)                  paper arrow, tip at (x,y). o: size(90), click 0..1, rot, alpha
 *  subscribe(ctx, cx, cy, t, o)             SUBSCRIBE → (o.tClick) squash/flip → grey SUBSCRIBED ✓ + wiggling bell. o: h(110), tClick, t0 (drop) | slap (slap-in time), bell
 *  tag(ctx, x, y, str, o)                   scrapbook chip + tape. o: color white|yellow|red|ink|cobalt|pink|cyan|#hex, font 'mono'|'sans', size(30), rot, pop | (t,t0), tape 'left'|'right'|'top'|false, anchor, scale
 *  thumb(ctx, [x,y,w,h], t, o)              paper video card. o: draw(ctx,[0,0,w,h],t) | name+bg, progress, dur '12:04'|false, t0 (slap), rot, seed
 *  screen(ctx, quad, t, t0, o)              prompt UI on a rect [x,y,w,h] or quad [[x,y]×4 TL,TR,BR,BL]: types o.text at o.cps(20), cursor clicks "generate ✦" at o.tClick, flash, o.drawResult(ctx,[0,0,w,h],t). o: pill, title, placeholder, fontSize, res, grid
 *  confetti(ctx, t, t0, o)                  paper triangles/chips. o: mode 'burst'|'rain', x, y, n(40), speed, spread, angle, gravity, size, dur(2.2), keep, seed, colors
 *  speed(ctx, t, o)                         torn white slivers. o: n(14), angle, speed, rect, alpha, seed, len[min,max], thick
 *  star(ctx, cx, cy, r, t, o)               paper starburst. o: points(14), inner, color, dots, rot, spin, text, textColor, font, seed, pop
 *  drop(t, t0, o) → {dy,sx,sy,on} · slap(t, t0, n, from) → scale · warm(o) pre-builds caches · PAL palette · _ internals (piece, drawPiece, cut, drawCut, torn, halftone, patR, …)
 */
(function () {
  'use strict';
  const { W, H, clamp, lerp, E, rng } = ENG;
  const TAU = Math.PI * 2;
  const PAL = { red: '#E5231E', cyan: '#5BD3F3', cyanL: '#BDEBFA', yellow: '#FFC21A', mustard: '#E9A21B', orange: '#F07A2E', cobalt: '#1660DA', navy: '#1B2A6B', olive: '#8DB33A', lime: '#C8D84A', paper: '#FBF8F1', news: '#D9D6CF', ink: '#141414', pink: '#F8B9C6', hotpink: '#F27BB0', earth: '#3A2A1E', green: '#2E8B3E' };
  const base = () => (window.CLX && window.CLX.cutoutBase) || '../cutouts/';

  /* =========================================================== utils */
  const hs = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 999983) + 1; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const POOL = new Map();
  function pool(name, w, h) {
    w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
    let c = POOL.get(name); if (!c) { c = mk(w, h); POOL.set(name, c); }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, w, h);
    return c;
  }
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
  const pickW = (r, list) => { let tot = 0; for (const it of list) tot += it[1]; let v = r() * tot; for (const it of list) { v -= it[1]; if (v <= 0) return it[0]; } return list[0][0]; };
  const tq12 = (t) => Math.floor(t * 12 + 1e-6);
  function rgbOf(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  const rgba = (hex, a) => { const [r, g, b] = rgbOf(hex); return `rgba(${r},${g},${b},${a})`; };
  function shade(hex, f) { let [r, g, b] = rgbOf(hex); if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return `rgb(${r | 0},${g | 0},${b | 0})`; }

  /* =========================================================== noise */
  function vnoise(seed) {
    const r = rng(seed * 7 + 3), N = 1024, v = new Float32Array(N); for (let i = 0; i < N; i++) v[i] = r() * 2 - 1;
    return (x) => { x = ((x % N) + N) % N; const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return v[i] + (v[(i + 1) % N] - v[i]) * s; };
  }
  function fbm(seed) { const a = vnoise(seed), b = vnoise(seed + 17), c = vnoise(seed + 29); return (x) => a(x) * 0.58 + b(x * 2.17 + 5.3) * 0.29 + c(x * 4.73 + 1.1) * 0.13; }

  /* =========================================================== geometry */
  const ngon = (r, n, a0 = 0, sx = 1) => { const p = []; for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n; p.push([Math.cos(a) * r * sx, Math.sin(a) * r]); } return p; };
  const circ = (r, m = 48, sx = 1) => ngon(r, m, 0, sx);
  function rrect(w, h, rad, per = 6) {
    const p = [], x0 = -w / 2, y0 = -h / 2; rad = Math.min(rad, w / 2, h / 2);
    for (const [cx, cy, a0] of [[x0 + w - rad, y0 + rad, -Math.PI / 2], [x0 + w - rad, y0 + h - rad, 0], [x0 + rad, y0 + h - rad, Math.PI / 2], [x0 + rad, y0 + rad, Math.PI]])
      for (let i = 0; i <= per; i++) { const a = a0 + (i / per) * Math.PI / 2; p.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
    return p;
  }
  const rectPts = (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a; }
  function toPath(pts) { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; }
  function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return [x0, y0, x1 - x0, y1 - y0]; }

  /* =========================================================== paper textures (cached tiles → patterns) */
  const TILE = new Map();
  function paperTile(col, kind = '') {
    const key = col + '|' + kind; if (TILE.has(key)) return TILE.get(key);
    const S = kind === 'grain' || kind === 'wood' ? 512 : 384, c = mk(S, S), x = c.getContext('2d'), r = rng(hs(key));
    x.fillStyle = col; x.fillRect(0, 0, S, S);
    const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
    const blobs = kind === 'mottle' ? 90 : 60, [cr, cg, cb] = rgbOf(col), lum = (cr * 0.3 + cg * 0.59 + cb * 0.11) / 255, dk = lum > 0.7 ? 0.4 : 0.8;
    for (let i = 0; i < blobs; i++) {
      const bx = r() * S, by = r() * S, br = 14 + r() * 60, light = r() < 0.55, a = (0.02 + r() * (kind === 'mottle' ? 0.06 : 0.04)) * (light ? 1 : dk);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, br); g.addColorStop(0, light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 0.8})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; wrap((ox, oy) => { x.save(); x.translate(bx + ox, by + oy); x.fillRect(-br, -br, br * 2, br * 2); x.restore(); });
    }
    if (kind === 'mottle') for (let i = 0; i < 480; i++) { const bx = r() * S, by = r() * S, br = 0.4 + r() * r() * 2.2; x.fillStyle = r() < 0.7 ? `rgba(255,255,255,${0.06 + r() * 0.16})` : `rgba(0,0,0,${0.04 + r() * 0.08})`; wrap((ox, oy) => { x.beginPath(); x.arc(bx + ox, by + oy, br, 0, TAU); x.fill(); }); }
    if (kind === 'streak') for (let i = 0; i < 34; i++) { const sx = r() * S, sy = r() * S, len = 60 + r() * 160, a = -0.5 + (r() - 0.5) * 0.4, w = 5 + r() * 16, light = r() < 0.7; x.strokeStyle = light ? `rgba(255,255,255,${0.05 + r() * 0.09})` : `rgba(0,0,0,${0.03 + r() * 0.05})`; x.lineWidth = w; x.lineCap = 'round'; wrap((ox, oy) => { x.beginPath(); x.moveTo(sx + ox, sy + oy); x.quadraticCurveTo(sx + ox + Math.cos(a + 0.3) * len * 0.5, sy + oy + Math.sin(a + 0.3) * len * 0.5, sx + ox + Math.cos(a) * len, sy + oy + Math.sin(a) * len); x.stroke(); }); }
    if (kind === 'grain' || kind === 'wood') {
      const dark = kind === 'wood' ? 'rgba(150,80,20,' : 'rgba(120,115,105,';
      for (let i = 0; i < (kind === 'wood' ? 40 : 70); i++) {
        const y0 = r() * S, A = 2 + r() * 10, k = 1 + Math.floor(r() * 3), ph = r() * TAU, a = (kind === 'wood' ? 0.12 : 0.03) + r() * (kind === 'wood' ? 0.16 : 0.09), lw = 0.6 + r() * 2.2;
        x.strokeStyle = dark + a + ')'; x.lineWidth = lw;
        for (const oy of [-S, 0, S]) { x.beginPath(); for (let px = 0; px <= S; px += 8) { const py = y0 + oy + A * Math.sin(px / S * TAU * k + ph) + 3 * Math.sin(px / S * TAU * (k + 2) + ph * 2); px ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
      }
    }
    x.lineCap = 'round';
    for (let i = 0; i < Math.round(150 * S * S / 65536); i++) {
      const fx = r() * S, fy = r() * S, len = 4 + r() * 16, a = r() * TAU, light = r() < 0.62;
      x.strokeStyle = light ? `rgba(255,255,255,${0.1 + r() * 0.2})` : `rgba(0,0,0,${0.04 + r() * 0.07})`; x.lineWidth = 0.5 + r() * 0.8;
      wrap((ox, oy) => { x.beginPath(); x.moveTo(fx + ox, fy + oy); x.quadraticCurveTo(fx + ox + Math.cos(a + 0.7) * len * 0.5, fy + oy + Math.sin(a + 0.7) * len * 0.5, fx + ox + Math.cos(a) * len, fy + oy + Math.sin(a) * len); x.stroke(); });
    }
    const id = x.getImageData(0, 0, S, S), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 20; d[i] += n; d[i + 1] += n; d[i + 2] += n; } x.putImageData(id, 0, 0);
    TILE.set(key, c); return c;
  }
  const PATS = new WeakMap();
  // fresh pattern with a random offset/rotation (breaks visible tile repetition between pieces)
  function patR(ctx, col, kind, seed) { const p = ctx.createPattern(paperTile(col, kind || ''), 'repeat'), r = rng(seed * 3 + 11); try { p.setTransform(new DOMMatrix().translateSelf(r() * 400, r() * 400).rotateSelf(r() * 360)); } catch (e) { /* old browsers */ } return p; }
  function pat(ctx, col, kind = '') { let m = PATS.get(ctx); if (!m) { m = new Map(); PATS.set(ctx, m); } const k = col + '|' + kind; let p = m.get(k); if (!p) { p = ctx.createPattern(paperTile(col, kind), 'repeat'); m.set(k, p); } return p; }

  /* =========================================================== torn outlines */
  // pts → jagged outer path (white paper) + inner path (coloured print layer) with an irregular white band between.
  // o: step, amp (fine jitter px), wave (low-freq wobble px), wMin/wMax (white band px), scale (wobble wavelength px), cutEdges [i] (clean scissor edges)
  function torn(pts, seed, o = {}) {
    const step = o.step || 4, amp = o.amp ?? 2.2, wave = o.wave ?? 3.5, wMin = o.wMin ?? 1, wMax = o.wMax ?? 10, fq = 1 / (o.scale || 46);
    const sg = area(pts) > 0 ? 1 : -1, nA = fbm(seed), nB = fbm(seed + 101), nW = vnoise(seed + 202), r = rng(seed + 303);
    const outer = [], inner = []; let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if (L < 1e-6) continue;
      const nx = sg * dy / L, ny = -sg * dx / L, m = Math.max(1, Math.ceil(L / step)), cut = o.cutEdges && o.cutEdges.includes(i);
      for (let j = 0; j < m; j++) {
        const u = j / m, px = a[0] + dx * u, py = a[1] + dy * u, ss = s + L * u;
        if (cut) { const jo = (r() - 0.5) * 0.8; outer.push([px + nx * jo, py + ny * jo]); inner.push([px - nx * 0.8, py - ny * 0.8]); continue; }
        const jo = nA(ss * fq) * wave + (r() - 0.5) * amp;
        const w = wMin + (wMax - wMin) * Math.pow(clamp(0.5 + 0.85 * nW(ss * fq * 0.55)), 1.7);
        const io = Math.min(jo - 0.6, jo - w + nB(ss * fq * 1.9) * wave * 0.5 + (r() - 0.5) * amp * 1.2);
        outer.push([px + nx * jo, py + ny * jo]); inner.push([px + nx * io, py + ny * io]);
      }
      s += L;
    }
    return { outer, inner, P: toPath(outer), Q: toPath(inner) };
  }
  function fibres(x, pts, seed, col) {
    const r = rng(seed + 999); x.save(); x.strokeStyle = col ? rgba(col, 0.9) : 'rgba(251,248,241,0.9)'; x.lineCap = 'round';
    for (let i = 0; i < pts.length; i++) { if (r() > 0.42) continue; const [px, py] = pts[i], a = r() * TAU, l = 1 + r() * 3.5; x.lineWidth = 0.5 + r() * 0.7; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    x.restore();
  }
  function halftone(x, b, o = {}) {
    const st = o.step || 12, ang = o.angle ?? 0.6, cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2, R = Math.hypot(b[2], b[3]) / 2 + st;
    const ca = Math.cos(ang), sa = Math.sin(ang), d = o.dir || [1, 0.3], dn = Math.hypot(d[0], d[1]) || 1, d0 = d[0] / dn, d1 = d[1] / dn;
    const ext = (Math.abs(b[2] * d0) + Math.abs(b[3] * d1)) / 2 || 1, r0 = o.r0 ?? 0.08, r1 = o.r1 ?? 0.42, rr = rng(o.seed || 5), jit = o.jit ?? 0.15;
    x.save(); x.fillStyle = o.col || 'rgba(255,255,255,0.5)'; x.beginPath();
    for (let v = -R; v <= R; v += st) for (let u = -R; u <= R; u += st) {
      const px = cx + u * ca - v * sa, py = cy + u * sa + v * ca;
      if (px < b[0] - st || px > b[0] + b[2] + st || py < b[1] - st || py > b[1] + b[3] + st) continue;
      const g = clamp(((px - cx) * d0 + (py - cy) * d1) / ext * 0.5 + 0.5);
      const rad = st * lerp(r0, r1, Math.pow(g, o.pow || 1)) * (1 + jit * (rr() - 0.5));
      if (rad < 0.35) continue; x.moveTo(px + rad, py); x.arc(px, py, rad, 0, TAU);
    }
    x.fill(); x.restore();
  }
  function crease(x, b, o) { // darker half-plane beyond the line a→b (o.side ±1) + a light fold line
    const [ax, ay] = o.a, [bx, by] = o.b, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, s = o.side || 1, nx = -dy / L * s, ny = dx / L * s, F = 4000;
    x.save(); x.fillStyle = `rgba(0,0,0,${o.dark ?? 0.12})`; x.beginPath(); x.moveTo(ax - dx / L * F, ay - dy / L * F); x.lineTo(bx + dx / L * F, by + dy / L * F); x.lineTo(bx + dx / L * F + nx * F, by + dy / L * F + ny * F); x.lineTo(ax - dx / L * F + nx * F, ay - dy / L * F + ny * F); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke(); x.restore();
  }

  /* =========================================================== sprites (cached canvases + blurred shadow silhouettes) */
  const SPR = new Map();
  function shadowOf(c, res, blur, ox, oy) {
    const q = 0.3, w = c.width / res, h = c.height / res, sp = Math.ceil(blur * q * 2.5) + 2, s = mk(w * q + sp * 2, h * q + sp * 2), x = s.getContext('2d');
    x.filter = `blur(${Math.max(0.5, blur * q)}px)`; x.drawImage(c, sp, sp, w * q, h * q); x.filter = 'none';
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, s.width, s.height);
    return { s, sw: s.width / q, shh: s.height / q, sox: ox + sp / q, soy: oy + sp / q };
  }
  // generic sprite: b = local bounds [x0,y0,w,h]; fn(x) draws in local coords
  function sprite(key, b, fn, o = {}) {
    const hit = SPR.get(key); if (hit) return hit;
    const res = o.res || 1, pad = o.pad ?? 8, c = mk((b[2] + pad * 2) * res, (b[3] + pad * 2) * res), x = c.getContext('2d');
    x.scale(res, res); x.translate(pad - b[0], pad - b[1]); fn(x);
    const P = { c, w: c.width / res, h: c.height / res, ox: pad - b[0], oy: pad - b[1], b };
    if (o.shadow !== false) Object.assign(P, shadowOf(c, res, o.blur ?? 6, P.ox, P.oy));
    SPR.set(key, P); if (SPR.size > 1600) { let n = 0; for (const k of SPR.keys()) { SPR.delete(k); if (++n >= 200) break; } } // FIFO cap (kits keep their own refs)
    return P;
  }
  // torn paper piece: o.fill colour | o.paint(x, innerBox, T) · o.tex texture kind · o.dots halftone · o.crease fold · o.edge false = no white band
  function piece(key, pts, o = {}) {
    const hit = SPR.get(key); if (hit) return hit;
    const seed = o.seed || hs(key), T = torn(pts, seed, o), b = bbox(T.outer);
    return sprite(key, b, (x) => {
      const edge = o.edge !== false;
      if (edge) { x.fillStyle = patR(x, o.edgeCol || PAL.paper, '', seed); x.fill(T.P); if (o.fibres !== false) fibres(x, T.outer, seed, o.edgeCol); }
      x.save(); x.clip(edge ? T.Q : T.P); const ib = bbox(edge ? T.inner : T.outer);
      if (o.paint) o.paint(x, ib, T); else { x.fillStyle = patR(x, o.fill || PAL.paper, o.tex || '', seed + 1); x.fillRect(b[0] - 2, b[1] - 2, b[2] + 4, b[3] + 4); }
      if (o.dots) halftone(x, ib, o.dots);
      if (o.crease) crease(x, ib, o.crease);
      x.restore();
      if (edge && o.line !== false) { x.strokeStyle = 'rgba(70,50,35,0.17)'; x.lineWidth = 0.9; x.stroke(T.Q); }
    }, { res: o.res, blur: o.blur, shadow: o.shadow, pad: 6 });
  }
  // draw a sprite with its origin at (x,y). o: rot, scale, sx, sy, alpha, shadow(false), sh [dx,dy] screen offset, shA, shM (offset multiplier)
  // o.ax/o.ay: local anchor point placed at (x,y) (default the sprite origin) · o.only 'shadow' draws just the shadow
  function drawPiece(ctx, P, x, y, o = {}) {
    const sc = o.scale ?? 1, sx = sc * (o.sx ?? 1), sy = sc * (o.sy ?? 1), rot = o.rot || 0, a = o.alpha ?? 1, ax = o.ax || 0, ay = o.ay || 0;
    if (a <= 0 || Math.abs(sx) < 1e-4 || Math.abs(sy) < 1e-4) return;
    if (o.shadow !== false && P.s) {
      const d = o.sh || [5, 8], m = o.shM ?? clamp(Math.abs(sc), 0.5, 2.2);
      ctx.save(); ctx.globalAlpha = a * (o.shA ?? 0.42); ctx.translate(x + d[0] * m, y + d[1] * m); ctx.rotate(rot); ctx.scale(sx, sy); ctx.drawImage(P.s, -P.sox - ax, -P.soy - ay, P.sw, P.shh); ctx.restore();
    }
    if (o.only === 'shadow') return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy); ctx.drawImage(P.c, -P.ox - ax, -P.oy - ay, P.w, P.h); ctx.restore();
  }
  // soft shadow for a full-frame layer (quarter-res blur)
  function layerShadow(ctx, layer, o = {}) {
    const q = 0.25, sc = pool('clx_lsh', W * q, H * q), x = sc.getContext('2d');
    x.filter = `blur(${o.blur ?? 2.5}px)`; x.drawImage(layer, 0, 0, W * q, H * q); x.filter = 'none';
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, sc.width, sc.height);
    const d = o.d || [5, 9]; ctx.save(); ctx.globalAlpha = o.a ?? 0.35; ctx.drawImage(sc, d[0], d[1], W, H); ctx.restore();
  }
  async function layerOf(src, name) { if (!src) return null; if (typeof src !== 'function') return src; const c = pool(name, W, H); await src(c.getContext('2d')); return c; }

  /* =========================================================== cut-outs */
  const CUT = new Map();
  function silhouette(img) {
    const q = 0.2, b = 10, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, c = mk(iw * q + b * 2, ih * q + b * 2), x = c.getContext('2d');
    x.filter = 'blur(3px)'; x.drawImage(img, b, b, iw * q, ih * q); x.filter = 'none'; x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    return { c, q, b };
  }
  // mip chain by exact 2×2 averaging, so downscaled cut-outs (halftone photos) never alias into moiré and look the same on GPU/CPU canvases
  function mips(img) { const L = [img]; let w = img.naturalWidth, h = img.naturalHeight, src = img; while (w > 96 && h > 96 && L.length < 6) { w = Math.ceil(w / 2); h = Math.ceil(h / 2); const c = mk(w, h), x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'low'; x.drawImage(src, 0, 0, w, h); L.push(c); src = c; } return L; }
  function cut(name) { if (!CUT.has(name)) CUT.set(name, ENG.Frames.img(base() + name + '.png').catch(() => (window.CUT_STUB ? window.CUT_STUB(name) : Promise.reject(new Error('missing cut-out ' + name)))).then((img) => ({ img, mips: mips(img), sh: silhouette(img), w: img.naturalWidth, h: img.naturalHeight }))); return CUT.get(name); }
  // draw cut-out C (from cut()) at (x,y) with height h px. o: rot, sx, sy, alpha, ax/ay anchor (0.5), shadow, sh, shA
  function drawCut(ctx, C, x, y, h, o = {}) {
    const iw = C.w, ih = C.h, s = h / ih, a = o.alpha ?? 1, ax = o.ax ?? 0.5, ay = o.ay ?? 0.5, sx = s * (o.sx ?? 1), sy = s * (o.sy ?? 1);
    if (a <= 0) return;
    if (o.shadow !== false) { const d = o.sh || [9, 14], m = clamp(h / 520, 0.35, 3), S = C.sh; ctx.save(); ctx.globalAlpha = a * (o.shA ?? 0.42); ctx.translate(x + d[0] * m, y + d[1] * m); ctx.rotate(o.rot || 0); ctx.scale(sx / S.q, sy / S.q); ctx.drawImage(S.c, -S.b - iw * S.q * ax, -S.b - ih * S.q * ay); ctx.restore(); }
    const m0 = ctx.getTransform(), dev = Math.max(Math.abs(sx), Math.abs(sy)) * Math.hypot(m0.a, m0.b);
    let li = 0; while (li < C.mips.length - 1 && dev < 0.5 / (1 << li) * 1.0001) li++;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(sx, sy); ctx.drawImage(C.mips[li], -iw * ax, -ih * ay, iw, ih); ctx.restore();
  }

  /* =========================================================== motion helpers */
  // 4-frame fall from above + squash + damped settle (the ref's boombox drop). → {dy, sx, sy, on}; squash around the bottom edge
  function drop(t, t0, o = {}) {
    const fall = o.fall ?? 4 / 24, hgt = o.h ?? 900, lt = t - t0;
    if (lt < 0) return { dy: -hgt * 2, sx: 1, sy: 1, on: false };
    if (lt < fall) { const f = (Math.floor(lt * 24 + 1e-6) + 1) / (fall * 24); return { dy: -hgt * (1 - f * f) * (f >= 1 ? 0 : 1), sx: 0.95, sy: 1.07, on: true }; }
    const u = lt - fall, s = Math.exp(-u * (o.damp ?? 8)) * Math.cos(u * (o.freq ?? 26));
    return { dy: 0, sx: 1 + (o.squash ?? 0.1) * s, sy: 1 - (o.squash ?? 0.1) * 1.3 * s, on: true };
  }
  // slap-in: scale 1.4 → 1 over n frames
  const slap = (t, t0, n = 3, from = 1.4) => { const lt = t - t0; if (lt < 0) return 0; const k = clamp((Math.floor(lt * 24 + 1e-6) + 1) / n); return lerp(from, 1, E.out3(k)); };
  // which style of the 2-frame logo flashes is on at t (null = none)
  function flashSeq(t, t0, styles = ['glitter', 'posters', 'lime', 'orange', 'streak', 'pink'], frames = 2) { const i = Math.floor((t - t0) * 24 / frames + 1e-6); return t >= t0 && i < styles.length ? styles[i] : null; }

  /* =========================================================== IRIS */
  const IRK = new Map();
  function irisKit(n) {
    if (IRK.has(n)) return IRK.get(n);
    const R0 = 200, k = 'iris' + n + '_';
    const kit = {
      R0,
      hex: piece(k + 'hex', ngon(R0 * 0.5, n, 0), { fill: PAL.yellow, tex: 'mottle', res: 2, wMax: 7, scale: 26, dots: { col: 'rgba(200,110,0,0.22)', step: 6, r0: 0.08, r1: 0.4, dir: [0.4, 1] } }),
      ring: piece(k + 'ring', circ(R0 * 0.2, 36), { fill: '#A4DDF4', res: 2, wMax: 6, scale: 14, wave: 2 }),
      core: piece(k + 'core', circ(R0 * 0.13, 30), { fill: PAL.yellow, res: 2, wMax: 4, scale: 10, wave: 1.5, edge: false }),
      blades: [0, 1, 2].map((v) => piece(k + 'blade' + v, [[-R0 * 0.26, 0], [R0 * 1.6, 0], [R0 * 1.4, -R0 * 1.3], [-R0 * 0.04, -R0 * 1.12]], { fill: [PAL.cyan, '#46C0EC', '#6CD9F6'][v], tex: 'streak', res: 2, wMin: 2, wMax: 11, wave: 4, crease: { a: [R0 * 0.3, 0], b: [R0 * 1.34, -R0 * 1.22], dark: 0.1, side: -1 } })),
      tris: [0, 1].map((v) => piece(k + 'tri' + v, [[-R0 * 0.5, R0 * 0.04], [R0 * 0.3, -R0 * 0.02], [R0 * (0.52 + v * 0.06), -R0 * (0.74 + v * 0.05)]], { fill: PAL.red, tex: 'mottle', res: 2, wMin: 2, wMax: 11, wave: 4, crease: { a: [-R0 * 0.1, R0 * 0.02], b: [R0 * (0.52 + v * 0.06), -R0 * (0.74 + v * 0.05)], dark: 0.17, side: 1 } })),
      bolt: boltPiece(R0 * 0.16),
      tc: torn(circ(100, 72), 77, { wave: 2.2, amp: 1, scale: 12 }).P,
    };
    IRK.set(n, kit); return kit;
  }
  function boltPiece(r) { // red/white lightning star (ref iris centre)
    return sprite('bolt' + r, [-r * 1.2, -r * 1.2, r * 2.4, r * 2.4], (x) => {
      for (let i = 0; i < 4; i++) {
        x.save(); x.rotate(i * Math.PI / 2 + Math.PI / 4);
        const p = [[0, 0], [r * 0.18, -r * 0.08], [r * 0.5, -r * 0.02], [r * 0.62, -r * 0.18], [r * 1.12, 0], [r * 0.6, r * 0.16], [r * 0.48, r * 0.04], [r * 0.16, r * 0.1]];
        x.beginPath(); p.forEach((q, j) => (j ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.closePath();
        x.fillStyle = PAL.paper; x.fill(); x.lineWidth = r * 0.07; x.strokeStyle = '#B5121B'; x.lineJoin = 'round'; x.stroke(); x.restore();
      }
    }, { blur: 3 });
  }
  async function iris(ctx, cx, cy, r, k, t, o = {}) {
    const n = o.n || 6, K = irisKit(n), tq = o.twos === false ? t : tq12(t) / 12, kk = clamp(k);
    const grow = o.grow ?? lerp(0.16, 1, E.out3(clamp(kk * 1.5)));
    const open = o.open ?? lerp(0.08, 0.44, E.inOut3(kk));
    const rot = (o.rot ?? 0) + tq * (o.spin ?? 1.1) + kk * 1.3;
    const R = r * grow, sc = R / K.R0, ap = R * open, m0 = ctx.getTransform(), A = TAU / n;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(r / 100, r / 100); ctx.clip(K.tc); ctx.setTransform(m0);
    if (o.bg !== false) { const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.05, cx, cy, r); g.addColorStop(0, '#323A58'); g.addColorStop(0.55, '#121524'); g.addColorStop(1, '#040507'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); }
    // yellow centre + tiny world in the middle
    drawPiece(ctx, K.hex, cx, cy, { rot: rot + A / 2, scale: (ap * 1.25) / (K.R0 * 0.5), sh: [3, 5] });
    const cr = ap * 0.55;
    drawPiece(ctx, K.ring, cx, cy, { rot: -rot, scale: cr / (K.R0 * 0.2), sh: [2, 4] });
    if (o.drawCenter) { ctx.save(); ctx.translate(cx, cy); ctx.scale(cr * 0.82 / 100, cr * 0.82 / 100); ctx.clip(K.tc); ctx.setTransform(m0); await o.drawCenter(ctx, cx, cy, cr * 0.82, t); ctx.restore(); }
    else { drawPiece(ctx, K.core, cx, cy, { scale: cr * 0.7 / (K.R0 * 0.13), shadow: false }); drawPiece(ctx, K.bolt, cx, cy, { rot: rot * 2, scale: (cr * 0.95) / (K.R0 * 0.16), sh: [1, 2] }); }
    // cyan aperture blades (first blade redrawn on top in its own sector so the spiral is cyclic)
    const blade = (i) => { const a = rot + i * A; drawPiece(ctx, K.blades[i % 3], cx + Math.cos(a) * ap, cy + Math.sin(a) * ap, { rot: a + Math.PI / 2 + Math.PI / n, scale: sc, sh: [4, 7], shA: 0.5 }); };
    for (let i = 0; i < n; i++) blade(i);
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); const R2 = R * 3; for (let j = 0; j <= 6; j++) { const a = rot - A * 0.55 + (A * 1.0) * j / 6; ctx.lineTo(cx + Math.cos(a) * R2, cy + Math.sin(a) * R2); } ctx.closePath(); ctx.clip(); blade(0); ctx.restore();
    ctx.restore();
    // red folded triangles poke out over the rim
    if (o.tris !== false) for (let i = 0; i < n; i++) { const b = -rot * 0.35 + i * A + A / 2, rr = R * 0.76; drawPiece(ctx, K.tris[i % 2], cx + Math.cos(b) * rr, cy + Math.sin(b) * rr, { rot: b + Math.PI / 2 + 0.25, scale: sc * 1.45, sh: [8, 12], shA: 0.5 }); }
  }

  /* =========================================================== KALEIDOSCOPE */
  const KK = new Map();
  function annulus(key, seg, R, inner, fill, o = {}) { // torn ring: white edges both sides, colour band between, hole inside
    const a0 = Math.PI / seg, T1 = torn(ngon(R, seg, a0), hs(key + 'o'), { wave: 6, amp: 2.4, wMin: 2, wMax: 12, scale: 50 }), T2 = torn(ngon(R * inner, seg, a0), hs(key + 'i'), { wave: 5, amp: 2.2, wMin: 2, wMax: 12, scale: 44 });
    return sprite(key, [-R - 20, -R - 20, R * 2 + 40, R * 2 + 40], (x) => {
      x.fillStyle = pat(x, PAL.paper); x.fill(T1.P); fibres(x, T1.outer, 3);
      if (fill) { x.save(); x.clip(T1.Q); x.fillStyle = pat(x, fill, o.tex || ''); x.fillRect(-R - 20, -R - 20, R * 2 + 40, R * 2 + 40); if (o.dots) halftone(x, [-R, -R, R * 2, R * 2], o.dots); x.restore(); x.strokeStyle = 'rgba(70,50,35,0.17)'; x.stroke(T1.Q); }
      x.fillStyle = pat(x, PAL.paper); x.fill(T2.P); fibres(x, T2.outer, 4);
      x.globalCompositeOperation = 'destination-out'; x.fill(T2.Q); x.globalCompositeOperation = 'source-over';
    }, { shadow: false, pad: 4 });
  }
  function kalKit(seg) {
    if (KK.has(seg)) return KK.get(seg);
    const R = 500, a0 = Math.PI / seg, T1 = torn(ngon(R, seg, a0), hs('kal' + seg + 'o'), { wave: 6, amp: 2.4, wMin: 2, wMax: 12, scale: 50 });
    const disc = sprite('kaldisc' + seg, [-R - 20, -R - 20, R * 2 + 40, R * 2 + 40], (x) => { x.fillStyle = '#000'; x.fill(T1.P); }, { shadow: true, blur: 16 });
    const rims = {
      white: annulus('kalr_w' + seg, seg, R, 0.972, null),
      red: annulus('kalr_r' + seg, seg, R, 0.9, PAL.red, { tex: 'mottle' }),
      dots: annulus('kalr_d' + seg, seg, R, 0.93, PAL.paper, { dots: { col: rgba(PAL.cyan, 0.85), step: 14, r0: 0.18, r1: 0.42, dir: [1, 1] } }),
      cyan: annulus('kalr_c' + seg, seg, R, 0.94, PAL.cyan, { tex: 'streak' }),
      yellow: annulus('kalr_y' + seg, seg, R, 0.93, PAL.yellow, { tex: 'mottle' }),
    };
    const kit = { R, clip: T1.P, disc, rims }; KK.set(seg, kit); return kit;
  }
  const HOLEK = new Map();
  function holeKit(col) {
    if (HOLEK.has(col)) return HOLEK.get(col);
    const R = 500, n = 6, T2 = torn(ngon(R * 0.9, n, 0), hs('hole_i'), { wave: 6, amp: 2.4, wMin: 2, wMax: 10, scale: 60 });
    const rim = annulus('hole_rim' + col, n, R, 0.87, col, { tex: 'mottle', dots: { col: 'rgba(190,90,0,0.25)', step: 9, r0: 0.1, r1: 0.4, dir: [0, 1] } });
    // inner shadow (quarter res): dark outside the hole, soft falloff inside
    const q = 0.25, S = Math.ceil(R * 2.6 * q), c = mk(S, S), x = c.getContext('2d'), tmp = mk(S, S), tx = tmp.getContext('2d');
    tx.translate(S / 2, S / 2); tx.scale(q, q); tx.fillStyle = '#000'; tx.fillRect(-S * 4, -S * 4, S * 8, S * 8); tx.globalCompositeOperation = 'destination-out'; tx.fill(T2.Q);
    x.filter = 'blur(7px)'; x.drawImage(tmp, 3, 5); x.filter = 'none';
    const kit = { R, n, clip: T2.P, rim, inner: c, S, q }; HOLEK.set(col, kit); return kit;
  }
  // o: segments 6|8, rot (rad), zoom (levels/s), ratio, levels, srcScale, srcX, srcY, srcRot, rims [...], flyers [{name,t0,dur,angle,spin,scale}], hole 0..1, drawNext, holeColor, res
  async function kaleido(ctx, t, drawSrc, o = {}) {
    const seg = o.segments || 8, A = TAU / seg, tq = o.twos === false ? t : tq12(t) / 12, rot = o.rot ?? tq * 0.45, Rm = Math.hypot(W, H) / 2 + 6, K = kalKit(seg);
    const src = pool('clx_k_src', W, H); await drawSrc(src.getContext('2d'), t);
    const res = o.res ?? 0.8, S = Math.ceil(Rm * 2 * res), sc = S / (Rm * 2), M = pool('clx_k_m', S, S), mx = M.getContext('2d');
    const ss = (o.srcScale ?? 1.15) * sc, scx = o.srcX ?? W / 2, scy = o.srcY ?? H / 2;
    for (let i = 0; i < seg; i++) {
      mx.save(); mx.translate(S / 2, S / 2); mx.rotate(i * A); if (i % 2) mx.scale(1, -1);
      const e = 0.006; mx.beginPath(); mx.moveTo(0, 0); mx.lineTo(S * Math.cos(-A / 2 - e), S * Math.sin(-A / 2 - e)); mx.lineTo(S * Math.cos(A / 2 + e), S * Math.sin(A / 2 + e)); mx.closePath(); mx.clip();
      mx.rotate(o.srcRot || 0); mx.scale(ss, ss); mx.drawImage(src, -scx, -scy); mx.restore();
    }
    // zoom tunnel: nested copies, each a torn paper n-gon sitting on the previous one
    const f = o.ratio ?? 0.5, L = o.levels ?? 6, c = tq * (o.zoom ?? 0.55), fl = Math.floor(c), fr = c - fl, rims = o.rims || ['white', 'red', 'white', 'dots', 'cyan', 'white', 'yellow'], m0 = ctx.getTransform(), cx = W / 2, cy = H / 2;
    for (let j = 0; j <= L; j++) {
      const m = fl + j, s = Math.pow(f, j - fr), lr = rot * (m % 2 ? -0.7 : 1) + (m * A * (o.twist ?? 0.37)), dsc = s / sc;
      if (j === 0) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(lr); ctx.scale(dsc, dsc); ctx.drawImage(M, -S / 2, -S / 2); ctx.restore(); continue; }
      const rad = Rm * s * (o.ring ?? 0.8); if (rad < 5) break;
      const ks = rad / K.R, sh = clamp(rad * 0.025, 1.5, 16);
      drawPiece(ctx, K.disc, cx, cy, { rot: lr, scale: ks, sh: [sh * 0.5, sh], shA: 0.5, shM: 1, only: 'shadow' });
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(lr); ctx.scale(ks, ks); ctx.clip(K.clip); ctx.setTransform(m0);
      ctx.translate(cx, cy); ctx.rotate(lr); ctx.scale(dsc, dsc); ctx.drawImage(M, -S / 2, -S / 2); ctx.restore();
      const rk = rims[((m % rims.length) + rims.length) % rims.length]; drawPiece(ctx, K.rims[rk] || K.rims.white, cx, cy, { rot: lr, scale: ks, shadow: false });
    }
    // hexagonal torn hole opening onto the next scene
    if ((o.hole || 0) > 0 && o.drawNext) {
      const nx = pool('clx_k_next', W, H); await o.drawNext(nx.getContext('2d'), t);
      const HK = holeKit(o.holeColor || '#F3A51C'), hs_ = (o.hole * Rm * 1.3) / (HK.R * 0.87), hsx = o.holeSx ?? 1.18, hr = rot * 0.3;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(hr); ctx.scale(hs_ * hsx, hs_); ctx.clip(HK.clip); ctx.setTransform(m0);
      ctx.drawImage(nx, 0, 0);
      ctx.translate(cx, cy); ctx.rotate(hr); ctx.scale(hs_ * hsx / HK.q, hs_ / HK.q); ctx.globalAlpha = 0.55; ctx.drawImage(HK.inner, -HK.S / 2, -HK.S / 2); ctx.restore();
      drawPiece(ctx, HK.rim, cx, cy, { rot: hr, scale: hs_, sx: hsx, shadow: false });
    }
    // cut-outs burst from the centre and fly past the camera
    const fly = [];
    for (const fl_ of (o.flyers || [])) { const p = (t - fl_.t0) / (fl_.dur || 0.7); if (p > 0 && p < 1) fly.push([p, fl_]); }
    fly.sort((a, b) => a[0] - b[0]);
    for (const [p, fl_] of fly) {
      const C = await cut(fl_.name), ang = fl_.angle ?? (hs(fl_.name) % 628) / 100, e = Math.pow(p, 2.1), d = e * Rm * 1.15;
      const h = H * 0.5 * (fl_.scale ?? 1) * 0.05 * Math.pow(60, p), x = cx + Math.cos(ang) * d, y = cy + Math.sin(ang) * d * 0.8;
      drawCut(ctx, C, x, y, h, { rot: (fl_.rot || 0) + (fl_.spin ?? 0.9) * p, shA: 0.45 });
    }
  }

  /* =========================================================== ROCKET / BURST strips */
  const STRIP_COLS = [[PAL.paper, 22], [PAL.yellow, 18], [PAL.red, 16], [PAL.cobalt, 14], [PAL.hotpink, 11], [PAL.cyan, 7], [PAL.navy, 4], ['#FFE48A', 6], [PAL.orange, 4], [PAL.green, 6], [PAL.ink, 3]];
  const MODELS = new Map();
  function stripModel(kind, seed, n) {
    const key = kind + seed + '_' + n; if (MODELS.has(key)) return MODELS.get(key);
    const r = rng(seed * 13 + 5), arr = [];
    for (let i = 0; i < n; i++) {
      const col = pickW(r, STRIP_COLS), u0 = r() * 2 - 1;
      arr.push({
        col, u: Math.sign(u0) * Math.pow(Math.abs(u0), 1.15), bw: (col === PAL.paper ? 50 : 26) + r() * r() * 160, lf: (col === PAL.paper || col === PAL.yellow || col === '#FFE48A') ? (r() < 0.6 ? 0.92 + r() * 0.08 : 0.55 + r() * 0.4) : 0.3 + r() * 0.55, del: r() < 0.55 ? r() * 0.06 : 0.1 + r() * 0.4, bend: (r() - 0.5) * 0.08, tx: r() - 0.5,
        ea: fbm(seed * 31 + i * 7), eb: fbm(seed * 31 + i * 7 + 3), streak: col === PAL.paper && r() < 0.8 ? pickW(r, [[PAL.ink, 4], [PAL.navy, 3], [PAL.red, 3], [PAL.yellow, 3], [PAL.cobalt, 3], [PAL.hotpink, 2]]) : null,
        so: r() * 0.55, sl: 0.2 + r() * 0.45, sw: 0.12 + r() * 0.35,
        a: r() * TAU, dist: 0.45 + r() * 0.75, len: 0.12 + r() * 0.3, js: Math.floor(r() * 1e6), s0r: r(), s1r: r(),
      });
    }
    for (const s of arr) { const lead = s.col === PAL.paper || s.col === PAL.yellow || s.col === '#FFE48A'; if (lead && s.s0r < 0.65) { s.s0 = 0; s.s1 = s.lf; } else { s.s0 = s.s0r * 0.55; s.s1 = Math.min(1, s.s0 + 0.18 + s.s1r * 0.4); s.del = Math.min(s.del, 0.3); } }
    arr.sort((p, q) => (q.col === PAL.paper) - (p.col === PAL.paper) || (p.s0 > 0) - (q.s0 > 0) || q.bw - p.bw);
    MODELS.set(key, arr); return arr;
  }
  function stripPts(B, T, w0, w1, ea, eb, bend, jr, extra, spin) {
    const dx = T[0] - B[0], dy = T[1] - B[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, m = Math.max(3, Math.ceil(L / 9)), left = [], right = [];
    for (let j = 0; j <= m; j++) {
      const s = j / m, d = s * L, bo = Math.sin(s * Math.PI) * bend * L, px = B[0] + dx * s + nx * bo, py = B[1] + dy * s + ny * bo, w = lerp(w0, w1, Math.pow(s, 0.85)) / 2 * (spin ? Math.min(1, 0.15 + s / 0.3) : 1) + extra;
      const el = Math.max(0.3, w + ea(d * 0.045) * (1.8 + w * 0.22) + (jr() - 0.5) * 1.6), er = Math.max(0.3, w + eb(d * 0.045) * (1.8 + w * 0.22) + (jr() - 0.5) * 1.6);
      left.push([px + nx * el, py + ny * el]); right.push([px - nx * er, py - ny * er]);
    }
    return left.concat(right.reverse());
  }
  function fillPts(x, pts, style) { x.fillStyle = style; x.beginPath(); pts.forEach((q, i) => (i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.closePath(); x.fill(); }
  function drawStrip(x, s, B, T, w0, jseed, spin) {
    const jr = rng(jseed), jr2 = rng(jseed + 1);
    fillPts(x, stripPts(B, T, w0 + 3, 1.5, s.ea, s.eb, s.bend, jr, 1.6, spin), pat(x, PAL.paper));
    if (s.col !== PAL.paper) fillPts(x, stripPts(B, T, w0, 0.6, s.eb, s.ea, s.bend, jr2, 0, spin), pat(x, s.col, 'mottle'));
    if (s.streak) { const a = s.so, b = Math.min(1, s.so + s.sl), P0 = [lerp(B[0], T[0], a), lerp(B[1], T[1], a)], P1 = [lerp(B[0], T[0], b), lerp(B[1], T[1], b)]; fillPts(x, stripPts(P0, P1, w0 * s.sw * (1 - a), 0.5, s.ea, s.eb, 0, rng(jseed + 2), 0), s.streak); }
  }
  // strips shoot up from the bottom edge to the vanishing point. o: vx, vy, by, bx, width, narrow, n, dur, seed, rider (cut-out name), riderH, drawRider(ctx,x,y,t), sparks
  async function rocket(ctx, t, t0, o = {}) {
    if (t < t0) return null;
    const dur = o.dur ?? 0.9, tq = o.twos === false ? t : tq12(t) / 12, pe = (tq - t0) / dur, p = clamp(pe), seed = o.seed || 7, n = o.n || 50, M = stripModel('rk', seed, n), bt = tq12(t);
    const vx = o.vx ?? W / 2, vy = o.vy ?? H * 0.14, by = o.by ?? H + 30, hy = lerp(by, vy, E.out3(p)), hx = lerp(o.bx ?? vx, vx, E.out3(p));
    const hw = (o.width ?? 1000) / 2 * lerp(1, o.narrow ?? 0.62, E.inOut3(p)), ws = hw / 500;
    const layer = pool('clx_rk', W, H), x = layer.getContext('2d');
    for (let i = 0; i < M.length; i++) {
      const s = M[i], g = s.del < 0.07 ? clamp(pe / 0.08) : E.out3(clamp((pe - s.del) / 0.4)); if (g <= 0) continue;
      const jr = rng(s.js + bt), B0 = [vx + s.u * hw + (jr() - 0.5) * 5, by + 40], Hd = [hx + s.tx * 26 * ws, hy];
      const f0 = s.s0 * g, f1 = Math.max(f0 + 0.02, s.s1 * g), B = [lerp(B0[0], Hd[0], f0), lerp(B0[1], Hd[1], f0)], T = [lerp(B0[0], Hd[0], f1), lerp(B0[1], Hd[1], f1)];
      drawStrip(x, s, B, T, s.bw * ws * (1 - s.s0 * 0.75) * (s.s0 > 0 ? 0.8 : 1), s.js + bt * 3, s.s0 > 0);
    }
    layerShadow(ctx, layer, { d: [4, 8], a: 0.3 }); ctx.drawImage(layer, 0, 0);
    if (o.sparks !== false) { const r = rng(seed + bt * 7); for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.6, d = 30 + r() * 140, P = confPiece(r() < 0.6 ? 'tri' : 'chip', pick(r, [PAL.yellow, PAL.red, PAL.cobalt, PAL.hotpink, PAL.cyan]), 1); drawPiece(ctx, P, hx + Math.cos(a) * d, hy + 60 + Math.sin(a) * d * 0.6 + r() * 120, { rot: r() * TAU, scale: 0.4 + r() * 0.5, sh: [2, 3], shA: 0.25 }); } }
    if (o.rider) { const C = await cut(o.rider), rh = o.riderH ?? 220; drawCut(ctx, C, hx, hy - rh * 0.42, rh, { rot: Math.sin(bt * 1.7) * 0.05 }); }
    if (o.drawRider) await o.drawRider(ctx, hx, hy, t);
    return { x: hx, y: hy };
  }
  // strips fly radially out of a centre and stick around the frame edges. o: cx, cy, n, dur, r (max radius), r0, seed, rot
  async function burst(ctx, t, t0, o = {}) {
    if (t < t0) return;
    const dur = o.dur ?? 0.65, tq = o.twos === false ? t : tq12(t) / 12, pe = (tq - t0) / dur, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2, M = stripModel('bu', o.seed || 9, o.n || 26), Rmax = o.r ?? Math.hypot(W, H) * 0.6, r0 = o.r0 ?? 80, bt = tq12(t);
    const layer = pool('clx_bu', W, H), x = layer.getContext('2d');
    for (const s of M) {
      const g = E.out3(clamp((pe - s.del * 0.4) / 0.8)); if (g <= 0) continue;
      const th = s.a + (o.rot || 0), d1 = r0 + s.dist * Rmax * g, len = s.len * Rmax * (0.3 + 0.7 * g), d0 = Math.max(r0 * 0.6, d1 - len);
      drawStrip(x, s, [cx + Math.cos(th) * d1, cy + Math.sin(th) * d1], [cx + Math.cos(th) * d0, cy + Math.sin(th) * d0], s.bw * 0.6 * (o.width ?? 1), s.js + bt * 3);
    }
    layerShadow(ctx, layer, { d: [4, 8], a: 0.3 }); ctx.drawImage(layer, 0, 0);
  }

  /* =========================================================== TITLE (AFRICA ROCKS look) */
  function autoSize(lines, width, font) { const m = mk(4, 4).getContext('2d'); m.font = `400 100px ${font || '"Ultra"'}`; const w = Math.max(...lines.map((s) => [...s].reduce((a, c) => a + m.measureText(c).width, 0))); return 100 * width / Math.max(1, w); }
  function titleSprite(lines, size, o) {
    const key = ['ttl', lines.join('|'), Math.round(size), o.seed || 3, o.extrude || 'vp', o.depth ?? 0.15, o.fill || PAL.red, o.side || PAL.cobalt, o.font || '', o.inline ? 1 : 0].join('~');
    if (SPR.has(key)) return SPR.get(key);
    const font = `400 ${size}px ${o.font || '"Ultra"'}`, M = mk(8, 8).getContext('2d'); M.font = font;
    const tr = size * (o.tracking ?? -0.005), lh = size * (o.leading ?? 0.88), capH = M.measureText('H').actualBoundingBoxAscent || size * 0.72;
    // lines 2+ get extra room for marks above the caps (Vietnamese Ớ Ề Ẫ…, accented capitals): else they merge into the line above
    let acc = 0; const L = lines.map((s, li) => { const ch = [...s], ws = ch.map((c) => M.measureText(c).width);
      if (li) acc += Math.max(0, (M.measureText(s).actualBoundingBoxAscent || capH) - capH * 1.04) * 1.15;
      return { ch, ws, w: ws.reduce((a, b) => a + b, 0) + tr * (ch.length - 1), oy: acc }; });
    const TW = Math.max(...L.map((l) => l.w)), TH = capH + lh * (lines.length - 1) + acc, ext = o.extrude !== 'offset';
    const padX = size * 0.35, padT = size * (ext ? 0.6 : 0.25), padB = size * 0.3, cw = TW + padX * 2, chh = TH + padT + padB;
    const r = rng(o.seed || 3), Ls = [];
    L.forEach((l, li) => { let xx = padX + (TW - l.w) / 2; const by = padT + capH + li * lh + l.oy; l.ch.forEach((ch, i) => { if (ch !== ' ') Ls.push({ ch, x: xx, y: by, w: l.ws[i], rot: (r() - 0.5) * 0.06, dx: (r() - 0.5) * size * 0.02, dy: (r() - 0.5) * size * 0.035 }); xx += l.ws[i] + tr; }); });
    const vp = [cw / 2 + (o.vpx ?? 0) * size, padT + TH / 2 - (o.vpy ?? 1.1) * size], depth = o.depth ?? 0.15, steps = 20;
    const at = (Lt, k) => { const lx = Lt.x + Lt.w / 2 + Lt.dx, ly = Lt.y - capH / 2 + Lt.dy; if (ext) return [lx + (vp[0] - lx) * depth * k, ly + (vp[1] - ly) * depth * k, 1 - 0.05 * k]; const off = size * (o.offset ?? 0.06) * k; return [lx + off, ly + off, 1]; };
    const P = sprite(key, [0, 0, cw, chh], (x) => {
      x.font = font; x.textBaseline = 'alphabetic'; x.lineJoin = 'round'; x.miterLimit = 2;
      const g = (tx, Lt, k, fn) => { const [gx, gy, gs] = at(Lt, k); tx.save(); tx.translate(gx, gy); tx.rotate(Lt.rot); tx.scale(gs, gs); tx.translate(-Lt.w / 2, capH / 2); fn(tx); tx.restore(); };
      const white = pat(x, PAL.paper), side = pat(x, o.side || PAL.cobalt, 'streak');
      // 1. white paper under the whole extrusion  2. cobalt sides (stepped toward the vanishing point)
      x.strokeStyle = white; x.lineWidth = size * 0.07;
      for (const Lt of Ls) for (let s = steps; s >= 0; s -= 2) g(x, Lt, s / steps, (tx) => tx.strokeText(Lt.ch, 0, 0));
      const B = mk(cw, chh), bx = B.getContext('2d'); bx.font = font; bx.textBaseline = 'alphabetic'; bx.fillStyle = pat(bx, o.side || PAL.cobalt, 'streak');
      for (const Lt of Ls) for (let s = steps; s >= 1; s--) g(bx, Lt, s / steps, (tx) => tx.fillText(Lt.ch, 0, 0));
      bx.globalCompositeOperation = 'source-atop'; halftone(bx, [0, 0, cw, chh], { col: 'rgba(8,20,80,0.28)', step: Math.max(5, size * 0.035), r0: 0.12, r1: 0.42, dir: [0, -1], angle: 0.3 });
      const gg = bx.createLinearGradient(0, 0, 0, chh); gg.addColorStop(0, 'rgba(0,0,40,0.25)'); gg.addColorStop(0.6, 'rgba(0,0,0,0)'); bx.fillStyle = gg; bx.fillRect(0, 0, cw, chh);
      x.drawImage(B, 0, 0);
      // 3. each letter's own white paper border  4. red printed face
      x.strokeStyle = white; x.lineWidth = size * 0.058;
      for (const Lt of Ls) g(x, Lt, 0, (tx) => tx.strokeText(Lt.ch, 0, 0));
      const F = mk(cw, chh), fx = F.getContext('2d'); fx.font = font; fx.textBaseline = 'alphabetic'; fx.lineJoin = 'round'; fx.fillStyle = pat(fx, o.fill || PAL.red, 'mottle');
      for (const Lt of Ls) g(fx, Lt, 0, (tx) => tx.fillText(Lt.ch, 0, 0));
      fx.globalCompositeOperation = 'source-atop';
      halftone(fx, [0, 0, cw, chh], { col: 'rgba(120,0,0,0.16)', step: Math.max(4, size * 0.028), r0: 0.1, r1: 0.42, dir: [0.3, 1], angle: 0.8 });
      if (o.inline) { for (const Lt of Ls) g(fx, Lt, 0, (tx) => { tx.strokeStyle = 'rgba(255,250,240,0.95)'; tx.lineWidth = size * 0.11; tx.strokeText(Lt.ch, 0, 0); tx.strokeStyle = pat(fx, o.fill || PAL.red, 'mottle'); tx.lineWidth = size * 0.075; tx.strokeText(Lt.ch, 0, 0); }); }
      x.drawImage(F, 0, 0);
    }, { pad: 4, blur: 10 });
    P.ax = cw / 2; P.ay = padT + TH / 2; P.bottom = padT + TH + size * 0.04; P.TW = TW; P.TH = TH; P.size = size;
    return P;
  }
  // lines: ['KAYE','CREATES']; drops from above in 3 frames at t0, squash/bounce, then slow push (o.zoom per s)
  // o: size | width (default 0.6 W), font, extrude 'vp'|'offset', depth, vpx, vpy (em above centre), offset, seed, zoom, inline, drop(false)
  async function title(ctx, lines, cx, cy, t, t0, o = {}) {
    if (t < t0) return null;
    const size = o.size || autoSize(lines, o.width ?? W * 0.6, o.font), P = titleSprite(lines, size, o), lt = t - t0;
    let dy = 0, sx = 1, sy = 1;
    if (o.drop !== false) {
      const fi = Math.floor(lt * 24 + 1e-6);
      if (fi < 3) dy = -(cy + P.TH * 0.22) * [1, 0.45, 0.12][fi];
      else { const u = lt - 3 / 24, s = Math.exp(-u * 7) * Math.cos(u * 24); sy = 1 - 0.13 * s; sx = 1 + 0.06 * s; }
    }
    const z = 1 + (o.zoom ?? 0.03) * Math.max(0, lt - 0.25);
    const by = cy + (P.bottom - P.ay) * z + dy;
    drawPiece(ctx, P, cx, by, { scale: z, sx, sy, ax: P.ax, ay: P.bottom, sh: [size * 0.03, size * 0.06], shM: 1, shA: 0.35, alpha: o.alpha ?? 1 });
    return { x: cx, y: cy + dy, w: P.TW * z, h: P.TH * z, size };
  }

  /* =========================================================== PAGE TEAR */
  const TEARK = new Map();
  function tearKit(seed, y0, y1, fw) {
    const key = [seed, Math.round(y0), Math.round(y1), Math.round(fw)].join('_'); if (TEARK.has(key)) return TEARK.get(key);
    const st = 6, n = Math.ceil((W + 80) / st) + 1, xs = [], top = [], bot = [], wt = [], wb = [], nA = fbm(seed), nB = fbm(seed + 9), nC = vnoise(seed + 3), nD = vnoise(seed + 5), r = rng(seed);
    for (let i = 0; i < n; i++) { const x = -40 + i * st; xs.push(x); top.push(y0 + nA(x / 60) * 13 + (r() - 0.5) * 3); bot.push(y1 + nB(x / 60) * 13 + (r() - 0.5) * 3); wt.push(3 + 12 * Math.pow(clamp(0.5 + 0.8 * nC(x / 70)), 1.5) + r() * 1.5); wb.push(2 + 10 * Math.pow(clamp(0.5 + 0.8 * nD(x / 70)), 1.5) + r() * 1.5); }
    // flap (the peeled paper's cobalt back), local coords: x relative to the tear front, absolute y
    // curled-back flap: a tall paper sheet, fold on the right, rounded rolled corner top-left, top edge lifting toward the viewer
    const bh = y1 - y0, lift = bh * 0.42, lb = bh * 0.12, xl = -fw * 0.3, xr = fw * 0.7, rT = fw * 0.26, rB = fw * 0.1, pts = [];
    const arc = (cx, cy, rx, ry, a0, a1, m) => { for (let i = 1; i <= m; i++) { const a = a0 + (a1 - a0) * i / m; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } };
    pts.push([xr, y0 + 4]);
    for (let i = 1; i <= 8; i++) { const u = i / 8; pts.push([lerp(xr, xl + rT, u), lerp(y0 + 4, y0 - lift, Math.pow(u, 0.8))]); }
    arc(xl + rT, y0 - lift + rT, rT, rT, -Math.PI / 2, -Math.PI, 8);
    for (let i = 1; i <= 8; i++) { const u = i / 8; pts.push([xl - Math.sin(u * Math.PI) * fw * 0.035 + u * fw * 0.03, lerp(y0 - lift + rT, y1 + lb - rB, u)]); }
    arc(xl + fw * 0.03 + rB, y1 + lb - rB, rB, rB, Math.PI, Math.PI / 2, 5);
    for (let i = 1; i <= 8; i++) { const u = i / 8; pts.push([lerp(xl + fw * 0.03 + rB, xr - fw * 0.05, u), lerp(y1 + lb, y1 - 4, Math.pow(u, 1.3))]); }
    const foldEdge = pts.length - 1;
    const flap = piece('tearflap' + key, pts, {
      cutEdges: [foldEdge], wMin: 3, wMax: 16, wave: 5, blur: 64, seed: seed + 41,
      paint: (x, b) => {
        x.fillStyle = pat(x, '#2A4479', 'mottle'); x.fillRect(b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8); // navy paper back
        const gv = x.createLinearGradient(0, b[1], 0, b[1] + b[3]); gv.addColorStop(0, 'rgba(255,255,255,0.1)'); gv.addColorStop(0.3, 'rgba(255,255,255,0)'); gv.addColorStop(1, 'rgba(0,0,30,0.12)'); x.fillStyle = gv; x.fillRect(b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8);
        // cylindrical shading of the curl: light crest on the rolled (left) side → dark into the fold at the tear front (right)
        const g = x.createLinearGradient(b[0], 0, b[0] + b[2], 0); g.addColorStop(0, 'rgba(0,0,25,0.3)'); g.addColorStop(0.1, 'rgba(255,255,255,0.08)'); g.addColorStop(0.24, 'rgba(255,255,255,0.3)'); g.addColorStop(0.36, 'rgba(255,255,255,0.12)'); g.addColorStop(0.62, 'rgba(0,0,30,0.05)'); g.addColorStop(0.86, 'rgba(0,0,30,0.32)'); g.addColorStop(1, 'rgba(0,0,30,0.6)');
        x.fillStyle = g; x.fillRect(b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8);
      },
    });
    const kit = { xs, top, bot, wt, wb, st, flap, fw }; TEARK.set(key, kit); return kit;
  }
  // band y0..y1 of drawOver tears away left→right (k 0..1) revealing drawUnder. drawOver/drawUnder: async (ctx2)=>{} or a canvas. o: y0, y1, seed, flapW
  async function tear(ctx, k, drawOver, drawUnder, o = {}) {
    const y0 = o.y0 ?? H * 0.36, y1 = o.y1 ?? H * 0.64, kk = clamp(k), fw = o.flapW ?? Math.max((y1 - y0) * 1.4, W * 0.26), K = tearKit(o.seed || 5, y0, y1, fw);
    const A = await layerOf(drawOver, 'clx_tear_a'), B = await layerOf(drawUnder, 'clx_tear_b');
    const X = lerp(-fw * 0.75, W + fw * 0.35, kk), xf = X + fw * 0.66;
    if (A) ctx.drawImage(A, 0, 0);
    if (xf <= -40) return;
    const n = Math.min(K.xs.length - 1, Math.max(1, Math.ceil((xf + 40) / K.st)));
    const R = new Path2D(); R.moveTo(K.xs[0], K.top[0]); for (let i = 1; i <= n; i++) R.lineTo(K.xs[i], K.top[i]); for (let i = n; i >= 0; i--) R.lineTo(K.xs[i], K.bot[i]); R.closePath();
    ctx.save(); ctx.clip(R); if (B) ctx.drawImage(B, 0, 0);
    // the page edge shadows the revealed band
    const Ts = new Path2D(); Ts.moveTo(K.xs[0], K.top[0] - 200); for (let i = 0; i <= n; i++) Ts.lineTo(K.xs[i], K.top[i]); Ts.lineTo(K.xs[n], K.top[n] - 200); Ts.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.42)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 7; ctx.fillStyle = '#000'; ctx.fill(Ts); ctx.restore();
    // white fibrous torn edges of the remaining page
    const wp = pat(ctx, PAL.paper);
    const top = new Path2D(); for (let i = 0; i <= n; i++) i ? top.lineTo(K.xs[i], K.top[i] - K.wt[i]) : top.moveTo(K.xs[i], K.top[i] - K.wt[i]); for (let i = n; i >= 0; i--) top.lineTo(K.xs[i], K.top[i]); top.closePath();
    const bot = new Path2D(); for (let i = 0; i <= n; i++) i ? bot.lineTo(K.xs[i], K.bot[i]) : bot.moveTo(K.xs[i], K.bot[i]); for (let i = n; i >= 0; i--) bot.lineTo(K.xs[i], K.bot[i] + K.wb[i]); bot.closePath();
    ctx.save(); ctx.fillStyle = wp; ctx.fill(top); ctx.fill(bot); ctx.strokeStyle = 'rgba(80,60,40,0.18)'; ctx.lineWidth = 1; ctx.stroke(top); ctx.stroke(bot); ctx.restore();
    // the curling flap (cobalt back) at the tear front
    if (X < W + fw) { drawPiece(ctx, K.flap, X, 0, { sh: [-fw * 0.22, fw * 0.07], shM: 1, shA: 0.32, only: 'shadow' }); drawPiece(ctx, K.flap, X, 0, { sh: [-10, 6], shM: 1, shA: 0.3 }); }
  }

  /* =========================================================== LOGO BAND + STYLE FLASHES */
  function bandSprite(h, seed) {
    const key = 'band' + Math.round(h) + '_' + seed, bw = W + 200;
    return sprite(key, [-bw / 2, -h / 2 - 90, bw, h + 210], (x) => {
      const r = rng(seed);
      // scraps peeking above / below the band
      drawPiece(x, piece(key + 'top', rectPts(bw, 50), { fill: PAL.navy, tex: 'streak', wMax: 8, wave: 9, scale: 90, seed: seed + 1 }), 0, -h / 2 - 6, { rot: -0.004, sh: [2, 4] });
      let xx = -bw / 2 - 40, i = 0;
      const cols = [PAL.navy, PAL.green, PAL.yellow, PAL.ink, '#7E8C2E', PAL.news, PAL.cobalt, PAL.yellow, '#5B3A1E', PAL.green, PAL.paper, PAL.red];
      const scraps = [];
      while (xx < bw / 2 + 40) {
        const w = 90 + r() * 280, hh = 50 + r() * 90, col = cols[Math.floor(r() * cols.length)], tri = r() < 0.25, sk = (r() - 0.5) * w * 0.5;
        const pts = tri ? [[-w / 2, hh / 2], [w / 2, hh / 2], [sk, -hh / 2 - r() * 30]] : [[-w / 2 + (r() - 0.5) * 30, -hh / 2], [w / 2 + (r() - 0.5) * 30, -hh / 2 + (r() - 0.5) * 20], [w / 2, hh / 2], [-w / 2, hh / 2]];
        scraps.push([piece(key + 'b' + i, pts, { fill: col, tex: 'mottle', wMax: 9, wave: 4, seed: seed + 10 + i, dots: r() < 0.3 ? { col: 'rgba(255,255,255,0.25)', step: 8, r0: 0.1, r1: 0.4 } : null }), xx + w / 2, h / 2 + 4 + r() * 46, (r() - 0.5) * 0.22, r()]);
        xx += w * (0.45 + r() * 0.45); i++;
      }
      scraps.sort((a, b) => a[4] - b[4]).forEach(([P, px, py, rot]) => drawPiece(x, P, px, py, { rot, sh: [2, 4] }));
      for (let k = 0; k < 6; k++) { const w = 120 + r() * 300, px = -bw / 2 + r() * bw, hh = 26 + r() * 22; drawPiece(x, piece(key + 'tp' + k, [[-w / 2, hh / 2], [w / 2, hh / 2], [w / 2 - r() * 40, -hh / 2], [-w / 2 + r() * 40, -hh / 2 + (r() - 0.5) * 10]], { fill: pick(r, [PAL.ink, PAL.paper, PAL.news, PAL.cobalt, PAL.yellow]), tex: 'mottle', wMax: 7, seed: seed + 60 + k }), px, -h / 2 - 10 - r() * 8, { rot: (r() - 0.5) * 0.06, sh: [2, 3] }); }
      drawPiece(x, piece(key + 'low', rectPts(bw, 60), { fill: PAL.paper, tex: 'grain', wMax: 10, seed: seed + 3 }), 0, h / 2 + 92, { rot: 0.003, sh: [2, 5] });
      // the white band (grain paper) with its own torn edges
      drawPiece(x, piece(key + 'band', rectPts(bw, h), { fill: '#F4F1EA', tex: 'grain', wMin: 2, wMax: 16, wave: 7, scale: 70, seed: seed + 2 }), 0, 0, { sh: [3, 9], shA: 0.5 });
    }, { shadow: true, blur: 12, pad: 10 });
  }
  const LETTERS = {
    red: { font: 'Chewy', passes: [['spray', '#EF1419', 14, 0.5], ['fill', '#EF1419', 'flat']] }, // flat spray stencil: no stroke, no mottle, overspray speckle ≤ 14 px off the edge
    rainbow: { font: 'Chewy', passes: [['stroke', '#0A0A0A', 0.11], ['stroke', '#FFFFFF', 0.04], ['rainbow']] },
    purple: { font: 'Chewy', passes: [['shadow', 'rgba(30,40,0,0.35)', 0.03, 0.05], ['stroke', '#2B0B33', 0.08], ['fill', '#A93BB0'], ['shine']] },
    cyan: { font: 'Chewy', passes: [['stroke', '#1B2433', 0.07], ['fill', '#41D3E6'], ['shine']], jit: 2.4 },
    chrome: { font: 'Chewy', passes: [['chroma']] },
    cream: { font: 'Chewy', passes: [['shadow', 'rgba(0,0,0,0.35)', 0.03, 0.05], ['stroke', '#141414', 0.13], ['fill', '#FBF8F1', 'flat']] }, // paper-cream face + heavy ink outline: reads on any band look and survives palette remaps
    green: { font: 'Chewy', passes: [['stroke', '#0A0A0A', 0.12], ['fill', '#46DA6E'], ['shine']] },
  };
  // spray-paint overspray: seeded speckle dots (r .5–1.25 px) outside the glyphs, denser near the edge, none beyond ≈ ps[2] px. ps: ['spray', colour, reach px, alpha]
  function spray(x, Ls, f, size, ps, seed) {
    const cw = x.canvas.width, ch = x.canvas.height, m = x.getTransform(), G = mk(cw, ch), gx = G.getContext('2d', { willReadFrequently: true });
    gx.setTransform(m); gx.font = f; gx.textAlign = 'center'; gx.textBaseline = 'alphabetic'; gx.fillStyle = '#000';
    for (const Lt of Ls) { if (Lt.c === ' ') continue; gx.save(); gx.translate(Lt.x, Lt.dy + size * 0.32); gx.rotate(Lt.rot); gx.scale(Lt.s, Lt.s); gx.fillText(Lt.c, 0, 0); gx.restore(); }
    const B = mk(cw, ch), bx = B.getContext('2d', { willReadFrequently: true }); bx.filter = `blur(${ps[2] * 0.42 * Math.hypot(m.a, m.b)}px)`; bx.drawImage(G, 0, 0);
    let gd, bd; try { gd = gx.getImageData(0, 0, cw, ch).data; bd = bx.getImageData(0, 0, cw, ch).data; } catch (e) { return; }
    const r = rng(seed * 7 + 11), N = Math.round(cw * ch * 0.3), dpr = Math.hypot(m.a, m.b);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = ps[1]; x.globalAlpha = ps[3] ?? 0.5; x.beginPath();
    for (let i = 0; i < N; i++) {
      const px = r() * cw, py = r() * ch, k = ((py | 0) * cw + (px | 0)) * 4 + 3, a = bd[k] / 255, rr = r(), rad = (0.5 + r() * r() * 0.9) * dpr;
      if (gd[k] > 100 || a < 0.015 || rr > Math.pow(a * 2, 1.25) * 0.8) continue;
      x.moveTo(px + rad, py); x.arc(px, py, rad, 0, TAU);
    }
    x.fill(); x.restore();
  }
  function logoSprite(text, size, style, seed, font) {
    const key = ['logo', text, Math.round(size), style, seed, font || ''].join('~'); if (SPR.has(key)) return SPR.get(key);
    const S = LETTERS[style] || LETTERS.red, famW = (font || S.font).split(':'), fam = famW[0], wt = famW[1] || (fam === 'Gluten' ? 900 : 400), f = `${wt} ${size}px "${fam}"`;   // font 'Family' or 'Family:800'
    const M = mk(4, 4).getContext('2d'); M.font = f; const ch = [...text], ws = ch.map((c) => M.measureText(c).width), tr = size * 0.01, TW = ws.reduce((a, b) => a + b, 0) + tr * (ch.length - 1);
    const r = rng(seed), jit = S.jit || 1, Ls = []; let xx = -TW / 2;
    ch.forEach((c, i) => { Ls.push({ c, x: xx + ws[i] / 2, w: ws[i], rot: (r() - 0.5) * 0.12 * jit, dy: (r() - 0.5) * size * 0.07 * jit, s: 1 + (r() - 0.5) * 0.1 * jit, i }); xx += ws[i] + tr; });
    const rainbow = ['#FFD21E', '#2FD3F0', '#FF3E9A', '#7BE33B', '#FF7A1A', '#3F6BFF', '#F9A8D4', '#E5231E', '#A35BFF'];
    return sprite(key, [-TW / 2 - size * 0.3, -size * 0.95, TW + size * 0.6, size * 1.75], (x) => {
      x.font = f; x.textBaseline = 'alphabetic'; x.lineJoin = 'round'; x.textAlign = 'center';
      const at = (Lt, fn, ox = 0, oy = 0) => { x.save(); x.translate(Lt.x + ox, Lt.dy + oy + size * 0.32); x.rotate(Lt.rot); x.scale(Lt.s, Lt.s); fn(); x.restore(); };
      for (const ps of S.passes) {
        if (ps[0] === 'spray') { spray(x, Ls, f, size, ps, seed); continue; }
        for (const Lt of Ls) {
          if (Lt.c === ' ') continue;
          if (ps[0] === 'shadow') { x.save(); x.filter = `blur(${size * 0.012}px)`; at(Lt, () => { x.fillStyle = ps[1]; x.fillText(Lt.c, 0, 0); }, size * ps[2], size * ps[3]); x.restore(); }
          else if (ps[0] === 'stroke') at(Lt, () => { x.strokeStyle = ps[1]; x.lineWidth = size * ps[2]; x.strokeText(Lt.c, 0, 0); });
          else if (ps[0] === 'fill') at(Lt, () => { x.fillStyle = ps[2] === 'flat' ? ps[1] : pat(x, ps[1], 'mottle'); x.fillText(Lt.c, 0, 0); });
          else if (ps[0] === 'shine') at(Lt, () => { x.save(); x.beginPath(); x.ellipse(-Lt.w * 0.18, -size * 0.5, size * 0.07, size * 0.04, -0.5, 0, TAU); x.fillStyle = 'rgba(255,255,255,0.75)'; x.fill(); x.restore(); });
          else if (ps[0] === 'rainbow') {
            const tmp = mk(size * 1.6, size * 1.6), tx = tmp.getContext('2d'), col = rainbow[Lt.i % rainbow.length], col2 = rainbow[(Lt.i * 3 + 4) % rainbow.length], kind = Lt.i % 4;
            tx.font = f; tx.textAlign = 'center'; tx.textBaseline = 'alphabetic'; tx.translate(size * 0.8, size * 1.1); tx.fillStyle = col; tx.fillText(Lt.c, 0, 0); tx.globalCompositeOperation = 'source-atop'; tx.fillStyle = col2; tx.strokeStyle = col2;
            if (kind === 0) for (let yy = -size * 1.2; yy < size * 0.4; yy += size * 0.11) tx.fillRect(-size, yy, size * 2, size * 0.045);
            else if (kind === 1) for (let yy = -size * 1.1; yy < size * 0.4; yy += size * 0.12) for (let xx2 = -size; xx2 < size; xx2 += size * 0.12) { tx.beginPath(); tx.arc(xx2, yy, size * 0.035, 0, TAU); tx.fill(); }
            else if (kind === 2) { tx.lineWidth = size * 0.03; for (let yy = -size * 1.1; yy < size * 0.4; yy += size * 0.13) { tx.beginPath(); for (let xx2 = -size; xx2 < size; xx2 += size * 0.08) tx.lineTo(xx2, yy + ((xx2 / (size * 0.08)) % 2 ? size * 0.04 : -size * 0.04)); tx.stroke(); } }
            else for (let yy = -size * 1.1; yy < size * 0.4; yy += size * 0.1) for (let xx2 = -size; xx2 < size; xx2 += size * 0.2) tx.fillRect(xx2 + ((yy / (size * 0.1)) % 2 ? size * 0.1 : 0), yy, size * 0.1, size * 0.1);
            at(Lt, () => x.drawImage(tmp, -size * 0.8, -size * 1.1));
          } else if (ps[0] === 'chroma') {
            at(Lt, () => { x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,40,60,0.9)'; x.fillText(Lt.c, -size * 0.035, 0); x.fillStyle = 'rgba(40,200,255,0.9)'; x.fillText(Lt.c, size * 0.035, 0); x.globalCompositeOperation = 'source-over'; const g = x.createLinearGradient(0, -size * 0.75, 0, 0); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#9DB4FF'); g.addColorStop(1, '#5E6BFF'); x.fillStyle = g; x.fillText(Lt.c, 0, 0); });
          }
        }
      }
    }, { shadow: false, pad: 6 });
  }
  const FLASHBG = new Map();
  function cloudPath(x, cx, cy, w, h, r) { // puffy cloud: bumps on top, flat-ish bottom
    const n = 3 + Math.floor(r() * 3), bumps = []; for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; bumps.push([cx - w / 2 + u * w, cy - h * (0.25 + r() * 0.35) * Math.sin(Math.PI * (0.2 + 0.6 * u)), h * (0.35 + r() * 0.25)]); }
    bumps.push([cx - w * 0.5, cy, h * 0.3], [cx + w * 0.5, cy, h * 0.28]);
    return bumps;
  }
  function drawCloud(x, bumps, fill, line, lw, h) {
    const cy = bumps[bumps.length - 1][1];
    x.lineWidth = lw * 2; x.strokeStyle = line; for (const [bx, by, br] of bumps) { x.beginPath(); x.arc(bx, by, br, 0, TAU); x.stroke(); }
    const xs = bumps.map((b) => b[0]); x.beginPath(); x.roundRect(Math.min(...xs), cy - h * 0.15, Math.max(...xs) - Math.min(...xs), h * 0.42, h * 0.2); x.stroke();
    x.fillStyle = fill; for (const [bx, by, br] of bumps) { x.beginPath(); x.arc(bx, by, br, 0, TAU); x.fill(); } x.beginPath(); x.roundRect(Math.min(...xs), cy - h * 0.15, Math.max(...xs) - Math.min(...xs), h * 0.42, h * 0.2); x.fill();
  }
  function flashBg(style) {
    if (FLASHBG.has(style)) return FLASHBG.get(style);
    const c = mk(W, H), x = c.getContext('2d'), r = rng(hs(style));
    if (style === 'lime') {
      x.fillStyle = patR(x, '#A3CE3D', '', 5); x.fillRect(0, 0, W, H);
      const spots = [[0.12, 0.16, 300], [0.55, 0.2, 420], [0.86, 0.12, 300], [0.32, 0.75, 360], [0.83, 0.74, 560], [0.07, 0.62, 200], [0.6, 0.93, 260]];
      for (const [u, v, w] of spots) { const b = cloudPath(x, u * W, v * H, w, w * 0.42, r); drawCloud(x, b, '#F4B21C', '#3A2A05', 3.5, w * 0.42); const ex = u * W + (r() - 0.5) * w * 0.3, ey = v * H - w * 0.12; for (const d of [-1, 1]) { x.beginPath(); x.ellipse(ex + d * w * 0.05, ey, w * 0.032, w * 0.022, 0, 0, TAU); x.fillStyle = '#FFF'; x.fill(); x.lineWidth = 2.5; x.strokeStyle = '#2A1A00'; x.stroke(); x.beginPath(); x.arc(ex + d * w * 0.05 + w * 0.01, ey + 1, w * 0.011, 0, TAU); x.fillStyle = '#111'; x.fill(); } x.beginPath(); x.moveTo(ex - w * 0.09, ey - w * 0.012); x.lineTo(ex + w * 0.09, ey - w * 0.012); x.lineWidth = 2.5; x.strokeStyle = '#3A2A05'; }
    } else if (style === 'orange') {
      x.fillStyle = patR(x, '#E9A65A', 'wood', 6); x.fillRect(0, 0, W, H);
      for (let i = 0; i < 16; i++) { const w = 120 + r() * 200, u = r() * W, v = r() * H; drawCloud(x, cloudPath(x, u, v, w, w * 0.45, r), '#F2F6B3', '#1D1A10', 2.5, w * 0.45); }
    } else if (style === 'pink') {
      x.fillStyle = patR(x, '#F7BAE3', '', 7); x.fillRect(0, 0, W, H);
      for (let i = 0; i < 46; i++) { const cx = r() * W, cy = r() * H, R = 6 + r() * r() * 60, m = 7, pts = []; for (let j = 0; j < m; j++) { const a = j * TAU / m, rr = R * (0.55 + r() * 0.75); pts.push([cx + Math.cos(a) * rr * (1 + r() * 0.6), cy + Math.sin(a) * rr]); }
        x.beginPath(); for (let j = 0; j <= m; j++) { const p0 = pts[j % m], p1 = pts[(j + 1) % m], mx_ = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; j ? x.quadraticCurveTo(p0[0], p0[1], mx_, my) : x.moveTo(mx_, my); } x.closePath(); x.fillStyle = '#EA84C6'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#B9518F'; x.stroke(); }
    } else if (style === 'posters') {
      x.fillStyle = patR(x, PAL.news, '', 8); x.fillRect(0, 0, W, H);
      const cols = [[PAL.paper, PAL.navy], [PAL.navy, PAL.paper], [PAL.yellow, PAL.navy], ['#8E7B4E', PAL.paper], [PAL.cobalt, PAL.yellow], [PAL.ink, PAL.paper], ['#3E86E0', PAL.paper], [PAL.paper, PAL.red], [PAL.news, PAL.ink]];
      const words = ['10', 'AF', 'RIC', 'O', 'ZO', 'ME', '3', 'NE', 'W'];
      for (let i = 0; i < 18; i++) { const w = 300 + r() * 650, h = 200 + r() * 420, [bg, fg] = cols[i % cols.length], word = words[i % words.length], fz = h * (0.9 + r() * 0.6), font = pick(r, ['Anton', 'Bungee', 'Ultra', 'Rubik']);
        const P = piece('poster' + i, rectPts(w, h), { seed: 700 + i, wMin: 2, wMax: 18, wave: 9, scale: 80, paint: (px, b) => { px.fillStyle = pat(px, bg, 'mottle'); px.fillRect(b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8); px.fillStyle = fg; px.font = `${font === 'Rubik' ? 900 : 400} ${fz}px "${font}"`; px.textBaseline = 'middle'; px.fillText(word, b[0] - fz * 0.2 * r(), b[1] + b[3] * 0.55); } });
        drawPiece(x, P, r() * W, r() * H, { rot: (r() - 0.5) * 0.7, sh: [4, 8], shA: 0.45 }); }
    }
    FLASHBG.set(style, c); return c;
  }
  async function postersBg(ctx, t, o) {
    if (window.CL && typeof window.CL.posters === 'function') { try { await window.CL.posters(ctx, t, o.posters || {}); return; } catch (e) { /* fall back to own */ } }
    ctx.drawImage(flashBg('posters'), 0, 0);
  }
  // o: style 'band'|'glitter'|'posters'|'lime'|'orange'|'streak'|'pink', x, y, h (band height), size (letter px), font 'Chewy'|'Gluten', rot, seed, boil
  async function logoBand(ctx, text, t, o = {}) {
    const style = o.style || 'band', cx = o.x ?? W / 2, cy = o.y ?? H / 2, h = o.h ?? 300, size = o.size ?? h * 0.56, seed = o.seed || 8, bt = tq12(t), lseed = seed + (o.boil ? bt % 2 : 0);
    let letters = 'red';
    if (style === 'band' || style === 'posters') {
      if (style === 'posters') await postersBg(ctx, t, o);
      drawPiece(ctx, bandSprite(h, seed), cx, cy, { rot: o.rot || 0, sh: [0, 10], shM: 1, shA: 0.45 });
    } else if (style === 'glitter') {
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
      const r = rng(Math.floor(t * 24) * 7 + 3), cols = ['#FF2A2A', '#2AFF5A', '#2A6BFF', '#FFE52A', '#FF2AD4', '#2AF0FF', '#FFFFFF'];
      for (let i = 0; i < 1400; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.35 + r() * 0.65; const s = 1 + r() * r() * 4; ctx.fillRect(r() * W, r() * H, s, s * (0.6 + r())); }
      ctx.globalAlpha = 1; letters = 'rainbow';
    } else if (style === 'streak') {
      ctx.fillStyle = '#07070B'; ctx.fillRect(0, 0, W, H);
      const r = rng(Math.floor(t * 24) * 5 + 1);
      for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(${200 + r() * 55 | 0},${200 + r() * 55 | 0},255,${0.05 + r() * 0.22})`; ctx.fillRect(r() * W, r() * H, 20 + r() * 260, 1 + r() * 2); }
      ctx.save(); ctx.translate(W * 0.62, H * 0.58); ctx.rotate(-0.62);
      const g = ctx.createLinearGradient(0, -220, 0, 260); g.addColorStop(0, 'rgba(20,60,255,0)'); g.addColorStop(0.42, 'rgba(40,110,255,0.55)'); g.addColorStop(0.5, 'rgba(150,200,255,0.95)'); g.addColorStop(0.54, 'rgba(40,90,240,0.7)'); g.addColorStop(1, 'rgba(10,30,160,0.5)');
      ctx.fillStyle = g; ctx.fillRect(-W, -220, W * 2, 1000); ctx.restore();
      const fx = cx + size * 0.05, fy = cy - size * 0.05, fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, size * 0.8); fg.addColorStop(0, 'rgba(255,240,255,0.95)'); fg.addColorStop(0.2, 'rgba(200,120,255,0.5)'); fg.addColorStop(1, 'rgba(120,60,255,0)'); ctx.fillStyle = fg; ctx.fillRect(fx - size, fy - size, size * 2, size * 2);
      letters = 'chrome';
    } else {
      ctx.drawImage(flashBg(style), 0, 0); letters = { lime: 'purple', orange: 'cyan', pink: 'green' }[style] || 'red';
    }
    drawPiece(ctx, logoSprite(text, size, letters, lseed, o.font), cx, cy, { rot: o.rot || 0, sx: o.lsx, sy: o.lsy, shadow: false });
    if (style === 'streak') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fx = cx + size * 0.05, fy = cy - size * 0.05; ctx.fillStyle = 'rgba(255,230,255,0.9)'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? size * 0.08 : size * 0.7; ctx.lineTo(fx + Math.cos(a) * rr, fy + Math.sin(a) * rr * 0.9); } ctx.closePath(); ctx.fill(); ctx.restore(); }
  }

  /* =========================================================== RANSOM LETTERS */
  // every face has Vietnamese glyphs (Ultra, Abril Fatface, Special Elite, Rubik had none: accented letters fell back to another font)
  const RFONTS = [['Alfa Slab One', 400], ['Bevan', 400], ['Playfair Display', 900], ['Anton', 400], ['Bungee', 400], ['JetBrains Mono', 700], ['Be Vietnam Pro', 900], ['Yeseva One', 400], ['Inter Tight', 900], ['Lobster', 400]];
  const RPAPER = [[PAL.paper, PAL.ink], [PAL.news, PAL.red], [PAL.yellow, PAL.ink], [PAL.red, PAL.paper], [PAL.cobalt, PAL.paper], [PAL.ink, PAL.yellow], [PAL.pink, PAL.cobalt], [PAL.cyan, PAL.ink], [PAL.paper, PAL.red], [PAL.orange, PAL.paper], [PAL.lime, PAL.ink], [PAL.news, PAL.ink], [PAL.navy, PAL.pink]];
  function ransomChip(ch, i, seed, size) {
    const key = ['rans', ch, i, seed, Math.round(size)].join('~'); if (SPR.has(key)) return SPR.get(key);
    const r = rng(seed * 101 + i * 7 + 1), [fam, wt] = RFONTS[Math.floor(r() * RFONTS.length)], s = size * (0.85 + r() * 0.3), [bg, fg] = RPAPER[(Math.floor(r() * RPAPER.length) + i * 5) % RPAPER.length];
    const f = `${wt} ${s}px "${fam}"`, M = mk(4, 4).getContext('2d'); M.font = f; const mt = M.measureText(ch);
    const gl = mt.actualBoundingBoxLeft, gr = mt.actualBoundingBoxRight, ga = mt.actualBoundingBoxAscent, gd = mt.actualBoundingBoxDescent, gw = gl + gr, gh = ga + gd;
    const pl = s * (0.12 + r() * 0.12), pr = s * (0.12 + r() * 0.12), pt = s * (0.1 + r() * 0.12), pb = s * (0.1 + r() * 0.12), w = gw + pl + pr, h = gh + pt + pb, j = s * 0.05;
    const pts = [[-w / 2 + (r() - 0.5) * j, -h / 2 + (r() - 0.5) * j], [w / 2 + (r() - 0.5) * j, -h / 2 + (r() - 0.5) * j], [w / 2 + (r() - 0.5) * j, h / 2 + (r() - 0.5) * j], [-w / 2 + (r() - 0.5) * j, h / 2 + (r() - 0.5) * j]];
    const gx = -w / 2 + pl + gl, gy = -h / 2 + pt + ga, news = r() < 0.3, dots = !news && r() < 0.3;
    const P = piece(key, pts, {
      seed: seed * 31 + i, wMin: 1, wMax: 7, wave: 2.5, scale: 30,
      paint: (x, b) => {
        x.fillStyle = pat(x, bg, 'mottle'); x.fillRect(b[0] - 3, b[1] - 3, b[2] + 6, b[3] + 6);
        if (news) { x.fillStyle = rgba(fg, 0.12); for (let yy = b[1] + 4; yy < b[1] + b[3]; yy += s * 0.08) x.fillRect(b[0], yy, b[2], s * 0.03); }
        if (dots) halftone(x, b, { col: rgba(fg, 0.14), step: s * 0.07, r0: 0.1, r1: 0.4, dir: [1, 1] });
        x.font = f; x.fillStyle = fg; x.textBaseline = 'alphabetic'; x.fillText(ch, gx, gy);
      },
    });
    P.cw = w; P.rot = (r() - 0.5) * 0.28; P.dy = (r() - 0.5) * size * 0.12; return P;
  }
  // letters slap in one by one every o.step. o: size (140), step (0.125), seed, gap, align 'center'|'left', spaceBeat(false)
  async function ransom(ctx, str, cx, cy, t, t0, o = {}) {
    const size = o.size || 140, step = o.step ?? 0.125, seed = o.seed || 4, gap = size * (o.gap ?? 0.05), chars = [...str];
    const items = chars.map((ch, i) => (ch === ' ' ? { sp: true, cw: size * 0.42 } : ransomChip(ch, i, seed, size)));
    const total = items.reduce((a, it) => a + it.cw, 0) + gap * (items.length - 1); let x = o.align === 'left' ? cx : cx - total / 2, li = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i], idx = o.spaceBeat ? i : li;
      if (!it.sp) { li++; const lt = t - (t0 + idx * step); if (lt >= 0) { const k = clamp((Math.floor(lt * 24 + 1e-6) + 1) / 3), sc = lerp(1.45, 1, E.out3(k)) * (o.scale || 1); drawPiece(ctx, it, cx + (x + it.cw / 2 - cx) * (o.scale || 1), cy + it.dy * (o.scale || 1), { rot: it.rot * lerp(2.2, 1, E.out3(k)), scale: sc, sh: [3, 6], shM: sc * 1.3, shA: 0.4 }); } }
      else if (o.spaceBeat) li++;
      x += it.cw + gap;
    }
    return total;
  }

  /* =========================================================== PLAY · CURSOR · SUBSCRIBE */
  function playKit(size) {
    const s = Math.max(40, Math.round(size / 8) * 8), key = 'play' + s; if (SPR.has(key + 'r')) return { r: SPR.get(key + 'r'), tri: SPR.get(key + 't'), s };
    const w = s, h = s * 0.7, res = s < 400 ? 1.5 : 1;
    const red = piece(key + 'r', rrect(w, h, h * 0.3, 7), { fill: PAL.red, tex: 'mottle', res, wMin: 2, wMax: Math.max(6, s / 28), wave: Math.max(2.5, s / 70), scale: s / 7, blur: s / 40, dots: { col: 'rgba(255,200,190,0.3)', step: Math.max(6, s / 42), r0: 0.05, r1: 0.42, dir: [1, 1] } });
    const tri = piece(key + 't', ngon(h * 0.27, 3, 0, 1.08), { fill: PAL.paper, res, wMin: 0.5, wMax: 3, wave: 2, scale: s / 14, blur: s / 80, line: false });
    return { r: red, tri, s };
  }
  // red paper play button, size = width. o: press 0..1, rot, alpha, t0 (drop-in)
  async function play(ctx, cx, cy, size, t, o = {}) {
    const K = playKit(size), sc = size / K.s, h = size * 0.7, pr = clamp(o.press || 0), d = o.t0 != null ? drop(t, o.t0, { h: cy + h }) : { dy: 0, sx: 1, sy: 1, on: true };
    if (!d.on) return;
    const sx = (1 + 0.06 * pr) * d.sx, sy = (1 - 0.13 * pr) * d.sy, y = cy + d.dy + (1 - sy) * h * 0.5, a = o.alpha ?? 1, rot = o.rot || 0;
    drawPiece(ctx, K.r, cx, y, { rot, scale: sc, sx, sy, alpha: a, sh: [6 * (1 - pr * 0.6), 10 * (1 - pr * 0.6)], shA: 0.45 });
    drawPiece(ctx, K.tri, cx + h * 0.045 * Math.cos(rot), y + h * 0.045 * Math.sin(rot), { rot, scale: sc, sx, sy, alpha: a, sh: [2, 3], shA: 0.35 });
  }
  const ARROW = [[0, 0], [0, 0.8], [0.2, 0.63], [0.34, 0.95], [0.47, 0.89], [0.33, 0.58], [0.58, 0.58]];
  function cursorSprite(size) {
    const s = Math.max(24, Math.round(size / 4) * 4), key = 'cur' + s, pts = ARROW.map(([x, y]) => [x * s, y * s]), J = torn(pts, 61, { wave: 1.2, amp: 0.8, scale: 18, wMax: 1 });
    return sprite(key, [-s * 0.12, -s * 0.12, s * 0.84, s * 1.2], (x) => {
      x.lineJoin = 'round'; x.strokeStyle = pat(x, PAL.paper); x.lineWidth = s * 0.17; x.stroke(J.P); x.fillStyle = pat(x, PAL.paper); x.fill(J.P);
      const p = toPath(pts); x.fillStyle = '#FFFFFF'; x.fill(p); x.strokeStyle = PAL.ink; x.lineWidth = s * 0.05; x.stroke(p);
    }, { blur: 5, res: 1.5 });
  }
  // paper arrow cursor with its tip at (x,y). o: size (90), click 0..1, rot, alpha
  async function cursor(ctx, x, y, t, o = {}) {
    const size = o.size || 90, P = cursorSprite(size), sc = (size / Math.max(24, Math.round(size / 4) * 4)) * (1 - 0.16 * clamp(o.click || 0));
    drawPiece(ctx, P, x, y, { scale: sc, rot: o.rot ?? -0.08, alpha: o.alpha, sh: [5, 8], shA: 0.4 });
  }
  function checkPath(x, cx, cy, s) { x.beginPath(); x.moveTo(cx - s * 0.5, cy); x.lineTo(cx - s * 0.12, cy + s * 0.38); x.lineTo(cx + s * 0.55, cy - s * 0.42); }
  function subKit(hgt, labels) {
    const [LA, LB] = labels || ['SUBSCRIBE', 'SUBSCRIBED'], h = Math.round(hgt / 4) * 4, key = 'sub' + h + '|' + LA + '|' + LB; if (SPR.has(key + 'a')) return { a: SPR.get(key + 'a'), b: SPR.get(key + 'b'), bell: SPR.get(key + 'bell'), h, wa: SPR.get(key + 'a').cw, wb: SPR.get(key + 'b').cw };
    const fz = h * 0.42, f = `900 ${fz}px "Be Vietnam Pro"`, M = mk(4, 4).getContext('2d'); M.font = f; M.letterSpacing = `${fz * 0.04}px`;
    const twA = M.measureText(LA).width, twB = M.measureText(LB).width + fz * 1.1, wa = twA + h * 0.9, wb = twB + h * 0.9;
    const a = piece(key + 'a', rrect(wa, h, h * 0.22, 5), { fill: PAL.red, tex: 'mottle', wMin: 2, wMax: 10, wave: 3, scale: 40, paint: (x, b) => { x.fillStyle = pat(x, PAL.red, 'mottle'); x.fillRect(b[0] - 3, b[1] - 3, b[2] + 6, b[3] + 6); halftone(x, b, { col: 'rgba(255,200,190,0.25)', step: 8, r0: 0.05, r1: 0.4, dir: [1, 1] }); x.font = f; x.letterSpacing = `${fz * 0.04}px`; x.fillStyle = PAL.paper; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(LA, 0, fz * 0.04); } });
    const b = piece(key + 'b', rrect(wb, h, h * 0.22, 5), { fill: '#CFCBC3', wMin: 2, wMax: 10, wave: 3, scale: 40, paint: (x, bb) => { x.fillStyle = pat(x, '#CFCBC3', 'mottle'); x.fillRect(bb[0] - 3, bb[1] - 3, bb[2] + 6, bb[3] + 6); x.font = f; x.letterSpacing = `${fz * 0.04}px`; x.fillStyle = '#3A3733'; x.textAlign = 'left'; x.textBaseline = 'middle'; const x0 = -twB / 2; x.fillText(LB, x0, fz * 0.04); checkPath(x, x0 + twB - fz * 0.45, 0, fz * 0.75); x.strokeStyle = '#3A3733'; x.lineWidth = fz * 0.16; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(); } });
    a.cw = wa; b.cw = wb;
    const br = h * 0.36, bell = sprite(key + 'bell', [-br * 1.4, -br * 1.4, br * 2.8, br * 2.9], (x) => {
      const p = new Path2D(); p.moveTo(-br * 0.95, br * 0.62); p.quadraticCurveTo(-br * 0.62, br * 0.38, -br * 0.66, -br * 0.1); p.bezierCurveTo(-br * 0.66, -br * 0.9, br * 0.66, -br * 0.9, br * 0.66, -br * 0.1); p.quadraticCurveTo(br * 0.62, br * 0.38, br * 0.95, br * 0.62); p.closePath();
      x.lineJoin = 'round'; x.strokeStyle = pat(x, PAL.paper); x.lineWidth = br * 0.45; x.stroke(p); x.beginPath(); x.arc(0, br * 0.78, br * 0.42, 0, TAU); x.fillStyle = pat(x, PAL.paper); x.fill();
      x.fillStyle = pat(x, PAL.yellow, 'mottle'); x.fill(p); x.strokeStyle = PAL.ink; x.lineWidth = br * 0.1; x.stroke(p);
      x.beginPath(); x.arc(0, br * 0.78, br * 0.2, 0, TAU); x.fillStyle = PAL.yellow; x.fill(); x.stroke(); x.beginPath(); x.arc(0, -br * 0.8, br * 0.12, 0, TAU); x.fill(); x.stroke();
    }, { blur: 4 });
    return { a, b, bell, h, wa, wb };
  }
  // red SUBSCRIBE → (o.tClick) squash + flip → grey SUBSCRIBED ✓, bell wiggles. o: h (110), tClick, t0 (drop-in), bell (true), labels ([before, after-click without ✓]; default ['SUBSCRIBE','SUBSCRIBED'])
  async function subscribe(ctx, cx, cy, t, o = {}) {
    const K = subKit(o.h || 110, o.labels), sc = (o.h || 110) / K.h, h = K.h * sc, tc = o.tClick ?? 1e9;
    let d = o.t0 != null ? drop(t, o.t0, { h: cy + h }) : { dy: 0, sx: 1, sy: 1, on: true };
    if (o.slap != null) { const k = slap(t, o.slap, 3, 1.5); d = { dy: 0, sx: k, sy: k, on: t >= o.slap }; } // slaps in place (1.5 → 1 in 3 frames)
    if (!d.on) return;
    let sx = d.sx, sy = d.sy, state = t < tc + 3 / 24 ? 'a' : 'b';
    const u = t - tc;
    if (u >= 0 && u < 2 / 24) { sx *= 1.05; sy *= 0.86; }
    if (u >= 1 / 24 && u < 5 / 24) { const q = (u - 1 / 24) / (4 / 24); sx *= Math.max(0.02, Math.abs(Math.cos(q * Math.PI))); state = q < 0.5 ? 'a' : 'b'; }
    if (u >= 5 / 24) { const v = u - 5 / 24, s = Math.exp(-v * 8) * Math.cos(v * 26); sx *= 1 + 0.06 * s; sy *= 1 - 0.07 * s; }
    const y = cy + d.dy + (1 - sy) * h * 0.5;
    drawPiece(ctx, state === 'a' ? K.a : K.b, cx, y, { scale: sc, sx, sy, sh: [5, 9], shA: 0.42 });
    if (o.bell !== false) { const bx = cx + (K.wb * sc) / 2 + h * 0.75, v = t - (tc + 0.2), w = v > 0 ? 0.55 * Math.sin(v * 34) * Math.exp(-v * 3.2) : 0; drawPiece(ctx, K.bell, bx, y - h * 0.05, { scale: sc * d.sx, sy: d.sy, rot: w, sh: [4, 6], shA: 0.4 });
      if (v > 0 && v < 0.9) { ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3 * sc; ctx.lineCap = 'round'; const a = 1 - v / 0.9; ctx.globalAlpha = a; for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) { const rr = h * (0.45 + i * 0.16); ctx.beginPath(); ctx.arc(bx, y - h * 0.08, rr, sd > 0 ? -0.5 : Math.PI - 0.5 + 1, sd > 0 ? 0.5 : Math.PI + 0.5); ctx.stroke(); } ctx.restore(); } }
  }

  /* =========================================================== TAG */
  const TAGC = { white: [PAL.paper, PAL.ink], yellow: [PAL.yellow, PAL.ink], red: [PAL.red, PAL.paper], ink: [PAL.ink, PAL.paper], cobalt: [PAL.cobalt, PAL.paper], pink: [PAL.pink, PAL.ink], cyan: [PAL.cyan, PAL.ink] };
  function tagKit(str, o) {
    const size = Math.round(o.size || 30), col = o.color || 'white', fnt = o.font || 'mono', key = ['tag', str, size, col, fnt, o.seed || 1].join('~'); if (SPR.has(key)) return SPR.get(key);
    const [bg, fg] = TAGC[col] || [col, o.textColor || PAL.ink], f = fnt === 'mono' ? `700 ${size}px "JetBrains Mono"` : `900 ${size}px "Inter Tight"`, ls = size * (fnt === 'mono' ? 0.02 : 0.03);
    const M = mk(4, 4).getContext('2d'); M.font = f; M.letterSpacing = `${ls}px`; const tw = M.measureText(str).width, w = tw + size * 1.1, h = size * 1.75;
    const r = rng(hs(key)), j = size * 0.08, pts = [[-w / 2, -h / 2 + (r() - 0.5) * j], [w / 2 + (r() - 0.5) * j, -h / 2], [w / 2, h / 2 + (r() - 0.5) * j], [-w / 2 + (r() - 0.5) * j, h / 2]];
    const P = piece(key, pts, { seed: hs(key), wMin: 1, wMax: 7, wave: 2.5, scale: 34, paint: (x, b) => { x.fillStyle = pat(x, bg, 'mottle'); x.fillRect(b[0] - 3, b[1] - 3, b[2] + 6, b[3] + 6); x.font = f; x.letterSpacing = `${ls}px`; x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(str, 0, size * 0.06); } });
    P.tw = w; P.th = h; return P;
  }
  function tapeSprite(w, h) {
    const key = 'tape' + Math.round(w) + 'x' + Math.round(h);
    return sprite(key, [-w / 2, -h / 2, w, h], (x) => {
      const r = rng(hs(key)), pts = []; const zz = 7;
      for (let i = 0; i <= zz; i++) pts.push([-w / 2 + (i % 2) * h * 0.08, -h / 2 + (i / zz) * h]);
      for (let i = zz; i >= 0; i--) pts.push([w / 2 - (i % 2) * h * 0.08, -h / 2 + (i / zz) * h]);
      const p = new Path2D(); p.moveTo(-w / 2, -h / 2); p.lineTo(w / 2, -h / 2); for (let i = 0; i <= zz; i++) p.lineTo(w / 2 - (i % 2) * h * 0.09, -h / 2 + (i / zz) * h); p.lineTo(-w / 2, h / 2); for (let i = zz; i >= 0; i--) p.lineTo(-w / 2 + (i % 2) * h * 0.09, -h / 2 + (i / zz) * h); p.closePath();
      x.fillStyle = 'rgba(238,230,205,0.62)'; x.fill(p); x.save(); x.clip(p); for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(255,255,255,${0.06 + r() * 0.1})`; x.fillRect(-w / 2 + r() * w, -h / 2, 1 + r() * 4, h); } x.restore();
      x.strokeStyle = 'rgba(140,120,90,0.25)'; x.lineWidth = 1; x.stroke(p);
    }, { shadow: false, pad: 2 });
  }
  // scrapbook tag. (x,y) = centre (o.anchor 'left'|'right' to pin an edge). o: color white|yellow|red|ink|cobalt|pink|cyan|#hex, font 'mono'|'sans', size (30), rot (rad), pop 0..1 (or t0 + t), tape 'left'|'right'|'top'|false
  async function tag(ctx, x, y, str, o = {}) {
    const P = tagKit(str, o), rot = o.rot ?? -0.03, pop = o.t0 != null && o.t != null ? (o.t < o.t0 ? 0 : clamp((Math.floor((o.t - o.t0) * 24 + 1e-6) + 1) / 3)) : (o.pop ?? 1);
    if (pop <= 0) return;
    const sc = lerp(1.4, 1, E.out3(pop)) * (o.scale || 1), ax = o.anchor === 'left' ? P.tw / 2 : o.anchor === 'right' ? -P.tw / 2 : 0, cx = x + ax * Math.cos(rot) * sc, cy = y + ax * Math.sin(rot) * sc;
    drawPiece(ctx, P, cx, cy, { rot: rot * lerp(2, 1, pop), scale: sc, sh: [3, 6], shM: sc * 1.2, shA: 0.4 });
    if (o.tape !== false) {
      const side = o.tape || 'left', T = tapeSprite(P.th * 1.25, P.th * 0.55), loc = side === 'right' ? [P.tw / 2 - P.th * 0.15, 0, Math.PI / 2 + 0.25] : side === 'top' ? [0, -P.th / 2, 0.08] : [-P.tw / 2 + P.th * 0.15, 0, Math.PI / 2 - 0.25];
      const c = Math.cos(rot), s = Math.sin(rot); drawPiece(ctx, T, cx + (loc[0] * c - loc[1] * s) * sc, cy + (loc[0] * s + loc[1] * c) * sc, { rot: rot + loc[2], scale: sc, shadow: false });
    }
  }

  /* =========================================================== THUMBNAIL CARD */
  function thumbFrame(w, h, seed) {
    const key = ['thf', Math.round(w), Math.round(h), seed].join('_'), b = w * 0.045;
    return piece(key, rectPts(w + b * 2, h + b * 2.0), { seed: seed + 3, fill: PAL.paper, edge: true, wMin: 1, wMax: 6, wave: 3, scale: 40, blur: 9 });
  }
  const THC = new Map();
  async function thumbInner(name, bg, w, h, seed) {
    const key = [name, bg, Math.round(w), Math.round(h), seed].join('_'); if (THC.has(key)) return THC.get(key);
    const c = mk(w, h), x = c.getContext('2d');
    x.fillStyle = pat(x, bg, 'mottle'); x.fillRect(0, 0, w, h);
    x.save(); x.translate(w / 2, h * 0.55); for (let i = 0; i < 16; i++) { x.rotate(TAU / 16); x.fillStyle = i % 2 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.04)'; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, -w * 0.2); x.lineTo(w, w * 0.2); x.closePath(); x.fill(); } x.restore();
    halftone(x, [0, 0, w, h], { col: 'rgba(255,255,255,0.22)', step: Math.max(6, w / 40), r0: 0.05, r1: 0.4, dir: [0, 1] });
    if (name) { const C = await cut(name), s = Math.min(w * 0.82 / C.w, h * 0.78 / C.h); drawCut(x, C, w / 2, h * 0.53, C.h * s, { sh: [6, 9] }); }
    THC.set(key, c); return c;
  }
  // rect [x,y,w,h] = the video area. o: draw async (ctx, [0,0,w,h], t) | name (cut-out) + bg colour, progress 0..1, dur '12:04', t0 slap-in, rot, seed, t
  async function thumb(ctx, rect, t, o = {}) {
    const [rx, ry, w, h] = rect, seed = o.seed || 1, lt = o.t0 != null ? t - o.t0 : 1;
    if (lt < 0) return;
    const k = clamp((Math.floor(lt * 24 + 1e-6) + 1) / 3), sc = lerp(1.35, 1, E.out3(k)), rot = (o.rot ?? 0) * lerp(2.5, 1, E.out3(k)), cx = rx + w / 2, cy = ry + h / 2;
    const F = thumbFrame(w, h, seed);
    let inner;
    if (o.draw) { inner = pool('clx_thumb', w, h); const ix = inner.getContext('2d'); await o.draw(ix, [0, 0, w, h], t); }
    else inner = await thumbInner(o.name || null, o.bg || pick(rng(seed), [PAL.yellow, PAL.cyan, PAL.pink, PAL.orange, PAL.lime]), w, h, seed);
    drawPiece(ctx, F, cx, cy, { rot, scale: sc, sh: [6, 10], shM: sc * 1.3, shA: 0.45 });
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(inner, 0, 0, w, h);
    const bh = Math.max(4, h * 0.035); ctx.fillStyle = 'rgba(30,30,30,0.35)'; ctx.fillRect(0, h - bh, w, bh); ctx.fillStyle = PAL.red; ctx.fillRect(0, h - bh, w * clamp(o.progress ?? 0.35), bh);
    if (o.dur !== false) { const fz = Math.max(11, h * 0.085), s = o.dur || '12:04'; ctx.font = `700 ${fz}px "JetBrains Mono"`; const tw = ctx.measureText(s).width, pw = tw + fz * 0.7, ph = fz * 1.35; ctx.fillStyle = 'rgba(12,12,12,0.88)'; ENG.roundRect(ctx, w - pw - fz * 0.5, h - bh - ph - fz * 0.4, pw, ph, fz * 0.25); ctx.fill(); ctx.fillStyle = '#F4F1EC'; ctx.textBaseline = 'middle'; ctx.fillText(s, w - pw - fz * 0.5 + fz * 0.35, h - bh - ph / 2 - fz * 0.4 + 1); }
    ctx.restore();
  }

  /* =========================================================== SCREEN (prompt UI on a device) */
  function triDraw(ctx, img, s0, s1, s2, d0, d1, d2) {
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, ex = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.9, p[1] + dy / l * 0.9]; };
    const e0 = ex(d0), e1 = ex(d1), e2 = ex(d2);
    ctx.save(); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    const u0 = s1[0] - s0[0], u1 = s1[1] - s0[1], v0 = s2[0] - s0[0], v1 = s2[1] - s0[1], U0 = d1[0] - d0[0], U1 = d1[1] - d0[1], V0 = d2[0] - d0[0], V1 = d2[1] - d0[1], det = u0 * v1 - v0 * u1 || 1e-6;
    const a = (U0 * v1 - V0 * u1) / det, c = (-U0 * v0 + V0 * u0) / det, b = (U1 * v1 - V1 * u1) / det, d = (-U1 * v0 + V1 * u0) / det;
    ctx.transform(a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]); ctx.drawImage(img, 0, 0); ctx.restore();
  }
  function drawQuad(ctx, img, q, n = 6) {
    const iw = img.width, ih = img.height, P = (u, v) => [lerp(lerp(q[0][0], q[1][0], u), lerp(q[3][0], q[2][0], u), v), lerp(lerp(q[0][1], q[1][1], u), lerp(q[3][1], q[2][1], u), v)];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n, a = P(u0, v0), b = P(u1, v0), c = P(u1, v1), d = P(u0, v1);
      triDraw(ctx, img, [u0 * iw, v0 * ih], [u1 * iw, v0 * ih], [u1 * iw, v1 * ih], a, b, c);
      triDraw(ctx, img, [u0 * iw, v0 * ih], [u1 * iw, v1 * ih], [u0 * iw, v1 * ih], a, c, d);
    }
  }
  // quad: [x,y,w,h] or [[x,y]×4] TL,TR,BR,BL. Types o.text from t0 at o.cps (20) chars/s, cursor to "generate ✦", click at o.tClick, flash, then o.drawResult(ctx,[0,0,w,h],t)
  // o: text, cps, tClick, drawResult, bg, res (UI px width), pill ('generate ✦'), title, label ('PROMPT'), placeholder, fontSize
  // A portrait quad (phone) gets an app layout: status bar, coloured header with o.title, order card, full-width button, finger tap instead of the cursor.
  async function screen(ctx, quad, t, t0, o = {}) {
    const isRect = typeof quad[0] === 'number', qw = isRect ? quad[2] : (Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]) + Math.hypot(quad[2][0] - quad[3][0], quad[2][1] - quad[3][1])) / 2;
    const qh = isRect ? quad[3] : (Math.hypot(quad[3][0] - quad[0][0], quad[3][1] - quad[0][1]) + Math.hypot(quad[2][0] - quad[1][0], quad[2][1] - quad[1][1])) / 2;
    const port = qh > qw * 1.15;
    const uw = Math.round(o.res || (port ? Math.min(900, Math.max(480, qw * 1.6)) : Math.min(1600, Math.max(640, qw * 1.25)))), uh = Math.round(uw * qh / qw), U = pool(port ? 'clx_screenP' : 'clx_screen', uw, uh), x = U.getContext('2d');
    const text = o.text || 'a pink race car in the clouds', cps = o.cps || 20, nT = [...text].length, tType = t0 + nT / cps, tc = o.tClick ?? tType + 0.55, lt = t - t0, s = uw / (port ? 560 : 1000);
    if (t < tc + 1 / 24 || !o.drawResult) {
      const g = x.createLinearGradient(0, 0, 0, uh); g.addColorStop(0, o.bg || '#F5F1E8'); g.addColorStop(1, o.bg2 || '#EDE6F3'); x.fillStyle = g; x.fillRect(0, 0, uw, uh);
      x.fillStyle = pat(x, '#F5F1E8'); x.globalAlpha = 0.35; x.fillRect(0, 0, uw, uh); x.globalAlpha = 1;
      if (!port) {
        [[PAL.red, 0], [PAL.yellow, 1], [PAL.olive, 2]].forEach(([c, i]) => { x.fillStyle = c; x.beginPath(); x.arc(30 * s + i * 26 * s, 28 * s, 8 * s, 0, TAU); x.fill(); });
        x.font = `700 ${22 * s}px "JetBrains Mono"`; x.fillStyle = 'rgba(20,20,20,0.55)'; x.textBaseline = 'middle'; x.fillText(o.title || 'kaye ✦ studio', 120 * s, 29 * s);
        const fw = uw * 0.82, fh = uh * 0.3, fx = (uw - fw) / 2, fy = uh * 0.2;
        x.save(); x.shadowColor = 'rgba(40,30,60,0.18)'; x.shadowBlur = 24 * s; x.shadowOffsetY = 8 * s; x.fillStyle = '#FFFFFF'; ENG.roundRect(x, fx, fy, fw, fh, 26 * s); x.fill(); x.restore();
        x.strokeStyle = 'rgba(20,20,20,0.1)'; x.lineWidth = 2 * s; ENG.roundRect(x, fx, fy, fw, fh, 26 * s); x.stroke();
        x.font = `700 ${18 * s}px "JetBrains Mono"`; x.fillStyle = 'rgba(20,20,20,0.4)'; x.textBaseline = 'top'; x.fillText(o.label ?? 'PROMPT', fx + 36 * s, fy + 22 * s);
        // wrap the full prompt once (stable layout), then reveal characters
        const n = clamp(Math.floor(lt * cps + 1e-6), 0, nT), fz = Math.min(fh * 0.26, o.fontSize ? o.fontSize * s : 54 * s), maxW = fw - 80 * s;
        x.font = `500 ${fz}px "JetBrains Mono"`;
        const words = text.split(' '), lines = []; let cur = '';
        for (const wd of words) { const tryL = cur ? cur + ' ' + wd : wd; if (x.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tryL; } if (cur) lines.push(cur);
        x.fillStyle = PAL.ink; x.textBaseline = 'middle'; let left = n, caretX = fx + 36 * s, caretY = fy + 62 * s + fz * 0.6;
        lines.forEach((ln, li) => { const ly = fy + 62 * s + fz * 0.6 + li * fz * 1.3, take = Math.max(0, Math.min(ln.length, left)); const part = ln.slice(0, take); x.fillText(part, fx + 36 * s, ly); if (left >= 0 && take > 0) { caretX = fx + 36 * s + x.measureText(part).width + 4 * s; caretY = ly; } left -= ln.length + 1; });
        if (n === 0) { x.fillStyle = 'rgba(20,20,20,0.3)'; x.fillText(o.placeholder || 'describe a shot…', fx + 36 * s, fy + 62 * s + fz * 0.6); }
        const caretOn = (lt >= 0 && lt < nT / cps) || Math.floor(t * 4) % 2 === 0; if (caretOn) { x.fillStyle = PAL.red; x.fillRect(caretX, caretY - fz * 0.62, 4 * s, fz * 1.24); }
        // generate pill
        const pf = `800 ${40 * s}px "Inter Tight"`; x.font = pf; const label = o.pill || 'generate ✦', pw = x.measureText(label).width + 80 * s, ph = 84 * s, px = fx + fw - pw, py = fy + fh + 40 * s;
        const pressed = t >= tc && t < tc + 3 / 24, hover = t >= tc - 0.25;
        x.save(); x.translate(px + pw / 2, py + ph / 2); const psc = pressed ? 0.93 : hover ? 1.04 : 1; x.scale(psc, psc);
        x.fillStyle = pressed ? '#000' : PAL.ink; ENG.roundRect(x, -pw / 2, -ph / 2, pw, ph, ph / 2); x.fill(); x.fillStyle = hover ? PAL.yellow : '#FFFFFF'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 0, 2 * s); x.restore();
        // cursor travels to the pill and clicks
        const tm0 = Math.max(t0 + 0.2, tc - 0.75), mk_ = E.inOut3(clamp((t - tm0) / (tc - 0.04 - tm0))), cxp = lerp(uw * 0.9, px + pw * 0.55, mk_), cyp = lerp(uh * 1.02, py + ph * 0.55, mk_), click = t >= tc && t < tc + 3 / 24 ? 1 : 0;
        await cursor(x, cxp, cyp, t, { size: 70 * s, click });
      } else {
        // status bar + header
        x.font = `700 ${22 * s}px "Inter Tight"`; x.fillStyle = PAL.ink; x.textBaseline = 'middle'; x.fillText('9:41', 30 * s, 30 * s);
        x.fillRect(uw - 70 * s, 22 * s, 40 * s, 17 * s); x.fillStyle = '#FFFFFF'; x.fillRect(uw - 67 * s, 25 * s, 34 * s, 11 * s); x.fillStyle = PAL.ink; x.fillRect(uw - 67 * s, 25 * s, 24 * s, 11 * s);
        const hy = 62 * s, hh = 110 * s; x.fillStyle = pat(x, PAL.red, 'mottle'); x.fillRect(0, hy, uw, hh);
        x.font = `800 ${38 * s}px "Inter Tight"`; x.fillStyle = PAL.paper; x.textAlign = 'center'; x.fillText(o.title || 'kaye ✦ studio', uw / 2, hy + hh / 2); x.textAlign = 'left';
        // order card
        const fw = uw * 0.86, fh = uh * 0.24, fx = (uw - fw) / 2, fy = hy + hh + uh * 0.08;
        x.save(); x.shadowColor = 'rgba(40,30,60,0.18)'; x.shadowBlur = 24 * s; x.shadowOffsetY = 8 * s; x.fillStyle = '#FFFFFF'; ENG.roundRect(x, fx, fy, fw, fh, 26 * s); x.fill(); x.restore();
        x.font = `700 ${19 * s}px "JetBrains Mono"`; x.fillStyle = 'rgba(20,20,20,0.4)'; x.textBaseline = 'top'; x.fillText(o.label ?? 'PROMPT', fx + 28 * s, fy + 22 * s);
        const n = clamp(Math.floor(lt * cps + 1e-6), 0, nT), fz = (o.fontSizePhone || 42) * s, maxW = fw - 56 * s;
        x.font = `600 ${fz}px "Inter Tight"`;
        const words = text.split(' '), lines = []; let cur = '';
        for (const wd of words) { const tryL = cur ? cur + ' ' + wd : wd; if (x.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tryL; } if (cur) lines.push(cur);
        x.fillStyle = PAL.ink; x.textBaseline = 'middle'; let left = n, caretX = fx + 28 * s, caretY = fy + 70 * s + fz * 0.6;
        lines.forEach((ln, li) => { const chs = [...ln], ly = fy + 70 * s + fz * 0.6 + li * fz * 1.3, take = Math.max(0, Math.min(chs.length, left)), part = chs.slice(0, take).join(''); x.fillText(part, fx + 28 * s, ly); if (left >= 0 && take > 0) { caretX = fx + 28 * s + x.measureText(part).width + 3 * s; caretY = ly; } left -= chs.length + 1; });
        if (n === 0) { x.fillStyle = 'rgba(20,20,20,0.3)'; x.fillText(o.placeholder || 'describe a shot…', fx + 28 * s, fy + 70 * s + fz * 0.6); }
        const caretOn = (lt >= 0 && lt < nT / cps) || Math.floor(t * 4) % 2 === 0; if (caretOn) { x.fillStyle = PAL.red; x.fillRect(caretX, caretY - fz * 0.62, 3 * s, fz * 1.24); }
        // full-width button + finger tap
        x.font = `800 ${40 * s}px "Inter Tight"`; const label = o.pill || 'generate ✦', pw = fw, ph = 96 * s, px = fx, py = fy + fh + 34 * s;
        const pressed = t >= tc && t < tc + 3 / 24, hover = t >= tc - 0.12;
        x.save(); x.translate(px + pw / 2, py + ph / 2); const psc = pressed ? 0.95 : 1; x.scale(psc, psc);
        x.fillStyle = pressed ? '#000' : PAL.ink; ENG.roundRect(x, -pw / 2, -ph / 2, pw, ph, ph / 2); x.fill(); x.fillStyle = hover ? PAL.yellow : '#FFFFFF'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 0, 2 * s); x.restore();
        // menu row under the button: o.menu = cut-out names (the shop's products), each on a white card
        const mn = (o.menu || []).slice(0, 3); if (mn.length) { const gap = 18 * s, cw = (fw - gap * (mn.length - 1)) / mn.length, cy0 = py + ph + 46 * s, chh = Math.min(cw * 1.25, uh - cy0 - 40 * s);
          x.font = `700 ${19 * s}px "JetBrains Mono"`; x.fillStyle = 'rgba(20,20,20,0.4)'; x.textBaseline = 'top'; if (o.menuLabel) x.fillText(o.menuLabel, fx + 4 * s, cy0 - 30 * s);
          for (let i = 0; i < mn.length; i++) { const cx0 = fx + i * (cw + gap); x.save(); x.shadowColor = 'rgba(40,30,60,0.14)'; x.shadowBlur = 16 * s; x.shadowOffsetY = 5 * s; x.fillStyle = '#FFFFFF'; ENG.roundRect(x, cx0, cy0, cw, chh, 20 * s); x.fill(); x.restore();
            if (window.CL) await window.CL.sprite(x, mn[i], cx0 + cw / 2, cy0 + chh * 0.52, { h: chh * 0.74, shadow: false }); } }
        const tk = (t - (tc - 2 / 24)) / 0.3; if (tk >= 0 && tk < 1) { const cx_ = px + pw * 0.62, cy_ = py + ph * 0.55; x.save(); x.globalAlpha = 1 - tk; x.strokeStyle = PAL.ink; x.lineWidth = 5 * s; x.beginPath(); x.arc(cx_, cy_, lerp(18, 70, E.out3(tk)) * s, 0, TAU); x.stroke(); x.fillStyle = 'rgba(20,20,20,0.35)'; x.beginPath(); x.arc(cx_, cy_, 22 * s, 0, TAU); x.fill(); x.restore(); }
      }
    }
    if (o.drawResult && t >= tc + 1 / 24) {
      const rk = clamp((t - tc - 1 / 24) / 0.25); x.save(); x.clearRect(0, 0, uw, uh); x.translate(uw / 2, uh / 2); const z = lerp(1.12, 1, E.out3(rk)); x.scale(z, z); x.translate(-uw / 2, -uh / 2); await o.drawResult(x, [0, 0, uw, uh], t); x.restore();
    }
    const fl = t >= tc && t < tc + 0.17 ? 1 - (t - tc) / 0.17 : 0; if (fl > 0) { x.fillStyle = `rgba(255,253,245,${0.92 * fl})`; x.fillRect(0, 0, uw, uh); }
    if (isRect) ctx.drawImage(U, quad[0], quad[1], quad[2], quad[3]); else drawQuad(ctx, U, quad, o.grid || 6);
  }

  /* =========================================================== CONFETTI · SPEED · STAR */
  function confPiece(shape, col, v) {
    const key = ['conf', shape, col, v].join('_'); if (SPR.has(key)) return SPR.get(key);
    const r = rng(hs(key)), s = 34;
    const pts = shape === 'tri' ? [[-s * 0.5, s * 0.35], [s * 0.5, s * 0.3 + (r() - 0.5) * 8], [(r() - 0.5) * 12, -s * 0.55]] : shape === 'chip' ? rectPts(s * 0.75, s * 0.5) : [[-s * 0.9, 0], [0, -s * 0.12], [s * 0.9, 0], [0, s * 0.12]];
    return piece(key, pts, { fill: col, tex: 'mottle', wMin: 0.8, wMax: 4, wave: 1.5, amp: 1.2, scale: 14, blur: 3, res: 1.5 });
  }
  // paper confetti. o: mode 'burst'|'rain', x, y, n (40), speed, spread, angle, gravity, size (1), dur, seed, colors, keep, twos
  async function confetti(ctx, t, t0, o = {}) {
    if (t < t0) return;
    const tq = o.twos === false ? t : tq12(t) / 12, u = Math.max(0, tq - t0), dur = o.dur ?? 2.2; if (u > dur && !o.keep) return;
    const n = o.n || 40, r = rng(o.seed || 12), cols = o.colors || [PAL.red, PAL.yellow, PAL.cobalt, PAL.cyan, PAL.hotpink, PAL.paper, PAL.orange, PAL.lime], g = o.gravity ?? 1500, mode = o.mode || 'burst', x0 = o.x ?? W / 2, y0 = o.y ?? H / 2;
    for (let i = 0; i < n; i++) {
      const rs = [r(), r(), r(), r(), r(), r(), r(), r(), r(), r()];
      const shape = rs[0] < 0.6 ? 'tri' : rs[0] < 0.85 ? 'chip' : 'sliver', col = cols[Math.floor(rs[1] * cols.length)], P = confPiece(shape, col, Math.floor(rs[2] * 3)), sz = (0.7 + rs[3] * 1.1) * (o.size || 1);
      let x, y;
      if (mode === 'rain') { x = rs[4] * W + Math.sin(u * 2.5 + i) * 40; y = -60 + ((u * (260 + rs[5] * 380) + rs[6] * (H + 120)) % (H + 160)); }
      else { const a = (o.angle ?? -Math.PI / 2) + (rs[4] - 0.5) * (o.spread ?? Math.PI * 1.7), sp = (o.speed ?? 1300) * (0.35 + 0.65 * rs[5]), k = 2.2, e = (1 - Math.exp(-k * u)) / k; x = x0 + Math.cos(a) * sp * e; y = y0 + Math.sin(a) * sp * e + 0.5 * g * u * u * 0.55; }
      const flip = Math.cos(u * (5 + rs[7] * 9) + rs[8] * 6);
      drawPiece(ctx, P, x, y, { rot: rs[9] * TAU + u * (rs[7] - 0.5) * 14, scale: sz, sy: Math.abs(flip) < 0.15 ? 0.15 * Math.sign(flip || 1) : flip, sh: [3, 5], shA: 0.3 });
    }
  }
  function sliverPiece(i, v) {
    const key = 'sliv' + i + '_' + v; if (SPR.has(key)) return SPR.get(key);
    const r = rng(hs(key)), len = 400, th = 10 + r() * 8, pts = [];
    for (let j = 0; j <= 10; j++) pts.push([-len / 2 + len * j / 10, -th / 2 * Math.sin(Math.PI * j / 10) * (0.7 + r() * 0.5)]);
    for (let j = 10; j >= 0; j--) pts.push([-len / 2 + len * j / 10, th / 2 * Math.sin(Math.PI * j / 10) * (0.7 + r() * 0.5)]);
    return piece(key, pts, { fill: PAL.paper, wMin: 0.5, wMax: 3, wave: 2.4, amp: 1.6, scale: 20, blur: 3 });
  }
  // torn white speed slivers streaking along o.angle. o: n (14), angle (0 = moving right), speed px/s, rect [x,y,w,h], alpha, seed, len [min,max], thick
  async function speed(ctx, t, o = {}) {
    const n = o.n || 14, ang = o.angle ?? 0, rect = o.rect || [0, 0, W, H], bt = tq12(t), tq = bt / 12, v = o.speed ?? 2600, span = Math.hypot(rect[2], rect[3]) + 800, lmin = o.len ? o.len[0] : 180, lmax = o.len ? o.len[1] : 700;
    ctx.save(); ctx.beginPath(); ctx.rect(rect[0], rect[1], rect[2], rect[3]); ctx.clip(); ctx.translate(rect[0] + rect[2] / 2, rect[1] + rect[3] / 2); ctx.rotate(ang);
    for (let i = 0; i < n; i++) {
      const r = rng((o.seed || 21) * 131 + i * 17), len = lmin + r() * (lmax - lmin), y = (r() - 0.5) * Math.hypot(rect[2], rect[3]) * 0.9, sp = v * (0.6 + r() * 0.8), x = ((r() * span + tq * sp) % span) - span / 2;
      drawPiece(ctx, sliverPiece(i % 6, (bt + i) % 3), x, y + (rng(bt * 7 + i)() - 0.5) * 6, { sx: len / 400, sy: (o.thick ?? 1) * (0.6 + r() * 0.8), alpha: o.alpha ?? 0.92, sh: [2, 4], shA: 0.18 });
    }
    ctx.restore();
  }
  // flat paper starburst. o: points (14), inner (0.72), color, dots, rot, spin (rad/s, on twos), text, textColor, font, seed, pop 0..1
  async function star(ctx, cx, cy, r, t, o = {}) {
    const n = o.points || 14, col = o.color || PAL.yellow, R = 100, seed = o.seed || 2, key = ['star', n, o.inner ?? 0.72, col, seed, o.text || '', o.textColor || '', o.font || ''].join('~');
    const P = SPR.get(key) || (() => { const rr = rng(seed), pts = []; for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, q = i % 2 ? (o.inner ?? 0.72) * (0.92 + rr() * 0.16) : 0.9 + rr() * 0.18; pts.push([Math.cos(a) * R * q, Math.sin(a) * R * q]); }
      return piece(key, pts, { fill: col, tex: 'mottle', res: 2, wMin: 1.5, wMax: 7, wave: 2.2, scale: 22, dots: o.dots === false ? null : { col: col === PAL.yellow ? 'rgba(220,120,0,0.25)' : 'rgba(255,255,255,0.25)', step: 7, r0: 0.05, r1: 0.4, dir: [1, 1] },
        paint: o.text ? (x, b) => { x.fillStyle = pat(x, col, 'mottle'); x.fillRect(b[0] - 3, b[1] - 3, b[2] + 6, b[3] + 6); const fz = R * 1.05 / Math.max(2.4, o.text.length * 0.62); x.font = o.font || `400 ${fz}px "Bungee"`; x.fillStyle = o.textColor || PAL.ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.text, 0, fz * 0.06); } : null }); })();
    const sc = (r / R) * (o.pop != null ? lerp(1.4, 1, E.out3(clamp(o.pop))) : 1); if (o.pop != null && o.pop <= 0) return;
    drawPiece(ctx, P, cx, cy, { rot: (o.rot || 0) + (o.spin || 0) * tq12(t) / 12, scale: sc, sh: [4, 7], shA: 0.4 });
  }

  /* =========================================================== WARM-UP (optional) */
  // Pre-builds the heavy t-independent caches so no frame pays the one-off build (call inside a cut's draw, i.e. after fonts are loaded).
  // o: { iris: n, kaleido: segments, title: {lines, size|width, ...titleOpts}, band: {h, seed}, logo: {text, size}, play: size, subscribe: h, cuts: [names], tear: {y0, y1, seed, flapW} }
  async function warm(o = {}) {
    if (o.iris) irisKit(o.iris === true ? 6 : o.iris);
    if (o.kaleido) { kalKit(o.kaleido === true ? 8 : o.kaleido); holeKit(o.holeColor || '#F3A51C'); }
    if (o.title) titleSprite(o.title.lines, o.title.size || autoSize(o.title.lines, o.title.width ?? W * 0.6, o.title.font), o.title);
    if (o.band) bandSprite(o.band.h ?? 300, o.band.seed || 8);
    if (o.logo) { const sz = o.logo.size ?? 168; for (const st of ['red', 'rainbow', 'purple', 'cyan', 'chrome', 'green']) logoSprite(o.logo.text, sz, st, o.logo.seed || 8, o.logo.font); for (const b of ['lime', 'orange', 'pink', 'posters']) flashBg(b); }
    if (o.play) playKit(o.play);
    if (o.subscribe) subKit(o.subscribe, o.subLabels);
    if (o.tear) { const y0 = o.tear.y0 ?? H * 0.36, y1 = o.tear.y1 ?? H * 0.64; tearKit(o.tear.seed || 5, y0, y1, o.tear.flapW ?? Math.max((y1 - y0) * 1.4, W * 0.26)); }
    if (o.cuts) await Promise.all(o.cuts.map(cut));
  }

  window.CLX = Object.assign(window.CLX || {}, {
    PAL, warm, iris, kaleido, rocket, burst, title, tear, logoBand, flashSeq, ransom, play, cursor, subscribe, tag, thumb, screen, confetti, speed, star, drop, slap,
    _: { torn, piece, sprite, drawPiece, pat, patR, paperTile, halftone, crease, fibres, cut, drawCut, layerShadow, pool, drawQuad, ngon, circ, rrect, rectPts, rng, hs, titleSprite, bandSprite, logoSprite, flashBg },
  });
})();
