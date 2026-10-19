// usage: node tools/strip.mjs <frames_dir> <out.png> [every_seconds=1]   (cross-platform twin of strip.sh)
// Contact sheet of one frame per N seconds (24 fps frames f_00000.*). Thumbnails via ffmpeg when present (else full frames).
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), P = dirname(HERE);
const [frArg, outArg, evArg] = process.argv.slice(2);
if (!outArg) { console.log('usage: strip.mjs <frames_dir> <out.png> [every_seconds=1]'); process.exit(2); }
const FR = resolve(frArg), OUT = resolve(outArg), EV = parseFloat(evArg || '1');
const TH = join(P, 'review/.strip_th'); rmSync(TH, { recursive: true, force: true }); mkdirSync(TH, { recursive: true });
const FF = process.env.FFMPEG || 'ffmpeg', hasFF = spawnSync(FF, ['-version'], { stdio: 'ignore' }).status === 0;
const files = readdirSync(FR).sort(), N = files.length, STEP = Math.max(1, Math.round(EV * 24)); const args = [];
for (let n = Math.floor(STEP / 2); n < N; n += STEP) {
  let img = join(FR, files[n]);
  if (hasFF) { const th = join(TH, `${n}.jpg`); if (spawnSync(FF, ['-v', 'error', '-y', '-i', img, '-vf', "scale='min(400,iw)':-2", '-q:v', '3', th]).status === 0) img = th; }
  args.push(`${img}|${(n / 24).toFixed(1)}s`);
}
const r = spawnSync(process.execPath, [join(HERE, 'sheet.mjs'), OUT, '6', '320', ...args], { stdio: 'ignore' });
if (r.status !== 0) { console.error('sheet.mjs failed'); process.exit(1); }
console.log(OUT);
