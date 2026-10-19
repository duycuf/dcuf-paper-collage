// usage: node tools/font_sheet.mjs "LINE1|LINE2" ["Family:weight|Family|..."] [palette]   (cross-platform twin of font_sheet.sh)
// Renders the title in each font with the real CLX.title treatment (paper border + extrusion) → review/title_fonts_sheet.png, numbered.
// Graded with the palette set in comp/film.config.js (palette:), so the fonts are judged in the film's colours; pass "orig" for the original colours.
// Families must be in comp/font_sheet.html's <link>; after the user picks, add the family to comp/index.html + film.js and set titleFont in comp/film.config.js.
// Vietnamese titles: pass VN-safe faces, e.g. "Be Vietnam Pro:900|Playfair Display:italic 900|Yeseva One|Lobster|Unbounded:900|Lexend:800|Baloo 2:800|Fraunces:italic 900".
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), P = dirname(HERE), NODE = process.execPath;
const [L = 'TIÊU ĐỀ|THẬT ĐẸP.', F = 'Be Vietnam Pro:900|Playfair Display:italic 900|Yeseva One|Lobster|Unbounded:900|Lexend:800|Baloo 2:800|Fraunces:italic 900', palArg] = process.argv.slice(2);   // default fonts all have Vietnamese glyphs
const fonts = F.split('|'); const TS = fonts.map((_, i) => i + 0.5).join(',');
const cfg = (f, re) => { try { return readFileSync(join(P, f), 'utf8').match(re)?.[1]; } catch { return undefined; } };
const PAL = palArg ?? (cfg('comp/film.config.js', /^\s*palette: *'([A-Za-z0-9_]*)'/m) || cfg('comp/index.html', /window\.PALETTE *= *'([A-Za-z0-9_]*)'/) || '');
const Q = new URLSearchParams({ lines: L, fonts: F, pal: PAL || 'orig' }).toString();
const D = join(P, 'review/title_fonts'); rmSync(D, { recursive: true, force: true });
const r = spawnSync(NODE, [join(HERE, 'capture.mjs'), join(P, 'comp/font_sheet.html'), D, '--stills', TS, '--query', Q], { stdio: ['ignore', 'ignore', 'inherit'] });
if (r.status !== 0) { console.error('capture failed'); process.exit(1); }
const stills = readdirSync(D).filter((f) => /^still_.*\.png$/.test(f)).sort((a, b) => parseFloat(a.slice(6)) - parseFloat(b.slice(6)));
const items = stills.map((f, i) => `${join(D, f)}|${i + 1} ${fonts[i]}`);
const OUT = join(P, 'review/title_fonts_sheet.png');
if (spawnSync(NODE, [join(HERE, 'sheet.mjs'), OUT, '2', '900', ...items], { stdio: 'ignore' }).status !== 0) { console.error('sheet failed'); process.exit(1); }
console.log(OUT);
