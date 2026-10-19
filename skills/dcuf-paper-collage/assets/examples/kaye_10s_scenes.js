/* scenes.js — kaye.creatives launch film, 10 s CUT (1920×1080, 24 fps, 120 BPM). Torn-paper collage (San Diego Zoo "Africa Rocks" technique), all code.
 * The 30 s version lives in assets/examples/kaye_30s_scenes.js of the skill (same engine / CL / CLX); this file re-times its scene functions to script.md (10 s table):
 *   0.33–0.5 ▶ drops (3 drawings) + settle · 0.5 channel tag · 0.58–0.83 cursor in · 0.875 press (star 2 frames) · 1.0 DROP page rips → F1
 *   1.75 car passes centre · 2.0 helmet slaps · 2.5 torn wipe → film camera · 2.65–3.46 accelerating push into the lens, iris 2.9–3.4 (kaleido in its centre)
 *   3.5–4.5 kaleidoscope (no rotation, rings; one ring of 8 cars + one ring of 8 reels, each on a single level) · flyers peak 4.2 / 4.3 / 4.4 · hex hole 4.33–4.42 → desk
 *   4.5 laptop lands · 4.75 headphones · 5.0 midi · 5.25 gimbal · prompt types 4.6–5.08 · 5.15 generate ✦ → result
 *   5.5–5.92 tilt-up, desk sheet drops away, strip rocket carries ▶ out of the top · 6.0 KAYE / CREATES expo-out (9 drawings, no overshoot) + burst
 *   6.3–7.4 biplane · 7.5–7.92 page tear → logo band · 8.0–8.5 logo flicker INSIDE the band only (2-1-2-3-2-2 frames)
 *   8.5 SUBSCRIBE slaps · 9.0 click → SUBSCRIBED ✓ · 9.15 bell · slow push to 10.0
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
    realism: 'AI REALISM',
    ui: 'kaye ✦ studio', placeholder: 'describe a shot…',
    prompt: 'pink race car ✦', generate: 'generate ✦',
    title: ['KAYE', 'CREATIVES'], titleFont: '"Fraunces"',   // Fraunces Black Italic (only the ital 900 face is loaded)
    logo: 'kaye.creatives',
    bandTag: 'AI FILMMAKING · NEW VIDEO EVERY WEEK',
    subscribe: 'SUBSCRIBE', subscribed: 'SUBSCRIBED ✓', // CLX.subscribe labels (the ✓ is drawn as a path)
    url: 'youtube.com/@Kaye.creates',
  };
  // 8.0–8.5 logo flicker: 6 looks held 2-1-2-3-2-2 frames (= 12 frames), ALWAYS clipped to the torn band (photosensitivity: never full frame).
  // Order runs from the light looks to the dark ones (measured frame mean: pink 188 · orange 185 · lime 178 · posters 161 · streak 107 · glitter 97, lockup 190)
  // so the band's luminance only steps down (no light→dark→light pair inside the flicker); the one dark→light return is the 8.5 hit.
  const FLICK = ['pink', 'orange', 'lime', 'posters', 'streak', 'glitter'];
  const FLICK_FR = [0, 0, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5];

  const SUBL = [COPY.subscribe, COPY.subscribed.replace(/\s*✓\s*$/, '')];   // button labels before / after the click
  K.setup({ bars: [1.0, 2.5, 4.5, 6.0, 7.5, 8.5] });

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
  // tags pop on twos (t quantised) and stay ≥ 0.8 s
  const worldTag = (ctx, t, t0, str, color, o = {}) => X.tag(ctx, o.x ?? 92, o.y ?? 978, str, Object.assign({ t: q(t), t0, color, anchor: 'left', rot: -0.025, tape: 'top' }, TAG, o));

  /* ---------- warm-up (once per browser, inside __seek so fonts are loaded) ---------- */
  const TEAR = { y0: Math.round(H * 0.22), y1: Math.round(H * 0.76), seed: 5, flapW: 360 };
  const LOGO = { x: W / 2, y: Math.round((TEAR.y0 + TEAR.y1) / 2), h: 400, size: 190 };
  const SUB = { x: W / 2 - 58, y: 876, h: 128 };   // button 812–940: its top overlaps the band's torn edge a little
  const URL_Y = 1004;                              // URL tag 971–1037, below the cursor's reach (cursor tip ≤ 840, arrow ≤ 95 px tall)
  const TTL = { size: 0, off: 0 };                 // title size (≈ .6 W, as CLX.title's autoSize) + sprite bottom offset, set in warm()
  const SUBW = { a: 0, b: 0 };                      // SUBSCRIBE / SUBSCRIBED widths (as CLX's subKit) for the cursor target + the bell clip
  let WARM = null;
  const warm = () => WARM || (WARM = (async () => {
    await CL.preload();
    const m = mkc(8, 8).getContext('2d'); m.font = `400 100px ${COPY.titleFont}`;   // same font string CLX.title uses (the loaded face decides weight/italic)
    const tw = Math.max(...COPY.title.map((s) => [...s].reduce((a, c) => a + m.measureText(c).width, 0)));
    TTL.size = 100 * (W * 0.6) / Math.max(1, tw);
    await X.warm({ iris: 6, kaleido: 8, title: { lines: COPY.title, size: TTL.size, font: COPY.titleFont }, band: { h: LOGO.h, seed: 8 }, logo: { text: COPY.logo, size: LOGO.size }, play: 470, subscribe: SUB.h, subLabels: SUBL, tear: TEAR,
      cuts: ['cam_front', 'car', 'clap', 'reel', 'helmet', 'cam_side', 'headphones', 'plane_side'] });
    await X.warm({ play: 240 });
    const P = U.titleSprite(COPY.title, TTL.size, { font: COPY.titleFont }); TTL.off = P.bottom - P.ay;
    const hh = Math.round(SUB.h / 4) * 4, fz = hh * 0.42, s = mkc(8, 8).getContext('2d'); s.font = `900 ${fz}px "Rubik"`; s.letterSpacing = `${fz * 0.04}px`;
    SUBW.a = s.measureText(SUBL[0]).width + hh * 0.9; SUBW.b = s.measureText(SUBL[1]).width + fz * 1.1 + hh * 0.9;
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
  // 1.0 DROP: the page rips from the centre, halves fly out L / R
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

  /* ======================================================================= 0–1 · PAGE + ▶ + cursor */
  const POPS = [['reel', 560, 712, 235, 7 / 12, -8], ['clap', 1235, 740, 255, 8 / 12, 9], ['cam_side', 150, 700, 260, 0.75, -6]];
  const PLAY0 = { x: 960, y: 548, size: 470 }, PLAY0_H = PLAY0.size * 0.7;
  const T_PRESS = 0.875;
  // ▶ drop on twos (ref boombox): 0.333 only the bottom edge shows at the top · 0.417 mid-air, tilted −8° · 0.5 lands level (scale 1.035) · 0.583 settled
  function playPose(t) {
    const i = drawingIdx(t, 1 / 3); if (i < 0) return null;
    if (i === 0) return { dy: 96 - (PLAY0.y + PLAY0_H / 2), rot: -3 * DEG, s: 1 };
    if (i === 1) return { dy: 300 - PLAY0.y, rot: -8 * DEG, s: 1 };
    return { dy: 0, rot: 0, s: i === 2 ? 1.035 : 1 };
  }
  async function pageScene(ctx, t) {
    const tq = q(t), cam = { zoom: 1 + 0.03 * tq, y: -6 * tq, fx: 960, fy: 560 };
    const press = t >= T_PRESS && t < 1.0 ? 1 : 0; // held down 0.875 → the 1.0 rip (the yellow star shows for 2 frames)
    await CL.page(ctx, t, { cam, insert: {
      1: async (c) => { // little cut-outs pop up from behind the far hills (masked by layer 2), 2 drawings each
        for (const [n, x, y, h, t0, rot] of POPS) { const p = CL.pop(tq, t0, { h: h * 0.85, frames: 4 }); if (!p.on) continue; const b = CL.bob(t, x, 2.4);
          await CL.sprite(c, n, x + b.dx, y + p.dy + b.dy, { h, ay: 1, rot: rot + b.rot, sx: p.sx, sy: p.sy, shadow: { dx: 5, dy: 8, blur: 10, alpha: 0.3 } }); }
      },
      3: async (c) => { // 0.875 press: a paper starburst flashes behind the ▶ for 2 frames
        if (t >= T_PRESS && t < T_PRESS + 2 / 24) await X.star(c, PLAY0.x, PLAY0.y, 330, t, { points: 14, inner: 0.62, color: X.PAL.yellow, seed: 3, pop: 1 });
        const p = playPose(t); if (!p) return;
        c.save(); c.translate(PLAY0.x, PLAY0.y + p.dy + PLAY0_H / 2); c.scale(p.s, p.s); c.translate(0, -PLAY0_H / 2);
        await X.play(c, 0, 0, PLAY0.size, t, { rot: p.rot, press }); c.restore();
      },
      4: async (c) => { // giant helmet peeks from the bottom-right corner (teaser for the F1 world)
        const p = CL.pop(tq, 8 / 12, { h: 420, frames: 6 }); if (!p.on) return; const b = CL.bob(t, 9, 3.5);
        await CL.sprite(c, 'helmet', 1735 + b.dx, 1235 + p.dy + b.dy, { h: 600, ay: 1, rot: -10 + b.rot, sx: p.sx, sy: p.sy, shadow: { dx: -10, dy: 14, blur: 18, alpha: 0.42 } });
      },
    } });
    // cursor slides in R→C 0.583–0.833 (on twos), presses 0.875
    if (tq >= 7 / 12) {
      const m = E.out3(prog(tq, 7 / 12, 10 / 12)), x = lerp(W + 80, PLAY0.x + 28, m), y = lerp(640, PLAY0.y + 18, m) + Math.sin(m * Math.PI) * -60;
      await X.cursor(ctx, x, y, t, { size: 140, click: press ? 1 : 0 });
    }
  }
  // channel tag: slaps on with the ▶ at 0.5, stays taped on top while the page rips (1.0–1.08), is swept off L on 1.17 / 1.25, gone 1.33 (visible .83 s)
  async function channelTag(ctx, t) {
    const tq = q(t); if (tq < 0.5) return;
    const k = Math.max(0, drawingIdx(t, 1.0) - 1); if (k > 2) return;
    await X.tag(ctx, 96 + [0, -130, -400][k], 150 + [0, -12, -30][k], COPY.channelTag, { t: tq, t0: 0.5, color: 'white', font: 'sans', size: 44, anchor: 'left', rot: -0.035 + 0.05 * k, tape: 'top' });
  }

  /* ======================================================================= 1–2.5 · WORLD 1 · F1 */
  async function f1Scene(ctx, t, o = {}) {
    const tq = q(t), lt = tq - 1.0, z = 1 + 0.03 * clamp(lt / 1.5);
    await zoomAbout(ctx, z, W / 2, H / 2, async () => {
      await CL.diag(ctx, tq, { angle: -24, speed: 1300, offset: 500 }); // bands scroll on twos
      const b = CL.bob(t, 3, 4), x = lerp(-760, 760, E.inOut3(clamp(lt / 1.5))); // the car crosses frame centre exactly on 1.75 (doppler peak)
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-24 * DEG);
      await CL.sprite(ctx, 'car', x + b.dx, 30 + b.dy, { h: 380, rot: b.rot, flipX: true, shadow: { dx: 26, dy: 34, blur: 18, alpha: 0.4 } });
      ctx.restore();
    });
    await X.speed(ctx, t, { n: 8, angle: Math.PI - 24 * DEG, speed: 3000, alpha: 0.85, seed: 31 });
    // helmet flies in from the bottom-right (1.833, 1.917) and slaps on 2.0 in the free lower-right band: the car is top-right by then (it passed centre on 1.75), so landing there would cover it
    if (tq >= 22 / 12) {
      const i = drawingIdx(t, 22 / 12), b = CL.bob(t, 21, 3), s = CL.slap(tq, 2.0, { from: 1.3, rot0: 10 });
      let x = 1420, y = 790, h = 300, rot = 8;
      if (i === 0) { x = 2020; y = 1000; h = 380; rot = 30; } else if (i === 1) { x = 1690; y = 870; h = 360; rot = 18; }
      else { h = 300 * s.s; rot = 8 + s.rot; x += b.dx - (tq - 2.0) * 40; y += b.dy + (tq - 2.0) * 18; }
      await CL.sprite(ctx, 'helmet', x, y, { h, rot: rot + b.rot, shadow: { dx: 14, dy: 22, blur: 18, alpha: 0.42 } });
    }
    if (!o.noTag) await worldTag(ctx, t, 13 / 12, COPY.f1, 'yellow');
  }

  /* ======================================================================= 2.5–3.5 · AI REALISM (camera → push into the lens → iris) */
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
  // the push ends at 3.46 so the last camera drawing (3.417) already shows the kaleidoscope centre ≈ 1000 px in radius: the 3.5 cut continues the zoom
  const PUSH = [2.65, 3.46];
  async function camScene(ctx, t, o = {}) {
    const tq = q(t), pz = prog(tq, PUSH[0], PUSH[1]), e = pz * pz, hk = prog(tq, 2.5, 3.0), z0 = 1.05 + 0.10 * hk, z = z0 * Math.pow(44, e), m = E.inOut3(clamp(pz * 1.3));
    const dr = [lerp(-19, 20, hk), lerp(6, 0, hk)], sx = lerp(LENS.x + dr[0], W / 2, m), sy = lerp(LENS.y + dr[1], H / 2, m), rS = LENS.r * z;
    const covered = rS * 0.95 > Math.hypot(Math.max(sx, W - sx), Math.max(sy, H - sy)) + 40;
    if (!covered) {
      ctx.save(); ctx.translate(sx, sy); ctx.scale(z, z); ctx.translate(-LENS.x, -LENS.y);
      const L = await studioLayer(); ctx.drawImage(L, -L.bleed, -L.bleed);
      const b = CL.bob(t, 5, 2.5);
      await CL.sprite(ctx, 'cam_front', CAM.x + b.dx * 0.5, CAM.y + b.dy * 0.5, { h: CAM.h, boil: 0.6, t, shadow: { dx: 16, dy: 24, blur: 22, alpha: 0.45 } });
      ctx.restore();
    }
    if (tq >= 2.75) { // paper iris pops into the lens (2 drawings), blades open 2.9–3.4; its centre is the kaleidoscope already zooming
      const ki = prog(tq, 2.9, 3.4), pop = lerp(0.55, 1, clamp(drawingIdx(t, 2.75) / 2));
      await X.iris(ctx, sx, sy, rS * pop, ki, t, { n: 6, spin: 1.2, drawCenter: ki > 0.12 ? async (c, cx, cy, rr, tt) => {
        const kb = await kalBuf(tt), s = rr / (Math.hypot(W, H) / 2); c.drawImage(kb, cx - (KS / 2) * s, cy - (KS / 2) * s, KS * s, KS * s);
      } : null });
    }
    if (!o.noTag && tq >= 2.5 && tq < 3.4) await worldTag(ctx, t, 31 / 12, COPY.realism, 'yellow');
  }

  /* ======================================================================= 3.5–4.5 · KALEIDOSCOPE */
  // Source of the mandala: VERTICAL bands on the right half (x 960–1930); the wedge samples along +x from the frame centre, so each band mirrors into
  // a concentric octagonal ring. With srcScale 1.2 / ratio .5 / ring .8 every tunnel level shows src x ≈ 1330–1700 (grass → sky → red → yellow).
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
  const KSRC = () => once('ksrc10', async () => {
    const c = mkc(W, H), x = c.getContext('2d');
    x.drawImage(CL.watercolor(97, { w: W, h: H, tone: 0.95, bloom: 0.1, clouds: 0, base: '#2DB8EE', light: '#8ADAF5', deep: '#1186CC' }), 0, 0);
    const V = (x0, w0, w1, dx = 0) => ({ band: [x0, -40, x0 + dx, H + 40, w0, w1 ?? w0], tips: false });
    const RED = [{ color: C.red, speck: 0.3 }, (x0, x1) => ({ halftone: { color: '#FBEFE4', cell: 14, angle: 20, r: [0.04, 0.4], grad: [x0, 0, x1, 0] } })];
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
    return c;
  });
  // three cut-outs fly past, peaking (≈ t0 + .9·dur) on the whooshes 4.2 (R) · 4.3 (L) · 4.4 (R); none of them is a car or a reel
  const FLYERS = [{ name: 'helmet', t0: 3.705, dur: 0.55, angle: 0.15, spin: 0.5, scale: 0.9 }, { name: 'clap', t0: 3.805, dur: 0.55, angle: Math.PI - 0.2, spin: -0.8, scale: 0.85 },
    { name: 'cam_side', t0: 3.905, dur: 0.55, angle: 0.5, spin: 0.7, scale: 0.75 }];
  const HOLE = [[52 / 12, 0.34], [53 / 12, 0.85]]; // 35 % → ≈ 140 % of frame width over 3 drawings (the 3rd is the 4.5 desk)
  const holeAt = (t) => { let h = 0; for (const [t0, v] of HOLE) if (t >= t0 - 1e-6) h = v; return h; };
  const kOpts = (t) => ({ segments: 8, rot: 0, twist: 0, zoom: 2.6, ratio: 0.5, levels: 7, srcScale: 1.2, rims: ['red', 'yellow', 'cyan', 'dots', 'red', 'yellow'], flyers: FLYERS, hole: holeAt(t), drawNext: (c, tt) => deskScene(c, tt), holeColor: '#F3A51C' });
  // Stickers live on ONE tunnel level each (not in the mirrored source, which would repeat them on every ring): a ring of 8 cars on absolute level 10
  // (r 373 px at 3.5 → past the frame edges by 4.1) and a ring of 8 reels between them on level 11 (small at 3.5 → r ≈ 530 on 4.25, then the hole).
  // Same geometry as CLX.kaleido's levels (scale .5^(m − 2.6·t), src → frame ×1.2·s), turned 90° so they run around the ring; odd wedges mirrored.
  const KST = [['car', 10, 580, 0, 150, -90], ['reel', 11, 430, Math.PI / 8, 120, 90]]; // [cut-out, level, src radius, angle offset, h, rot°]
  async function kalStickers(ctx, tq) {
    const c = tq * 2.6;
    for (const [n, m, d, a0, h, rot] of KST) {
      const k = 1.2 * Math.pow(0.5, m - c), R = d * k; if (R < 12 || (d - h) * k > 1160) continue;
      for (let i = 0; i < 8; i++) {
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(i * Math.PI / 4 + a0); if (i % 2) ctx.scale(1, -1);
        await CL.sprite(ctx, n, R, 0, { h: h * k, rot, shadow: { dx: 5 * k, dy: 8 * k, blur: 9 * k, alpha: 0.4 } }); ctx.restore();
      }
    }
  }
  // pass 1: the tunnel levels · stickers · pass 2 (levels −1 → no levels, empty source): the hex hole + the flyers on top
  const kalDraw = async (ctx, t) => {
    const tq = q(t), src = await KSRC(), o = kOpts(tq);
    await X.kaleido(ctx, tq, async (c) => c.drawImage(src, 0, 0), Object.assign({}, o, { hole: 0, flyers: [] }));
    await kalStickers(ctx, tq);
    if (o.hole > 0 || FLYERS.some((f) => tq > f.t0 && tq < f.t0 + f.dur)) await X.kaleido(ctx, tq, async () => {}, Object.assign({}, o, { levels: -1 }));
  };
  const KS = Math.ceil(Math.hypot(W, H)) + 8; // square: the kaleidoscope's whole disc (radius ≈ half-diagonal)
  async function kalBuf(t) { const cv = buf('kal', KS, KS), x = cv.getContext('2d'); x.translate((KS - W) / 2, (KS - H) / 2); await kalDraw(x, t); return cv; }

  /* ======================================================================= 4.5–5.5 · HOW IT'S DONE (desk, laptop prompt) */
  const LAP = { x: 968, y: 912, h: 690, rot: -1.5, sw: 1944, shh: 1272 };
  const LAP_Q = [[800, 105], [1838, 150], [1745, 915], [668, 792]];
  const lapSc = LAP.h / LAP.shh, lapW = LAP.sw * lapSc, lapLocalQ = LAP_Q.map(([px, py]) => [-lapW / 2 + px * lapSc, -LAP.h + py * lapSc]);
  const GEAR = [['headphones', 340, 330, 310, 4.75, -14], ['midi', 1530, 300, 255, 5.0, 10], ['phone_gimbal', 1570, 740, 350, 5.25, 8]];
  const DESK_CAM = { fx: 980, fy: 470, z: 0.2 };
  // the laptop screen centre in frame coords at the end of the desk push (5.5): the ▶ launches from here
  const LAP_SCR = (() => { const c = lapLocalQ.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]), p = xfPt(c, LAP.x, LAP.y, LAP.rot), z = 1 + DESK_CAM.z; return { x: DESK_CAM.fx + (p[0] - DESK_CAM.fx) * z, y: DESK_CAM.fy + (p[1] - DESK_CAM.fy) * z }; })();
  async function promptResult(c, r, t) {
    const [, , w, h] = r; c.drawImage(CL.watercolor(93, { w: 1200, h: 800, clouds: 0.6, tone: 0.82, cloudY: [0.1, 0.55] }), 0, 0, w, h);
    await CL.piece(c, { band: [-40, h * 0.86, w + 40, h * 0.8, h * 0.12, h * 0.1] }, { color: C.sun, brush: 0.6 }, { seed: 971, amp: 7 });
    await CL.sprite(c, 'cloud_2', w * 0.24, h * 0.66, { h: h * 0.34, shadow: { dx: 4, dy: 7, blur: 8, alpha: 0.25 } });
    await CL.sprite(c, 'cloud_4', w * 0.8, h * 0.28, { h: h * 0.22, flipX: true, shadow: { dx: 4, dy: 7, blur: 8, alpha: 0.25 } });
    const b = CL.bob(t, 11, h * 0.012); await CL.sprite(c, 'car', w * 0.56 + b.dx, h * 0.5 + b.dy, { h: h * 0.38, rot: -8 + b.rot, flipX: true, shadow: { dx: 8, dy: 16, blur: 10, alpha: 0.3 } });
  }
  async function deskScene(ctx, t) {
    const tq = q(t), pz = E.inOut3(prog(tq, 4.5, 5.5));
    await CL.desk(ctx, t, { cam: { zoom: 1 + DESK_CAM.z * pz, fx: DESK_CAM.fx, fy: DESK_CAM.fy }, insert: { 0: async (c) => {
      for (const [n, x, y, h, t0, rot] of GEAR) { const s = CL.slap(tq, t0, { rot0: rot > 0 ? 9 : -9 }); if (!s.on) continue; const b = CL.bob(t, x, 3);
        await CL.sprite(c, n, x + b.dx, y + b.dy, { h: h * s.s, rot: rot + s.rot + b.rot, shadow: { dx: 8 * s.shadow, dy: 12 * s.shadow, blur: 12 * s.shadow, alpha: 0.4 } }); }
      // laptop: 3 falling drawings (4.25 hidden above, 4.333 bottom edge in, 4.417 mid-air) → lands on 4.5
      const d = CL.drop(tq, 4.25, { h: 1500, tilt: 5, dur: 0.25 }); if (!d.on) return;
      c.save(); c.translate(LAP.x, LAP.y + d.dy); c.rotate((LAP.rot + d.rot) * DEG); c.scale(d.sx, d.sy);
      await CL.sprite(c, 'laptop', 0, 0, { h: LAP.h, ax: 0.5, ay: 1, shadow: { dx: 12, dy: 20, blur: 20, alpha: 0.42 } });
      // prompt types 4.6 → complete on the 5.083 drawing; generate ✦ pressed 5.15 (first pressed drawing 5.167) → result
      await X.screen(c, lapLocalQ, tq, 4.6, { text: COPY.prompt, pill: COPY.generate, title: COPY.ui, placeholder: COPY.placeholder, cps: 32, tClick: 5.15, fontSize: 64, drawResult: promptResult });
      c.restore();
    } } });
  }

  /* ======================================================================= 5.5–7.5 · strip rocket → KAYE / CREATES */
  const TITLE_Y = 520;
  const deskOff = (t) => H * 1.18 * Math.pow(prog(q(t), 5.5, 71 / 12), 1.6); // the desk sheet drops away 5.5–5.92 (camera tilts up)
  // the ▶ rides the plume head and shoots off the top 5.667–5.917 (gone on the 5.917 breath drawing)
  async function rider(c, x, y, tt) {
    const qq = q(tt), lk = prog(qq, 68 / 12, 71 / 12); if (lk >= 1) return;
    const sl = CL.slap(qq, 5.5, { from: 1.3, rot0: 0 }), s = lerp(1, 0.6, lk) * (sl.on ? sl.s : 1), rot = lk > 0 ? (Math.floor(tt * 12 + 1e-6) % 2 ? 0.15 : -0.15) : Math.sin(qq * 9) * 0.05;
    c.save(); c.translate(x, y - 640 * Math.pow(lk, 1.5)); c.scale(s, s); await X.play(c, 0, 0, 240, tt, { rot }); c.restore();
  }
  async function titleBg(ctx, t) {
    const tq = q(t), tilt = 0.9 * E.inOut3(prog(tq, 5.5, 6.0)) + 0.1 * prog(tq, 6.0, 8.5);
    await CL.sky(ctx, t, { tilt, part: E.inOut3(prog(tq, 67 / 12, 6.0)) }); // cloud banks at the bottom part L / R
    if (tq < 71 / 12) { const B = padBuf('deskS'); await deskScene(B.getContext('2d'), t); drawSheet(ctx, B, 0, deskOff(t), [1, 0, 0, 0], 17, [0, -18]); }
    // plume base width follows its length (as CLX.rocket's head: by → vy, out3 over dur), so the first drawings are a narrow streamer, not a wide skirt under the ▶
    const rby = Math.min(LAP_SCR.y + deskOff(t), H + 70), rhy = lerp(rby, H * 0.31, E.out3(clamp((q(t) - 5.5) / 0.42)));
    await X.rocket(ctx, t, 5.5, { vx: W / 2, vy: H * 0.31, by: rby, bx: LAP_SCR.x, dur: 0.42, n: 64, width: clamp((rby - rhy) * 2.2, 300, 1050), narrow: 0.66, seed: 7, drawRider: rider });
    await X.burst(ctx, t, 6.0, { cx: W / 2, cy: TITLE_Y, n: 26, seed: 9 });
  }
  // title lands from above with an expo-out over 9 drawings (6.0 → 6.75), no overshoot: ref bottom-edge fractions .075 .23 .36 .45 .53 .58 .63 .65 .67 .68
  const TFR = [0, 0.256, 0.471, 0.62, 0.752, 0.835, 0.917, 0.95, 0.983, 1];
  async function titleScene(ctx, t) {
    await titleBg(ctx, t);
    const tq = q(t); if (tq < 6.0) return;
    const i = drawingIdx(t, 6.0), f = i < TFR.length ? TFR[i] : 1, dy0 = H * 0.075 - (TITLE_Y + TTL.off);
    await X.title(ctx, COPY.title, W / 2, TITLE_Y + dy0 * (1 - f), tq, 6.0, { size: TTL.size, font: COPY.titleFont, drop: false, zoom: 0.03 });
    if (tq >= 6.3 && tq <= 7.4) { // biplane crosses over the letters
      const k = prog(tq, 6.3, 7.4), b = CL.bob(t, 17, 4);
      await CL.sprite(ctx, 'plane_side', lerp(-360, W + 360, k) + b.dx, 250 + Math.sin(k * 5) * 18 + b.dy, { h: 220, rot: -4 + b.rot, boil: 0.7, t, shadow: { dx: 12, dy: 34, blur: 14, alpha: 0.25 } });
    }
  }

  /* ======================================================================= 7.5–10 · tear → logo band → flicker → SUBSCRIBE */
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
  const logoAt = (c, t, style) => X.logoBand(c, COPY.logo, t, { style: style || 'band', x: LOGO.x, y: LOGO.y, h: LOGO.h, size: LOGO.size, seed: 8, boil: !style || style === 'band' });
  // a flicker look drawn full-frame into a buffer that is then clipped to the band. 'posters' is custom: CLX's 'posters' style lays the clean band
  // sprite over the poster wall, which inside the band reads as the lockup; here the letters sit straight on the channel's own poster wall (CL.posters) instead.
  async function lookAt(c, t, st) {
    if (st !== 'posters') { await logoAt(c, t, st); return; }
    await CL.posters(c, t, {}); U.drawPiece(c, U.logoSprite(COPY.logo, LOGO.size, 'chrome', 8), LOGO.x, LOGO.y, { shadow: false });
  }
  const flashAt = (t) => { const i = Math.floor((t - 8.0) * 24 + 1e-6); return i >= 0 && i < FLICK_FR.length ? FLICK[FLICK_FR[i]] : null; }; // frame-exact holds 2-1-2-3-2-2
  const T_SUB = 8.5, T_CLICK = 9.0, T_BELL = 9.15;
  async function endScene(ctx, t) {
    const tq = q(t), st = flashAt(t), z = 1 + 0.025 * Math.max(0, tq - 95 / 12); // slow push on the logo card about a low point (tag + URL stay in frame)
    await zoomAbout(ctx, z, W / 2, 800, async () => {
      const BG = buf('tbg'); await titleBg(BG.getContext('2d'), t);
      const under = async (c) => { c.drawImage(BG, 0, 0); await logoAt(c, t, null); };
      // the tear's k starts one drawing before the cut, so the 7.5 drawing already shows the curl ≈ 1/6 across (on the rip hit, not 83 ms after it)
      if (tq < 7.9) await X.tear(ctx, prog(tq, 89 / 12, 7.92), async (c) => titleScene(c, t), under, TEAR);
      else {
        const Bc = buf('tunder'); await under(Bc.getContext('2d')); tearDone(ctx, BG, Bc);
        if (st) { const F = buf('flash'); await lookAt(F.getContext('2d'), tq, st); ctx.save(); ctx.clip(TEARDONE.R); ctx.drawImage(F, 0, 0); ctx.restore(); } // only ever inside the band
      }
      if (tq >= 95 / 12) await X.tag(ctx, W / 2, 150, COPY.bandTag, { t: tq, t0: 95 / 12, color: 'cobalt', font: 'sans', size: 44, rot: -0.02, tape: 'top' });
      // 8.5 SUBSCRIBE slaps in place · 9.0 click → SUBSCRIBED ✓ (+ paper confetti from behind) · 9.15 bell
      if (tq >= T_CLICK) await X.confetti(ctx, t, T_CLICK, { x: SUB.x, y: SUB.y - 20, n: 24, speed: 1300, spread: Math.PI * 1.1, gravity: 1300, dur: 0.95, seed: 28 });
      if (tq >= T_SUB) {
        await X.subscribe(ctx, SUB.x, SUB.y, tq, { h: SUB.h, slap: T_SUB, tClick: T_CLICK, bell: false, labels: SUBL });
        // the bell: CLX rings it 0.2 s after tClick, so a second pass with tClick 8.95, clipped right of the button, rings it on 9.15 (first wiggle on the 9.167 drawing)
        ctx.save(); ctx.beginPath(); ctx.rect(SUB.x + SUBW.b / 2 + 24, SUB.y - 200, 420, 400); ctx.clip();
        await X.subscribe(ctx, SUB.x, SUB.y, tq, { h: SUB.h, slap: T_SUB, tClick: T_BELL - 0.2, labels: SUBL }); ctx.restore();
      }
      if (tq >= 8.75) await X.tag(ctx, W / 2, URL_Y, COPY.url, { t: tq, t0: 8.75, color: 'ink', font: 'mono', size: 38, rot: 0.015, tape: false });
      if (tq >= 103 / 12) { // cursor: curves in from the right ABOVE the bell 8.58–8.92, clicks the right end of SUBSCRIBE (past the E) on 9.0, then rises off to the right over
        // the band edge (y 9.08–9.33 first, x 9.08–9.5 after) — never over the label, the ✓, the ringing bell or the URL
        const click = t >= T_CLICK && t < T_CLICK + 2 / 24 ? 1 : 0;
        const al = prog(tq, 103 / 12, 107 / 12), c2 = prog(tq, 109 / 12, 9.5), tx = SUB.x + SUBW.a / 2 - 30, ty = SUB.y - SUB.h * 0.32;
        let x = lerp(W + 90, tx, E.out3(al)), y = lerp(640, ty, al * al); x = lerp(x, 1560, c2 * c2); y = lerp(y, 700, E.out3(prog(tq, 109 / 12, 112 / 12)));
        await X.cursor(ctx, x, y, t, { size: 116, click, rot: -0.3 });
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
  Cut(0.0, 1.0, async (ctx, t) => { await pageScene(ctx, t); await channelTag(ctx, t); });
  Cut(1.0, 2.5, async (ctx, t) => { // 1.0 DROP: page rips from the centre (3 drawings), F1 world underneath; the channel tag is swept off after
    await f1Scene(ctx, t);
    const i = drawingIdx(t, 1.0);
    if (i < 3) { const A = padBuf('ripA'); await pageScene(A.getContext('2d'), t); ripDraw(ctx, [0.05, 0.36, 0.8][i], A); await X.confetti(ctx, t, 1.0, { x: W / 2, y: H / 2, n: 30, speed: 1500, spread: Math.PI * 2, gravity: 900, dur: 0.6, seed: 20, colors: [C.paper, C.paper, C.red, C.sun] }); }
    await channelTag(ctx, t);
  });
  Cut(2.5, 3.5, (ctx, t) => wipe(ctx, t, 2.5, (c) => f1Scene(c, t), (c) => camScene(c, t), { from: [1, 0], edges: [0, 0, 0, 1], seed: 4, push: 0.22, roll: -10, rollB: 6, speed: { n: 10, angle: Math.PI, speed: 3600, alpha: 0.9, seed: 41 } }));
  Cut(3.5, 4.5, (ctx, t) => kalDraw(ctx, t));
  Cut(4.5, 5.5, (ctx, t) => deskScene(ctx, t));
  Cut(5.5, 6.0, (ctx, t) => titleBg(ctx, t));
  Cut(6.0, 7.5, (ctx, t) => titleScene(ctx, t));
  Cut(7.5, 10.0, (ctx, t) => endScene(ctx, t));

  const PERF = /perf/.test(location.search);
  window.SCENES = {
    duration: 10.0,
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
