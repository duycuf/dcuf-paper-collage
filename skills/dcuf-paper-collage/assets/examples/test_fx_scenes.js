/* test_fx_scenes.js — exercises every CLX device on a quick self-made collage (no dependency on CL). ~9.3 s.
 * 0–1 page + play drop + cursor click + tag · 1–2 camera → iris · 2–3 kaleido + flyers + hex hole · 3–4 rocket + burst + title
 * 4–4.5 tear · 4.5–5.1 logo flashes · 5.1–6.3 ransom + thumbs + confetti + star + speed · 6.3–8.3 laptop prompt screen · 8.3–9.3 subscribe
 */
(function () {
  'use strict';
  const { W, H, clamp, lerp, prog, E } = ENG;
  const X = CLX, U = CLX._, P = CLX.PAL;
  const cache = new Map();
  const once = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };

  /* ---- quick collage material (test only) ---- */
  function sky(seed = 1, col = P.cyan) {
    return once('sky' + seed + col, () => {
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const r = U.rng(seed);
      x.fillStyle = U.patR(x, col, '', seed); x.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { const bx = r() * W, by = r() * H, br = 80 + r() * 260, g = x.createRadialGradient(bx, by, 0, bx, by, br); g.addColorStop(0, `rgba(255,255,255,${0.12 + r() * 0.22})`); g.addColorStop(0.6, `rgba(255,255,255,${0.05 + r() * 0.08})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(bx - br, by - br, br * 2, br * 2); }
      U.halftone(x, [0, 0, W, H], { col: 'rgba(255,255,255,0.12)', step: 10, r0: 0.05, r1: 0.25, dir: [0, 1] });
      return c;
    });
  }
  function page() {
    return once('page', () => {
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      x.drawImage(sky(1), 0, 0);
      const strips = [
        [P.red, 1500, 240, -0.2, 300, 170, { col: 'rgba(255,220,210,0.55)', step: 14, r0: 0.1, r1: 0.45, dir: [1, 0] }],
        [P.orange, 1300, 380, -0.16, 100, 120, null],
        [P.paper, 1700, 470, -0.18, 1100, 150, null],
        [P.yellow, 1900, 560, -0.12, 700, 160, { col: 'rgba(210,120,0,0.25)', step: 10, r0: 0.05, r1: 0.4, dir: [0, 1] }],
        [P.cyan, 900, 160, -0.22, 1500, 90, null],
      ];
      strips.forEach(([col, w, y, rot, cx, h, dots], i) => U.drawPiece(x, U.piece('pg' + i, U.rectPts(w, h), { fill: col, tex: 'mottle', wMax: 14, wave: 7, scale: 70, dots, res: 1 }), cx, y, { rot, sh: [5, 9] }));
      U.drawPiece(x, U.piece('pg_hill', [[-1100, 60], [-600, -90], [0, -40], [500, -120], [1100, -20], [1100, 300], [-1100, 300]], { fill: P.olive, tex: 'mottle', wMax: 12, wave: 8, scale: 80, dots: { col: 'rgba(240,230,60,0.3)', step: 12, r0: 0.05, r1: 0.4, dir: [0, -1] } }), W / 2, H - 200, { sh: [0, -8] });
      U.drawPiece(x, U.piece('pg_hill2', [[-1100, 40], [-300, -60], [400, 20], [1100, -60], [1100, 300], [-1100, 300]], { fill: P.yellow, tex: 'mottle', wMax: 12, wave: 8, scale: 80 }), W / 2, H - 90, { sh: [0, -8] });
      U.drawPiece(x, U.piece('pg_earth', U.rectPts(2300, 120), { fill: P.earth, wMax: 10, wave: 6 }), W / 2, H - 20, { sh: [0, -6] });
      return c;
    });
  }
  async function collageSrc(c, t) { // material for the kaleidoscope (dense, many small pieces like the ref)
    c.drawImage(page(), 0, 0);
    const r = U.rng(44);
    for (let i = 0; i < 9; i++) U.drawPiece(c, U.piece('ks' + i, U.rectPts(260 + r() * 400, 50 + r() * 70), { fill: [P.red, P.paper, P.cyan, P.yellow, P.cobalt][i % 5], tex: 'mottle', wMax: 10, dots: i % 2 ? { col: 'rgba(255,255,255,0.4)', step: 11, r0: 0.1, r1: 0.45 } : null }), 960 + r() * 900, 300 + r() * 480, { rot: (r() - 0.5) * 2, sh: [4, 6] });
    const items = [['cloud_2', 1180, 420, 200, 0], ['car', 1500, 470, 190, -0.3], ['reel', 1180, 640, 160, 0.4], ['clap', 1700, 700, 170, 0.2], ['tree_a', 1400, 330, 170, 0], ['cam_side', 1250, 860, 170, -0.4], ['headphones', 1760, 300, 130, 0.3], ['rocks_a', 1600, 870, 150, 0], ['grass_strip', 1300, 560, 90, 0.5], ['cassette', 1080, 760, 90, -0.2]];
    for (const [n, x, y, h, rr] of items) U.drawCut(c, await U.cut(n), x, y, h, { rot: rr });
  }
  function skyScene(c, t) {
    c.drawImage(sky(3, '#62CFF0'), 0, 0);
    const r = U.rng(5);
    for (let i = 0; i < 7; i++) U.drawPiece(c, U.piece('cl' + i, U.rectPts(300 + r() * 500, 24 + r() * 30), { fill: P.paper, tex: 'grain', wMax: 12, wave: 9, scale: 50 }), r() * W, 80 + r() * 700, { rot: (r() - 0.5) * 0.1, sh: [3, 6], shA: 0.25 });
  }
  async function titleScene(c, t) {
    skyScene(c, t);
    await X.rocket(c, t, 3.0, { dur: 0.6, vy: H * 0.12, drawRider: async (cc, x, y, tt) => { if (tt < 3.6) await X.play(cc, x, y - 50, 150, tt, {}); } });
    await X.burst(c, t, 3.55, { cy: H * 0.45 });
    await X.title(c, ['KAYE', 'CREATES'], W / 2, H * 0.45, t, 3.55, {});
  }

  /* ---- timeline ---- */
  const cuts = [];
  const C = (t0, t1, draw) => cuts.push({ t0, t1, draw });

  let warmed = null;
  C(0, 1, async (ctx, t) => {
    if (!warmed) warmed = X.warm({ iris: 6, kaleido: 8, title: { lines: ['KAYE', 'CREATES'] }, band: { h: 300 }, logo: { text: 'kaye.creatives' }, play: 420, subscribe: 110, tear: { y0: H * 0.37, y1: H * 0.63 }, cuts: ['cam_front', 'car', 'clap', 'reel', 'laptop', 'phone', 'plane_front', 'cloud_2'] });
    await warmed;
    ctx.drawImage(page(), 0, 0);
    await X.star(ctx, 1640, 250, 120, t, { text: 'NEW!', color: P.yellow, spin: 0.6 });
    const press = t >= 0.75 && t < 0.875 ? 1 : 0;
    await X.play(ctx, W / 2, H * 0.48, 420, t, { t0: 0.1, press });
    const ck = E.inOut3(prog(t, 0.3, 0.72));
    await X.cursor(ctx, lerp(W * 0.85, W / 2 + 40, ck), lerp(H * 1.05, H * 0.5, ck), t, { click: press, size: 96 });
    await X.tag(ctx, 300, 900, 'kaye.creatives ✦ youtube', { t, t0: 0.4, color: 'white', rot: -0.05 });
    await X.tag(ctx, 1500, 960, 'F1 COMMERCIAL · AI + BLENDER', { t, t0: 0.55, color: 'yellow', font: 'sans', size: 30, rot: 0.04, tape: 'right' });
  });
  C(1, 2, async (ctx, t) => {
    ctx.drawImage(page(), 0, 0);
    const C0 = await U.cut('cam_front'), h = 860, s = h / C0.h, cx = W / 2 + 120, cy = H / 2 + 20;
    const lx = cx + (400 - C0.w / 2) * s, ly = cy + (605 - C0.h / 2) * s, z = 1 + 3.2 * E.in3(prog(t, 1.45, 2.0));
    ctx.save(); ctx.translate(lx, ly); ctx.scale(z, z); ctx.translate(-lx, -ly);
    U.drawCut(ctx, C0, cx, cy, h, {});
    await X.iris(ctx, lx, ly, 228 * s, prog(t, 1.0, 1.8), t, {});
    ctx.restore();
    await X.tag(ctx, 260, 140, 'AI REALISM', { t, t0: 1.05, color: 'red', font: 'sans', size: 40, rot: -0.04 });
  });
  C(2, 3, async (ctx, t) => {
    await X.kaleido(ctx, t, collageSrc, { segments: 8, flyers: [{ name: 'car', t0: 2.4, angle: 2.6 }, { name: 'clap', t0: 2.47, angle: 0.4 }, { name: 'reel', t0: 2.52, angle: -1.2 }], hole: Math.pow(prog(t, 2.62, 3.0), 1.6), drawNext: async (c, tt) => skyScene(c, tt) });
  });
  C(3, 4, async (ctx, t) => { await titleScene(ctx, t); });
  C(4, 4.5, async (ctx, t) => {
    await X.tear(ctx, prog(t, 4.02, 4.42), async (c) => titleScene(c, t), async (c) => { await titleScene(c, t); await X.logoBand(c, 'kaye.creatives', t, { y: H * 0.5 }); }, { y0: H * 0.37, y1: H * 0.63 });
  });
  C(4.5, 5.1, async (ctx, t) => {
    const st = X.flashSeq(t, 4.5);
    if (!st) await titleScene(ctx, t);
    await X.logoBand(ctx, 'kaye.creatives', t, { y: H * 0.5, style: st || 'band' });
  });
  C(5.1, 6.3, async (ctx, t) => {
    ctx.drawImage(sky(9, P.yellow), 0, 0);
    U.drawPiece(ctx, U.piece('desk_pink', U.rectPts(2200, 520), { fill: P.pink, tex: 'mottle', wMax: 14, wave: 8, scale: 80 }), W / 2, H - 120, { rot: -0.04 });
    await X.speed(ctx, t, { angle: 0, n: 10, rect: [0, 0, W, 380], alpha: 0.8 });
    await X.thumb(ctx, [180, 560, 420, 236], t, { t0: 5.55, name: 'car', bg: P.pink, progress: 0.6, dur: '12:04', rot: -0.06, seed: 1 });
    await X.thumb(ctx, [750, 610, 420, 236], t, { t0: 5.7, name: 'phone', bg: P.cyan, progress: 0.3, dur: '8:41', rot: 0.04, seed: 2 });
    await X.thumb(ctx, [1320, 560, 420, 236], t, { t0: 5.85, draw: async (c, r) => { c.drawImage(sky(1), 0, 0, r[2], r[3]); U.drawCut(c, await U.cut('plane_front'), r[2] / 2, r[3] / 2, r[3] * 0.6, {}); }, progress: 0.8, dur: '15:22', rot: -0.03, seed: 3 });
    await X.ransom(ctx, 'STEP BY STEP', W / 2, 300, t, 5.15, { size: 150, step: 0.06 });
    await X.confetti(ctx, t, 5.55, { x: W / 2, y: 650, n: 46 });
  });
  C(6.3, 8.3, async (ctx, t) => {
    ctx.drawImage(sky(9, P.yellow), 0, 0);
    U.drawPiece(ctx, U.piece('desk_red', U.rectPts(2300, 420), { fill: P.red, tex: 'mottle', wMax: 14, wave: 8, scale: 80, dots: { col: 'rgba(255,220,210,0.4)', step: 14, r0: 0.05, r1: 0.4, dir: [0, 1] } }), W / 2, H - 120, { rot: 0.03 });
    const L = await U.cut('laptop'), lh = 820, s = lh / L.h, cx = W / 2, cy = H / 2 + 40, x0 = cx - L.w * s / 2, y0 = cy - L.h * s / 2;
    U.drawCut(ctx, L, cx, cy, lh, {});
    const q = [[800, 105], [1838, 150], [1745, 915], [668, 792]].map(([a, b]) => [x0 + a * s, y0 + b * s]);
    await X.screen(ctx, q, t, 6.4, { text: 'a pink race car in the clouds', tClick: 7.95, drawResult: async (c, r, tt) => { c.drawImage(sky(1), 0, 0, r[2], r[3]); U.drawCut(c, await U.cut('cloud_2'), r[2] * 0.3, r[3] * 0.7, r[3] * 0.4, {}); U.drawCut(c, await U.cut('car'), r[2] * 0.55, r[3] * 0.5, r[3] * 0.45, { rot: -0.08 }); } });
  });
  C(8.3, 9.3, async (ctx, t) => {
    ctx.drawImage(sky(3, '#62CFF0'), 0, 0);
    await X.logoBand(ctx, 'kaye.creatives', t, { y: H * 0.38, h: 260 });
    await X.subscribe(ctx, W / 2 - 50, H * 0.74, t, { t0: 8.35, tClick: 8.85 });
    const ck = E.inOut3(prog(t, 8.5, 8.82)); await X.cursor(ctx, lerp(W * 0.9, W / 2 - 10, ck), lerp(H * 1.05, H * 0.75, ck), t, { click: t >= 8.85 && t < 8.97 ? 1 : 0 });
    await X.tag(ctx, W / 2, H * 0.9, 'youtube.com/@Kaye.creates', { t, t0: 8.6, color: 'ink', size: 30, tape: 'top' });
  });

  const PERF = (window.__perf = []);
  const wrapped = cuts.map((c) => ({ ...c, draw: async (ctx, t, k, lt) => { const a = performance.now(); await c.draw(ctx, t, k, lt); ctx.getImageData(0, 0, 1, 1); PERF.push([+t.toFixed(3), Math.round(performance.now() - a)]); } }));
  window.SCENES = { duration: 9.3, cuts: wrapped, overlay: async (ctx, t) => ENG.grain(ctx, t, 0.05, 'overlay') };
})();
