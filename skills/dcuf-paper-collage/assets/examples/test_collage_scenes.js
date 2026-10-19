/* test_collage_scenes.js — 6 s test reel for collage.js (CL). Loaded by test_collage.html instead of scenes.js. */
(function () {
  'use strict';
  const { W, H, prog, E, lerp } = ENG;
  const PERF = (window.__perf = []);
  const timed = (fn) => async (ctx, t, k, lt) => { const t0 = performance.now(); await fn(ctx, t, k, lt); try { ctx.getImageData(0, 0, 1, 1); } catch (e) { console.log('tainted'); } const ms = performance.now() - t0; PERF.push([t, ms]); console.log('perf t=' + t.toFixed(2) + ' ms=' + ms.toFixed(0)); };

  // 0.0–1.2 · PAGE: slow push, camera drops in at .25, stickers slap at .6/.75/.9
  const pageCut = async (ctx, t, k, lt) => {
    const cam = { zoom: 1 + 0.025 * lt, y: -6 * lt };
    await CL.page(ctx, t, {
      cam,
      insert: {
        3: async (c) => { // behind the foreground, in front of mid grass
          const d = CL.drop(t, 0.25, { h: 1000, tilt: 8 });
          await CL.sprite(c, 'cam_side', 960, 905 + d.dy, { h: 560, ax: 0.5, ay: 1, rot: d.rot, sx: d.sx, sy: d.sy, boil: d.k >= 1 ? 0.6 : 0, t, shadow: { dx: 10, dy: 14, blur: 16, alpha: 0.4 } });
        },
        4: async (c) => {
          const st = [['car', 470, 760, 230, 0.6, -10], ['helmet', 1460, 760, 220, 0.75, 8], ['clap', 1300, 330, 190, 0.9, -6]];
          for (const [n, x, y, h, t0, rot] of st) {
            const s = CL.slap(t, t0, { rot0: rot > 0 ? 9 : -9 }); if (!s.on) continue;
            const b = CL.bob(t, x, 3);
            await CL.sprite(c, n, x + b.dx, y + b.dy, { h: h * s.s, rot: rot + s.rot + b.rot, shadow: { dx: 8 * s.shadow, dy: 12 * s.shadow, blur: 12 * s.shadow, alpha: 0.38 } });
          }
        },
      },
    });
  };

  // 1.2–2.2 · DIAG: race car through sliding bands
  const diagCut = async (ctx, t, k, lt) => {
    await CL.diag(ctx, t, { angle: -24, speed: 1300, mid: async (c) => {
      const b = CL.bob(t, 3, 4);
      c.save(); c.translate(W / 2, H / 2); c.rotate(-24 * Math.PI / 180);
      await CL.sprite(c, 'car', -60 + lt * 60 + b.dx, 20 + b.dy, { h: 300, rot: b.rot, shadow: { dx: 26, dy: 34, blur: 18, alpha: 0.38 } });
      c.restore();
    } });
  };

  // 2.2–3.2 · POSTERS: phone drops onto the poster wall
  const postersCut = async (ctx, t, k, lt) => {
    await CL.posters(ctx, t, { drift: 14, cam: { zoom: 1.04 - 0.03 * k } });
    const d = CL.drop(t, 2.35, { h: 900, tilt: -6 });
    await CL.sprite(ctx, 'phone', 960, 820 + d.dy, { h: 470, ay: 1, rot: d.rot - 4, sx: d.sx, sy: d.sy, boil: 0.5, t, shadow: { dx: 14, dy: 20, blur: 18, alpha: 0.45 } });
  };

  // 3.2–4.2 · CLOUDSKY: biplane flies at us
  const cloudCut = async (ctx, t, k, lt) => {
    await CL.cloudsky(ctx, t, { fly: k, mid: async (c) => {
      const p = CL.fly(t, 3.2, 4.2, { from: { x: 1100, y: 420, s: 0.18 }, to: { x: 760, y: 700, s: 1.6 }, ease: (v) => v });
      await CL.sprite(c, 'plane_front', p.x, p.y, { h: 560 * p.s, rot: -4 + 6 * p.k, boil: 0.6, t, shadow: { dx: 20 * p.s, dy: 60 * p.s, blur: 20, alpha: 0.25 } });
    } });
  };

  // 4.2–5.2 · DESK: laptop drops, gear pops in on beats
  const deskCut = async (ctx, t, k, lt) => {
    await CL.desk(ctx, t, { cam: { zoom: 1.02 - 0.02 * k }, insert: { 0: async (c) => {
      const d = CL.drop(t, 4.25, { h: 900, tilt: 5 });
      await CL.sprite(c, 'laptop', 965, 870 + d.dy, { h: 560, ay: 1, rot: d.rot, sx: d.sx, sy: d.sy, shadow: { dx: 12, dy: 18, blur: 18, alpha: 0.42 } });
      const gear = [['headphones', 300, 300, 330, 4.5, -14], ['midi', 1600, 260, 260, 4.58, 10], ['phone_gimbal', 1620, 760, 360, 4.67, 8], ['cassette', 330, 860, 220, 4.75, -9]];
      for (const [n, x, y, h, t0, rot] of gear) {
        const s = CL.slap(t, t0); if (!s.on) continue; const b = CL.bob(t, x, 3);
        await CL.sprite(c, n, x + b.dx, y + b.dy, { h: h * s.s, rot: rot + s.rot + b.rot, shadow: { dx: 8 * s.shadow, dy: 12 * s.shadow, blur: 12 * s.shadow, alpha: 0.4 } });
      }
    } } });
  };

  // 5.2–6.0 · SKY: tilt up through paper cloud strips
  const skyCut = async (ctx, t, k, lt) => { await CL.sky(ctx, t, { tilt: E.inOut3(k) }); };

  window.SCENES = {
    duration: 6.0,
    cuts: [
      { t0: 0.0, t1: 1.2, draw: timed(pageCut) },
      { t0: 1.2, t1: 2.2, draw: timed(diagCut) },
      { t0: 2.2, t1: 3.2, draw: timed(postersCut) },
      { t0: 3.2, t1: 4.2, draw: timed(cloudCut) },
      { t0: 4.2, t1: 5.2, draw: timed(deskCut) },
      { t0: 5.2, t1: 6.0, draw: timed(skyCut) },
    ],
    overlay: async (ctx, t) => { CL.printGrain(ctx, t, 0.05); },
  };
})();
