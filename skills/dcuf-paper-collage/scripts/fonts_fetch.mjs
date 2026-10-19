// fonts_fetch.mjs: download Google Fonts into comp/fonts/ (woff2 + fonts.css) so the film renders offline and every Vietnamese glyph
// comes from the real face (no on-the-fly subset loading, no silent fallback). Keeps the vietnamese, latin and latin-ext subsets.
//
//   node tools/fonts_fetch.mjs                          # (re)download everything listed in comp/fonts/fonts.json
//   node tools/fonts_fetch.mjs "Nunito:900" "Playfair Display:italic 900" "Fraunces:ital,opsz,wght@1,144,900"
//                                                        # add fonts (shorthand "Family:weight" / "Family:italic weight", or the css2 form)
//   node tools/fonts_fetch.mjs --check "Chewy"           # does it have Vietnamese? (no download)
//
// A font without the vietnamese subset is still added (latin only) but flagged: don't use it for Vietnamese words (logoFont, titleFont).
// Then: add the face to comp/film.js fonts() (e.g. '900 96px "Nunito"') and use it in comp/film.config.js. Fonts are OFL / Apache: fine to ship.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const P = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR = process.env.FONTS_DIR || join(P, 'comp/fonts'), MAN = join(DIR, 'fonts.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const KEEP = new Set(['vietnamese', 'latin', 'latin-ext']);

// "Nunito:900" → "Nunito:wght@900"; "Playfair Display:italic 900" → "Playfair Display:ital,wght@1,900"; css2 forms pass through
function css2(spec) {
  const [fam, w] = spec.split(':'); if (!w) return fam;
  if (w.includes('@')) return spec;
  const m = w.trim().match(/^(italic\s+)?(\d{3})$/); if (!m) return spec;
  return m[1] ? `${fam}:ital,wght@1,${m[2]}` : `${fam}:wght@${m[2]}`;
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function faces(spec) {
  const url = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(spec).replace(/%20/g, '+').replace(/%3A/g, ':').replace(/%2C/g, ',').replace(/%40/g, '@').replace(/%3B/g, ';') + '&display=swap';
  const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(`${spec}: HTTP ${r.status} (family name or weight wrong?)`);
  const css = await r.text(), out = [];
  for (const m of css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]+)\}/g)) {
    const body = m[2], get = (k) => (body.match(new RegExp(k + ':\\s*([^;]+);')) || [])[1]?.trim();
    out.push({ subset: m[1], family: get('font-family').replace(/['"]/g, ''), style: get('font-style'), weight: get('font-weight'), src: (body.match(/url\(([^)]+)\)/) || [])[1], range: get('unicode-range') });
  }
  return out;
}

const args = process.argv.slice(2);
if (args[0] === '--check') {
  for (const f of args.slice(1)) { const fs = await faces(css2(f)); console.log(fs.some((x) => x.subset === 'vietnamese') ? `✓ ${f}: có tiếng Việt` : `✗ ${f}: KHÔNG có tiếng Việt (chỉ ${[...new Set(fs.map((x) => x.subset))].join(', ')})`); }
} else {
  mkdirSync(DIR, { recursive: true });
  const man = existsSync(MAN) ? JSON.parse(readFileSync(MAN, 'utf8')) : { families: [] };
  for (const a of args) { const s = css2(a); if (!man.families.includes(s)) man.families.push(s); }
  const blocks = [], noVN = [];
  for (const spec of man.families) {
    const fs = await faces(spec), hasVN = fs.some((x) => x.subset === 'vietnamese');
    if (!hasVN) noVN.push(spec.split(':')[0]);
    for (const f of fs.filter((x) => KEEP.has(x.subset))) {
      const file = `${slug(f.family)}-${f.style}-${f.weight.replace(/\s+/g, '_')}-${f.subset}.woff2`;
      if (!existsSync(join(DIR, file))) { const r = await fetch(f.src, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`); writeFileSync(join(DIR, file), Buffer.from(await r.arrayBuffer())); }
      blocks.push(`/* ${f.family} ${f.style} ${f.weight} · ${f.subset} */\n@font-face { font-family: '${f.family}'; font-style: ${f.style}; font-weight: ${f.weight}; font-display: block; src: url('${file}') format('woff2'); unicode-range: ${f.range}; }`);
    }
    console.log(`${hasVN ? '✓' : '✗ no Vietnamese:'} ${spec}`);
  }
  writeFileSync(join(DIR, 'fonts.css'), `/* fonts.css: written by tools/fonts_fetch.mjs from fonts.json (Google Fonts, OFL / Apache). Do not edit by hand. */\n${blocks.join('\n')}\n`);
  writeFileSync(MAN, JSON.stringify(man, null, 2) + '\n');
  console.log(`\n${man.families.length} families → ${join(DIR, 'fonts.css')}`);
  if (noVN.length) console.log(`No Vietnamese (Latin decoration only, never for Vietnamese words): ${noVN.join(', ')}`);
}
