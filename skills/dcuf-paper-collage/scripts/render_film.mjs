// usage: node tools/render_film.mjs <draft|final> [audio.m4a|wav] [out.mp4] [index.html] [--format 16x9|9x16]   (cross-platform twin of render_film.sh)
//   --format 9x16 renders the same project vertically (passes ?format=9x16 to the page; film.config.js picks the layout).
//   draft: JPEG frames, 4 browsers, 20 Mbps — about 30 s for 30 s of film.  final: PNG frames, 6 browsers, 30 Mbps.
//   audio defaults to audio/score.m4a, else audio/score.wav (mux.mjs encodes WAV to AAC). Encodes with ffmpeg (encode.mjs, mux.mjs).
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), P = dirname(HERE), NODE = process.execPath;
const ARGV = process.argv.slice(2), fi = ARGV.indexOf('--format'), FORMAT = fi >= 0 ? ARGV.splice(fi, 2)[1] : '16x9', VERT = FORMAT === '9x16', SFX = VERT ? '_9x16' : '';
const [MODE = 'draft', audArg, outArg, pageArg] = ARGV;
const AUD = audArg ? resolve(audArg) : [join(P, 'audio/score.m4a'), join(P, 'audio/score.wav')].find(existsSync) || join(P, 'audio/score.m4a');
const OUT = outArg ? resolve(outArg) : join(P, `${basename(P)}_${MODE}${SFX}.mp4`);
const PAGE = pageArg ? resolve(pageArg) : join(P, 'comp/index.html');
const FINAL = MODE === 'final';
const FR = join(P, `.frames_${MODE}${SFX}`); rmSync(FR, { recursive: true, force: true }); mkdirSync(FR, { recursive: true });
spawnSync(NODE, [join(HERE, 'clips_js.mjs')], { stdio: 'ignore' });
const durOf = (f) => existsSync(f) && (readFileSync(f, 'utf8').match(/duration\s*:\s*([0-9.]+)/) || [])[1];   // film.config.js (new template) or scenes.js (older projects)
const DUR = +(durOf(join(P, 'comp/film.config.js')) || durOf(join(P, 'comp/scenes.js')) || 30);
const QUERY = VERT ? ['--query', 'format=9x16'] : [];
const N = FINAL ? 6 : 4, EXT = FINAL ? [] : ['--jpg'], MB = FINAL ? 30 : 20;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (args, logFile, flags = 'w') => new Promise((res) => {
  const log = createWriteStream(logFile, { flags }); const c = spawn(NODE, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  c.stdout.pipe(log); c.stderr.pipe(log); c.on('close', (code) => log.end(() => res(code)));
});
const T0 = Date.now(); const jobs = [];
for (let i = 0; i < N; i++) {
  const A = Math.round(DUR * i / N * 1e4) / 1e4, B = Math.round(DUR * (i + 1) / N * 1e4) / 1e4;
  jobs.push(run([join(HERE, 'capture.mjs'), PAGE, FR, '--from', String(A), '--to', String(B), ...EXT, ...QUERY], `${FR}.log${i}`));
  await sleep(1500);
}
await Promise.all(jobs);
// verify every frame exists; re-capture missing runs one by one (a worker can fail to start under load)
const TOTAL = Math.round(DUR * 24);
for (let pass = 1; pass <= 3; pass++) {
  const have = new Set(readdirSync(FR).filter((f) => f.startsWith('f_')).map((f) => parseInt(f.slice(2, 7), 10)));
  const runs = [];
  for (let i = 0; i < TOTAL; i++) if (!have.has(i)) { if (runs.length && i === runs.at(-1)[1] + 1) runs.at(-1)[1] = i; else runs.push([i, i]); }
  if (!runs.length) break;
  console.log(`pass ${pass}: re-capturing ${runs.map(([a, b]) => `${(a / 24).toFixed(4)}:${((b + 1) / 24).toFixed(4)}`).join(' ')}`);
  for (const [a, b] of runs) await run([join(HERE, 'capture.mjs'), PAGE, FR, '--from', (a / 24).toFixed(4), '--to', ((b + 1) / 24).toFixed(4), ...EXT, ...QUERY], `${FR}.retry`, 'a');
}
const CNT = readdirSync(FR).length;
console.log(`captured ${CNT}/${TOTAL} frames in ${Math.round((Date.now() - T0) / 1000)}s`);
const logs = readdirSync(P).filter((f) => f.startsWith(`.frames_${MODE}${SFX}.log`) || f === `.frames_${MODE}${SFX}.retry`).map((f) => join(P, f));
const exc = logs.flatMap((f) => readFileSync(f, 'utf8').split('\n').filter((l) => l.includes('EXC'))).slice(0, 3); if (exc.length) console.log(exc.join('\n'));
if (CNT < TOTAL) { console.log(`missing frames — see logs in ${FR}.log*`); process.exit(1); }
const SILENT = join(P, '.silent.mp4');
if (spawnSync(NODE, [join(HERE, 'encode.mjs'), FR, '24', SILENT, String(MB)], { stdio: ['ignore', 'ignore', 'inherit'] }).status !== 0) { console.log('encode failed'); process.exit(1); }
if (existsSync(AUD)) {
  if (spawnSync(NODE, [join(HERE, 'mux.mjs'), SILENT, AUD, OUT], { stdio: ['ignore', 'ignore', 'inherit'] }).status !== 0) { console.log('mux failed'); process.exit(1); }
  rmSync(SILENT, { force: true });
} else { rmSync(OUT, { force: true }); renameSync(SILENT, OUT); console.log(`(no audio found at ${AUD} — silent render)`); }
spawnSync(NODE, [join(HERE, 'strip.mjs'), FR, join(P, `review/strip_${MODE}${SFX}.png`), '1'], { stdio: 'ignore', env: Object.assign({}, process.env, VERT ? { SHEET_PORTRAIT: '1' } : {}) });
for (const f of logs) rmSync(f, { force: true });
console.log(OUT);
