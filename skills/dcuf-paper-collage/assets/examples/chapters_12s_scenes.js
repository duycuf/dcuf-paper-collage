/* scenes.js — duycuf.vn intro v2, 12 s (1920×1080, 24 fps, 120 BPM = 0.5 s beats, 6 drawings). Torn-paper collage, all code + free-stock cut-outs.
 * Story (2026-10-19, a portfolio): no career journey — what the owner makes with AI, shown as real objects (the kaye/San Diego way: object + paper tag, one screen only).
 *   0–1.0   blank sheet, prompt card types "make me…", click "cook ✦"            (the ONE screen of the film)
 *   1.0     page rips → AI AGENT: rotary phone drops + rings, chat bubbles slap 1.25 1.42 1.58 1.75
 *   2.0     torn wipe → CUSTOM AI SKILLS: toolbox slaps, 5 skill cards fan out 2.25–2.58
 *   3.0     torn wipe → AUTOMATION: cash register slaps, receipt prints 3.2–3.95, gears turn, slips fly
 *   4.0     LIFT → AI CREATIVE: poster wall, objects slap faster and faster (camera, flash, perfume, bag, clapper, reel), ransom "CREATIVE"
 *   6.5     torn wipe → open recipe book drops; every object of the film flies into it 6.75–7.58; book shuts 7.83 → SLAM 8.0
 *           tag "and I teach your team to cook it all"
 *   9.0     cover push: duycuf title drops (final hit), FULL-STACK AI CREATOR, LET ME COOK., LET'S TALK → work@duycuf.vn ✓, duycuf.vn
 * Pure function of t; motion on twos (q(t)); colours authored in the original collage palette, remapped to duycuf by grade.js.
 * The kaye 10 s / duycuf v1 file is kept as scenes_v1_kaye10s.js.bak.
 */
(function () {
  'use strict';
  const { W, H, clamp, lerp, prog, E } = ENG;
  const K = KIT, X = CLX, C = CL.C, DEG = Math.PI / 180;

  /* ---------- copy: every on-screen word lives here ---------- */
  const COPY = {
    channelTag: 'duycuf ✦ full-stack AI creator',
    ui: 'duycuf ✦ kitchen', prompt: 'make me…', generate: 'cook ✦',
    agent: 'AI AGENT · ANSWERS 24/7',
    bubbles: ['where’s my order?', 'shipped today ✓', 'table for 4 at 7?', 'booked ✦'],
    skills: 'CUSTOM AI SKILLS', skillCards: ['RESEARCH', 'WRITE', 'DESIGN', 'CODE', 'SELL'],
    auto: 'AUTOMATION · RUNS WHILE YOU SLEEP',
    creative: 'AI CREATIVE', creativeWord: 'CREATIVE',
    teach: 'and I teach your team to cook it all',
    title: ['duycuf'], titleFont: '"Fraunces"',
    role: 'FULL-STACK AI CREATOR', cook: 'LET ME COOK.',
    talk: 'LET’S TALK', talked: 'work@duycuf.vn ✓', url: 'duycuf.vn',
  };
  const SUBL = [COPY.talk, COPY.talked.replace(/\s*✓\s*$/, '')];
  K.setup({ bars: [1.0, 2.0, 3.0, 4.0, 8.0, 9.0] });

  /* ---------- helpers ---------- */
  const q = (t) => Math.floor(t * 12 + 1e-6) / 12;
  const drawingIdx = (t, t0) => Math.floor((t - t0) * 12 + 1e-6);
  const BUFS = new Map();
  function buf(name, w = W, h = H) {
    let c = BUFS.get(name); if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; BUFS.set(name, c); }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, c.width, c.height);
    return c;
  }
  const PAD = 170;
  function padBuf(name) { const c = buf(name, W + 2 * PAD, H + 2 * PAD), x = c.getContext('2d'); x.fillStyle = '#FBF8F1'; x.fillRect(0, 0, c.width, c.height); x.translate(PAD, PAD); c.pad = PAD; return c; }
  const pc = (x, shape, fill, o) => CL.piece(x, shape, fill, Object.assign({ cache: false }, o));
  async function zoomAbout(ctx, z, fx, fy, fn) { ctx.save(); ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy); await fn(); ctx.restore(); }
  const paperPat = (ctx) => ctx.createPattern(CL.paper(C.paper, 3, { tex: 0.8 }), 'repeat');
  const TAG = { size: 46, font: 'sans' };
  const worldTag = (ctx, t, t0, str, color, o = {}) => X.tag(ctx, o.x ?? 92, o.y ?? 990, str, Object.assign({ t: q(t), t0, color, anchor: 'left', rot: -0.025, tape: 'top' }, TAG, o));
  // slap a cut-out in place on twos (scale from→1, little rotation kick)
  async function slapSprite(ctx, t, name, x, y, t0, o = {}) {
    const tq = q(t), s = CL.slap(tq, t0, { from: o.from ?? 1.35, rot0: o.rot0 ?? ((o.rot || 0) > 0 ? 9 : -9) }); if (!s.on) return false;
    const b = CL.bob(t, x + y, o.bob ?? 2.5);
    await CL.sprite(ctx, name, x + b.dx, y + b.dy, Object.assign({}, o, { rot: (o.rot || 0) + s.rot + b.rot, h: o.h && o.h * s.s, w: o.w && o.w * s.s, shadow: { dx: 9 * s.shadow, dy: 14 * s.shadow, blur: 14 * s.shadow, alpha: 0.42 } }));
    return true;
  }

  /* ---------- warm-up (inside __seek, fonts loaded) ---------- */
  const SUB = { x: W / 2, y: 930, h: 120 };
  const TTL = { size: 0 };
  let WARM = null;
  const warm = () => WARM || (WARM = (async () => {
    await CL.preload(['phone', 'toolbox', 'cash_register', 'gear', 'cam_front', 'flash', 'perfume', 'shopping_bag', 'clap', 'reel', 'book_open', 'tomato']);
    const m = document.createElement('canvas').getContext('2d'); m.font = `400 100px ${COPY.titleFont}`;
    TTL.size = 100 * (W * 0.42) / Math.max(1, m.measureText(COPY.title[0]).width);
    await X.warm({ title: { lines: COPY.title, size: TTL.size, font: COPY.titleFont }, subscribe: SUB.h, subLabels: SUBL,
      cuts: ['phone', 'toolbox', 'cash_register', 'cam_front', 'flash', 'perfume', 'shopping_bag', 'book_open'] });
  })());

  /* ======================================================================= paper transitions (as the 10 s cut) */
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
    drawSheet(ctx, B, dx * (W + 340) * (1 - k), dy * (H + 340) * (1 - k), o.edges, o.seed || 3, [-dx * 22, -dy * 22 + 10]);
    if (o.speed) await X.speed(ctx, t, o.speed);
  }
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

  /* ======================================================================= backgrounds (cached layers) */
  // each chapter: its own colour field + a few torn strips; authored in the original palette (grade.js maps it to duycuf)
  const bgLayer = (key, build) => CL.layer(key, async (x) => { await build(x); }, { bleed: 200 });
  const BG = {
    open: () => bgLayer('v2open', async (x) => {
      x.fillStyle = CL.pat(x, CL.paper(C.sky, 11, { tex: 1 })); x.fillRect(-200, -200, W + 400, H + 400);
      await pc(x, { band: [-220, 120, 760, -40, 150, 90] }, { color: C.sun, brush: 0.6 }, { seed: 801, amp: 10, halftone: { color: 'rgba(240,122,46,0.8)', cell: 14, angle: 25, r: [0.05, 0.38], grad: [-200, 0, 760, 0] } });
      await pc(x, { band: [1180, 1180, 2140, 820, 210, 140] }, { color: C.red, speck: 0.3 }, { seed: 802, amp: 12, halftone: { color: '#FBEFE4', cell: 18, angle: 20, r: [0.02, 0.42], grad: [1200, 0, 2100, 0] } });
      await pc(x, { band: [-200, 1010, 900, 1090, 70, 50] }, C.paper, { seed: 803, amp: 7, news: { alpha: 0.5 } });
      await pc(x, { band: [1500, 40, 2140, -20, 90, 60] }, C.olive, { seed: 804, amp: 8 });
    }),
    agent: () => bgLayer('v2agent', async (x) => {
      x.fillStyle = CL.pat(x, CL.paper(C.sun, 21, { tex: 1, brush: 0.5 })); x.fillRect(-200, -200, W + 400, H + 400);
      CL.halftone(x, [-200, -200, W + 400, H + 400], 'rgba(240,122,46,0.55)', { cell: 22, angle: 30, r: [0.36, 0.02], grad: [0, H, W, 0] });
      await pc(x, { circle: [760, 610, 430] }, C.paper, { seed: 811, amp: 11, dotgrid: { cell: 20, r: 0.08, angle: 12 } });
      await pc(x, { band: [-200, 980, 2140, 900, 160, 130] }, { color: C.red, speck: 0.3 }, { seed: 812, amp: 12 });
      await pc(x, { band: [1060, -40, 1240, 1120, 70, 90] }, C.paper, { seed: 813, amp: 8, news: { alpha: 0.45, angle: -80 } });
    }),
    skill: () => bgLayer('v2skill', async (x) => {
      x.fillStyle = CL.pat(x, CL.paper(C.olive, 31, { tex: 1.1 })); x.fillRect(-200, -200, W + 400, H + 400);
      CL.halftone(x, [-200, -200, W + 400, H + 400], 'rgba(30,60,10,0.25)', { cell: 18, angle: 15, r: [0.04, 0.34], grad: [W / 2, 0, W / 2, H] });
      await pc(x, { rect: [420, 140, 1080, 640] }, C.paper, { seed: 821, amp: 12, rot: -2, dotgrid: { cell: 22, r: 0.07 } });
      await pc(x, { band: [-200, 70, 700, 20, 90, 70] }, C.sun, { seed: 822, amp: 8 });
      await pc(x, { band: [1300, 1100, 2140, 960, 150, 110] }, { color: C.red, speck: 0.3 }, { seed: 823, amp: 10 });
    }),
    auto: () => bgLayer('v2auto', async (x) => {
      x.fillStyle = CL.pat(x, CL.paper(C.paper, 41, { tex: 0.9 })); x.fillRect(-200, -200, W + 400, H + 400);
      await pc(x, { band: [-200, 880, 2140, 180, 520, 420] }, { color: C.earth }, { seed: 841, amp: 14, halftone: { color: 'rgba(0,0,0,0.38)', cell: 18, angle: 20, r: [0.4, 0.05], grad: [0, H, W, 0] } });
      await pc(x, { band: [-200, 300, 900, 180, 60, 40] }, C.sun, { seed: 842, amp: 7 });
      await pc(x, { band: [1200, 1040, 2140, 1000, 70, 50] }, C.paper, { seed: 843, amp: 7, news: { alpha: 0.5 } });
    }),
    book: () => bgLayer('v2book', async (x) => {
      x.fillStyle = CL.pat(x, CL.paper(C.paper, 51, { tex: 1 })); x.fillRect(-200, -200, W + 400, H + 400);
      CL.halftone(x, [-200, -200, W + 400, H + 400], 'rgba(229,35,30,0.35)', { cell: 20, angle: 25, r: [0.02, 0.32], grad: [W / 2, H / 2, W, 0] });
      await pc(x, { band: [-200, 120, 2140, 40, 120, 90] }, C.sun, { seed: 851, amp: 9 });
      await pc(x, { band: [-200, 1060, 2140, 980, 160, 140] }, C.olive, { seed: 852, amp: 10 });
    }),
  };
  async function drawBg(ctx, which) { const L = await BG[which](); ctx.drawImage(L, -L.bleed, -L.bleed); }

  /* ======================================================================= 0–1 · OPEN: the prompt card (the film's one screen) */
  const CARD = [150, 120, 1620, 860];   // near full frame: the typed words must read at phone size
  async function openScene(ctx, t) {
    const tq = q(t), z = 1 + 0.03 * tq;
    await zoomAbout(ctx, z, W / 2, H / 2, async () => {
      await drawBg(ctx, 'open');
      await CL.piece(ctx, CARD, C.paper, { seed: 861, amp: 10, shadow: { dx: 10, dy: 18, blur: 26, alpha: 0.42 } });
      await X.screen(ctx, [CARD[0] + 46, CARD[1] + 42, CARD[2] - 92, CARD[3] - 84], tq, 0.15, { text: COPY.prompt, cps: 14, tClick: 0.83, pill: COPY.generate, title: COPY.ui, placeholder: ' ', fontSize: 110, bg: '#F5F1E8', bg2: '#F3EBDD' });
    });
    if (tq >= 0.25 && tq < 1.0) await X.tag(ctx, 96, 120, COPY.channelTag, { t: tq, t0: 0.25, color: 'white', font: 'sans', size: 44, anchor: 'left', rot: -0.035, tape: 'top' });
  }

  /* ======================================================================= 1–2 · AI AGENT */
  const PHONE = { x: 760, y: 900, h: 560 };
  const BUB = [[1360, 250, 1.25, -3, C.paper], [1430, 430, 17 / 12, 2, C.sky], [1330, 610, 19 / 12, -2, C.paper], [1440, 790, 21 / 12, 3, C.sky]];
  async function bubble(ctx, t, i) {
    const [x, y, t0, rot, fill] = BUB[i], tq = q(t), s = CL.slap(tq, t0, { from: 1.4, rot0: rot > 0 ? 8 : -8 }); if (!s.on) return;
    const str = COPY.bubbles[i], fz = 50; ctx.font = `800 ${fz}px "Inter Tight"`; const tw = ctx.measureText(str).width, w = tw + 90, h = 112;
    ctx.save(); ctx.translate(x, y); ctx.rotate((rot + s.rot) * DEG); ctx.scale(s.s, s.s); ctx.translate(-x, -y);
    await CL.piece(ctx, { band: [x - w / 2, y, x + w / 2, y, h, h], tips: false }, fill, { seed: 870 + i, amp: 7, shadow: { dx: 6, dy: 10, blur: 12, alpha: 0.35 } });
    const tail = i % 2 ? [[x + w / 2 - 70, y + 40, 1], [x + w / 2 - 10, y + 40, 1], [x + w / 2 + 12, y + 100, 1]] : [[x - w / 2 + 10, y + 40, 1], [x - w / 2 + 70, y + 40, 1], [x - w / 2 - 12, y + 100, 1]];
    await CL.piece(ctx, { poly: tail }, fill, { seed: 880 + i, amp: 3, shadow: false });
    ctx.font = `800 ${fz}px "Inter Tight"`; ctx.fillStyle = C.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(str, x, y + 3); ctx.textAlign = 'left';
    ctx.restore();
  }
  async function agentScene(ctx, t) {
    const tq = q(t), z = 1 + 0.03 * clamp(tq - 1.0);
    await zoomAbout(ctx, z, W / 2, H / 2, async () => {
      await drawBg(ctx, 'agent');
      const d = CL.drop(tq, 1.0, { h: PHONE.y, tilt: -6, dur: 0.25 });
      if (d.on) {
        const ring = tq >= 1.25 && tq < 1.95, rr = ring ? (drawingIdx(t, 1.25) % 2 ? 4 : -4) : 0;
        await CL.sprite(ctx, 'phone', PHONE.x, PHONE.y + d.dy, { h: PHONE.h, ay: 1, rot: d.rot + rr, sx: d.sx, sy: d.sy, shadow: { dx: 12, dy: 18, blur: 18, alpha: 0.45 } });
        if (ring) for (const side of [-1, 1]) { // ring marks: three torn slivers either side, alternating on twos
          if ((drawingIdx(t, 1.25) + (side > 0 ? 1 : 0)) % 2) continue;
          for (let k = 0; k < 3; k++) { const a = (-60 + k * 30) * DEG, cx = PHONE.x + side * 330, cy = PHONE.y - 420, r0 = 40, r1 = 120;
            await CL.strip(ctx, cx + side * Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + side * Math.cos(a) * r1, cy + Math.sin(a) * r1, 18, { fill: C.paper, seed: 890 + k + (side > 0 ? 3 : 0) }); }
        }
      }
      for (let i = 0; i < BUB.length; i++) await bubble(ctx, t, i);
    });
    if (tq >= 13 / 12) await worldTag(ctx, t, 13 / 12, COPY.agent, 'white');
  }

  /* ======================================================================= 2–3 · CUSTOM AI SKILLS */
  const TB = { x: 960, y: 1010, h: 420 };
  const CARDS = COPY.skillCards.map((s, i) => ({ s, t0: 2.25 + i / 12, a: (-60 + i * 30) * DEG }));
  async function skillCard(ctx, t, i) {
    const c = CARDS[i], tq = q(t); if (tq < c.t0) return;
    const k = E.out3(clamp((tq - c.t0) / 0.25)), ox = TB.x, oy = TB.y - 330, R = 560 * k, x = ox + Math.sin(c.a) * R * 1.15, y = oy - Math.cos(c.a) * R * 0.78, s = lerp(0.35, 1, k), w = 220, h = 300;
    ctx.save(); ctx.translate(x, y); ctx.rotate(c.a * 0.8 * k); ctx.scale(s, s);
    await CL.piece(ctx, [-w / 2, -h / 2, w, h], i % 2 ? C.paper : C.sun, { seed: 900 + i, amp: 6, shadow: { dx: 6, dy: 10, blur: 12, alpha: 0.4 } });
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(0, -30, 54, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.paper; ctx.font = `900 64px "Rubik"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', 0, -26);
    ctx.fillStyle = C.ink; ctx.font = `800 34px "Inter Tight"`; ctx.fillText(c.s, 0, 92); ctx.textAlign = 'left';
    ctx.restore();
  }
  async function skillScene(ctx, t) {
    const tq = q(t), z = 1 + 0.03 * clamp(tq - 2.0);
    await zoomAbout(ctx, z, W / 2, H / 2, async () => {
      await drawBg(ctx, 'skill');
      for (let i = 0; i < CARDS.length; i++) await skillCard(ctx, t, i);   // drawn behind the box: they come out of it
      await slapSprite(ctx, t, 'toolbox', TB.x, TB.y, 2.0 + 1 / 12, { h: TB.h, ay: 1, rot: -2, from: 1.3 });
    });
    if (tq >= 25 / 12) await worldTag(ctx, t, 25 / 12, COPY.skills, 'yellow');
  }

  /* ======================================================================= 3–4 · AUTOMATION */
  const REG = { x: 760, y: 1000, h: 600 };
  async function autoScene(ctx, t) {
    const tq = q(t), z = 1 + 0.03 * clamp(tq - 3.0);
    await zoomAbout(ctx, z, W / 2, H / 2, async () => {
      await drawBg(ctx, 'auto');
      for (const [gx, gy, gh, dir] of [[1500, 300, 360, 1], [1745, 470, 230, -1.6]]) await CL.sprite(ctx, 'gear', gx, gy, { h: gh, rot: dir * (tq - 3.0) * 160, shadow: { dx: 6, dy: 10, blur: 10, alpha: 0.35 } });
      if (tq >= 3.2) { // the receipt prints out of the register top and runs up to the right 3.2–3.95
        const L = 980 * clamp((tq - 3.2) / 0.75), x0 = REG.x + 40, y0 = REG.y - REG.h * 0.78;
        if (L > 30) await CL.piece(ctx, { band: [x0, y0, x0 + L * 0.55, y0 - L * 0.8, 120, 120], tips: false }, C.paper, { seed: 920 + Math.round(L / 40), amp: 4, news: { alpha: 0.55, angle: -55 }, shadow: { dx: 8, dy: 12, blur: 12, alpha: 0.35 } });
      }
      await slapSprite(ctx, t, 'cash_register', REG.x, REG.y, 3.0 + 1 / 12, { h: REG.h, ay: 1, rot: -2, from: 1.25 });
      for (const [i, t0] of [[0, 3.42], [1, 3.58], [2, 3.75]]) { // receipt slips fly off to the right
        const f = CL.fly(tq, t0, t0 + 0.42, { from: { x: REG.x + 120, y: REG.y - 480, s: 0.5 }, to: { x: W + 200, y: 120 + i * 240, s: 1.2 } }); if (!f.on) continue;
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate((-12 + i * 9) * DEG); ctx.scale(f.s, f.s);
        await CL.piece(ctx, [-90, -130, 180, 260], C.paper, { seed: 940 + i, amp: 5, news: { alpha: 0.6 }, shadow: { dx: 6, dy: 10, blur: 10, alpha: 0.35 } }); ctx.restore();
      }
    });
    if (tq >= 37 / 12) await worldTag(ctx, t, 37 / 12, COPY.auto, 'white');
  }

  /* ======================================================================= 4–6.5 · AI CREATIVE (faster and faster) */
  // [name, x, y, h, t0, rot]: gaps shrink 0.42 → 0.17 s; the ransom word lands 5.67–6.25
  const PILE = [['cam_front', 560, 470, 560, 4.0 + 1 / 12, -8], ['flash', 1420, 330, 400, 4.5, 10], ['perfume', 1180, 760, 470, 4.0 + 10 / 12, -6],
    ['shopping_bag', 330, 820, 480, 5.0 + 1 / 12, 8], ['clap', 1600, 790, 320, 5.0 + 4 / 12, 14], ['reel', 900, 260, 280, 5.5, -12]];
  async function creativeScene(ctx, t, o = {}) {
    const tq = q(t);
    await CL.posters(ctx, t, {});
    await X.burst(ctx, t, 4.0, { cx: W / 2, cy: H / 2, n: 30, seed: 19 });
    for (const [n, x, y, h, t0, rot] of PILE) {
      if (n === 'flash' && tq >= t0 && tq < t0 + 2 / 12) await X.star(ctx, x - 40, y - 60, 230, t, { points: 14, inner: 0.6, color: X.PAL.yellow, seed: 4, pop: 1 });
      await slapSprite(ctx, t, n, x, y, t0, { h, rot, from: 1.45 });
    }
    if (tq >= 5.0 + 8 / 12) await X.ransom(ctx, COPY.creativeWord, W / 2, 560, tq, 5.0 + 8 / 12, { size: 150, seed: 6, step: 1 / 12 });
    if (!o.noTag && tq >= 49 / 12) await worldTag(ctx, t, 49 / 12, COPY.creative, 'yellow');
  }

  /* ======================================================================= 6.5–9 · RECIPE BOOK: everything flies in, the book slams shut */
  const BOOK = { x: W / 2, y: 820, w: 1050 };
  // where each object waits (frame px, height) before it flies into the book (6.75 → 7.58, one drawing apart)
  const INTO = [['phone', 230, 300, 300], ['toolbox', 1690, 300, 280], ['cash_register', 260, 760, 320], ['cam_front', 1680, 760, 300], ['flash', 520, 180, 240],
    ['perfume', 1420, 170, 260], ['shopping_bag', 120, 520, 280], ['clap', 1800, 520, 210], ['reel', 960, 120, 200], ['gear', 760, 330, 200], ['tomato', 1180, 340, 170]];
  const T_SHUT = 7.0 + 10 / 12, T_SLAM = 8.0;
  async function bookCover(ctx, x, y, w, h) { // the closed book: ink cover, ember spine, paper page block
    await CL.piece(ctx, [x - w / 2 + 14, y - h / 2 + 22, w, h], C.paper, { seed: 961, amp: 5, news: { alpha: 0.35 }, shadow: { dx: 12, dy: 22, blur: 26, alpha: 0.5 } });
    await CL.piece(ctx, [x - w / 2, y - h / 2, w, h], { color: C.earth }, { seed: 962, amp: 8, shadow: false, halftone: { color: 'rgba(0,0,0,0.38)', cell: 16, angle: 20, r: [0.05, 0.3], grad: [x - w / 2, y + h / 2, x + w / 2, y - h / 2] } });
    await CL.piece(ctx, [x - w / 2, y - h / 2, w * 0.09, h], { color: C.red, speck: 0.3 }, { seed: 963, amp: 4, shadow: false });
  }
  async function bookScene(ctx, t) {
    const tq = q(t);
    await drawBg(ctx, 'book');
    if (tq < T_SHUT) { // open book drops in (lands ≈6.67); objects fly into its gutter
      const d = CL.drop(tq, 6.5, { h: BOOK.y + 160, tilt: 4, dur: 0.25 });
      if (d.on) await CL.sprite(ctx, 'book_open', BOOK.x, BOOK.y + d.dy + 160, { w: BOOK.w, ay: 1, rot: d.rot, sx: d.sx, sy: d.sy, shadow: { dx: 14, dy: 24, blur: 26, alpha: 0.45 } });
      for (let i = 0; i < INTO.length; i++) {
        const [n, x, y, h] = INTO[i], t0 = 6.75 + i / 12;
        if (tq < t0) { const b = CL.bob(t, i * 7, 3); await CL.sprite(ctx, n, x + b.dx, y + b.dy, { h, rot: b.rot + (i % 2 ? 6 : -6), shadow: { dx: 7, dy: 11, blur: 12, alpha: 0.38 } }); continue; }
        const f = CL.fly(tq, t0, t0 + 0.42, { from: { x, y, s: 1 }, to: { x: BOOK.x - 5, y: BOOK.y - 80, s: 0.06 } });   // book_open spine mid ≈ (793, 537) of 1566×898 → frame ≈ (955, 740) if (!f.on || f.k >= 1) continue;
        await CL.sprite(ctx, n, f.x, f.y, { h: h * f.s, rot: (i % 2 ? 1 : -1) * 220 * f.k, shadow: false });
      }
      if (tq >= 6.75 && tq < 7.6) await X.speed(ctx, t, { n: 10, angle: Math.PI / 2, speed: 2600, alpha: 0.7, seed: 51 });
      return;
    }
    // 7.83: half-shut drawing (spread squashed toward the spine) · 8.0 SLAM: closed cover, dust strips, confetti, the teach tag
    if (tq < T_SLAM) { await CL.sprite(ctx, 'book_open', BOOK.x, BOOK.y + 160, { w: BOOK.w * 0.62, ay: 1, sy: 1.08, rot: -3, shadow: { dx: 14, dy: 24, blur: 26, alpha: 0.45 } }); return; }
    const s = CL.slap(tq, T_SLAM, { from: 1.22, rot0: -4 }), cy = BOOK.y - 140;
    ctx.save(); ctx.translate(BOOK.x, cy); ctx.rotate(s.rot * DEG); ctx.scale(s.s, s.s * (drawingIdx(t, T_SLAM) === 0 ? 0.92 : 1)); ctx.translate(-BOOK.x, -cy);
    await bookCover(ctx, BOOK.x, cy, 900, 600); ctx.restore();
    await X.burst(ctx, t, T_SLAM, { cx: BOOK.x, cy: cy + 290, n: 22, dur: 0.5, r0: 420, seed: 23 });
    await X.confetti(ctx, t, T_SLAM, { x: BOOK.x, y: cy, n: 26, speed: 1300, spread: Math.PI * 1.2, gravity: 1200, dur: 0.9, seed: 33 });
    if (tq >= T_SLAM + 1 / 12) await X.tag(ctx, W / 2, 150, COPY.teach, { t: tq, t0: T_SLAM + 1 / 12, color: 'yellow', font: 'sans', size: 50, rot: -0.02, tape: 'top' });
  }

  /* ======================================================================= 9–12 · COVER: duycuf + role + LET'S TALK */
  const T_TTL = 9.0, T_TALK = 10.25, T_CLICK = 10.0 + 10 / 12, BTN_Y = SUB.y - 150;
  async function coverScene(ctx, t) {
    const tq = q(t), pz = E.inOut3(prog(tq, T_TTL, T_TTL + 0.42)), z = lerp(1, 1.42, pz) * (1 + 0.012 * Math.max(0, tq - 9.5)), cy = BOOK.y - 140;
    await zoomAbout(ctx, z, BOOK.x, cy, async () => { await drawBg(ctx, 'book'); await bookCover(ctx, BOOK.x, cy, 900, 600); });
    // the type sits on the pushed-in cover in screen space (stays crisp)
    await X.title(ctx, COPY.title, W / 2, 380, tq, T_TTL + 1 / 12, { size: TTL.size, font: COPY.titleFont, zoom: 0.02 });
    if (tq >= 9.5) await X.tag(ctx, W / 2, 560, COPY.role, { t: tq, t0: 9.5, color: 'white', font: 'sans', size: 48, rot: -0.015, tape: false });
    if (tq >= 9.75) await X.tag(ctx, W / 2 + 470, 230, COPY.cook, { t: tq, t0: 9.75, color: 'yellow', font: 'sans', size: 40, rot: 0.08, tape: 'top' });
    if (tq >= T_CLICK) await X.confetti(ctx, t, T_CLICK, { x: SUB.x, y: BTN_Y - 20, n: 22, speed: 1200, spread: Math.PI * 1.1, gravity: 1300, dur: 0.95, seed: 28 });
    if (tq >= T_TALK) await X.subscribe(ctx, SUB.x, BTN_Y, tq, { h: SUB.h, slap: T_TALK, tClick: T_CLICK, bell: false, labels: SUBL });
    if (tq >= 10.5) await X.tag(ctx, W / 2, 1010, COPY.url, { t: tq, t0: 10.5, color: 'ink', font: 'mono', size: 38, rot: 0.015, tape: false });
    if (tq >= 10.25 + 2 / 12) { // cursor curves in from the right, clicks the right end of the button, leaves up-right
      const click = t >= T_CLICK && t < T_CLICK + 2 / 24 ? 1 : 0, al = prog(tq, 10.25 + 2 / 12, T_CLICK - 1 / 12), c2 = prog(tq, T_CLICK + 2 / 12, 11.4);
      let x = lerp(W + 90, SUB.x + 150, E.out3(al)), y = lerp(620, BTN_Y - 20, al * al); x = lerp(x, 1640, c2 * c2); y = lerp(y, 640, E.out3(c2));
      await X.cursor(ctx, x, y, t, { size: 110, click, rot: -0.3 });
    }
  }

  /* ======================================================================= timeline */
  const cuts = [];
  const Cut = (t0, t1, draw) => cuts.push({ t0, t1, draw: async (ctx, t, k, lt) => {
    await warm();
    const z = K.punch(q(t)); ctx.fillStyle = '#FBF8F1'; ctx.fillRect(0, 0, W, H);
    await zoomAbout(ctx, z, W / 2, H / 2, () => draw(ctx, t, k, lt));
  } });
  Cut(0.0, 1.0, (ctx, t) => openScene(ctx, t));
  Cut(1.0, 2.0, async (ctx, t) => { // page rips from the centre (3 drawings) onto the agent world
    await agentScene(ctx, t);
    const i = drawingIdx(t, 1.0);
    if (i < 3) { const A = padBuf('ripA'); await openScene(A.getContext('2d'), t); ripDraw(ctx, [0.05, 0.36, 0.8][i], A); await X.confetti(ctx, t, 1.0, { x: W / 2, y: H / 2, n: 30, speed: 1500, spread: Math.PI * 2, gravity: 900, dur: 0.6, seed: 20, colors: [C.paper, C.paper, C.red, C.sun] }); }
  });
  Cut(2.0, 3.0, (ctx, t) => wipe(ctx, t, 2.0, (c) => agentScene(c, t), (c) => skillScene(c, t), { from: [1, 0], edges: [0, 0, 0, 1], seed: 4, push: 0.22, roll: -8, speed: { n: 10, angle: Math.PI, speed: 3600, alpha: 0.9, seed: 41 } }));
  Cut(3.0, 4.0, (ctx, t) => wipe(ctx, t, 3.0, (c) => skillScene(c, t), (c) => autoScene(c, t), { from: [0, 1], edges: [1, 0, 0, 0], seed: 7, push: 0.22, roll: 6, speed: { n: 10, angle: -Math.PI / 2, speed: 3600, alpha: 0.9, seed: 42 } }));
  Cut(4.0, 6.5, (ctx, t) => creativeScene(ctx, t));
  Cut(6.5, 9.0, (ctx, t) => wipe(ctx, t, 6.5, (c) => creativeScene(c, t, { noTag: true }), (c) => bookScene(c, t), { from: [-1, 0], edges: [0, 1, 0, 0], seed: 9, push: 0.22, roll: 8, speed: { n: 10, angle: 0, speed: 3600, alpha: 0.9, seed: 43 } }));
  Cut(9.0, 12.0, (ctx, t) => coverScene(ctx, t));

  window.SCENES = { duration: 12.0, cuts, overlay: async (ctx, t) => { CL.printGrain(ctx, t, 0.05); } };
  window.COPY = COPY;
})();
