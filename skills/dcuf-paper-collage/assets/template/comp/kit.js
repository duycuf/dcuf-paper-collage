/* kit.js — scene helpers on top of engine.js (ENG) and deco.js (DECO).
 * Configure once per film with KIT.setup({ clips, fallback, bars, clipDir }) from scenes.js.
 * Everything is a pure function of time, so capture is frame-exact.
 */
(function () {
  'use strict';
  const { W, H, P, clamp, lerp, prog, E, rng, fx, Frames, grain, handles, label, text, measure } = ENG;
  const CFG = { bars: [], fallback: {}, clipDir: '../clips', clipLen: 5.0 };

  function setup(o) {
    Object.assign(CFG, o);
    for (const id of (window.CLIPS_AVAILABLE || [])) Frames.meta[id] = { dir: `${CFG.clipDir}/${id}`, frames: 121, fps: 24 };
  }

  /* ---------- clips ---------- */
  // a clip that is not generated yet falls back to its start-frame still, so drafts render before clips arrive
  async function src(id, ct) {
    if (Frames.meta[id]) return { img: await Frames.get(id, clamp(ct, 0, CFG.clipLen)), still: false };
    if (!CFG.fallback[id]) return { img: null, still: true };
    return { img: await Frames.img(CFG.fallback[id]), still: true };
  }
  // designed placeholder for a shot that is not generated yet (code mode / animatic)
  function placeholder(ctx, id, rect, o = {}) {
    const [x, y, w, h] = rect, cream = o.world === 'cream' || (CFG.worlds && CFG.worlds[id] === 'cream');
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, cream ? '#E9DFD2' : '#17141A'); g.addColorStop(1, cream ? '#F3D9E4' : '#2A1F33');
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = cream ? 'rgba(26,23,20,0.35)' : 'rgba(240,240,240,0.35)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, w - 16, h - 16); ctx.restore();
    const d = (CFG.desc && CFG.desc[id]) || id; const fs = Math.max(14, Math.min(28, w / 30));
    label(ctx, x + 24, y + 24, ['✦ GENERATION · ' + id], { style: 'lime', size: fs });
    text(ctx, d.length > 64 ? d.slice(0, 62) + '…' : d, x + 24, y + 24 + fs * 3.2, { size: fs * 1.3, weight: 500, font: '"Inter Tight", sans-serif', color: cream ? P.creamInk : '#F4F1EC', revealMode: 'none' });
  }
  async function clip(ctx, id, ct, rect, o = {}) {
    const s = await src(id, ct); if (!s.img) return placeholder(ctx, id, rect, o);
    const oo = Object.assign({}, o);
    if (s.still) oo.zoom = (o.zoom || 1) * (1 + 0.03 * ct); // stills get a slow push so the draft still moves
    fx(ctx, s.img, rect, oo);
  }
  const FULL = [0, 0, W, H];
  // 1.06 → 1.0 zoom punch over 6 frames on every bar downbeat (CFG.bars)
  const punch = (t) => { let z = 1; for (const b of CFG.bars) if (t >= b && t < b + 0.25) z = 1 + 0.06 * (1 - E.out3((t - b) / 0.25)); return z; };
  // full-frame clip drawer with punch + grain
  const full = (id, ct, o = {}) => async (ctx, t) => clip(ctx, id, ct, FULL, Object.assign({ grain: 0.05 }, o, { zoom: (o.zoom || 1) * punch(t) }));
  // a sequence of fast sub-cuts inside one cut window: seq([[t0, async (ctx, t, localT) => {}], ...])
  const seq = (parts) => async (ctx, t) => { let p = parts[0]; for (const q of parts) if (t >= q[0]) p = q; await p[1](ctx, t, t - p[0]); };
  // a clip in a window tile with corner handles and an optional mono label
  async function tile(ctx, id, ct, r, o = {}) {
    await clip(ctx, id, ct, r, o);
    if (o.handles !== false) handles(ctx, r[0], r[1], r[2], r[3], { size: 7, color: o.hcol || P.mint, alpha: o.halpha ?? 0.9 });
    if (o.label) label(ctx, r[0] + 10, r[1] + 10, o.label, { style: o.lstyle || 'dark', size: 18 });
  }
  const lerpR = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

  /* ---------- legibility plates ---------- */
  const grad = (ctx, x0, y0, x1, y1, rgb, a) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.55, `rgba(${rgb},${a * 0.6})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  const darkLeft = (ctx, a = 0.85, w = 1150) => grad(ctx, 0, 0, w, 0, '5,5,5', a);
  const lightLeft = (ctx, a = 0.75, w = 1100) => grad(ctx, 0, 0, w, 0, '239,232,222', a);
  const darkRight = (ctx, a = 0.85, w = 900) => grad(ctx, W, 0, W - w, 0, '5,5,5', a);
  const darkBottom = (ctx, a = 0.85, h = 380) => grad(ctx, 0, H, 0, H - h, '5,5,5', a);
  const lightBottom = (ctx, a = 0.7, h = 380) => grad(ctx, 0, H, 0, H - h, '239,232,222', a);

  /* ---------- type ---------- */
  const SANS = '"Inter Tight", sans-serif', SERIF = '"Instrument Serif", serif';
  const INK = P.creamInk, LIGHT = '#F4F1EC';
  const rev = (t, t0, dur = 0.35) => E.out3(prog(t, t0, t0 + dur));
  // two-part line: sans + serif-italic accent word; reveal 0..1 rises letters from the baseline across the line
  function line2(ctx, a, b, x, y, o = {}) {
    const size = o.size || 110, col = o.color || LIGHT, acc = o.accent || col;
    const wa = measure(ctx, a, { size, weight: 600, font: SANS, tracking: -0.02 });
    const wb = measure(ctx, b, { size: size * 1.08, weight: 400, font: SERIF, italic: true });
    const x0 = o.align === 'center' ? x - (wa + wb) / 2 : o.align === 'right' ? x - wa - wb : x;
    const n = a.length + b.length, r = o.reveal ?? 1;
    const ra = clamp(r * n / Math.max(1, a.length) * 0.999), rb = clamp((r * n - a.length) / Math.max(1, b.length));
    text(ctx, a, x0, y, { size, weight: 600, font: SANS, tracking: -0.02, color: col, reveal: ra, rise: size * 0.28, alpha: o.alpha });
    text(ctx, b, x0 + wa, y, { size: size * 1.08, weight: 400, font: SERIF, italic: true, color: acc, reveal: rb, rise: size * 0.28, alpha: o.alpha });
    return wa + wb;
  }
  // a big single word that flashes for a few frames (rhythm, not must-read)
  const flashWord = (ctx, s, o = {}) => text(ctx, s, o.x ?? W / 2, o.y ?? 600, { size: o.size || 200, weight: 400, font: SERIF, italic: true, color: o.color || LIGHT, align: 'center', revealMode: 'none' });
  // letters of a name grow up from below the frame edge, one by one
  function nameRise(ctx, name, t, t0, o = {}) {
    const size = o.size || 400; ctx.save(); ctx.font = `700 ${size}px ${SANS}`; const ws = [...name].map((c) => ctx.measureText(c).width); ctx.restore();
    const tr = -0.03 * size, total = ws.reduce((a, b) => a + b, 0) + tr * (name.length - 1); let x = (o.cx ?? W / 2) - total / 2;
    for (let i = 0; i < name.length; i++) { const g = E.out5(prog(t, t0 + i * 0.07, t0 + i * 0.07 + 0.38)); text(ctx, name[i], x, lerp(H + size * 0.85, o.y ?? 820, g), { size, weight: 700, font: SANS, color: o.color || INK, revealMode: 'none' }); x += ws[i] + tr; }
  }

  /* ---------- specimens (ref4-style microscopic shapes, drawn in code around a point) ---------- */
  const SPEC = (() => { const r = rng(77), list = [], cols = [P.orange, P.magenta, P.blue, P.mint, P.apricot, '#9A6BE0', '#7A8F3A', P.pink];
    for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * 760; list.push({ a, d, kind: Math.floor(r() * 6), size: 6 + Math.pow(r(), 2.2) * 54, col: cols[Math.floor(r() * cols.length)], col2: cols[Math.floor(r() * cols.length)], rot: r() * 6.28, t: r(), wob: r() }); }
    return list.sort((p, q) => p.d - q.d); })();
  function specimens(ctx, cx, cy, k, t, o = {}) {
    for (const s of SPEC) { const ap = clamp((k * 1.25 - (s.d / 760) * 0.9 - s.t * 0.15) * 4); if (ap <= 0) continue;
      const sc = ap < 1 ? E.out3(ap) * (1 + 0.15 * Math.sin(ap * Math.PI)) : 1, sp = o.spread || 1;
      const x = cx + Math.cos(s.a) * s.d * sp, y = cy + Math.sin(s.a) * s.d * 0.62 * sp + Math.sin(t * 1.3 + s.wob * 6) * 3, z = s.size * sc;
      ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot + t * 0.2 * (s.wob - 0.5)); ctx.globalAlpha = 0.92 * (o.alpha ?? 1);
      switch (s.kind) {
        case 0: ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(0, 0, z * 0.5, 0, 6.283); ctx.fill(); ctx.fillStyle = s.col2; ctx.beginPath(); ctx.arc(z * 0.1, -z * 0.05, z * 0.2, 0, 6.283); ctx.fill(); break;
        case 1: ctx.strokeStyle = s.col; ctx.lineWidth = Math.max(1.5, z * 0.09); ctx.beginPath(); ctx.arc(0, 0, z * 0.42, 0, 6.283); ctx.stroke(); break;
        case 2: ctx.fillStyle = s.col; ctx.beginPath(); ctx.ellipse(0, 0, z * 0.6, z * 0.32, 0, 0, 6.283); ctx.fill(); break;
        case 3: ctx.strokeStyle = s.col; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-z, 0); ctx.bezierCurveTo(-z * 0.3, -z * 0.8, z * 0.3, z * 0.8, z, 0); ctx.stroke(); break;
        case 4: ctx.strokeStyle = s.col; ctx.lineWidth = 1.6; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc((j % 2 - 0.5) * z * 0.36, (Math.floor(j / 2) - 0.5) * z * 0.36, z * 0.17, 0, 6.283); ctx.stroke(); } break;
        default: ctx.fillStyle = s.col; ctx.fillRect(-z * 0.18, -z * 0.18, z * 0.36, z * 0.36);
      }
      ctx.restore(); }
  }

  /* ---------- phyllotaxis mark (golden-angle dot spiral) ---------- */
  function phyllo(ctx, cx, cy, n, scale, o = {}) {
    const GA = 137.5 * Math.PI / 180, cols = o.colors || [P.pink, P.pink, P.apricot, P.butter, P.magenta, P.mint];
    for (let i = 0; i < n; i++) { const rr = scale * Math.sqrt(i), th = i * GA, size = (2.2 + Math.sqrt(i) * 0.42) * (o.dot || 1) * E.out3(clamp(n - i));
      ctx.fillStyle = i % 23 === 7 ? P.mint : cols[Math.min(cols.length - 2, Math.floor(i / Math.max(1, n) * 4))]; ctx.beginPath(); ctx.arc(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr, size, 0, 6.283); ctx.fill(); }
  }

  /* ---------- overlay builder: deco events + glitch slices + grain ---------- */
  // events: [[t0, t1, fn(ctx, t, k)]]; glitches: times of 3-frame slice glitches (put them on the music's vocal stutters)
  function overlay(events, glitches = [], grainAmt = 0.05) {
    return async (ctx, t) => {
      for (const [t0, t1, fn] of events) if (t >= t0 && t < t1) { ctx.save(); fn(ctx, t, (t - t0) / (t1 - t0)); ctx.restore(); }
      for (const g of glitches) if (t >= g && t < g + 0.125) {
        const r = rng(Math.floor(t * 24) + 5), snap = document.createElement('canvas'); snap.width = W; snap.height = H; snap.getContext('2d').drawImage(ctx.canvas, 0, 0);
        for (let i = 0; i < 9; i++) { const y = Math.floor(r() * H), h = 20 + Math.floor(r() * 90), dx = (r() - 0.5) * 140; ctx.drawImage(snap, 0, y, W, h, dx, y, W, h); }
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.35; ctx.drawImage(snap, 8, 0); ctx.restore();
      }
      grain(ctx, t, grainAmt, 'overlay');
    };
  }
  // white flash for a hit (≤ 2 frames, flash-safe)
  const flash = (ctx, lt, a = 0.75) => { const f = 1 - prog(lt, 0, 0.085); if (f > 0) { ctx.fillStyle = `rgba(255,250,244,${a * f})`; ctx.fillRect(0, 0, W, H); } };

  window.KIT = { setup, CFG, src, clip, placeholder, FULL, punch, full, seq, tile, lerpR, darkLeft, lightLeft, darkRight, darkBottom, lightBottom, SANS, SERIF, INK, LIGHT, rev, line2, flashWord, nameRise, specimens, phyllo, overlay, flash };
})();
