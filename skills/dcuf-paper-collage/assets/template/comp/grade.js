/* grade.js — palette remap as the very last pass of every frame (load after scenes.js, before film.js).
 * Each anchor colour of the original collage palette is moved to the same role in the chosen palette; texture,
 * halftone, shading and grain ride along because the shift is an offset blended by distance (RBF in RGB).
 * Bake a palette into renders with window.PALETTE = '<name>' in index.html; preview others with ?pal=<name> (?pal=orig = original colours).
 */
(function () {
  'use strict';
  // roles of the original palette (collage.js C / collage_fx.js PAL + sampled scene colours)
  const SRC = {
    sky: '#5BD3F3', skyL: '#BDEBFA', skyD: '#2DB8EE', skyDD: '#1186CC',
    red: '#E5231E', verm: '#E64A2C', yellow: '#FFC21A', mustard: '#E9A21B', orange: '#F07A2E',
    cobalt: '#1660DA', navy: '#1B2A6B', pink: '#F8B9C6', hotpink: '#F27BB0',
    olive: '#8DB33A', lime: '#C8D84A', grass: '#B9C23C', earth: '#3A2A1E',
    paper: '#FBF8F1', news: '#D9D6CF', ink: '#141414',
    purple: '#A93BB0', cyan: '#41D3E6', mint: '#46DA6E',   // logo flash letters (collage_fx LETTERS): roles so brand palettes can map them
  };
  // target palettes: only roles that change need listing (missing = keep)
  const PALS = {
    candy: { // pastel candy: baby blue, bubblegum, butter, lilac, mint
      sky: '#A9DBF7', skyL: '#E4F4FD', skyD: '#86C8F0', skyDD: '#6AB2E6',
      red: '#FF7EB0', verm: '#FF8FB8', yellow: '#FFE38A', mustard: '#F9CF7A', orange: '#FFB08A',
      cobalt: '#9D8CF2', navy: '#5A4BB6', pink: '#FFCADF', hotpink: '#FF9CC6',
      olive: '#8FD9AE', lime: '#C7F0D6', grass: '#A8E3BF', earth: '#7A5C8C',
    },
    brand: { // white paper + hot pink + ink (the channel's earlier intro colours)
      sky: '#FFE1EE', skyL: '#FFF4F9', skyD: '#FFC4DD', skyDD: '#FFA6CB',
      red: '#FF3D8B', verm: '#FF5C9D', yellow: '#FFFFFF', mustard: '#FFD3E6', orange: '#FF7FB2',
      cobalt: '#141414', navy: '#141414', pink: '#FFC2DA', hotpink: '#FF3D8B',
      olive: '#F2B8D0', lime: '#FBE1EC', grass: '#F6C9DC', earth: '#141414',
    },
    vintage: { // muted risograph: cream, tomato, ochre, teal, denim
      sky: '#8FC6C4', skyL: '#DCEAE2', skyD: '#5FA6A8', skyDD: '#3E8790',
      red: '#D6463A', verm: '#DA5A43', yellow: '#E6B24A', mustard: '#C9973D', orange: '#D8733F',
      cobalt: '#2F4D86', navy: '#1F2D4E', pink: '#E8B3A3', hotpink: '#D9817A',
      olive: '#7E8B4C', lime: '#B6B666', grass: '#A3A55A', earth: '#4A3424',
      paper: '#F3EADA', news: '#D8CDBA', ink: '#22201C',
    },
    night: { // dark indigo sky + neon accents
      sky: '#1D1748', skyL: '#33287A', skyD: '#140F36', skyDD: '#0C0924',
      red: '#FF2E86', verm: '#FF4F7E', yellow: '#FFE14D', mustard: '#FFB300', orange: '#FF6A3D',
      cobalt: '#3D7BFF', navy: '#0B0B1E', pink: '#FF9BD0', hotpink: '#FF5FB6',
      olive: '#22C99C', lime: '#B6FF5C', grass: '#3FD9A0', earth: '#120E2A',
    },
    mono: { // black / white / one yellow like the channel thumbnails
      sky: '#ECE8E0', skyL: '#FAF8F4', skyD: '#D8D3C8', skyDD: '#C2BCAF',
      red: '#FFE600', verm: '#FFE600', yellow: '#FFE600', mustard: '#E9D200', orange: '#FFD400',
      cobalt: '#141414', navy: '#141414', pink: '#FFF3A6', hotpink: '#FFE600',
      olive: '#3B3B3B', lime: '#B9B9B9', grass: '#6E6E6E', earth: '#141414',
    },
    sunset: { // warm: apricot sky, coral, plum, cream
      sky: '#FFC9A3', skyL: '#FFE9D6', skyD: '#FFAE85', skyDD: '#F59273',
      red: '#E8435A', verm: '#EE5B5B', yellow: '#FFD36B', mustard: '#F3B04E', orange: '#FF8A5B',
      cobalt: '#6B3FA0', navy: '#3B2357', pink: '#FFC0C7', hotpink: '#F2709A',
      olive: '#C98A5A', lime: '#F2C38E', grass: '#E3A86E', earth: '#4A2738',
    },
  };
  Object.assign(PALS, window.EXTRA_PALS || {});   // comp/palettes.js (written by scripts/brand_palette.mjs): brand, brandVivid, brandDark …
  window.PALETTES = PALS;
  const q = new URLSearchParams(location.search).get('pal');
  const name = q || window.PALETTE;   // ?pal=<name> (stills / palette sheets) wins over window.PALETTE (set in index.html, baked into renders)
  const T = name && PALS[name];
  if (!T || !window.SCENES) return;

  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const keys = Object.keys(SRC), S = keys.map((k) => hex(SRC[k])), D = keys.map((k) => hex(T[k] || SRC[k]));
  const SIG2 = 2 * 46 * 46, W0 = 0.06;      // RBF width; small identity weight for far-away colours
  const N = 64, lut = new Uint8ClampedArray(N * N * N * 3);
  for (let ri = 0; ri < N; ri++) for (let gi = 0; gi < N; gi++) for (let bi = 0; bi < N; bi++) {
    const r = ri * 4 + 2, g = gi * 4 + 2, b = bi * 4 + 2;
    let sw = W0, dr = 0, dg = 0, db = 0;
    for (let i = 0; i < S.length; i++) {
      const s = S[i], e = (r - s[0]) ** 2 + (g - s[1]) ** 2 + (b - s[2]) ** 2, w = Math.exp(-e / SIG2);
      sw += w; dr += w * (D[i][0] - s[0]); dg += w * (D[i][1] - s[1]); db += w * (D[i][2] - s[2]);
    }
    const o = ((ri * N + gi) * N + bi) * 3;
    const lg = g + dg / sw; let lb = b + db / sw;
    if (T.unblue && lb > lg) lb -= (lb - lg) * T.unblue;   // optional per palette: the engine's blues blend between a dark and a light target → mauve; pull blue back to green
    lut[o] = r + dr / sw; lut[o + 1] = lg; lut[o + 2] = lb;
  }
  const ov = window.SCENES.overlay;
  window.SCENES.overlay = async (ctx, t, cut) => {
    if (ov) await ov(ctx, t, cut);
    const cw = ctx.canvas.width, ch = ctx.canvas.height, im = ctx.getImageData(0, 0, cw, ch), p = im.data;
    for (let i = 0; i < p.length; i += 4) {
      const o = (((p[i] >> 2) * N + (p[i + 1] >> 2)) * N + (p[i + 2] >> 2)) * 3;
      p[i] = lut[o]; p[i + 1] = lut[o + 1]; p[i + 2] = lut[o + 2];
    }
    ctx.putImageData(im, 0, 0);
  };
})();
