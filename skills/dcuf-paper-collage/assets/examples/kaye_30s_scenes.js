/* scenes.js — kaye.creatives launch film (30 s, 1920×1080, 24 fps, 120 BPM). Torn-paper collage (San Diego Zoo "Africa Rocks" technique), all code.
 * Implements script.md v3 beat by beat, locked to audio/NOTES.md cues:
 *   0.5 ▶ plate slap · 1.0–1.45 cursor in · 1.5 press · 2.0 DROP page rips L/R → F1 · 3.0 car pass + helmet · 3.75–4.0 poster sheet, phone lands 4.0
 *   5.0 shutter · 5.5–6.0 zoom-through the phone screen → camera · 6.75–7.6 iris · 7.15–8.0 push into the lens → 8.0 kaleidoscope
 *   9.38/9.5/9.64 cut-outs fly past · 9.6–9.9 hex hole → clouds · 11.0 biplane passes · 11.75–12.0 desk sheet, laptop lands 12.0
 *   12.5/13.0/13.25/13.5/13.75 gear · 13.2 generate ✦ · 13.83–14.0 whip → 14.0 STEP BY STEP (0.125 s slots) · 16/16.5/17/17.5 cards, pull back
 *   18.0 strip rocket carries ▶ up (tilt-up) · 19.5 breath · 20.0 KAYE / CREATES slam + radial burst · 24.0–24.42 page tear → logo band
 *   26.0–27.5 18 two-frame logo style flashes (26.0–26.5 full frame, then inside the band) · 27.5 logo click · 28.0 SUBSCRIBE slap · 28.6 click → SUBSCRIBED ✓ · 28.8 bell
 * Every frame is a pure function of t; motion runs on twos (q(t)); everything t-independent is cached (CL / CLX caches + local Maps).
 */
(function () {
  'use strict';
  const { W, H, clamp, lerp, prog, E } = ENG;
  const K = KIT, X = CLX, U = CLX._, C = CL.C, DEG = Math.PI / 180;

  /* ---------- copy: every on-screen word lives here ---------- */
  const COPY = {
    channelTag: 'kaye.creatives ✦ youtube',
    f1: 'F1 COMMERCIAL · AI + BLENDER',
    phone: 'PHONE AD · FULL AI WORKFLOW',
    realism: 'AI REALISM',
    worlds: 'CINEMATIC WORLDS',
    ui: 'kaye ✦ studio', placeholder: 'describe a shot…',
    prompt: 'a pink race car in the clouds', generate: 'generate ✦',
    steps: 'STEP BY STEP',
    durs: ['NEW', 'NEW', 'NEW', 'NEW'], // no invented metrics: a 'NEW' chip instead of video lengths
    heads: ['F1 AD', 'PHONE AD', 'AI REALISM', 'NEW WORLDS'], // 2-word thumbnail headlines
    title: ['KAYE', 'CREATES'], // alternatives: ['LIGHTS, CAMERA,', 'A.I.'] · ['IDEAS →', 'FILMS'] · ['MADE', 'WITH AI']
    logo: 'kaye.creatives',
    bandTag: 'AI FILMMAKING · NEW VIDEO EVERY WEEK',
    subscribe: 'SUBSCRIBE', subscribed: 'SUBSCRIBED ✓', // drawn by CLX.subscribe
    url: 'youtube.com/@Kaye.creates',
  };
  // 26–27.5 logo flashes (18 slices of 2 frames, locked to the score's stutter): slices 1–6 (26.0–26.5) one full-frame pass of the 6 looks
  // (as the ref, ≈ .5 s) · slices 7–18 the looks stay inside the torn band and every 3rd slice is the clean band lockup (photosensitivity).
  // FLASH_AREA = 'band' keeps even the first pass inside the band. Order keeps the black looks (glitter, streak) away from the bright ones.
  const FLASH_AREA = 'full';
  const FLASH6 = ['posters', 'lime', 'orange', 'pink', 'glitter', 'streak'];

  K.setup({ bars: [2, 4, 6, 8, 10, 12, 14, 16, 20, 22, 24, 28] });

  /* ---------- helpers ---------- */
  const q = (t) => Math.floor(t * 12 + 1e-6) / 12;                 // stop-motion "on twos"
  const drawingIdx = (t, t0) => Math.floor((t - t0) * 12 + 1e-6);  // drawing index since t0
  const BUFS = new Map();
  function buf(name, w = W, h = H) {
    let c = BUFS.get(name); if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; BUFS.set(name, c); }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, c.width, c.height);
    return c;
  }
  const PAD = 170; // bleed of buffers that get moved/rotated (sheets, rip halves)
  function padBuf(name) { const c = buf(name, W + 2 * PAD, H + 2 * PAD), x = c.getContext('2d'); x.fillStyle = '#FBF8F1'; x.fillRect(0, 0, c.width, c.height); x.translate(PAD, PAD); c.pad = PAD; return c; }
  const ONCE = new Map();
  const once = (k, fn) => { if (!ONCE.has(k)) ONCE.set(k, fn()); return ONCE.get(k); };
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const paperPat = (ctx) => ctx.createPattern(CL.paper(C.paper, 3, { tex: 0.8 }), 'repeat');
  const pc = (x, shape, fill, o) => CL.piece(x, shape, fill, Object.assign({ cache: false }, o)); // pieces baked into cached layers
  async function zoomAbout(ctx, z, fx, fy, fn, rot = 0) { ctx.save(); ctx.translate(fx, fy); if (rot) ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-fx, -fy); await fn(); ctx.restore(); }
  const xfPt = (p, tx, ty, rotDeg, sx = 1, sy = 1) => { const a = rotDeg * DEG, c = Math.cos(a), s = Math.sin(a), x = p[0] * sx, y = p[1] * sy; return [tx + x * c - y * s, ty + x * s + y * c]; };
  const TAG = { size: 46, font: 'sans' };
  const worldTag = (ctx, t, t0, str, color, o = {}) => X.tag(ctx, o.x ?? 92, o.y ?? 978, str, Object.assign({ t, t0, color, anchor: 'left', rot: -0.025, tape: 'top' }, TAG, o));
  // rounded-corner path through a quad (corner radius r in the quad's own units)
  function roundQuad(Q, r) {
    const p = new Path2D(), n = Q.length, at = (a, b, d) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [a[0] + dx / l * d, a[1] + dy / l * d]; };
    for (let i = 0; i < n; i++) { const P0 = Q[(i - 1 + n) % n], P1 = Q[i], P2 = Q[(i + 1) % n], a = at(P1, P0, r), b = at(P1, P2, r); i ? p.lineTo(a[0], a[1]) : p.moveTo(a[0], a[1]); p.quadraticCurveTo(P1[0], P1[1], b[0], b[1]); }
    p.closePath(); return p;
  }

  /* ---------- warm-up (once per browser, inside __seek so fonts are loaded) ---------- */
  const TEAR = { y0: Math.round(H * 0.22), y1: Math.round(H * 0.76), seed: 5, flapW: 360 };
  const LOGO = { x: W / 2, y: Math.round((TEAR.y0 + TEAR.y1) / 2), h: 400, size: 190 };
  const SUB = { x: W / 2 - 58, y: 895, h: 140 };
  let WARM = null;
  const warm = () => WARM || (WARM = (async () => {
    await CL.preload();
    await X.warm({ iris: 6, kaleido: 8, title: { lines: COPY.title }, band: { h: LOGO.h, seed: 8 }, logo: { text: COPY.logo, size: LOGO.size }, play: 470, subscribe: SUB.h, tear: TEAR,
      cuts: ['cam_front', 'car', 'clap', 'reel', 'helmet', 'cam_side', 'headphones', 'plane_side', 'cassette'] });
    await X.warm({ play: 260 });
  })());

  /* ======================================================================= paper transitions */
  const SHEETS = new Map();
  const sheetPath = (edges, seed) => { const k = edges.join('') + seed; if (!SHEETS.has(k)) SHEETS.set(k, CL.torn({ rect: [-170, -170, W + 340, H + 340], edges }, seed, { amp: 18, white: [3, 17], bite: 3 })); return SHEETS.get(k); };
  // a canvas glued on a big torn-edged paper sheet, offset by (ox, oy)
  function drawSheet(ctx, cv, ox, oy, edges, seed, sh = [0, 14]) {
    const T = sheetPath(edges, seed);
    ctx.save(); ctx.translate(ox, oy);
    ctx.save(); ctx.shadowColor = 'rgba(10,16,30,0.5)'; ctx.shadowBlur = 34; ctx.shadowOffsetX = sh[0]; ctx.shadowOffsetY = sh[1]; ctx.fillStyle = paperPat(ctx); ctx.fill(T); ctx.restore();
    ctx.save(); ctx.clip(T.inner); ctx.drawImage(cv, -(cv.pad || 0), -(cv.pad || 0)); ctx.restore();
    ctx.restore();
  }
  // B arrives on a torn sheet sliding in from `from` (unit vector of the side it comes from); A is pushed away + rolled. 3 drawings by default.
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
  // 2.0 DROP: the page rips from the centre, halves fly out L / R
  const RIP = (() => {
    const r = CL.R(901), pts = []; for (let y = -140; y <= H + 140; y += 70) pts.push([W / 2 + (r() - 0.5) * 120 + (y - H / 2) * 0.1, y]);
    const top = pts[0], bot = pts[pts.length - 1];
    const L = [[-500, top[1], 0], ...pts.map((p, i) => [p[0], p[1], i < pts.length - 1 ? 1 : 0]), [-500, bot[1], 0]];
    const Rr = [[top[0], top[1], 0], [W + 500, top[1], 0], [W + 500, bot[1], 0], ...pts.slice().reverse().map((p, i) => [p[0], p[1], i < pts.length - 1 ? 1 : 0])];
    return { L: CL.torn({ poly: L }, 911, { amp: 14, white: [4, 18], bite: 4 }), R: CL.torn({ poly: Rr }, 912, { amp: 14, white: [4, 18], bite: 4 }) };
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

  /* ======================================================================= 0–2 · PAGE + ▶ + cursor */
  const POPS = [['reel', 560, 712, 235, 0.75, -8], ['clap', 1235, 740, 255, 0.92, 9], ['cam_side', 150, 700, 260, 1.08, -6]];
  const PLAY0 = { x: 960, y: 548, size: 470 };
  async function pageScene(ctx, t, o = {}) {
    const tq = q(t), cam = { zoom: 1 + 0.024 * tq, y: -5 * tq, fx: 960, fy: 560 };
    const press = t >= 1.5 && t < 1.625 ? 1 : t >= 1.625 && t < 1.708 ? 0.45 : 0;
    await CL.page(ctx, t, { cam, insert: {
      1: async (c) => { // little cut-outs pop up from behind the far hills (masked by layer 2)
        for (const [n, x, y, h, t0, rot] of POPS) { const p = CL.pop(t, t0, { h: h * 0.85, frames: 2 }); if (!p.on) continue; const b = CL.bob(t, x, 2.4);
          await CL.sprite(c, n, x + b.dx, y + p.dy + b.dy, { h, ay: 1, rot: rot + b.rot, sx: p.sx, sy: p.sy, shadow: { dx: 5, dy: 8, blur: 10, alpha: 0.3 } }); }
      },
      3: async (c) => { // 1.5 press: a paper starburst flashes behind the ▶ for 2 frames
        if (t >= 1.5 && t < 1.5 + 2 / 24) await X.star(c, PLAY0.x, PLAY0.y, 330, t, { points: 14, inner: 0.62, color: X.PAL.yellow, seed: 3, pop: 1 });
        await X.play(c, PLAY0.x, PLAY0.y, PLAY0.size, t, { t0: 0.5 - 3 / 24, press });
      },
      4: async (c) => { // giant helmet peeks from the bottom-right corner (teaser for world 1)
        const p = CL.pop(t, 0.83, { h: 420, frames: 3 }); if (!p.on) return; const b = CL.bob(t, 9, 3.5);
        await CL.sprite(c, 'helmet', 1735 + b.dx, 1235 + p.dy + b.dy, { h: 600, ay: 1, rot: -10 + b.rot, sx: p.sx, sy: p.sy, shadow: { dx: -10, dy: 14, blur: 18, alpha: 0.42 } });
      },
    } });
    // cursor slides in R→C 1.0–1.45, presses 1.5
    if (t >= 1.0) {
      const m = E.out3(prog(tq, 1.0, 1.45)), x = lerp(W + 80, PLAY0.x + 28, m), y = lerp(640, PLAY0.y + 18, m) + Math.sin(m * Math.PI) * -60;
      await X.cursor(ctx, x, y, t, { size: 140, click: press ? 1 : 0 });
    }
    if (!o.noTag) await X.tag(ctx, 96, 150, COPY.channelTag, { t, t0: 1.0, color: 'white', font: 'sans', size: 44, anchor: 'left', rot: -0.035, tape: 'top' });
  }

  /* ======================================================================= 2–4 · WORLD 1 · F1 */
  async function f1Scene(ctx, t, o = {}) {
    const tq = q(t), lt = tq - 2.0, z = 1 + 0.03 * clamp(lt / 2);
    await zoomAbout(ctx, z, W / 2, H / 2, async () => {
      await CL.diag(ctx, t, { angle: -24, speed: 1300, offset: 500 });
      const b = CL.bob(t, 3, 4), x = lerp(-760, 760, E.inOut3(clamp((lt - 0.05) / 1.9))); // the car crosses frame centre exactly on 3.0 (doppler peak), exiting by the 3.75 wipe
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-24 * DEG);
      await CL.sprite(ctx, 'car', x + b.dx, 30 + b.dy, { h: 380, rot: b.rot, flipX: true, shadow: { dx: 26, dy: 34, blur: 18, alpha: 0.4 } });
      ctx.restore();
    });
    await X.speed(ctx, t, { n: 8, angle: Math.PI - 24 * DEG, speed: 3000, alpha: 0.85, seed: 31 });
    // helmet flies in from the top-right and slaps on 3.0
    if (tq >= 2.83) {
      const i = drawingIdx(t, 2.833), b = CL.bob(t, 21, 3), s = CL.slap(t, 3.0, { from: 1.3, rot0: 10 });
      let x = 1500, y = 300, h = 300, rot = 8;
      if (i === 0) { x = 2150; y = -120; h = 380; rot = 30; } else if (i === 1) { x = 1720; y = 120; h = 360; rot = 18; }
      else { h = 300 * s.s; rot = 8 + s.rot; x += b.dx - (tq - 3) * 40; y += b.dy + (tq - 3) * 18; }
      await CL.sprite(ctx, 'helmet', x, y, { h, rot: rot + b.rot, shadow: { dx: 14, dy: 22, blur: 18, alpha: 0.42 } });
    }
    if (!o.noTag) await worldTag(ctx, t, 2.25, COPY.f1, 'yellow');
  }

  /* ======================================================================= 4–6 · WORLD 2 · PHONE AD */
  const PHONE = { x: 960, y: 872, h: 560, rot: -4, sw: 2128, shh: 1216 };
  const PHONE_Q = [[106, 180], [2006, 101], [2035, 1046], [138, 1095]]; // screen in phone.png pixels
  const phoneSc = PHONE.h / PHONE.shh, phoneW = PHONE.sw * phoneSc;
  const phoneLocalQ = PHONE_Q.map(([px, py]) => [-phoneW / 2 + px * phoneSc, -PHONE.h + py * phoneSc]);
  const phoneRestQ = phoneLocalQ.map((p) => xfPt(p, PHONE.x, PHONE.y, PHONE.rot));
  const PH_C = phoneRestQ.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  const PH_ROT = Math.atan2(phoneRestQ[1][1] - phoneRestQ[0][1], phoneRestQ[1][0] - phoneRestQ[0][0]); // screen tilt on frame
  const PH_SH = (Math.hypot(phoneRestQ[3][0] - phoneRestQ[0][0], phoneRestQ[3][1] - phoneRestQ[0][1]) + Math.hypot(phoneRestQ[2][0] - phoneRestQ[1][0], phoneRestQ[2][1] - phoneRestQ[1][1])) / 2;
  const PH_ZEND = (H * 1.22) / PH_SH; // the screen ends 22 % taller than the frame: no bezel / rounded corner on the last drawing
  const VF = { w: 1110, h: 540 }; // viewfinder canvas ≈ screen aspect
  async function viewfinder(t) {
    const cv = buf('vf', VF.w, VF.h), x = cv.getContext('2d'), tf = q(Math.min(t, 5.0)), lt = tf - 3.8;
    x.drawImage(CL.watercolor(91, { w: VF.w + 120, h: VF.h + 60, clouds: 0.35, tone: 0.95, cloudY: [0.05, 0.5], bloom: 0.15 }), -60 + lt * 14, -30);
    await CL.piece(x, { band: [-60, 470, 1180, 420, 90, 70] }, { color: C.sun, brush: 0.6 }, { seed: 941, amp: 8 });
    await CL.piece(x, { band: [-60, 540, 1180, 500, 90, 80] }, { color: C.orange, brush: 0.6 }, { seed: 942, amp: 8 });
    await CL.piece(x, { band: [500, 430, 1180, 400, 26, 18] }, C.red, { seed: 943, amp: 5 });
    await CL.sprite(x, 'cloud_2', 250 + lt * 26, 250, { h: 210, shadow: { dx: 4, dy: 7, blur: 10, alpha: 0.25 } });
    await CL.sprite(x, 'cloud_4', 860 + lt * 40, 150, { h: 130, flipX: true, shadow: { dx: 4, dy: 7, blur: 10, alpha: 0.25 } });
    await CL.sprite(x, 'plane_side', 230 + lt * 190, 330 - lt * 22, { h: 110, rot: -6, boil: 0.6, t: tf, shadow: { dx: 6, dy: 14, blur: 10, alpha: 0.2 } });
    // camera UI: heavy corner brackets with a 2 px dark shadow, REC on a dark pill, a focus square snapping onto the plane on the 4.5 / 4.75 beats
    x.save(); x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 10; x.lineCap = 'square'; x.shadowColor = 'rgba(10,20,40,0.6)'; x.shadowOffsetX = 2; x.shadowOffsetY = 2; x.shadowBlur = 2;
    const m = 46, l = 70; for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [VF.w - m, m, -1, 1], [m, VF.h - m, 1, -1], [VF.w - m, VF.h - m, -1, -1]]) { x.beginPath(); x.moveTo(cx, cy + sy * l); x.lineTo(cx, cy); x.lineTo(cx + sx * l, cy); x.stroke(); }
    if (tf >= 4.5) {
      const tb = tf >= 4.75 ? 4.75 : 4.5, lb = tb - 3.8, fx = 230 + lb * 190, fy = 330 - lb * 22, sz = (tb === 4.5 ? 210 : 160) * (1 + 0.3 * Math.max(0, 1 - drawingIdx(t, tb) / 1)), hs = sz / 2, tk = sz * 0.22;
      x.strokeStyle = '#FFD21E'; x.lineWidth = 6;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { x.beginPath(); x.moveTo(fx + sx * hs, fy + sy * (hs - tk)); x.lineTo(fx + sx * hs, fy + sy * hs); x.lineTo(fx + sx * (hs - tk), fy + sy * hs); x.stroke(); }
      x.beginPath(); x.moveTo(fx - 12, fy); x.lineTo(fx + 12, fy); x.moveTo(fx, fy - 12); x.lineTo(fx, fy + 12); x.lineWidth = 4; x.stroke();
    }
    x.restore();
    x.fillStyle = 'rgba(0,0,0,0.4)'; ENG.roundRect(x, 64, 66, 140, 54, 27); x.fill();
    if (t < 5.0 && Math.floor(t * 2) % 2 === 0) { x.fillStyle = C.red; x.beginPath(); x.arc(96, 93, 14, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = '#fff'; x.font = '700 30px "JetBrains Mono"'; x.textBaseline = 'middle'; x.fillText('REC', 122, 94);
    if (t >= 5.0) { // captured: white photo border + 2-frame shutter flash
      x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 22; x.strokeRect(11, 11, VF.w - 22, VF.h - 22);
      const fl = t < 5.0 + 2 / 24 ? 0.95 : t < 5.0 + 4 / 24 ? 0.4 : 0; if (fl) { x.fillStyle = `rgba(255,253,245,${fl})`; x.fillRect(0, 0, VF.w, VF.h); }
    }
    return cv;
  }
  // world 3 rendered wide (screen aspect) for the zoom-through: frame x ∈ [-150, W+150]
  // inside the phone the camera world counter-zooms to 1/1.22 as the screen grows to 1.22 H, so the last push drawing (5.917) equals camScene at 6.0
  // (z0 1.05, lens drift −19/+6 px = the 1.22 zoom about the frame centre instead of the lens); the studio layer has 380 px bleed to cover the margins
  async function world3Wide(t) { const cv = buf('w3', W + 300, H), x = cv.getContext('2d'), e = prog(q(t), 5.5, 5.917) ** 2; x.translate(150, 0); await camScene(x, t, { noTag: true, zMul: lerp(1, 1 / 1.22, e), drift: [0, 0] }); return cv; }
  const STARS2 = [[300, 230, 46, C.sun, 4.17], [1640, 205, 40, C.cobalt, 4.33], [1690, 860, 52, C.paper, 4.5], [250, 860, 38, C.red, 4.67], [1500, 520, 30, C.pink, 4.83], [430, 520, 28, '#5BD3F3', 5.0]];
  async function posterScene(ctx, t, o = {}) {
    const tq = q(t), lt = tq - 4.0, pz = o.noPush ? 0 : prog(tq, 5.5, 5.917), e = pz * pz; // zoom-through ends on 5.917: the 5.917 drawing already has no bezel
    const draw = async () => {
      await CL.posters(ctx, t, { cam: { zoom: 1.06 - 0.02 * clamp(lt / 2), x: -30 + 16 * lt } });
      for (const [x, y, r, col, t0] of STARS2) { if (t < t0) continue; const b = CL.bob(t, x, 2); await X.star(ctx, x + b.dx, y + b.dy, r, t, { points: 5, inner: 0.45, color: col, spin: 0.4, seed: x % 7 + 1, pop: clamp((drawingIdx(t, t0) + 1) / 2) }); }
      const d = CL.drop(t, 4.0 - 4 / 24, { h: 1400, tilt: -7 }); if (!d.on) return;
      const b = d.k >= 1 ? CL.bob(t, 7, 2) : { dx: 0, dy: 0, rot: 0 };
      ctx.save(); ctx.translate(PHONE.x + b.dx, PHONE.y + d.dy + b.dy); ctx.rotate((PHONE.rot + d.rot + b.rot) * DEG); ctx.scale(d.sx, d.sy);
      await CL.sprite(ctx, 'phone', 0, 0, { h: PHONE.h, ax: 0.5, ay: 1, shadow: { dx: 14, dy: 22, blur: 20, alpha: 0.45 } });
      const src = tq >= 5.5 && !o.noPush ? await world3Wide(t) : await viewfinder(t);
      ctx.save(); ctx.clip(roundQuad(phoneLocalQ, 36)); U.drawQuad(ctx, src, phoneLocalQ, 6);
      const g = ctx.createLinearGradient(phoneLocalQ[0][0], phoneLocalQ[0][1], phoneLocalQ[2][0], phoneLocalQ[2][1]); g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.42, 'rgba(255,255,255,0.05)'); g.addColorStop(0.43, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1 - E.inOut3(pz); ctx.fillStyle = g; ctx.fillRect(-phoneW / 2, -PHONE.h, phoneW, PHONE.h); ctx.restore(); // gloss fades out with the zoom-through
      ctx.restore();
    };
    const zs = o.noPush ? 1 : 1 + 0.07 * E.inOut3(clamp((tq - 4.0) / 1.5)); // slow push on the phone
    if (e > 0 || zs > 1) { // then the accelerating zoom-through into the screen (lands as the full-frame world 3 at 6.0)
      const z = Math.pow(PH_ZEND, e) * lerp(zs, 1, e), m = E.inOut3(pz);
      ctx.save(); ctx.translate(lerp(PH_C[0], W / 2, m), lerp(PH_C[1], H / 2, m)); ctx.rotate(-PH_ROT * m); ctx.scale(z, z); ctx.translate(-PH_C[0], -PH_C[1]); await draw(); ctx.restore();
    } else await draw();
    if (!o.noTag && tq < 5.5) await worldTag(ctx, t, 4.2, COPY.phone, 'pink');
  }

  /* ======================================================================= 6–8 · WORLD 3 · AI REALISM (lens → iris → kaleidoscope) */
  const CAM = { x: 1080, y: 560, h: 760 };
  const camS = CAM.h / 1192, LENS = { x: CAM.x + (400 - 724) * camS, y: CAM.y + (605 - 596) * camS, r: 228 * camS };
  const studioLayer = () => CL.layer('studio', async (x) => {
    const B = 380;
    x.drawImage(CL.watercolor(71, { w: W + 2 * B, h: H + 2 * B, tone: 0.84, dots: 0.6, bloom: 0.8 }), -B, -B);
    await pc(x, [-220, -220, 880, 1520], { color: C.cobalt }, { seed: 701, rot: 5, amp: 14, halftone: { color: '#0B3A92', cell: 18, angle: 20, r: [0.06, 0.42], grad: [-200, 1200, 640, -200] } });
    await pc(x, { band: [-170, 140, 900, 50, 90, 60] }, { color: C.orange, brush: 0.6 }, { seed: 706, amp: 9 });
    await pc(x, { circle: [CAM.x, CAM.y - 10, 575] }, { color: C.sun, brush: 0.6 }, { seed: 702, amp: 12, halftone: { color: 'rgba(240,122,46,0.92)', cell: 17, angle: 30, r: [0.42, 0.03], grad: [CAM.x, CAM.y + 560, CAM.x, CAM.y - 560] } });
    await pc(x, { circle: [CAM.x, CAM.y - 10, 450] }, C.paper, { seed: 703, amp: 10, dotgrid: { cell: 20, r: 0.09, angle: 12 } });
    await pc(x, { band: [1240, 80, 2090, -10, 120, 90] }, C.paper, { seed: 707, amp: 8, news: { alpha: 0.5, angle: -5 } });
    await pc(x, { band: [1480, 225, 2090, 150, 52, 32] }, '#8EDDF6', { seed: 708, amp: 6 });
    await pc(x, { band: [-170, 1030, 2090, 850, 200, 140] }, { color: C.red, speck: 0.3 }, { seed: 704, amp: 13, fx: [{ type: 'grunge', seed: 3 }] });
    await pc(x, { band: [1150, 1010, 2090, 930, 62, 40] }, C.paper, { seed: 705, amp: 7, news: { alpha: 0.5 } });
    await pc(x, { poly: [[150, 690], [430, 600], [360, 880]] }, C.sun, { seed: 709, amp: 6 });
    await CL.sprite(x, 'clap', 250, 330, { h: 230, rot: -12, shadow: { dx: 8, dy: 12, blur: 14, alpha: 0.4 } });
    await CL.sprite(x, 'reel', 1760, 790, { h: 210, rot: 10, shadow: { dx: 8, dy: 12, blur: 14, alpha: 0.4 } });
  }, { bleed: 380 });
  async function camScene(ctx, t, o = {}) {
    // hold 6.0–7.15: push 1.05 → 1.15 + lens drift x −19 → +20 (y +6 → 0); o.zMul / o.drift are used by the phone zoom-through (world3Wide)
    const tq = q(t), pz = prog(tq, 7.15, 8.0), e = pz * pz, hk = clamp((tq - 6.0) / 1.15), z0 = (o.zMul ?? 1) * (1.05 + 0.10 * hk), z = z0 * Math.pow(44, e), m = E.inOut3(clamp(pz * 1.3));
    const dr = o.drift || [lerp(-19, 20, hk), lerp(6, 0, hk)], sx = lerp(LENS.x + dr[0], W / 2, m), sy = lerp(LENS.y + dr[1], H / 2, m), rS = LENS.r * z;
    const covered = rS * 0.95 > Math.hypot(Math.max(sx, W - sx), Math.max(sy, H - sy)) + 40;
    if (!covered) {
      ctx.save(); ctx.translate(sx, sy); ctx.scale(z, z); ctx.translate(-LENS.x, -LENS.y);
      const L = await studioLayer(); ctx.drawImage(L, -L.bleed, -L.bleed);
      const b = CL.bob(t, 5, 2.5);
      await CL.sprite(ctx, 'cam_front', CAM.x + b.dx * 0.5, CAM.y + b.dy * 0.5, { h: CAM.h, boil: 0.6, t, shadow: { dx: 16, dy: 24, blur: 22, alpha: 0.45 } });
      ctx.restore();
    }
    if (tq >= 6.5) { // paper iris unfolds in the lens (blade flicks 6.75–7.6); its centre is the kaleidoscope already turning
      const ki = prog(tq, 6.75, 7.6), pop = lerp(0.55, 1, clamp(drawingIdx(t, 6.5) / 2));
      await X.iris(ctx, sx, sy, rS * pop, ki, t, { n: 6, spin: 1.2, drawCenter: ki > 0.12 ? async (c, cx, cy, rr, tt) => {
        const kb = await kalBuf(tt), s = rr / (Math.hypot(W, H) / 2); c.drawImage(kb, cx - (KS / 2) * s, cy - (KS / 2) * s, KS * s, KS * s);
      } : null });
    }
    if (!o.noTag && tq >= 6.0 && tq < 7.3) await worldTag(ctx, t, 6.15, COPY.realism, 'yellow');
  }

  /* ======================================================================= 8–9.9 · KALEIDOSCOPE */
  // Source of the mandala: VERTICAL bands on the right half (x 960–1930). The wedge samples along +x from the frame centre, so each
  // vertical band mirrors into a concentric octagonal ring (ref 4.5–5.4 s: olive grass ring · deep sky ring with white clouds · red ring).
  // With srcScale 1.2 / ratio .5 / ring .8 every tunnel level shows src x ≈ 1330–1700 (the outermost level reaches ≈ 1880), so one full
  // grass → sky → red → yellow cycle sits in that window; the rims add the separating red / yellow / cyan / dotted rings.
  const KGR = async (c, bb) => { // grass strip turned 90°: shaggy tips along the band edge (→ a shaggy grass ring)
    const im = await CL.img('grass_strip'), [bx, by, bw, bh] = bb, cr = [60, 175, 2380, 300], s = (bw + 30) / cr[3];
    c.fillStyle = CL.pat(c, CL.paper('#5E7020', 3, { tex: 1.2 })); c.fillRect(bx, by, bw, bh);
    c.filter = 'saturate(1.25) brightness(0.95) contrast(1.12)';
    for (let y = by - 40, k = 0; y < by + bh; y += cr[2] * s - 4, k++) { c.save(); c.translate(bx + bw / 2, y); c.rotate(Math.PI / 2); if (k % 2) c.scale(-1, 1); c.drawImage(im, cr[0], cr[1], cr[2], cr[3], 0, -cr[3] * s / 2, cr[2] * s, cr[3] * s); c.restore(); }
    c.filter = 'none';
  };
  const KSKY = (seed, clouds) => (c, bb) => { // watercolour sky turned 90° so its clouds run along the band (→ around the ring)
    const [bx, by, bw, bh] = bb, HH = 800, k = (bw + 40) / HH, wc = CL.watercolor(seed, { w: Math.ceil((bh + 60) / k), h: HH, res: 0.25, tone: 0.95, bloom: 0.1, clouds, cloudY: [0.38, 0.6], base: '#2DB8EE', light: '#8ADAF5', deep: '#1186CC' });
    c.save(); c.translate(bx + bw / 2, by + bh / 2); c.rotate(Math.PI / 2); c.scale(k, k); c.drawImage(wc, -wc.width / 2, -wc.height / 2); c.restore();
  };
  const KSRC = () => once('ksrc', async () => {
    const c = mkc(W, H), x = c.getContext('2d');
    x.drawImage(CL.watercolor(97, { w: W, h: H, tone: 0.95, bloom: 0.1, clouds: 0, base: '#2DB8EE', light: '#8ADAF5', deep: '#1186CC' }), 0, 0);
    const V = (x0, w0, w1, dx = 0) => ({ band: [x0, -40, x0 + dx, H + 40, w0, w1 ?? w0], tips: false });
    const RED = [{ color: C.red, speck: 0.3 }, (x0, x1) => ({ halftone: { color: '#FBEFE4', cell: 14, angle: 20, r: [0.04, 0.4], grad: [x0, 0, x1, 0] } })];
    // [kind, centre x, width] — outward from the centre; the window ≈ 1330–1700 holds grass · sky · red · yellow
    const BANDS = [['sky', 1030, 150], ['red', 1135, 64], ['yel', 1192, 56], ['skyC', 1272, 110],
      ['grass', 1382, 124], ['sky', 1506, 128], ['red', 1600, 62], ['yel', 1658, 56], ['grass', 1742, 116], ['skyC', 1866, 136]];
    let i = 0;
    for (const [k, cx, w] of BANDS) {
      const sh = { dx: 7, dy: 0, blur: 12, alpha: 0.35 }, seed = 960 + i++, dx = ((seed * 37) % 21) - 10, s = V(cx - dx / 2, w, w * (0.9 + (seed % 3) * 0.06), dx);
      if (k === 'grass') await CL.piece(x, s, KGR, { seed, amp: 7, shadow: sh, cache: false });
      else if (k === 'sky' || k === 'skyC') await CL.piece(x, s, KSKY(seed, k === 'skyC' ? 0.6 : 0.45), { seed, amp: 7, shadow: sh, cache: false });
      else if (k === 'red') await CL.piece(x, s, RED[0], Object.assign({ seed, amp: 6, shadow: sh, cache: false }, RED[1](cx - w / 2, cx + w / 2)));
      else await CL.piece(x, s, { color: C.sun, brush: 0.6 }, { seed, amp: 6, shadow: sh, cache: false, halftone: { color: 'rgba(240,122,46,0.8)', cell: 11, angle: 30, r: [0.36, 0.04], grad: [cx - w / 2, 0, cx + w / 2, 0] } });
    }
    // 4 stickers on the band centrelines (y 540 ± 160); one car only
    const items = [['car', 1506, 455, 112, -8], ['reel', 1382, 660, 88, 14], ['clap', 1600, 600, 92, 10], ['cam_side', 1742, 470, 104, -12]];
    for (const [n, px, py, h, rot] of items) await CL.sprite(x, n, px, py, { h, rot, shadow: { dx: 5, dy: 8, blur: 9, alpha: 0.4 } });
    return c;
  });
  // flyers peak (≈ t0 + 0.9·dur) on the whooshes 9.38 (R) · 9.50 (L) · 9.64 (R); the three small ones stay small so the hole reads
  const FLYERS = [{ name: 'car', t0: 8.84, dur: 0.6, angle: 0.15, spin: 0.5, scale: 1.1 }, { name: 'clap', t0: 8.96, dur: 0.6, angle: Math.PI - 0.2, spin: -0.8 },
    { name: 'reel', t0: 9.10, dur: 0.6, angle: 0.5, spin: 1.0 }, { name: 'helmet', t0: 9.15, dur: 0.55, angle: 2.3, spin: -0.6, scale: 0.6 }, { name: 'cam_side', t0: 9.2, dur: 0.55, angle: -0.6, spin: 0.7, scale: 0.6 }, { name: 'headphones', t0: 9.25, dur: 0.5, angle: 3.9, spin: -1, scale: 0.6 }];
  const HOLE = [[9.583, 0.3], [9.667, 0.62], [9.75, 1.05]]; // 35 % → 140 % of frame width in 3 drawings (ref)
  const holeAt = (t) => { let h = 0; for (const [t0, v] of HOLE) if (t >= t0 - 1e-6) h = v; return h; };
  const kOpts = (t) => ({ segments: 8, rot: 0, twist: 0, zoom: 2.6, ratio: 0.5, levels: 7, srcScale: 1.2, rims: ['red', 'yellow', 'cyan', 'dots', 'red', 'yellow'], flyers: FLYERS, hole: holeAt(t), drawNext: (c, tt) => cloudScene(c, tt, { noTag: true }), holeColor: '#F3A51C' });
  const kalDraw = async (ctx, t) => { const src = await KSRC(); await X.kaleido(ctx, t, async (c) => c.drawImage(src, 0, 0), kOpts(t)); };
  const KS = Math.ceil(Math.hypot(W, H)) + 8; // square: the kaleidoscope's whole disc (radius ≈ half-diagonal)
  async function kalBuf(t) { const cv = buf('kal', KS, KS), x = cv.getContext('2d'); x.translate((KS - W) / 2, (KS - H) / 2); await kalDraw(x, t); return cv; }

  /* ======================================================================= 9.9–11.75 · WORLD 4 · CINEMATIC (biplane over clouds) */
  async function cloudScene(ctx, t, o = {}) {
    const tq = q(t);
    await CL.cloudsky(ctx, t, { fly: 0.9 * prog(tq, 9.55, 12.0), mid: async (c) => {
      // approaches to fill the frame on the 11.0 peak, then passes the camera: 3 drawings sliding off the bottom-left (gone by 11.25)
      let p = CL.fly(tq, 9.55, 11.0, { from: { x: 985, y: 470, s: 0.22 }, to: { x: 560, y: 700, s: 2.0 } });
      if (tq > 11.0) { const u = prog(tq, 11.0, 11.25); p = { x: lerp(560, -2300, u), y: lerp(700, 1500, u), s: lerp(2.0, 3.6, u), k: 1 }; }
      if (tq < 11.25) await CL.sprite(c, 'plane_front', p.x, p.y, { h: 560 * p.s, rot: -5 + 10 * p.k, boil: 0.7, t, shadow: { dx: 18 * p.s, dy: 50 * p.s, blur: 18, alpha: 0.22 } });
    } });
    if (tq >= 11.33) { // the plane comes back in from the right and banks away into the distance
      const k = prog(tq, 11.33, 11.95), b = CL.bob(t, 13, 3), ke = E.out3(k);
      await CL.sprite(ctx, 'plane_side', lerp(W + 200, 820, ke) + b.dx, lerp(720, 330, ke) + b.dy, { h: lerp(430, 150, ke), rot: 12 - 6 * k, flipX: true, boil: 0.7, t, shadow: { dx: 10, dy: 40, blur: 16, alpha: 0.2 } });
    }
    if (!o.noTag && tq >= 9.9) await worldTag(ctx, t, 10.08, COPY.worlds, 'cobalt');
  }

  /* ======================================================================= 11.75–14 · HOW IT'S DONE (desk, laptop prompt) */
  const LAP = { x: 968, y: 912, h: 690, rot: -1.5, sw: 1944, shh: 1272 };
  const LAP_Q = [[800, 105], [1838, 150], [1745, 915], [668, 792]];
  const lapSc = LAP.h / LAP.shh, lapW = LAP.sw * lapSc, lapLocalQ = LAP_Q.map(([px, py]) => [-lapW / 2 + px * lapSc, -LAP.h + py * lapSc]);
  const GEAR = [['headphones', 340, 330, 310, 12.5, -14], ['midi', 1530, 300, 255, 13.0, 10], ['phone_gimbal', 1570, 740, 350, 13.25, 8], ['cassette', 370, 790, 215, 13.5, -9], ['clap', 1190, 250, 190, 13.75, 12]]; // inside the 1.2 push
  async function promptResult(c, r, t) {
    const [, , w, h] = r; c.drawImage(CL.watercolor(93, { w: 1200, h: 800, clouds: 0.6, tone: 0.82, cloudY: [0.1, 0.55] }), 0, 0, w, h);
    await CL.piece(c, { band: [-40, h * 0.86, w + 40, h * 0.8, h * 0.12, h * 0.1] }, { color: C.sun, brush: 0.6 }, { seed: 971, amp: 7 });
    await CL.sprite(c, 'cloud_2', w * 0.24, h * 0.66, { h: h * 0.34, shadow: { dx: 4, dy: 7, blur: 8, alpha: 0.25 } });
    await CL.sprite(c, 'cloud_4', w * 0.8, h * 0.28, { h: h * 0.22, flipX: true, shadow: { dx: 4, dy: 7, blur: 8, alpha: 0.25 } });
    const b = CL.bob(t, 11, h * 0.012); await CL.sprite(c, 'car', w * 0.56 + b.dx, h * 0.5 + b.dy, { h: h * 0.38, rot: -8 + b.rot, flipX: true, shadow: { dx: 8, dy: 16, blur: 10, alpha: 0.3 } });
  }
  async function deskScene(ctx, t) {
    const tq = q(t), pz = E.inOut3(prog(tq, 12.4, 13.9));
    await CL.desk(ctx, t, { cam: { zoom: 1 + 0.2 * pz, fx: 980, fy: 470 }, insert: { 0: async (c) => {
      for (const [n, x, y, h, t0, rot] of GEAR) { const s = CL.slap(t, t0, { rot0: rot > 0 ? 9 : -9 }); if (!s.on) continue; const b = CL.bob(t, x, 3);
        await CL.sprite(c, n, x + b.dx, y + b.dy, { h: h * s.s, rot: rot + s.rot + b.rot, shadow: { dx: 8 * s.shadow, dy: 12 * s.shadow, blur: 12 * s.shadow, alpha: 0.4 } }); }
      const d = CL.drop(t, 12.0 - 4 / 24, { h: 1500, tilt: 5 }); if (!d.on) return;
      c.save(); c.translate(LAP.x, LAP.y + d.dy); c.rotate((LAP.rot + d.rot) * DEG); c.scale(d.sx, d.sy);
      await CL.sprite(c, 'laptop', 0, 0, { h: LAP.h, ax: 0.5, ay: 1, shadow: { dx: 12, dy: 20, blur: 20, alpha: 0.42 } });
      await X.screen(c, lapLocalQ, t, 12.3, { text: COPY.prompt, pill: COPY.generate, title: COPY.ui, placeholder: COPY.placeholder, cps: 34, tClick: 13.2, fontSize: 64, drawResult: promptResult });
      c.restore();
    } } });
  }

  /* ======================================================================= 14–18 · STEP BY STEP + thumbnail wall */
  const boardLayer = () => CL.layer('board', async (x) => {
    const B = CL.BLEED;
    x.drawImage(CL.watercolor(81, { w: W + 2 * B, h: H + 2 * B, tone: 0.76, bloom: 1 }), -B, -B);
    await pc(x, [-220, -200, 1040, 600], { color: C.pink }, { seed: 801, rot: -3, amp: 13, halftone: { color: '#F38FA8', cell: 14, r: 0.3 } });
    await pc(x, [760, -190, 1420, 560], { color: C.sun, brush: 0.7 }, { seed: 802, rot: 2, amp: 13 });
    await pc(x, [-220, 690, 1160, 600], { color: C.red, speck: 0.3 }, { seed: 803, rot: 3, amp: 13, fx: [{ type: 'grunge', seed: 7 }] });
    await pc(x, [930, 700, 1240, 600], { color: C.cobalt }, { seed: 804, rot: -4, amp: 13, halftone: { color: '#0B3A92', cell: 16, angle: 10, r: [0.06, 0.38], grad: [930, 1200, 2100, 700] } });
    await pc(x, { band: [-170, 345, 2090, 285, 40, 30] }, '#8EDDF6', { seed: 805, amp: 6 });
    await pc(x, [-180, 370, 2280, 330], C.paper, { seed: 806, rot: -1.2, amp: 12, news: { alpha: 0.28, x: 4.4, head: 0.5 }, dotgrid: { cell: 22, r: 0.07, angle: 8, color: 'rgba(25,25,25,0.55)' } });
    await pc(x, { band: [-170, 735, 2090, 790, 46, 34] }, { color: C.mustard, brush: 0.7 }, { seed: 807, amp: 7 });
    await pc(x, { band: [1580, 960, 2090, 1000, 60, 44] }, C.paper, { seed: 808, amp: 6, news: { alpha: 0.5 } });
  });
  const PLAY2 = { x: 960, y: 790, size: 260 };
  const CARDS = [['f1', [60, 50, 480, 270], 16.0, -0.05, 0.62], ['phone', [1380, 50, 480, 270], 16.5, 0.035, 0.4], ['cam', [60, 755, 480, 270], 17.0, 0.04, 0.8], ['plane', [1380, 755, 480, 270], 17.5, -0.035, 0.3]]; // 480×270, pushed into the corners so they don't bury the S of STEP
  // thumbnails = real frames of the film's earlier worlds, rendered once
  const SNAP = (name) => once('snap_' + name, async () => {
    const big = mkc(W, H), x = big.getContext('2d');
    if (name === 'f1') await f1Scene(x, 3.15, { noTag: true });
    else if (name === 'phone') await posterScene(x, 5.2, { noTag: true, noPush: true });
    else if (name === 'cam') await camScene(x, 7.25, { noTag: true });
    else await cloudScene(x, 10.6, { noTag: true });
    const s = mkc(800, 450), sx = s.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(big, 0, 0, 800, 450);
    // 2-word YouTube headline (Anton, yellow / white with an ink stroke)
    const i = CARDS.findIndex((c) => c[0] === name), txt = COPY.heads[i] || '';
    sx.save(); sx.translate(34, 128); sx.rotate(-0.035); sx.font = '400 104px "Anton"'; sx.textBaseline = 'alphabetic'; sx.lineJoin = 'round';
    sx.lineWidth = 16; sx.strokeStyle = '#141414'; sx.strokeText(txt, 0, 0); sx.fillStyle = i % 2 ? '#FFFFFF' : '#FFD21E'; sx.fillText(txt, 0, 0); sx.restore();
    return s;
  });
  async function boardScene(ctx, t, o = {}) {
    const tq = q(t), z = tq < 15.4 ? 1.33 + 0.012 * (tq - 14) : lerp(1.3468, 1.0, E.out3(prog(tq, 15.4, 16.5))); // pull-back from 15.4, ≈ 1.02 by the first card (16.0) so it is never cropped
    if (tq >= 14.6) await Promise.all(CARDS.map((c) => SNAP(c[0]))); // build thumbnails well before the first card
    const br = CL.R(CL.f12(t) * 13 + 5), bx = (br() - 0.5) * 1.4, by = (br() - 0.5) * 1.4; // layer boil on twos
    ctx.save(); CL.camXf(ctx, { zoom: z, fx: 960, fy: 545, x: lerp(-26, 26, prog(tq, 14.0, 18.6)), y: lerp(10, -10, prog(tq, 14.0, 18.6)) }, 1);
    const L = await boardLayer(); ctx.drawImage(L, -L.bleed + bx, -L.bleed + by);
    if (!o.noPlay) await X.play(ctx, PLAY2.x, PLAY2.y, PLAY2.size, t, { rot: -0.03 });
    // magazine letters, one per 1/16 slot (0.125 s, spaces count): 'STEP BY' 14.0–14.75 · 'STEP' 15.0–15.375
    const sp = COPY.steps.split(' '), l1 = sp.slice(0, 2).join(' '), l2 = sp.slice(2).join(' ');
    await X.ransom(ctx, l1, 960, 420, t, 14.0, { size: 172, step: 0.125, seed: 15, spaceBeat: true });
    await X.ransom(ctx, l2, 960, 628, t, 14.0 + (l1.length + 1) * 0.125, { size: 172, step: 0.125, seed: 23, spaceBeat: true });
    for (let i = 0; i < CARDS.length; i++) {
      const [name, rect, t0, rot, prg] = CARDS[i]; if (t < t0) continue; const snap = await SNAP(name);
      await X.thumb(ctx, rect, t, { t0, rot, seed: i + 1, progress: prg, dur: COPY.durs[i], draw: (c, r) => c.drawImage(snap, 0, 0, r[2], r[3]) });
    }
    ctx.restore();
  }

  /* ======================================================================= 18–24 · strip rocket → KAYE / CREATES */
  const TITLE_Y = 520;
  const boardOff = (t) => H * 1.18 * E.in3(prog(q(t), 18.0, 18.6));
  async function titleBg(ctx, t) {
    const tq = q(t), tilt = 0.9 * E.inOut3(prog(tq, 18.0, 19.6)) + 0.1 * prog(tq, 19.6, 24.5);
    await CL.sky(ctx, t, { tilt, part: E.inOut3(prog(tq, 18.6, 19.5)) }); // cloud banks at the bottom part L / R 18.6–19.5 (ref 9.75 s)
    if (tq < 18.6) { const B = padBuf('board'); await boardScene(B.getContext('2d'), t, { noPlay: true }); drawSheet(ctx, B, 0, boardOff(t), [1, 0, 0, 0], 17, [0, -18]); }
    // 19.5–20 breath: the strips stop boiling (frozen drawing) and settle 8 px down; the offset is kept under the title
    const settle = tq >= 19.5 ? 8 * E.out3(prog(tq, 19.5, 19.917)) : 0, tR = t >= 19.5 && t < 20.0 ? 19.5 : t;
    ctx.save(); ctx.translate(0, settle);
    await X.rocket(ctx, tR, 18.0, { vx: W / 2, vy: H * 0.31, by: Math.min(PLAY2.y + boardOff(t), H + 70), bx: PLAY2.x, dur: 1.25, n: 64, width: 1250, narrow: 0.55, seed: 7,
      drawRider: async (c, x, y, tt) => { // the ▶ rides up, then shoots off the top 18.9–19.45 (scale 1 → .45, rocking ±0.15 on twos)
        const qq = q(tt), lk = prog(qq, 18.9, 19.45); if (tt >= 19.5 || lk >= 1) return;
        const s = lk > 0 ? lerp(0.78, 0.45, lk) : lerp(1, 0.78, prog(qq, 18.0, 18.9)), rot = lk > 0 ? (Math.floor(tt * 12 + 1e-6) % 2 ? 0.15 : -0.15) : Math.sin(qq * 9) * 0.05;
        c.save(); c.translate(x, y - 520 * E.in3(lk)); c.scale(s, s); await X.play(c, 0, 0, PLAY2.size, tt, { rot }); c.restore();
      } });
    ctx.restore();
    await X.burst(ctx, t, 20.0, { cx: W / 2, cy: TITLE_Y, n: 26, seed: 9 });
  }
  async function titleScene(ctx, t) {
    await titleBg(ctx, t);
    const tq = q(t), jit = tq >= 21.75 && tq < 21.9 ? (tq < 21.79 ? [6, -4, 1.5] : [-5, 3, -1.2]) : null; // 21.75 scratch accent: 2 drawings of jitter
    if (jit) { ctx.save(); ctx.translate(W / 2 + jit[0], TITLE_Y + jit[1]); ctx.rotate(jit[2] * DEG); ctx.translate(-W / 2, -TITLE_Y); }
    await X.title(ctx, COPY.title, W / 2, TITLE_Y, t, 20.0 - 3 / 24, {});
    if (jit) ctx.restore();
    if (tq >= 20.45 && tq <= 23.95) { // biplane crosses over the letters
      const k = prog(tq, 20.45, 23.95), b = CL.bob(t, 17, 4);
      await CL.sprite(ctx, 'plane_side', lerp(-360, W + 360, k) + b.dx, 250 + Math.sin(k * 5) * 18 + b.dy, { h: 220, rot: -4 + b.rot, boil: 0.7, t, shadow: { dx: 12, dy: 34, blur: 14, alpha: 0.25 } });
    }
  }

  /* ======================================================================= 24–30 · tear → logo band → flashes → SUBSCRIBE */
  // the completed tear (k = 1) without the off-screen flap's shadow: same geometry as CLX.tear's kit (seed, y0, y1)
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
  // squash: the logo letters squash (sx 1.04, sy .94) for the 2 frames of the 27.5 click
  const logoAt = (c, t, style, squash) => X.logoBand(c, COPY.logo, t, { style: style || 'band', x: LOGO.x, y: LOGO.y, h: LOGO.h, size: LOGO.size, seed: 8, boil: !style || style === 'band', lsx: squash ? 1.04 : 1, lsy: squash ? 0.94 : 1 });
  const flashAt = (t) => { // → { st: look, full: bool } | null (clean band)
    if (t < 26.0 || t >= 27.5) return null; const i = Math.floor((t - 26.0) * 12 + 1e-6);
    if (i < 6) return { st: FLASH6[i], full: FLASH_AREA === 'full' };
    return i % 3 === 2 ? null : { st: FLASH6[i % 6], full: false };
  };
  async function endScene(ctx, t) {
    const tq = q(t), fl = flashAt(t), st = fl && fl.st, z = 1 + 0.025 * Math.max(0, tq - 24.4); // push on the logo card (about a low centre so tag + URL stay in frame)
    const click1 = t >= 27.5 && t < 27.5 + 2 / 24;
    await zoomAbout(ctx, z, W / 2, 720, async () => {
      if (fl && fl.full) { await logoAt(ctx, t, st); return; }
      const BG = buf('tbg'); await titleBg(BG.getContext('2d'), t);
      const under = async (c) => { c.drawImage(BG, 0, 0); await logoAt(c, t, null, click1); };
      if (t < 24.4) await X.tear(ctx, prog(tq, 24.0, 24.42), async (c) => titleScene(c, t), under, TEAR);
      else {
        const Bc = buf('tunder'); await under(Bc.getContext('2d')); tearDone(ctx, BG, Bc);
        if (st) { const F = buf('flash'); await logoAt(F.getContext('2d'), t, st); ctx.save(); ctx.clip(TEARDONE.R); ctx.drawImage(F, 0, 0); ctx.restore(); }
      }
      if (tq >= 24.6) await X.tag(ctx, W / 2, 150, COPY.bandTag, { t, t0: 24.6, color: 'cobalt', font: 'sans', size: 44, rot: -0.02, tape: 'top' });
      // 27.5 click on the logo (squash + star) · 28.0 SUBSCRIBE slaps in place · 28.6 click → SUBSCRIBED ✓ (+ paper confetti from behind) · 28.8 bell
      if (t >= 28.62) await X.confetti(ctx, t, 28.62, { x: SUB.x, y: SUB.y - 20, n: 24, speed: 1300, spread: Math.PI * 1.1, gravity: 1300, dur: 0.95, seed: 28 });
      if (t >= 28.0) await X.subscribe(ctx, SUB.x, SUB.y, t, { h: SUB.h, slap: 28.0, tClick: 28.6 });
      if (t >= 28.3) await X.tag(ctx, W / 2, 985, COPY.url, { t, t0: 28.3, color: 'ink', font: 'mono', size: 38, rot: 0.015, tape: false });
      if (t >= 27.25) {
        const click = click1 || (t >= 28.6 && t < 28.725) ? 1 : 0;
        const a = E.out3(prog(tq, 27.25, 27.46)), b2 = E.inOut3(prog(tq, 28.12, 28.55)), c2 = E.out3(prog(tq, 28.75, 29.3));
        let x = lerp(W + 90, 1230, a), y = lerp(760, LOGO.y + 40, a);
        x = lerp(x, SUB.x + 30, b2); y = lerp(y, SUB.y + 18, b2); x = lerp(x, 1470, c2); y = lerp(y, 870, c2);
        if (click1) await X.star(ctx, x, y, 62, t, { points: 12, inner: 0.5, color: X.PAL.yellow, seed: 5, pop: 1 });
        await X.cursor(ctx, x, y, t, { size: 140, click });
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
  Cut(0.0, 2.0, (ctx, t) => pageScene(ctx, t));
  Cut(2.0, 3.75, async (ctx, t) => { // 2.0 DROP: page rips from the centre (3 drawings), F1 world underneath
    await f1Scene(ctx, t);
    const i = drawingIdx(t, 2.0);
    if (i < 3) { const A = padBuf('ripA'); await pageScene(A.getContext('2d'), t); ripDraw(ctx, [0.05, 0.36, 0.8][i], A); await X.confetti(ctx, t, 2.0, { x: W / 2, y: H / 2, n: 30, speed: 1500, spread: Math.PI * 2, gravity: 900, dur: 0.6, seed: 20, colors: [C.paper, C.paper, C.red, C.sun] }); }
  });
  Cut(3.75, 6.0, (ctx, t) => wipe(ctx, t, 3.75, (c) => f1Scene(c, t), (c) => posterScene(c, t), { from: [1, 0], edges: [0, 0, 0, 1], seed: 4, push: 0.22, roll: -10, rollB: 6, speed: { n: 10, angle: Math.PI, speed: 3600, alpha: 0.9, seed: 41 } }));
  Cut(6.0, 8.0, (ctx, t) => camScene(ctx, t));
  Cut(8.0, 238 / 24, (ctx, t) => kalDraw(ctx, t));
  Cut(238 / 24, 11.75, (ctx, t) => cloudScene(ctx, t));
  Cut(11.75, 332 / 24, (ctx, t) => wipe(ctx, t, 11.75, (c) => cloudScene(c, t), (c) => deskScene(c, t), { from: [0, 1], edges: [1, 0, 0, 0], seed: 6, push: 0.18, roll: 4 }));
  Cut(332 / 24, 18.0, (ctx, t) => wipe(ctx, t, 332 / 24, (c) => deskScene(c, t), (c) => boardScene(c, t), { ks: [0.5, 0.88], from: [0.9, 0.45], edges: [1, 0, 0, 1], seed: 8, push: 0.32, roll: -14, rollB: -8, speed: { n: 10, angle: Math.PI + 0.46, speed: 3800, alpha: 0.9, seed: 43 } }));
  Cut(18.0, 24.0, (ctx, t) => titleScene(ctx, t));
  Cut(24.0, 30.0, (ctx, t) => endScene(ctx, t));

  const PERF = /perf/.test(location.search);
  window.SCENES = {
    duration: 30.0,
    cuts: PERF ? cuts.map((c) => ({ ...c, draw: async (ctx, t, k, lt) => {
      const a = performance.now(); await c.draw(ctx, t, k, lt); try { ctx.getImageData(0, 0, 1, 1); } catch (e) { /* tainted */ }
      const ms = Math.round(performance.now() - a), S = (window.__perfStats = window.__perfStats || { n: 0, sum: 0, max: 0, maxT: 0, slow: [] });
      S.n++; S.sum += ms; if (ms > S.max) { S.max = ms; S.maxT = t; } if (ms > 250) S.slow.push(t.toFixed(3) + ':' + ms);
      console.log('perf t=' + t.toFixed(3) + ' ms=' + ms + ' | n=' + S.n + ' avg=' + Math.round(S.sum / S.n) + ' max=' + S.max + '@' + S.maxT.toFixed(3) + ' >250: ' + S.slow.join(' '));
    } })) : cuts,
    overlay: async (ctx, t) => { CL.printGrain(ctx, t, 0.05); },
  };
  window.COPY = COPY;
})();
