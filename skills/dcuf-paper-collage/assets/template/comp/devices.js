/* devices.js — DV: reusable collage devices on top of CL (collage.js) and CLX (collage_fx.js). Load after collage_fx.js, before scenes.js.
 * Every device is a pure function of t (motion on twos via DV.q) and draws in frame pixels of the current format (ENG.W × ENG.H).
 * Written for the dcuf-paper-collage skill (2026-10-19) from the films it was tested on; brand-free: all words / cut-out names come in as arguments.
 *
 *  timing     q(t) · drawingIdx(t, t0)
 *  format     VERT (true when H > W) · ZC (H / 1080) · pick(landValue, vertValue)
 *             landCover(ctx, fn, cx, cy)            draw a 1920×1080-designed background ×ZC about design point (cx, cy) so it covers a 9:16 frame
 *  objects    slap(ctx, t, name, x, y, t0, o)        a cut-out slaps in place (scale from→1 on twos, rotation kick, soft bob); false before t0
 *             flyInto(ctx, t, name, from, to, t0, o) a cut-out flies (accelerating, spinning, shrinking) from {x,y,h} into point {x,y}
 *  words      tag(ctx, t, t0, str, o)               torn paper label with tape (CLX.tag), anchored left by default, sized for the format
 *             bubble(ctx, t, spec)                  torn-paper chat bubble with a tail: {x, y, t0, text, fill, rot, size, seed, tail:'l'|'r'}
 *  sets       cardFan(ctx, t, spec)                 cards fan out of a point: {ox, oy, t0, step, labels[], radius, spread, card:[w,h], seeds}
 *             receipt(ctx, t, spec)                 a printed strip grows out of a slot: {x, y, t0, dur, len, angle, width, seed}
 *             bookSwallow                           see bookScene in assets/examples/chapters_12s_scenes.js (a book swallows the film's objects)
 *  phone      phone(ctx, h, o) · phoneTop(ctx, h)    code-drawn smartphone (no photo, no measuring), anchored bottom-centre at the current origin;
 *             phoneQuad(h)                          its screen corners (TL, TR, BR, BL) in the same local coords → CLX.screen. phoneTop draws the camera pill over the screen
 */
(function () {
  'use strict';
  const { W, H, clamp, lerp, E } = ENG;
  const C = CL.C, X = CLX, DEG = Math.PI / 180;
  const VERT = H > W, ZC = H / 1080;
  const q = (t) => Math.floor(t * 12 + 1e-6) / 12;
  const drawingIdx = (t, t0) => Math.floor((t - t0) * 12 + 1e-6);
  const pick = (land, vert) => (VERT ? vert : land);

  async function landCover(ctx, fn, cx = 620, cy = 540) {
    if (!VERT) { await fn(); return; }
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(ZC, ZC); ctx.translate(-cx, -cy); await fn(); ctx.restore();
  }

  async function slap(ctx, t, name, x, y, t0, o = {}) {
    const tq = q(t), s = CL.slap(tq, t0, { from: o.from ?? 1.35, rot0: o.rot0 ?? ((o.rot || 0) > 0 ? 9 : -9) }); if (!s.on) return false;
    const b = CL.bob(t, x + y, o.bob ?? 2.5);
    await CL.sprite(ctx, name, x + b.dx, y + b.dy, Object.assign({}, o, { rot: (o.rot || 0) + s.rot + b.rot, h: o.h && o.h * s.s, w: o.w && o.w * s.s,
      shadow: o.shadow === false ? false : { dx: 9 * s.shadow, dy: 14 * s.shadow, blur: 14 * s.shadow, alpha: 0.42 } }));
    return true;
  }

  async function flyInto(ctx, t, name, from, to, t0, o = {}) {
    const tq = q(t), dur = o.dur ?? 0.42;
    if (tq < t0) { const b = CL.bob(t, from.x + from.y, 3); await CL.sprite(ctx, name, from.x + b.dx, from.y + b.dy, { h: from.h, rot: (o.rot || 0) + b.rot, shadow: { dx: 7, dy: 11, blur: 12, alpha: 0.38 } }); return; }
    const f = CL.fly(tq, t0, t0 + dur, { from: { x: from.x, y: from.y, s: 1 }, to: { x: to.x, y: to.y, s: o.endScale ?? 0.06 } }); if (!f.on || f.k >= 1) return;
    await CL.sprite(ctx, name, f.x, f.y, { h: from.h * f.s, rot: (o.spin ?? 220) * f.k, shadow: false });
  }

  function tag(ctx, t, t0, str, o = {}) {
    return X.tag(ctx, o.x ?? pick(92, 60), o.y ?? pick(990, 1520), str, Object.assign({ t: q(t), t0, color: 'yellow', font: 'sans', size: pick(46, 56), anchor: 'left', rot: -0.025, tape: 'top' }, o));
  }

  async function bubble(ctx, t, sp) {
    const tq = q(t), rot = sp.rot ?? -3, s = CL.slap(tq, sp.t0, { from: 1.4, rot0: rot > 0 ? 8 : -8 }); if (!s.on) return;
    const fz = sp.size ?? pick(48, 58), font = `800 ${fz}px "Inter Tight"`; ctx.font = font;
    const w = ctx.measureText(sp.text).width + fz * 1.7, h = fz * 2.2, x = sp.x, y = sp.y, fill = sp.fill || C.paper, seed = sp.seed ?? 870, r = sp.tail === 'r';
    ctx.save(); ctx.translate(x, y); ctx.rotate((rot + s.rot) * DEG); ctx.scale(s.s, s.s); ctx.translate(-x, -y);
    await CL.piece(ctx, { band: [x - w / 2, y, x + w / 2, y, h, h], tips: false }, fill, { seed, amp: 7, shadow: { dx: 6, dy: 10, blur: 12, alpha: 0.35 } });
    const ty = y + h * 0.33, tb = y + h * 0.88, tail = r ? [[x + w / 2 - fz * 1.3, ty, 1], [x + w / 2 - fz * 0.2, ty, 1], [x + w / 2 + fz * 0.25, tb, 1]] : [[x - w / 2 + fz * 0.2, ty, 1], [x - w / 2 + fz * 1.3, ty, 1], [x - w / 2 - fz * 0.25, tb, 1]];
    await CL.piece(ctx, { poly: tail }, fill, { seed: seed + 10, amp: 3, shadow: false });
    ctx.font = font; ctx.fillStyle = C.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(sp.text, x, y + 3); ctx.textAlign = 'left';
    ctx.restore();
  }

  async function cardFan(ctx, t, sp) {
    const tq = q(t), n = sp.labels.length, [cw, ch] = sp.card || [220, 300], R0 = sp.radius ?? 560, spread = (sp.spread ?? 120) * DEG;
    for (let i = 0; i < n; i++) {
      const t0 = sp.t0 + i * (sp.step ?? 1 / 12); if (tq < t0) continue;
      const a = -spread / 2 + (n > 1 ? spread * i / (n - 1) : 0), k = E.out3(clamp((tq - t0) / 0.25)), R = R0 * k;
      const x = sp.ox + Math.sin(a) * R * 1.15, y = sp.oy - Math.cos(a) * R * 0.78, s = lerp(0.35, 1, k);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a * 0.8 * k); ctx.scale(s, s);
      await CL.piece(ctx, [-cw / 2, -ch / 2, cw, ch], i % 2 ? C.paper : C.sun, { seed: (sp.seed ?? 900) + i, amp: 6, shadow: { dx: 6, dy: 10, blur: 12, alpha: 0.4 } });
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(0, -ch * 0.1, cw * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.paper; ctx.font = `900 ${cw * 0.29}px "Be Vietnam Pro"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sp.glyph || '✦', 0, -ch * 0.09);
      ctx.fillStyle = C.ink; ctx.font = `800 ${cw * 0.155}px "Inter Tight"`; ctx.fillText(sp.labels[i], 0, ch * 0.31); ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  async function receipt(ctx, t, sp) {
    const tq = q(t); if (tq < sp.t0) return;
    const L = (sp.len ?? 980) * clamp((tq - sp.t0) / (sp.dur ?? 0.75)), a = (sp.angle ?? -55) * DEG; if (L < 30) return;
    await CL.piece(ctx, { band: [sp.x, sp.y, sp.x + Math.cos(a) * L, sp.y + Math.sin(a) * L, sp.width ?? 120, sp.width ?? 120], tips: false }, C.paper,
      { seed: (sp.seed ?? 920) + Math.round(L / 40), amp: 4, news: { alpha: 0.55, angle: sp.angle ?? -55 }, shadow: { dx: 8, dy: 12, blur: 12, alpha: 0.35 } });
  }

  // smartphone drawn in code: hand-cut paper border + dark body; h = full height, anchored bottom-centre (0, 0). o: body colour, seed, shadow
  const phoneW = (h) => h * 0.485;
  function phoneQuad(h) { const w = phoneW(h), sx = w * 0.05, st = h * 0.034, sb = h * 0.03; return [[-w / 2 + sx, -h + st], [w / 2 - sx, -h + st], [w / 2 - sx, -sb], [-w / 2 + sx, -sb]]; }
  async function phone(ctx, h, o = {}) {
    const w = phoneW(h), r = w * 0.15, pad = h * 0.024;
    await CL.piece(ctx, [-w / 2 - pad, -h - pad, w + pad * 2, h + pad * 2], C.paper, { seed: o.seed ?? 640, amp: 5, shadow: o.shadow === false ? false : { dx: 12, dy: 20, blur: 20, alpha: 0.42 } });
    ctx.save(); ctx.fillStyle = o.body || '#1F1B19'; ENG.roundRect(ctx, -w / 2, -h, w, h, r); ctx.fill();
    ctx.fillRect(w / 2 - w * 0.01, -h * 0.8, w * 0.03, h * 0.09); ctx.fillRect(-w / 2 - w * 0.02, -h * 0.82, w * 0.03, h * 0.06);   // side buttons
    const g = ctx.createLinearGradient(-w / 2, -h, w / 2, 0); g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ENG.roundRect(ctx, -w / 2, -h, w, h, r); ctx.fill();
    ctx.restore();
  }
  function phoneTop(ctx, h) { const w = phoneW(h), pw = w * 0.3, ph = h * 0.022; ctx.save(); ctx.fillStyle = '#0D0B0A'; ENG.roundRect(ctx, -pw / 2, -h + h * 0.045, pw, ph, ph / 2); ctx.fill(); ctx.restore(); }

  window.DV = { VERT, ZC, q, drawingIdx, pick, landCover, slap, flyInto, tag, bubble, cardFan, receipt, phone, phoneQuad, phoneTop };
})();
