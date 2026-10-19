// brand_palette.mjs — turn a brand's colours into three collage palettes for comp/grade.js: brand (light paper ground),
// brandVivid (big fields in a contrasting colour) and brandDark (dark ink ground). Writes comp/palettes.js (window.EXTRA_PALS).
//
//   node tools/brand_palette.mjs --primary "#D9542A" [--secondary "#2F7F7A"] [--accent "#E6B45E"] [--green "#7C8656"]
//                                [--ink "#1F1B17"] [--paper "#F5EFE4"] [--prefix brand] [--out comp/palettes.js]
//
//   primary   the brand colour (buttons, logo) → the engine's red roles: strips, title face, CTA
//   secondary the big fields in brandVivid (default: the complement of primary, deep and muted)
//   accent    warm second accent → yellow / mustard roles (default: primary's hue +35°, light)
//   green     leaves / grass roles (default: a muted herb green)
//   ink, paper the brand's text colour and its lightest background (defaults: warm near-black / warm cream)
// Lessons baked in (duycuf.vn tests, 2026-10-19): a cream ground equal to the paper edges flattens the collage → brandVivid / brandDark exist;
// the engine's blues land between a dark and a light target and turn mauve → every palette sets `unblue`.
// Then compare: node tools/palette_sheet.mjs 1.5 4.3 8.3  (or render stills with ?pal=brandVivid) and set palette in comp/film.config.js.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!opt('primary')) { console.log('usage: brand_palette.mjs --primary "#hex" [--secondary "#hex"] [--accent "#hex"] [--green "#hex"] [--ink "#hex"] [--paper "#hex"] [--prefix brand] [--out comp/palettes.js]'); process.exit(2); }

const hex2rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgb2hex = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hsl2rgb([h, s, l]) { h = ((h % 360) + 360) % 360 / 360; if (!s) return [l * 255, l * 255, l * 255];
  const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q2, f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q2 - p) * 6 * t : t < 0.5 ? q2 : t < 2 / 3 ? p + (q2 - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
const H = (hex) => rgb2hsl(hex2rgb(hex)), X = (hsl) => rgb2hex(hsl2rgb(hsl));
const mix = (a, b, k) => rgb2hex(hex2rgb(a).map((v, i) => v + (hex2rgb(b)[i] - v) * k));
const shade = (hex, dl, ds = 0) => { const [h, s, l] = H(hex); return X([h, Math.min(1, Math.max(0, s + ds)), Math.min(1, Math.max(0, l + dl))]); };

const primary = opt('primary'), [ph, ps, pl] = H(primary);
const ink = opt('ink', X([ph, 0.12, 0.1])), paper = opt('paper', X([ph, 0.42, 0.93]));
const secondary = opt('secondary', X([ph + 180, 0.46, 0.34])), accent = opt('accent', X([ph + 35, 0.72, 0.63])), green = opt('green', X([75, 0.22, 0.43]));
const pre = opt('prefix', 'brand'), out = resolve(opt('out', 'comp/palettes.js'));

const common = (p) => ({
  red: p, verm: shade(p, 0.04), yellow: accent, mustard: shade(accent, -0.12), orange: mix(p, accent, 0.45),
  pink: mix(paper, p, 0.22), hotpink: mix(paper, p, 0.6), olive: green, lime: mix(green, paper, 0.45), grass: mix(green, paper, 0.2),
  paper, news: mix(paper, ink, 0.12), ink,
  purple: shade(p, -0.14, 0.05), cyan: mix(secondary, paper, 0.35), mint: mix(green, accent, 0.35),   // logo flash letters
});
const PALS = {
  [pre]: Object.assign(common(primary), { // light paper ground (closest to most brand sites; calm, flatter collage)
    sky: mix(paper, ink, 0.07), skyL: paper, skyD: mix(paper, ink, 0.13), skyDD: mix(paper, ink, 0.24),
    cobalt: mix(ink, paper, 0.08), navy: ink, earth: mix(ink, paper, 0.12), unblue: 1.0 }),
  [pre + 'Vivid']: Object.assign(common(shade(primary, 0.02, 0.08)), { // big fields in the contrasting colour: paper edges and cut-outs pop
    sky: secondary, skyL: mix(secondary, paper, 0.55), skyD: shade(secondary, -0.08), skyDD: shade(secondary, -0.15),
    cobalt: ink, navy: ink, earth: mix(ink, paper, 0.12), olive: shade(green, 0, 0.12), unblue: 0.6 }),
  [pre + 'Dark']: Object.assign(common(shade(primary, 0.03)), { // dark ink ground (the 'night' structure in brand colours)
    sky: mix(ink, paper, 0.06), skyL: mix(ink, paper, 0.14), skyD: shade(ink, -0.03), skyDD: shade(ink, -0.06),
    cobalt: mix(paper, accent, 0.3), navy: shade(ink, -0.04), earth: shade(ink, -0.04), unblue: 1.0 }),
};
const body = `/* palettes.js — written by tools/brand_palette.mjs (${new Date().toISOString().slice(0, 10)}): primary ${primary}, secondary ${secondary}, accent ${accent}, green ${green}, ink ${ink}, paper ${paper}.
 * Merged into grade.js's built-ins. Pick one in comp/film.config.js (palette: '${pre}Vivid'). Re-run the script to change; hand edits are fine too. */
window.EXTRA_PALS = ${JSON.stringify(PALS, null, 2)};
`;
writeFileSync(out, body);
console.log(`wrote ${out}: ${Object.keys(PALS).join(', ')}`);
for (const [k, v] of Object.entries(PALS)) console.log(`  ${k.padEnd(14)} ground ${v.sky}  primary ${v.red}  accent ${v.yellow}  ink ${v.ink}  paper ${v.paper}`);
