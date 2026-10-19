// usage: node tools/palette_sheet.mjs [times...] [--pals orig,brand,brandVivid,brandDark] [--format 9x16]   (cross-platform twin of palette_sheet.sh)
// Renders stills of the current film in several palettes at the given times and builds review/palettes_sheet.png (one row per palette).
// Default palettes: the original colours + the project's own (comp/palettes.js, written by brand_palette.mjs) + grade.js's built-ins.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), P = dirname(HERE), NODE = process.execPath;
const A = process.argv.slice(2), flag = (k) => { const i = A.indexOf(k); return i >= 0 ? A.splice(i, 2)[1] : null; };
const pick = flag('--pals'), FORMAT = flag('--format'), VERT = FORMAT === '9x16';
const T = A.length ? A : ['0.75', '3.75', '6.9', '8.75']; const TS = T.join(',');
const keysOf = (file, re) => { if (!existsSync(file)) return []; const m = readFileSync(file, 'utf8').match(re); return m ? [...m[1].matchAll(/^\s+"?(\w+)"?: \{/gm)].map((x) => x[1]) : []; };
const own = keysOf(join(P, 'comp/palettes.js'), /EXTRA_PALS = \{([\s\S]*)\};/), built = keysOf(join(P, 'comp/grade.js'), /const PALS = \{([\s\S]*?)\r?\n  \};/);
const PALS = pick ? pick.split(',') : ['orig', ...own, ...built];
rmSync(join(P, 'review/pal'), { recursive: true, force: true });
await Promise.all(PALS.map((p) => new Promise((res) => spawn(NODE, [join(HERE, 'capture.mjs'), join(P, 'comp/index.html'), join(P, 'review/pal', p), '--stills', TS, '--query', `pal=${p}${VERT ? '&format=9x16' : ''}`], { stdio: 'ignore' }).on('close', res))));
const items = PALS.flatMap((p, i) => T.map((t) => `${join(P, 'review/pal', p, `still_${parseFloat(t).toFixed(2)}.png`)}|${i} ${p} · ${t}`));
const OUT = join(P, 'review/palettes_sheet.png');
if (spawnSync(NODE, [join(HERE, 'sheet.mjs'), OUT, String(T.length), VERT ? '240' : '470', ...items], { stdio: 'ignore', env: Object.assign({}, process.env, VERT ? { SHEET_PORTRAIT: '1' } : {}) }).status !== 0) { console.error('sheet failed'); process.exit(1); }
console.log(`${OUT}  (rows: ${PALS.map((p, i) => `${i} ${p}`).join(' · ')})`);
