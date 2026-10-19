/* scenes.js — the 10 s collage promo (dcuf-paper-collage template, 2026-10-19). Brand-free: every word and cut-out comes from window.FILM
 * (comp/film.config.js). One file, two formats: LAND (1920×1080) and VERT (1080×1920) layouts below; landscape-designed backgrounds are
 * drawn through DV.landCover in 9:16. Timings are fixed to the 120 BPM score (audio/score.html):
 *   0.33–0.5 hero drops (3 drawings) + settle · 0.5 open tag · 0.58–0.83 cursor in · 0.875 press (star 2 frames) · 1.0 DROP page rips → world 1
 *   1.75 world-1 object passes centre · 1.83 / 2.0 / 2.17 chat bubbles · 2.5 torn wipe → camera · 2.65–3.46 push into the lens, iris 2.9–3.4
 *   3.5–4.5 kaleidoscope (3 sticker rings, 3 flyers 4.2 / 4.3 / 4.4, hex hole 4.33–4.42) · 4.5 laptop lands · 4.75 / 5.0 / 5.25 desk objects slap
 *   4.6–5.08 prompt types · 5.15 button → result · 5.5–5.92 strip rocket carries the hero away · 6.0 title expo-out (9 drawings) + burst
 *   6.3–7.4 two objects cross (above / below the title) · 7.5–7.92 page tear → logo band · 8.0–8.5 logo flicker inside the band only
 *   8.5 CTA slaps · 9.0 click → done label + confetti · slow push to 10.0
 * Pure function of t; motion on twos; colours authored in the engine palette (grade.js remaps them).
 * Built from the kaye.creatives 10 s cut (assets/examples/kaye_10s_scenes.js) and the duycuf.vn v3 films.
 */
(function () {
  'use strict';
  const F = window.FILM, { W, H, clamp, lerp, prog, E } = ENG;
  const K = KIT, X = CLX, U = CLX._, C = CL.C, DEG = Math.PI / 180;
  const { VERT, ZC, q, drawingIdx, pick, landCover } = DV;

  const COPY = { title: F.title, titleFont: F.titleFont, logo: F.brand, bandTag: F.role, subscribe: F.cta[0], subscribed: F.cta[1], url: F.url };
  // 8.0–8.5 logo flicker: 6 looks held 2-1-2-3-2-2 frames, ALWAYS clipped to the torn band (photosensitivity: never full frame); light → dark order
  const FLICK = ['pink', 'orange', 'lime', 'posters', 'streak', 'glitter'];
  const FLICK_FR = [0, 0, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5];
  const SUBL = [COPY.subscribe, COPY.subscribed.replace(/\s*✓\s*$/, '')];
  K.setup({ bars: [1.0, 2.5, 4.5, 6.0, 7.5, 8.5] });

  /* ---------- layout: every position that differs between 16:9 and 9:16 ---------- */
  const L = pick({
    pops: [[560, 712, 210, 7 / 12, -8], [1250, 740, 230, 8 / 12, 7], [160, 700, 230, 0.75, -6]], peek: [1735, 1235, 560],
    hero: { x: 960, y: 548, size: 470 }, cursorFrom: [W + 80, 640], openTag: [96, 150, 44], pageCam: [960, 560],
    world1Y: 30, bubbles: [[1250, 640], [1460, 790], [1300, 940]], bubbleSize: 46,
    cam: { x: 1240, y: 600, h: 780 }, clap: [250, 330, 230], reel: [1760, 790, 210],
    lap: { x: 968, y: 940, h: 720 }, phone: { x: 960, y: 1010, h: 880, rot: -3 }, gear: [[330, 330, 230], [1530, 330, 360], [1580, 780, 250]], deskCam: { fx: 980, fy: 470, z: 0.2 },
    titleY: 520, titleW: 0.6, crossA: [105, 300], crossB: [935, 200],
    tear: [0.22, 0.76, 360], logo: { dy: 0, h: 400, size: 190 }, sub: { x: W / 2 - 58, y: 876, h: 128 }, urlY: 1004, roleDy: 128, roleSize: 42,
    extraY: 150, extraSize: 44, endFocusY: 800, cursorEnd: [640, 1560, 700],
  }, {
    pops: [[870, 700, 250, 7 / 12, -8], [330, 1430, 300, 8 / 12, 7], [220, 690, 270, 0.75, -6]], peek: [960, 1760, 560],
    hero: { x: 540, y: 930, size: 560 }, cursorFrom: [W + 80, 1150], openTag: [60, 330, 52], pageCam: [620, 540],
    world1Y: -60, bubbles: [[520, 1130], [610, 1290], [500, 1450]], bubbleSize: 58,
    cam: { x: 600, y: 900, h: 940 }, clap: [220, 330, 260], reel: [W - 190, 1560, 260],
    lap: { x: 540, y: 1300, h: 660 }, phone: { x: 540, y: 1440, h: 1060, rot: -3 }, gear: [[290, 470, 270], [790, 520, 400], [870, 1500, 250]], deskCam: { fx: 540, fy: 900, z: 0.16 },
    titleY: 900, titleW: 0.88, crossA: [330, 330], crossB: [1330, 240],
    tear: [0.33, 0.6, 300], logo: { dy: -30, h: 400, size: 230 }, sub: { x: W / 2, y: 1340, h: 140 }, urlY: 1490, roleDy: 165, roleSize: 52,
    extraY: null, extraSize: 54, endFocusY: 1100, cursorEnd: [1150, W + 120, 1180],
  });

  /* ---------- helpers ---------- */
  const BUFS = new Map();
  function buf(name, w = W, h = H) {
    let c = BUFS.get(name); if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; BUFS.set(name, c); }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, c.width, c.height);
    return c;
  }
  const PAD = 170;
  function padBuf(name) { const c = buf(name, W + 2 * PAD, H + 2 * PAD), x = c.getContext('2d'); x.fillStyle = '#FBF8F1'; x.fillRect(0, 0, c.width, c.height); x.translate(PAD, PAD); c.pad = PAD; return c; }
  const ONCE = new Map();
  const once = (k, fn) => { if (!ONCE.has(k)) ONCE.set(k, fn()); return ONCE.get(k); };
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const paperPat = (ctx) => ctx.createPattern(CL.paper(C.paper, 3, { tex: 0.8 }), 'repeat');
  const pc = (x, shape, fill, o) => CL.piece(x, shape, fill, Object.assign({ cache: false }, o));
  async function zoomAbout(ctx, z, fx, fy, fn) { ctx.save(); ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy); await fn(); ctx.restore(); }
  const xfPt = (p, tx, ty, rotDeg) => { const a = rotDeg * DEG, c = Math.cos(a), s = Math.sin(a); return [tx + p[0] * c - p[1] * s, ty + p[0] * s + p[1] * c]; };

  /* ---------- warm-up (once per browser, inside __seek so fonts are loaded) ---------- */
  const TEAR = { y0: Math.round(H * L.tear[0]), y1: Math.round(H * L.tear[1]), seed: 5, flapW: L.tear[2] };
  const LOGO = { x: W / 2, y: Math.round((TEAR.y0 + TEAR.y1) / 2) + L.logo.dy, h: L.logo.h, size: L.logo.size };
  const SUB = L.sub, URL_Y = L.urlY;
  const TTL = { size: 0, off: 0 }, SUBW = { a: 0, b: 0 };
  const CUTS = [...new Set([F.hero.cut, ...F.pops, F.peek, F.world1.cut, F.lens.cut, ...(F.lens.props || []), ...F.kaleido.rings, ...F.kaleido.flyers, F.desk.laptop, ...F.desk.gear, ...(F.desk.result || []), ...(F.titleFly || [])].filter(Boolean))];
  let WARM = null;
  const warm = () => WARM || (WARM = (async () => {
    await CL.preload(CUTS);
    const m = mkc(8, 8).getContext('2d'); m.font = `400 100px ${COPY.titleFont}`;
    const tw = Math.max(...COPY.title.map((s) => [...s].reduce((a, c) => a + m.measureText(c).width, 0)));
    TTL.size = 100 * (W * L.titleW) / Math.max(1, tw);
    await X.warm({ iris: 6, kaleido: 8, title: { lines: COPY.title, size: TTL.size, font: COPY.titleFont }, band: { h: LOGO.h, seed: 8 }, logo: { text: COPY.logo, size: LOGO.size }, subscribe: SUB.h, subLabels: SUBL, tear: TEAR, cuts: CUTS });
    const P = U.titleSprite(COPY.title, TTL.size, { font: COPY.titleFont }); TTL.off = P.bottom - P.ay;
    const hh = Math.round(SUB.h / 4) * 4, fz = hh * 0.42, s = mkc(8, 8).getContext('2d'); s.font = `900 ${fz}px "Be Vietnam Pro"`; s.letterSpacing = `${fz * 0.04}px`;
    SUBW.a = s.measureText(SUBL[0]).width + hh * 0.9; SUBW.b = s.measureText(SUBL[1]).width + fz * 1.1 + hh * 0.9;
  })());

  /* ======================================================================= paper transitions */
  const SHEETS = new Map();
  const sheetPath = (edges, seed) => { const k = edges.join('') + seed; if (!SHEETS.has(k)) SHEETS.set(k, CL.torn({ rect: [-170, -170, W + 340, H + 340], edges }, seed, { amp: 18, white: [3, 17], bite: 3 })); return SHEETS.get(k); };
  function drawSheet(ctx, cv, ox, oy, edges, seed, sh = [0, 14]) {
    const T = sheetPath(edges, seed);
    ctx.save(); ctx.translate(ox, oy);
    ctx.save(); ctx.shadowColor = 'rgba(10,16,30,0.5)'; ctx.shadowBlur = 34; ctx.shadowOffsetX = sh[0]; ctx.shadowOffsetY = sh[1]; ctx.fillStyle = paperPat(ctx); ctx.fill(T); ctx.restore();
    ctx.save(); ctx.clip(T.inner); ctx.drawImage(cv, -(cv.pad || 0), -(cv.pad || 0)); ctx.restore();
    ctx.restore();
  }
  async function wipe(ctx, t, t0, drawA, drawB, o) {
    const ks = o.ks || [0.34, 0.74, 0.95], i = drawingIdx(t, t0);
    if (i >= ks.length || i < 0) { await drawB(ctx, t); return; }
    const k = ks[i], [dx, dy] = o.from, A = padBuf('wipeA'), B = padBuf('wipeB');
    await drawA(A.getContext('2d'), t); await drawB(B.getContext('2d'), t);
    const pa = (o.push ?? 0.28) * k, sa = 1 + (o.zoomA ?? 0.06) * k;
    ctx.save(); ctx.translate(W / 2 - dx * W * pa, H / 2 - dy * H * pa); ctx.rotate((o.roll || 0) * k * DEG); ctx.scale(sa, sa); ctx.drawImage(A, -W / 2 - PAD, -H / 2 - PAD); ctx.restore();
    const ox = dx * (W + 340) * (1 - k), oy = dy * (H + 340) * (1 - k);
    if (o.rollB) { ctx.save(); ctx.translate(W / 2 + ox, H / 2 + oy); ctx.rotate(o.rollB * (1 - k) * DEG); ctx.translate(-W / 2 - ox, -H / 2 - oy); }
    drawSheet(ctx, B, ox, oy, o.edges, o.seed || 3, [-dx * 22, -dy * 22 + 10]);
    if (o.rollB) ctx.restore();
    if (o.speed) await X.speed(ctx, t, o.speed);
  }
  const RIP = (() => {
    const r = CL.R(901), pts = []; for (let y = -140; y <= H + 140; y += 70) pts.push([W / 2 + (r() - 0.5) * 120 + (y - H / 2) * 0.1, y]);
    const top = pts[0], bot = pts[pts.length - 1];
    const Lp = [[-500, top[1], 0], ...pts.map((p, i) => [p[0], p[1], i < pts.length - 1 ? 1 : 0]), [-500, bot[1], 0]];
    const Rr = [[top[0], top[1], 0], [W + 500, top[1], 0], [W + 500, bot[1], 0], ...pts.slice().reverse().map((p, i) => [p[0], p[1], i < pts.length - 1 ? 1 : 0])];
    return { L: CL.torn({ poly: Lp }, 911, { amp: 14, white: [4, 18], bite: 4 }), R: CL.torn({ poly: Rr }, 912, { amp: 14, white: [4, 18], bite: 4 }) };
  })();
  function ripDraw(ctx, k, cv) {
    for (const side of [-1, 1]) {
      const T = side < 0 ? RIP.L : RIP.R, dx = side * (22 + k * W * 0.64);
      ctx.save(); ctx.translate(W / 2 + dx, H / 2 + k * k * 90); ctx.rotate(side * k * 7 * DEG); ctx.translate(-W / 2, -H / 2);
      ctx.save(); ctx.shadowColor = 'rgba(10,16,30,0.5)'; ctx.shadowBlur = 28; ctx.shadowOffsetX = side * 10; ctx.shadowOffsetY = 12; ctx.fillStyle = paperPat(ctx); ctx.fill(T); ctx.restore();
      ctx.save(); ctx.clip(T.inner); ctx.drawImage(cv, -PAD, -PAD); ctx.restore();
      ctx.restore();
    }
  }

  /* ======================================================================= 0–1 · PAGE: hero drops, objects pop, cursor presses */
  const PLAY0 = L.hero, PLAY0_H = PLAY0.size * 0.7, T_PRESS = 0.875;
  function heroPose(t) {   // 0.333 bottom edge only · 0.417 mid-air −8° · 0.5 lands (1.035) · 0.583 settled
    const i = drawingIdx(t, 1 / 3); if (i < 0) return null;
    if (i === 0) return { dy: 96 - (PLAY0.y + PLAY0_H / 2), rot: -3 * DEG, s: 1 };
    if (i === 1) return { dy: (VERT ? 520 : 300) - PLAY0.y, rot: -8 * DEG, s: 1 };
    return { dy: 0, rot: 0, s: i === 2 ? 1.035 : 1 };
  }
  async function pageScene(ctx, t) {
    const tq = q(t), [fx, fy] = L.pageCam, cam = { zoom: 1 + 0.03 * tq, y: -6 * tq, fx, fy };
    const press = t >= T_PRESS && t < 1.0 ? 1 : 0;
    await landCover(ctx, () => CL.page(ctx, t, { cam }));
    if (t >= T_PRESS && t < T_PRESS + 2 / 24) await X.star(ctx, PLAY0.x, PLAY0.y, VERT ? 400 : 330, t, { points: 14, inner: 0.62, color: X.PAL.yellow, seed: 3, pop: 1 });
    for (let i = 0; i < L.pops.length && i < F.pops.length; i++) {
      const [x, y, h, t0, rot] = L.pops[i], p = CL.pop(tq, t0, { h: h * 0.85, frames: 4 }); if (!p.on) continue; const b = CL.bob(t, x, 2.4);
      await CL.sprite(ctx, F.pops[i], x + b.dx, y + p.dy + b.dy, { h, ay: 1, rot: rot + b.rot, sx: p.sx, sy: p.sy, shadow: { dx: 5, dy: 8, blur: 10, alpha: 0.3 } });
    }
    if (F.peek) { const p = CL.pop(tq, 8 / 12, { h: 420, frames: 6 }); if (p.on) { const b = CL.bob(t, 9, 3.5), [x, y, h] = L.peek;
      await CL.sprite(ctx, F.peek, x + b.dx, y + p.dy + b.dy, { h, ay: 1, rot: -10 + b.rot, sx: p.sx, sy: p.sy, shadow: { dx: -10, dy: 14, blur: 18, alpha: 0.42 } }); } }
    const pp = heroPose(t);
    if (pp) { ctx.save(); ctx.translate(PLAY0.x, PLAY0.y + pp.dy + PLAY0_H / 2); ctx.scale(pp.s, pp.s); ctx.translate(0, -PLAY0_H / 2);
      await CL.sprite(ctx, F.hero.cut, 0, 0, { w: F.hero.w * (VERT ? 1.22 : 1), rot: pp.rot / DEG, sx: press ? 1.04 : 1, sy: press ? 0.9 : 1, shadow: { dx: 10, dy: 18, blur: 18, alpha: 0.42 } }); ctx.restore(); }
    if (tq >= 7 / 12) {
      const m = E.out3(prog(tq, 7 / 12, 10 / 12)), x = lerp(L.cursorFrom[0], PLAY0.x + 40, m), y = lerp(L.cursorFrom[1], PLAY0.y + 18, m) + Math.sin(m * Math.PI) * -70;
      await X.cursor(ctx, x, y, t, { size: VERT ? 160 : 140, click: press ? 1 : 0 });
    }
  }
  async function openTag(ctx, t) {   // slaps with the hero at 0.5, stays taped while the page rips, swept off 1.17 / 1.25
    const tq = q(t); if (tq < 0.5 || !F.openTag) return;
    const k = Math.max(0, drawingIdx(t, 1.0) - 1); if (k > 2) return; const [x, y, size] = L.openTag;
    await X.tag(ctx, x + [0, -130, -400][k], y + [0, -12, -30][k], F.openTag, { t: tq, t0: 0.5, color: 'white', font: 'sans', size, anchor: 'left', rot: -0.035 + 0.05 * k, tape: 'top' });
  }

  /* ======================================================================= 1–2.5 · WORLD 1: an object flies through diagonal bands + chat bubbles */
  const BUBT = [22 / 12, 2.0, 26 / 12];
  async function world1Scene(ctx, t, o = {}) {
    const tq = q(t), lt = tq - 1.0, z = 1 + 0.03 * clamp(lt / 1.5), roll = lerp(-7, 0, E.out3(clamp(lt / 1.2))) * DEG;
    await zoomAbout(ctx, z, W / 2, H / 2, async () => {
      ctx.translate(W / 2, H / 2); ctx.rotate(roll); ctx.translate(-W / 2, -H / 2);
      await CL.diag(ctx, tq, { angle: -24, speed: 1300, offset: 500 });
      const b = CL.bob(t, 3, 4), x = lerp(-760, 760, E.inOut3(clamp(lt / 1.5)));   // passes frame centre on 1.75
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-24 * DEG);
      const jig = drawingIdx(t, 1.0) % 2 ? 5 : -5;
      await CL.sprite(ctx, F.world1.cut, x + b.dx, L.world1Y + b.dy, { h: F.world1.h * (VERT ? 1.18 : 1), rot: b.rot + 24 + jig, shadow: { dx: 26, dy: 34, blur: 18, alpha: 0.4 } });
      ctx.restore();
    });
    await X.speed(ctx, t, { n: 8, angle: Math.PI - 24 * DEG, speed: 3000, alpha: 0.85, seed: 31 });
    for (let i = 0; i < (F.world1.bubbles || []).length && i < 3; i++) {
      const [x, y] = L.bubbles[i];
      await DV.bubble(ctx, t, { x, y, t0: BUBT[i], text: F.world1.bubbles[i], fill: i % 2 ? C.sky : C.paper, rot: [-3, 2, -2][i], size: L.bubbleSize, seed: 870 + i * 3, tail: i % 2 ? 'r' : 'l' });
    }
    if (!o.noTag && F.world1.tag) await DV.tag(ctx, t, 13 / 12, F.world1.tag);
  }

  /* ======================================================================= 2.5–3.5 · LENS: camera → push into the lens → paper iris */
  const CAM = L.cam, camS = CAM.h / F.lens.spriteSize[1];
  const LENS = { x: CAM.x + (F.lens.lensPx[0] - F.lens.spriteSize[0] / 2) * camS, y: CAM.y + (F.lens.lensPx[1] - F.lens.spriteSize[1] / 2) * camS, r: F.lens.lensR * camS };
  const studioLayer = () => CL.layer('studio', async (x) => {
    const B = 380;
    x.drawImage(CL.watercolor(71, { w: W + 2 * B, h: H + 2 * B, tone: 0.84, dots: 0.6, bloom: 0.8 }), -B, -B);
    await pc(x, [-220, -220, 880, 1520], { color: C.cobalt }, { seed: 701, rot: 5, amp: 14, halftone: { color: '#0B3A92', cell: 18, angle: 20, r: [0.06, 0.42], grad: [-200, 1200, 640, -200] } });
    await pc(x, { band: [-170, 140, 900, 50, 90, 60] }, { color: C.orange, brush: 0.6 }, { seed: 706, amp: 9 });
    await pc(x, { circle: [CAM.x, CAM.y - 10, CAM.h * 0.74] }, { color: C.sun, brush: 0.6 }, { seed: 702, amp: 12, halftone: { color: 'rgba(240,122,46,0.92)', cell: 17, angle: 30, r: [0.42, 0.03], grad: [CAM.x, CAM.y + 560, CAM.x, CAM.y - 560] } });
    await pc(x, { circle: [CAM.x, CAM.y - 10, CAM.h * 0.58] }, C.paper, { seed: 703, amp: 10, dotgrid: { cell: 20, r: 0.09, angle: 12 } });
    await pc(x, { band: [W - 680, 80, W + 170, -10, 120, 90] }, C.paper, { seed: 707, amp: 8, news: { alpha: 0.5, angle: -5 } });
    await pc(x, { band: [-170, H - 50, W + 170, H - 230, 200, 140] }, { color: C.red, speck: 0.3 }, { seed: 704, amp: 13, fx: [{ type: 'grunge', seed: 3 }] });
    if (VERT) await pc(x, { band: [-170, H - 500, W + 170, H - 590, 70, 50] }, C.paper, { seed: 715, amp: 7, news: { alpha: 0.5 } });
    await pc(x, { poly: [[150, 690], [430, 600], [360, 880]] }, C.sun, { seed: 709, amp: 6 });
    const [a, b] = F.lens.props || [];
    if (a) await CL.sprite(x, a, L.clap[0], L.clap[1], { h: L.clap[2], rot: -12, shadow: { dx: 8, dy: 12, blur: 14, alpha: 0.4 } });
    if (b) await CL.sprite(x, b, L.reel[0], L.reel[1], { h: L.reel[2], rot: 10, shadow: { dx: 8, dy: 12, blur: 14, alpha: 0.4 } });
  }, { bleed: 380 });
  const PUSH = [2.65, 3.46];
  async function lensScene(ctx, t, o = {}) {
    const tq = q(t), pz = prog(tq, PUSH[0], PUSH[1]), e = pz * pz, hk = prog(tq, 2.5, 3.0), z0 = 1.05 + 0.10 * hk, z = z0 * Math.pow(44, e), m = E.inOut3(clamp(pz * 1.3));
    const dr = [lerp(-19, 20, hk), lerp(6, 0, hk)], sx = lerp(LENS.x + dr[0], W / 2, m), sy = lerp(LENS.y + dr[1], H / 2, m), rS = LENS.r * z;
    const covered = rS * 0.95 > Math.hypot(Math.max(sx, W - sx), Math.max(sy, H - sy)) + 40;
    if (!covered) {
      ctx.save(); ctx.translate(sx, sy); ctx.scale(z, z); ctx.translate(-LENS.x, -LENS.y);
      const Ly = await studioLayer(); ctx.drawImage(Ly, -Ly.bleed, -Ly.bleed);
      const b = CL.bob(t, 5, 2.5);
      await CL.sprite(ctx, F.lens.cut, CAM.x + b.dx * 0.5, CAM.y + b.dy * 0.5, { h: CAM.h, boil: 0.6, t, shadow: { dx: 16, dy: 24, blur: 22, alpha: 0.45 } });
      ctx.restore();
    }
    if (tq >= 2.75) {
      const ki = prog(tq, 2.9, 3.4), pop = lerp(0.55, 1, clamp(drawingIdx(t, 2.75) / 2));
      await X.iris(ctx, sx, sy, rS * pop, ki, t, { n: 6, spin: 1.2, drawCenter: ki > 0.12 ? async (c, cx, cy, rr, tt) => {
        const kb = await kalBuf(tt), s = rr / (Math.hypot(W, H) / 2); c.drawImage(kb, cx - (KS / 2) * s, cy - (KS / 2) * s, KS * s, KS * s);
      } : null });
    }
    if (!o.noTag && F.lens.tag && tq >= 2.5 && tq < 3.4) await DV.tag(ctx, t, 31 / 12, F.lens.tag);
  }

  /* ======================================================================= 3.5–4.5 · KALEIDOSCOPE */
  const KGR = async (c, bb) => {   // grass strip turned 90° (→ a shaggy ring); plain olive paper when the project has no grass_strip cut-out
    const [bx, by, bw, bh] = bb; c.fillStyle = CL.pat(c, CL.paper('#5E7020', 3, { tex: 1.2 })); c.fillRect(bx, by, bw, bh);
    const im = await CL.img('grass_strip'); if (!im || !im.naturalWidth || im.naturalWidth < 400) return;
    const cr = [0, 0, im.naturalWidth, im.naturalHeight], s = (bw + 30) / cr[3];
    c.filter = 'saturate(1.25) brightness(0.95) contrast(1.12)';
    for (let y = by - 40, k = 0; y < by + bh; y += cr[2] * s - 4, k++) { c.save(); c.translate(bx + bw / 2, y); c.rotate(Math.PI / 2); if (k % 2) c.scale(-1, 1); c.drawImage(im, cr[0], cr[1], cr[2], cr[3], 0, -cr[3] * s / 2, cr[2] * s, cr[3] * s); c.restore(); }
    c.filter = 'none';
  };
  const KSKY = (seed, clouds) => (c, bb) => {
    const [bx, by, bw, bh] = bb, HH = 800, k = (bw + 40) / HH, wc = CL.watercolor(seed, { w: Math.ceil((bh + 60) / k), h: HH, res: 0.25, tone: 0.95, bloom: 0.1, clouds, cloudY: [0.38, 0.6], base: '#2DB8EE', light: '#8ADAF5', deep: '#1186CC' });
    c.save(); c.translate(bx + bw / 2, by + bh / 2); c.rotate(Math.PI / 2); c.scale(k, k); c.drawImage(wc, -wc.width / 2, -wc.height / 2); c.restore();
  };
  const KSRC = () => once('ksrc', async () => {   // vertical bands right of the frame centre: the wedges mirror them into rings
    const c = mkc(W, H), x = c.getContext('2d'), ox = W / 2 - 960;
    x.drawImage(CL.watercolor(97, { w: W, h: H, tone: 0.95, bloom: 0.1, clouds: 0, base: '#2DB8EE', light: '#8ADAF5', deep: '#1186CC' }), 0, 0);
    const V = (x0, w0, w1, dx = 0) => ({ band: [x0, -40, x0 + dx, H + 40, w0, w1 ?? w0], tips: false });
    const RED = [{ color: C.red, speck: 0.3 }, (x0, x1) => ({ halftone: { color: '#FBEFE4', cell: 14, angle: 20, r: [0.04, 0.4], grad: [x0, 0, x1, 0] } })];
    const BANDS = [['sky', 1030, 150], ['red', 1135, 64], ['yel', 1192, 56], ['skyC', 1272, 110], ['grass', 1382, 124], ['sky', 1506, 128], ['red', 1600, 62], ['yel', 1658, 56], ['grass', 1742, 116], ['skyC', 1866, 136]];
    let i = 0;
    for (const [k, cx0, w] of BANDS) {
      const cx = cx0 + ox, sh = { dx: 7, dy: 0, blur: 12, alpha: 0.35 }, seed = 960 + i++, dx = ((seed * 37) % 21) - 10, s = V(cx - dx / 2, w, w * (0.9 + (seed % 3) * 0.06), dx);
      if (k === 'grass') await CL.piece(x, s, KGR, { seed, amp: 7, shadow: sh, cache: false });
      else if (k === 'sky' || k === 'skyC') await CL.piece(x, s, KSKY(seed, k === 'skyC' ? 0.6 : 0.45), { seed, amp: 7, shadow: sh, cache: false });
      else if (k === 'red') await CL.piece(x, s, RED[0], Object.assign({ seed, amp: 6, shadow: sh, cache: false }, RED[1](cx - w / 2, cx + w / 2)));
      else await CL.piece(x, s, { color: C.sun, brush: 0.6 }, { seed, amp: 6, shadow: sh, cache: false, halftone: { color: 'rgba(240,122,46,0.8)', cell: 11, angle: 30, r: [0.36, 0.04], grad: [cx - w / 2, 0, cx + w / 2, 0] } });
    }
    return c;
  });
  const FLY_T = [3.705, 3.805, 3.905], FLY_A = [0.15, Math.PI - 0.2, 0.5], FLY_S = [0.9, 0.85, 0.75];
  const FLYERS = F.kaleido.flyers.map((name, i) => ({ name, t0: FLY_T[i % 3], dur: 0.55, angle: FLY_A[i % 3], spin: i % 2 ? -0.8 : 0.6, scale: FLY_S[i % 3] }));
  const HOLE = [[52 / 12, 0.34], [53 / 12, 0.85]];
  const holeAt = (t) => { let h = 0; for (const [t0, v] of HOLE) if (t >= t0 - 1e-6) h = v; return h; };
  // the desk seen through the hole is counter-scaled in 9:16 (the tunnel itself is drawn ×ZC) so the 4.5 cut doesn't jump
  const kOpts = (t) => ({ segments: 8, rot: 0, twist: 0, zoom: 2.6, ratio: 0.5, levels: 7, srcScale: 1.2, rims: ['red', 'yellow', 'cyan', 'dots', 'red', 'yellow'], flyers: FLYERS, hole: holeAt(t),
    drawNext: async (c, tt) => { if (!VERT) { await deskScene(c, tt); return; } c.save(); c.translate(W / 2, H / 2); c.scale(1 / ZC, 1 / ZC); c.translate(-W / 2, -H / 2); await deskScene(c, tt); c.restore(); }, holeColor: '#F3A51C' });
  // stickers live on ONE tunnel level each (never in the mirrored source, which would repeat them on every ring)
  const RINGS = F.kaleido.rings.map((n, i) => [n, 10 + i, [580, 430, 300][i % 3], [0, Math.PI / 8, Math.PI / 16][i % 3], [160, 120, 110][i % 3], [-90, 90, 0][i % 3]]);
  async function kalStickers(ctx, tq) {
    const c = tq * 2.6;
    for (const [n, m, d, a0, h, rot] of RINGS) {
      const k = 1.2 * Math.pow(0.5, m - c), R = d * k; if (R < 12 || (d - h) * k > 1160) continue;
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(i * Math.PI / 4 + a0); if (i % 2) ctx.scale(1, -1);
        await CL.sprite(ctx, n, R, 0, { h: h * k, rot, shadow: { dx: 5 * k, dy: 8 * k, blur: 9 * k, alpha: 0.4 } }); ctx.restore(); }
    }
  }
  const kalDraw = async (ctx, t) => {
    const tq = q(t), src = await KSRC(), o = kOpts(tq);
    await X.kaleido(ctx, tq, async (c) => c.drawImage(src, 0, 0), Object.assign({}, o, { hole: 0, flyers: [] }));
    await kalStickers(ctx, tq);
    if (o.hole > 0 || FLYERS.some((f) => tq > f.t0 && tq < f.t0 + f.dur)) await X.kaleido(ctx, tq, async () => {}, Object.assign({}, o, { levels: -1 }));
  };
  const KS = Math.ceil(Math.hypot(W, H)) + 8;
  async function kalBuf(t) { const cv = buf('kal', KS, KS), x = cv.getContext('2d'); x.translate((KS - W) / 2, (KS - H) / 2); await kalDraw(x, t); return cv; }

  /* ======================================================================= 4.5–5.5 · DESK: laptop (photo) or phone (drawn) types the order / prompt, three objects slap */
  const PHONE = F.desk.device === 'phone';
  const LAP = PHONE ? Object.assign({ rot: -3 }, L.phone) : Object.assign({ rot: -1.5, sw: F.desk.spriteSize[0], shh: F.desk.spriteSize[1] }, L.lap);
  const lapSc = LAP.h / (LAP.shh || 1), lapW = (LAP.sw || 0) * lapSc, lapLocalQ = PHONE ? DV.phoneQuad(LAP.h) : F.desk.screenQuad.map(([px, py]) => [-lapW / 2 + px * lapSc, -LAP.h + py * lapSc]);
  const GEART = [4.75, 5.0, 5.25], GEARR = [-10, 8, 0];
  const DESK_CAM = L.deskCam;
  const LAP_SCR = (() => { const c = lapLocalQ.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]), p = xfPt(c, LAP.x, LAP.y, LAP.rot), z = 1 + DESK_CAM.z; return { x: DESK_CAM.fx + (p[0] - DESK_CAM.fx) * z, y: DESK_CAM.fy + (p[1] - DESK_CAM.fy) * z }; })();
  async function promptResult(c, r, t) {
    const [, , w, h] = r; c.drawImage(CL.watercolor(93, { w: 1200, h: 800, clouds: 0.6, tone: 0.82, cloudY: [0.1, 0.55] }), 0, 0, w, h);
    await CL.piece(c, { band: [-40, h * 0.86, w + 40, h * 0.8, h * 0.12, h * 0.1] }, { color: C.sun, brush: 0.6 }, { seed: 971, amp: 7 });
    const [a, b2, c2] = F.desk.result || [], bb = CL.bob(t, 11, h * 0.012), port = h > w, m = port ? w * 0.95 : h;   // phone screen: size by width, keep inside
    if (b2) await CL.sprite(c, b2, w * (port ? 0.26 : 0.3), h * (port ? 0.3 : 0.4), { h: port ? undefined : m * 0.22, w: port ? w * 0.36 : undefined, shadow: { dx: 4, dy: 7, blur: 8, alpha: 0.25 } });
    if (c2) await CL.sprite(c, c2, w * (port ? 0.74 : 0.72), h * (port ? 0.32 : 0.38), { h: port ? undefined : m * 0.24, w: port ? w * 0.34 : undefined, rot: 14, shadow: { dx: 4, dy: 7, blur: 8, alpha: 0.25 } });
    if (a) await CL.sprite(c, a, w * 0.5 + bb.dx, h * (port ? 0.56 : 0.52) + bb.dy, { h: port ? Math.min(h * 0.42, w * 1.1) : h * 0.42, rot: -6 + bb.rot, shadow: { dx: 8, dy: 16, blur: 10, alpha: 0.3 } });
  }
  async function deskScene(ctx, t) {
    const tq = q(t), pz = E.inOut3(prog(tq, 4.5, 5.5)), z = 1 + DESK_CAM.z * pz;
    await landCover(ctx, () => CL.desk(ctx, t, VERT ? {} : { cam: { zoom: z, fx: DESK_CAM.fx, fy: DESK_CAM.fy } }), 965, 545);
    await zoomAbout(ctx, z, DESK_CAM.fx, DESK_CAM.fy, async () => {
      for (let i = 0; i < F.desk.gear.length && i < 3; i++) { const [x, y, h] = L.gear[i]; await DV.slap(ctx, t, F.desk.gear[i], x, y, GEART[i], { h, rot: GEARR[i] }); }
      const d = CL.drop(tq, 4.25, { h: VERT ? 1900 : 1500, tilt: 5, dur: 0.25 }); if (!d.on) return;
      ctx.save(); ctx.translate(LAP.x, LAP.y + d.dy); ctx.rotate((LAP.rot + d.rot) * DEG); ctx.scale(d.sx, d.sy);
      if (PHONE) await DV.phone(ctx, LAP.h); else await CL.sprite(ctx, F.desk.laptop, 0, 0, { h: LAP.h, ax: 0.5, ay: 1, shadow: { dx: 12, dy: 20, blur: 20, alpha: 0.42 } });
      await X.screen(ctx, lapLocalQ, tq, 4.6, { text: F.desk.prompt, pill: F.desk.button, title: F.desk.ui, placeholder: F.desk.placeholder, cps: Math.max(32, [...(F.desk.prompt || '')].length / 0.42), menu: PHONE ? (F.desk.menu || F.desk.result) : null, menuLabel: F.desk.menuLabel, tClick: 5.15, fontSize: 64, fontSizePhone: 44, label: F.desk.label, drawResult: promptResult });
      if (PHONE) DV.phoneTop(ctx, LAP.h);
      ctx.restore();
    });
  }

  /* ======================================================================= 5.5–7.5 · strip rocket → TITLE */
  const TITLE_Y = L.titleY;
  const deskOff = (t) => H * 1.18 * Math.pow(prog(q(t), 5.5, 71 / 12), 1.6);
  async function rider(c, x, y, tt) {
    const qq = q(tt), lk = prog(qq, 68 / 12, 71 / 12); if (lk >= 1) return;
    const sl = CL.slap(qq, 5.5, { from: 1.3, rot0: 0 }), s = lerp(1, 0.6, lk) * (sl.on ? sl.s : 1), rot = lk > 0 ? (Math.floor(tt * 12 + 1e-6) % 2 ? 0.15 : -0.15) : Math.sin(qq * 9) * 0.05;
    c.save(); c.translate(x, y - 640 * Math.pow(lk, 1.5)); c.scale(s, s); await CL.sprite(c, F.hero.cut, 0, 0, { w: F.hero.w * 0.52, rot: rot / DEG, shadow: { dx: 6, dy: 10, blur: 10, alpha: 0.35 } }); c.restore();
  }
  async function titleBg(ctx, t) {
    const tq = q(t), tilt = 0.9 * E.inOut3(prog(tq, 5.5, 6.0)) + 0.1 * prog(tq, 6.0, 8.5);
    await CL.sky(ctx, t, { tilt, part: E.inOut3(prog(tq, 67 / 12, 6.0)) });
    if (tq < 71 / 12) { const B = padBuf('deskS'); await deskScene(B.getContext('2d'), t); drawSheet(ctx, B, 0, deskOff(t), [1, 0, 0, 0], 17, [0, -18]); }
    const rby = Math.min(LAP_SCR.y + deskOff(t), H + 70), rhy = lerp(rby, H * 0.31, E.out3(clamp((q(t) - 5.5) / 0.42)));
    await X.rocket(ctx, t, 5.5, { vx: W / 2, vy: H * 0.31, by: rby, bx: LAP_SCR.x, dur: 0.42, n: 64, width: clamp((rby - rhy) * 2.2, 300, 1050), narrow: 0.66, seed: 7, drawRider: rider });
    await X.burst(ctx, t, 6.0, { cx: W / 2, cy: TITLE_Y, n: 26, seed: 9 });
  }
  const TFR = [0, 0.256, 0.471, 0.62, 0.752, 0.835, 0.917, 0.95, 0.983, 1];   // expo-out, no overshoot (ref bottom-edge fractions)
  async function titleScene(ctx, t) {
    await titleBg(ctx, t);
    const tq = q(t); if (tq < 6.0) return;
    const i = drawingIdx(t, 6.0), f = i < TFR.length ? TFR[i] : 1, dy0 = H * 0.075 - (TITLE_Y + TTL.off);
    await X.title(ctx, COPY.title, W / 2, TITLE_Y + dy0 * (1 - f), tq, 6.0, { size: TTL.size, font: COPY.titleFont, drop: false, zoom: 0.03 });
    const [above, below] = F.titleFly || [];
    if (below && tq >= 6.5 && tq <= 7.4) { const k = prog(tq, 6.5, 7.4), b = CL.bob(t, 23, 3);
      await CL.sprite(ctx, below, lerp(W + 300, -300, k) + b.dx, L.crossB[0] + b.dy, { h: L.crossB[1], rot: 8 - 20 * k + b.rot, shadow: { dx: 10, dy: 20, blur: 12, alpha: 0.3 } }); }
    if (above && tq >= 6.3 && tq <= 7.4) { const k = prog(tq, 6.3, 7.4), b = CL.bob(t, 17, 4);
      await CL.sprite(ctx, above, lerp(-360, W + 360, k) + b.dx, L.crossA[0] + Math.sin(k * 5) * 12 + b.dy, { w: L.crossA[1], rot: -12 + 24 * k + b.rot, boil: 0.7, t, shadow: { dx: 12, dy: 34, blur: 14, alpha: 0.25 } }); }
  }

  /* ======================================================================= 7.5–10 · tear → logo band → flicker → CTA */
  function vnoise(seed) { const r = ENG.rng(seed * 7 + 3), N = 1024, v = new Float32Array(N); for (let i = 0; i < N; i++) v[i] = r() * 2 - 1; return (x) => { x = ((x % N) + N) % N; const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return v[i] + (v[(i + 1) % N] - v[i]) * s; }; }
  function fbm(seed) { const a = vnoise(seed), b = vnoise(seed + 17), c = vnoise(seed + 29); return (x) => a(x) * 0.58 + b(x * 2.17 + 5.3) * 0.29 + c(x * 4.73 + 1.1) * 0.13; }
  const TEARDONE = (() => {
    const { y0, y1, seed } = TEAR, st = 6, n = Math.ceil((W + 80) / st) + 1, nA = fbm(seed), nB = fbm(seed + 9), nC = vnoise(seed + 3), nD = vnoise(seed + 5), r = ENG.rng(seed), xs = [], top = [], bot = [], wt = [], wb = [];
    for (let i = 0; i < n; i++) { const x = -40 + i * st; xs.push(x); top.push(y0 + nA(x / 60) * 13 + (r() - 0.5) * 3); bot.push(y1 + nB(x / 60) * 13 + (r() - 0.5) * 3); wt.push(3 + 12 * Math.pow(clamp(0.5 + 0.8 * nC(x / 70)), 1.5) + r() * 1.5); wb.push(2 + 10 * Math.pow(clamp(0.5 + 0.8 * nD(x / 70)), 1.5) + r() * 1.5); }
    const R = new Path2D(), Ts = new Path2D(), tp = new Path2D(), bp = new Path2D(), m = n - 1;
    R.moveTo(xs[0], top[0]); for (let i = 1; i <= m; i++) R.lineTo(xs[i], top[i]); for (let i = m; i >= 0; i--) R.lineTo(xs[i], bot[i]); R.closePath();
    Ts.moveTo(xs[0], top[0] - 200); for (let i = 0; i <= m; i++) Ts.lineTo(xs[i], top[i]); Ts.lineTo(xs[m], top[m] - 200); Ts.closePath();
    for (let i = 0; i <= m; i++) i ? tp.lineTo(xs[i], top[i] - wt[i]) : tp.moveTo(xs[i], top[i] - wt[i]); for (let i = m; i >= 0; i--) tp.lineTo(xs[i], top[i]); tp.closePath();
    for (let i = 0; i <= m; i++) i ? bp.lineTo(xs[i], bot[i]) : bp.moveTo(xs[i], bot[i]); for (let i = m; i >= 0; i--) bp.lineTo(xs[i], bot[i] + wb[i]); bp.closePath();
    return { R, Ts, tp, bp };
  })();
  function tearDone(ctx, A, B) {
    const T = TEARDONE; ctx.drawImage(A, 0, 0);
    ctx.save(); ctx.clip(T.R); ctx.drawImage(B, 0, 0); ctx.shadowColor = 'rgba(0,0,0,0.42)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 7; ctx.fillStyle = '#000'; ctx.fill(T.Ts); ctx.restore();
    ctx.save(); ctx.fillStyle = U.pat(ctx, X.PAL.paper); ctx.fill(T.tp); ctx.fill(T.bp); ctx.strokeStyle = 'rgba(80,60,40,0.18)'; ctx.lineWidth = 1; ctx.stroke(T.tp); ctx.stroke(T.bp); ctx.restore();
  }
  const logoAt = (c, t, style) => X.logoBand(c, COPY.logo, t, { style: style || 'band', x: LOGO.x, y: LOGO.y, h: LOGO.h, size: LOGO.size, seed: 8, boil: !style || style === 'band', font: F.logoFont });
  async function lookAt(c, t, st) {   // 'posters': the wordmark straight on the poster wall, cream letters (read on any palette)
    if (st !== 'posters') { await logoAt(c, t, st); return; }
    await CL.posters(c, t, {}); U.drawPiece(c, U.logoSprite(COPY.logo, LOGO.size, 'cream', 8, F.logoFont), LOGO.x, LOGO.y, { shadow: false });
  }
  const flashAt = (t) => { const i = Math.floor((t - 8.0) * 24 + 1e-6); return i >= 0 && i < FLICK_FR.length ? FLICK[FLICK_FR[i]] : null; };
  const T_SUB = 8.5, T_CLICK = 9.0;
  async function endScene(ctx, t) {
    const tq = q(t), st = flashAt(t), z = 1 + 0.025 * Math.max(0, tq - 95 / 12);
    await zoomAbout(ctx, z, W / 2, L.endFocusY, async () => {
      const BG = buf('tbg'); await titleBg(BG.getContext('2d'), t);
      const under = async (c) => { c.drawImage(BG, 0, 0); await logoAt(c, t, null); };
      if (tq < 7.9) await X.tear(ctx, prog(tq, 89 / 12, 7.92), async (c) => titleScene(c, t), under, TEAR);
      else {
        const Bc = buf('tunder'); await under(Bc.getContext('2d')); tearDone(ctx, BG, Bc);
        if (st) { const Fb = buf('flash'); await lookAt(Fb.getContext('2d'), tq, st); ctx.save(); ctx.clip(TEARDONE.R); ctx.drawImage(Fb, 0, 0); ctx.restore(); }
      }
      if (F.extraTag && tq >= 8.75) await X.tag(ctx, W / 2, L.extraY ?? TEAR.y0 - 120, F.extraTag, { t: tq, t0: 8.75, color: 'yellow', font: 'sans', size: L.extraSize, rot: -0.02, tape: 'top' });
      if (COPY.bandTag && tq >= 95 / 12) await X.tag(ctx, W / 2, LOGO.y + L.roleDy, COPY.bandTag, { t: tq, t0: 95 / 12, color: 'ink', font: 'sans', size: L.roleSize, rot: -0.015, tape: false });
      if (tq >= T_CLICK) await X.confetti(ctx, t, T_CLICK, { x: SUB.x, y: SUB.y - 20, n: 24, speed: 1300, spread: Math.PI * 1.1, gravity: 1300, dur: 0.95, seed: 28 });
      if (tq >= T_SUB) await X.subscribe(ctx, SUB.x, SUB.y, tq, { h: SUB.h, slap: T_SUB, tClick: T_CLICK, bell: false, labels: SUBL });
      if (COPY.url && tq >= 8.75) await X.tag(ctx, W / 2, URL_Y, COPY.url, { t: tq, t0: 8.75, color: 'ink', font: 'mono', size: VERT ? 48 : 38, rot: 0.015, tape: false });
      if (tq >= 103 / 12) {   // cursor curves in from the right, clicks the right end of the button on 9.0, rises off to the right
        const click = t >= T_CLICK && t < T_CLICK + 2 / 24 ? 1 : 0;
        const al = prog(tq, 103 / 12, 107 / 12), c2 = prog(tq, 109 / 12, 9.5), tx = SUB.x + SUBW.a / 2 - 30, ty = SUB.y - SUB.h * 0.32, [y0, xe, ye] = L.cursorEnd;
        let x = lerp(W + 90, tx, E.out3(al)), y = lerp(y0, ty, al * al); x = lerp(x, xe, c2 * c2); y = lerp(y, ye, E.out3(prog(tq, 109 / 12, 112 / 12)));
        await X.cursor(ctx, x, y, t, { size: VERT ? 130 : 116, click, rot: -0.3 });
      }
    });
  }

  /* ======================================================================= timeline */
  const cuts = [];
  const Cut = (t0, t1, draw) => cuts.push({ t0, t1, draw: async (ctx, t, k, lt) => {
    await warm();
    const z = K.punch(q(t)); ctx.fillStyle = '#FBF8F1'; ctx.fillRect(0, 0, W, H);
    await zoomAbout(ctx, z, W / 2, H / 2, () => draw(ctx, t, k, lt));
  } });
  Cut(0.0, 1.0, async (ctx, t) => { await pageScene(ctx, t); await openTag(ctx, t); });
  Cut(1.0, 2.5, async (ctx, t) => {
    await world1Scene(ctx, t);
    const i = drawingIdx(t, 1.0);
    if (i < 3) { const A = padBuf('ripA'); await pageScene(A.getContext('2d'), t); ripDraw(ctx, [0.05, 0.36, 0.8][i], A); await X.confetti(ctx, t, 1.0, { x: W / 2, y: H / 2, n: 30, speed: 1500, spread: Math.PI * 2, gravity: 900, dur: 0.6, seed: 20, colors: [C.paper, C.paper, C.red, C.sun] }); }
    await openTag(ctx, t);
  });
  Cut(2.5, 3.5, (ctx, t) => wipe(ctx, t, 2.5, (c) => world1Scene(c, t), (c) => lensScene(c, t), { from: [1, 0], edges: [0, 0, 0, 1], seed: 4, push: 0.22, roll: -10, rollB: 6, speed: { n: 10, angle: Math.PI, speed: 3600, alpha: 0.9, seed: 41 } }));
  Cut(3.5, 4.5, (ctx, t) => (VERT ? zoomAbout(ctx, ZC, W / 2, H / 2, () => kalDraw(ctx, t)) : kalDraw(ctx, t)));
  Cut(4.5, 5.5, async (ctx, t) => { await deskScene(ctx, t); if (F.desk.tag && q(t) >= 4.5 + 1 / 12) await DV.tag(ctx, t, 4.5 + 1 / 12, F.desk.tag); });
  Cut(5.5, 6.0, (ctx, t) => titleBg(ctx, t));
  Cut(6.0, 7.5, (ctx, t) => titleScene(ctx, t));
  Cut(7.5, F.duration, (ctx, t) => endScene(ctx, t));

  window.SCENES = { duration: F.duration, cuts, overlay: async (ctx, t) => { CL.printGrain(ctx, t, 0.05); } };
  window.COPY = COPY;
})();
