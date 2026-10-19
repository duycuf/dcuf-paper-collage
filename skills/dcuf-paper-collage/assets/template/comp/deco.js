/* deco.js — construction lines, orbits, rings, rulers, connectors and halftone patches (ref1/ref2 language).
 * Everything is a pure function of time. Colours come from the world: black → light lines + mint; cream → ink lines + magenta.
 */
(function () {
  'use strict';
  const { W, H, P, clamp, lerp, prog, E, label } = ENG;
  const COL = {
    black: { line: 'rgba(236,236,236,0.6)', soft: 'rgba(236,236,236,0.38)', acc: P.mint, dot: '#FFFFFF' },
    cream: { line: 'rgba(26,23,20,0.55)', soft: 'rgba(26,23,20,0.32)', acc: P.magenta, dot: P.creamInk },
  };
  const S = (ctx, c, w = 1.5, dash = null) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.setLineDash(dash || []); };

  // dashed construction cross through a focus point, drawing outward (k 0..1), with a centre crosshair
  function constr(ctx, x, y, k, world, o = {}) {
    const c = COL[world]; const e = E.out3(k); ctx.save(); S(ctx, c.line, 1.6, [5, 7]);
    const lx = Math.max(x, W - x) * e, ly = Math.max(y, H - y) * e;
    ctx.beginPath(); ctx.moveTo(x - lx, y + 0.5); ctx.lineTo(x + lx, y + 0.5); ctx.moveTo(x + 0.5, y - ly); ctx.lineTo(x + 0.5, y + ly); ctx.stroke();
    S(ctx, c.acc, 2); const s = 14 * E.out5(clamp(k * 3));
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    ctx.restore();
    if (o.coord && k > 0.3) label(ctx, x + 18, y + 14, o.coord, { style: world === 'black' ? 'dark' : 'plainDark', size: 17, alpha: clamp((k - 0.3) * 3) * (o.alpha ?? 1) });
  }
  // dashed ellipse orbit with a travelling dot (ref2)
  function orbit(ctx, cx, cy, rx, ry, t, world, o = {}) {
    const c = COL[world]; const k = o.k ?? 1; ctx.save(); S(ctx, c.soft, 1.4, [5, 8]); ctx.lineDashOffset = -t * 30;
    const a1 = (o.a0 || -Math.PI / 2) + Math.PI * 2 * E.out3(k);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, o.rot || 0, o.a0 || -Math.PI / 2, a1); ctx.stroke();
    if (o.dot !== false && k > 0.95) { const a = (o.a0 || 0) + t * (o.speed || 1.1); const px = cx + Math.cos(a) * rx * Math.cos(o.rot || 0) - Math.sin(a) * ry * Math.sin(o.rot || 0), py = cy + Math.cos(a) * rx * Math.sin(o.rot || 0) + Math.sin(a) * ry * Math.cos(o.rot || 0);
      ctx.setLineDash([]); ctx.fillStyle = c.dot; ctx.beginPath(); ctx.arc(px, py, 6, 0, 6.283); ctx.fill(); }
    ctx.restore();
  }
  // concentric dashed rings expanding from a point (for the big hits)
  function rings(ctx, cx, cy, k, world, o = {}) {
    const c = COL[world]; const n = o.n || 4; ctx.save();
    for (let i = 0; i < n; i++) { const kk = clamp(k * 1.3 - i * 0.12); if (kk <= 0) continue; const r = E.out3(kk) * (o.r || 900) * (0.35 + i * 0.22);
      ctx.globalAlpha = (1 - kk) * 0.9; S(ctx, i % 2 ? c.acc : c.line, i % 2 ? 2 : 1.4, i % 2 ? [] : [6, 9]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke(); }
    ctx.restore();
  }
  // tick ruler (horizontal or vertical) drawing on
  function ruler(ctx, x, y, len, k, world, o = {}) {
    const c = COL[world]; const step = o.step || 30, n = Math.floor(len * E.out3(k) / step); ctx.save(); S(ctx, c.line, 1.2);
    for (let i = 0; i <= n; i++) { const big = i % 5 === 0, d = big ? 16 : 8; if (o.vertical) { ctx.beginPath(); ctx.moveTo(x, y + i * step); ctx.lineTo(x + d, y + i * step); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(x + i * step, y); ctx.lineTo(x + i * step, y - d); ctx.stroke(); } }
    ctx.beginPath(); if (o.vertical) { ctx.moveTo(x, y); ctx.lineTo(x, y + n * step); } else { ctx.moveTo(x, y); ctx.lineTo(x + n * step, y); } ctx.stroke(); ctx.restore();
  }
  // elbow connector from (x0,y0) to (x1,y1) with an end ring
  function connector(ctx, x0, y0, x1, y1, k, world) {
    const c = COL[world]; const e = E.out3(k), mx = x1; ctx.save(); S(ctx, c.line, 1.3);
    const l1 = Math.abs(mx - x0), l2 = Math.abs(y1 - y0), tot = l1 + l2, d = tot * e;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    if (d <= l1) ctx.lineTo(x0 + Math.sign(mx - x0) * d, y0); else { ctx.lineTo(mx, y0); ctx.lineTo(mx, y0 + Math.sign(y1 - y0) * (d - l1)); }
    ctx.stroke(); if (e > 0.98) { S(ctx, c.acc, 2); ctx.beginPath(); ctx.arc(x1, y1, 9, 0, 6.283); ctx.stroke(); }
    ctx.restore();
  }
  // halftone patch: pink rings/dots modulated by a travelling sine (ref1 dot tiles)
  function halftone(ctx, x, y, w, h, t, world, o = {}) {
    const step = o.step || 16; ctx.save(); ctx.globalAlpha = o.alpha ?? 0.9;
    for (let yy = y + step / 2; yy < y + h; yy += step) for (let xx = x + step / 2; xx < x + w; xx += step) {
      const v = 0.5 + 0.5 * Math.sin((xx - x) * 0.018 + (yy - y) * 0.011 - t * 3.2) * Math.cos((yy - y) * 0.02 + t * 1.3);
      if (v > 0.66) { ctx.fillStyle = P.pink; ctx.beginPath(); ctx.arc(xx, yy, step * 0.4 * v, 0, 6.283); ctx.fill(); }
      else if (v > 0.4) { ctx.strokeStyle = P.pink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(xx, yy, step * 0.3, 0, 6.283); ctx.stroke(); }
      else if (v > 0.22) { ctx.fillStyle = world === 'black' ? P.mint : P.blue; ctx.beginPath(); ctx.arc(xx, yy, 1.6, 0, 6.283); ctx.fill(); }
    }
    ctx.restore();
  }
  // a horizontal scan line sweeping down (for flash beats)
  function scan(ctx, k, world) { const c = COL[world]; const y = lerp(-10, H + 10, k); ctx.save(); S(ctx, c.acc, 2); ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.restore(); }
  // partial arcs rotating around a centre (measuring language)
  function arcs(ctx, cx, cy, r, t, world, o = {}) {
    const c = COL[world]; ctx.save(); S(ctx, c.line, 1.4);
    for (let i = 0; i < 3; i++) { const a = t * (0.6 + i * 0.25) * (i % 2 ? -1 : 1) + i * 2; ctx.beginPath(); ctx.arc(cx, cy, r + i * 26, a, a + 0.7 + i * 0.3); ctx.stroke(); }
    ctx.restore();
  }
  const coord = (x, y) => [`${(x / 60).toFixed(1).padStart(4, '0')},${(y / 60).toFixed(1).padStart(4, '0')}`];
  window.DECO = { constr, orbit, rings, ruler, connector, halftone, scan, arcs, coord, COL };
})();
