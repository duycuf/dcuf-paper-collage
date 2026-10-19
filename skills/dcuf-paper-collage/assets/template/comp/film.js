/* film.js — timeline runtime (load last). scenes.js sets window.SCENES = { duration, cuts: [{t0, t1, draw: async (ctx, t, k, lt) => {}}], overlay }.
 * k = local progress 0..1, lt = local seconds. Overlays (copy, labels, flashes, grain) are drawn after the cut.
 */
(function () {
  'use strict';
  const { W, H } = ENG;
  const cv = document.getElementById('c'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const FPS = 24, DUR = (window.SCENES && window.SCENES.duration) || 30.0;
  window.__comp = { width: W, height: H, fps: FPS, duration: DUR };
  let fontsReady = null;
  // load with Latin + Vietnamese sample text: Google serves Vietnamese glyphs as a separate unicode-range file that a plain load() never fetches
  const SAMPLE = 'Aa Đđ ăâêôơư ạảãáàằẳẵắặậẩẫấầẹẻẽéèệểễếềịỉĩíìọỏõóòộổỗốồợởỡớờụủũúùựửữứừỵỷỹýỳ ✦✓';
  async function fonts() {
    if (!fontsReady) fontsReady = Promise.all([
      '600 96px "Inter Tight"', '700 96px "Inter Tight"', '500 96px "Inter Tight"', '800 96px "Inter Tight"',
      'italic 400 96px "Instrument Serif"', '400 96px "Instrument Serif"', '500 22px "JetBrains Mono"', '700 22px "JetBrains Mono"', '400 96px "Ultra"', '900 96px "Cinzel"', 'italic 900 96px "Fraunces"', '400 96px "Rubik Spray Paint"', '400 96px "Lilita One"', '400 22px "Libre Caslon Text"', '400 96px "Permanent Marker"', '400 96px "Alfa Slab One"', '400 96px "Bevan"', '400 96px "Abril Fatface"', '400 96px "Anton"', '400 96px "Bungee"', '400 96px "Chewy"', '900 96px "Gluten"', '700 96px "Gluten"', '400 96px "Special Elite"', '900 96px "Rubik"', '800 96px "Rubik"', '900 96px "Inter Tight"',
      '900 96px "Be Vietnam Pro"', 'italic 900 96px "Playfair Display"', '400 96px "Lobster"', '800 96px "Baloo 2"', '400 96px "Yeseva One"', '900 96px "Unbounded"', '800 96px "Lexend"',
    ].map((f) => document.fonts.load(f, SAMPLE))).then(() => document.fonts.ready);
    return fontsReady;
  }
  window.__seek = async (t) => {
    await fonts();
    const S = window.SCENES; t = Math.min(Math.max(t, 0), DUR - 1e-6);
    const cut = S.cuts.find((c) => t >= c.t0 && t < c.t1) || S.cuts[S.cuts.length - 1];
    ctx.save(); ctx.clearRect(0, 0, W, H);
    await cut.draw(ctx, t, (t - cut.t0) / (cut.t1 - cut.t0), t - cut.t0, cut);
    ctx.restore();
    if (S.overlay) { ctx.save(); await S.overlay(ctx, t, cut); ctx.restore(); }
  };
})();
