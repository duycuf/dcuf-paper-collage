// Encode audio (score.wav, a cut track …) to AAC .m4a with ffmpeg — the cross-platform stand-in for
// `afconvert -f m4af -d aac -b 256000 in.wav out.m4a`.
// usage: node aac.mjs <in.wav> <out.m4a> [kbps=256]
// Picks the platform AAC encoder when ffmpeg has it (aac_at on macOS, aac_mf on Windows): ffmpeg's built-in `aac`
// overshoots the score's peak by ~1.5 dB (−2.2 → −0.7 dBFS), aac_mf stays at about −1.8 dBFS like afconvert.
// aac_mf writes whole 1024-sample frames (10 s → 10.005 s), so the last packet is shortened back to the input length.
import { spawnSync } from 'node:child_process';
import { renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const [inArg, outArg, kbps = '256'] = process.argv.slice(2);
if (!outArg) { console.error('usage: aac <in> <out.m4a> [kbps]'); process.exit(2); }
const FF = process.env.FFMPEG || 'ffmpeg', FP = process.env.FFPROBE || 'ffprobe';
const enc = spawnSync(FF, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
if (enc.status !== 0) { console.error('ffmpeg not found on PATH (Windows: winget install Gyan.FFmpeg; or set FFMPEG=/path/to/ffmpeg)'); process.exit(1); }
const codec = ['aac_at', 'aac_mf'].find((c) => new RegExp(`^ A\\S* ${c} `, 'm').test(enc.stdout)) || 'aac';
const src = resolve(inArg), out = resolve(outArg), tmp = out + '.tmp.m4a';
const r = spawnSync(FF, ['-v', 'error', '-y', '-i', src, '-c:a', codec, '-b:a', `${kbps}k`, '-ar', '48000', tmp], { stdio: ['ignore', 'inherit', 'inherit'] });
if (r.status !== 0) { rmSync(tmp, { force: true }); console.error(`ffmpeg ${codec} failed`); process.exit(1); }
const probe = (f, entry) => (spawnSync(FP, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', entry, '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout || '').trim().split('\n')[0];
const want = parseFloat(probe(src, 'stream=duration')) || parseFloat(probe(src, 'format=duration'));
const [k, last] = trimPlan(tmp, want);
if (k) {
  const t = spawnSync(FF, ['-v', 'error', '-y', '-i', tmp, '-map', '0:a:0', '-c', 'copy', '-frames:a', String(k), '-bsf:a', `setts=duration='if(eq(N,${k - 1}),${last},DURATION)'`, out], { stdio: ['ignore', 'inherit', 'inherit'] });
  rmSync(tmp, { force: true }); if (t.status !== 0) { console.error('trim failed'); process.exit(1); }
} else { rmSync(out, { force: true }); renameSync(tmp, out); }
console.log(`wrote ${out} (${codec} ${kbps} kb/s, ${probe(out, 'stream=duration')} s)`);

// packets to keep + duration of the last one (in 1/sample_rate ticks) so the stream ends at `sec`; [0] when nothing to trim
function trimPlan(f, sec) {
  const sr = parseInt(probe(f, 'stream=sample_rate')), have = parseFloat(probe(f, 'stream=duration'));
  if (!sr || !sec || !have || have - sec < 0.5 / sr || probe(f, 'stream=time_base') !== `1/${sr}`) return [0];
  const pts0 = (spawnSync(FP, ['-v', 'error', '-select_streams', 'a:0', '-read_intervals', '%+#1', '-show_entries', 'packet=pts', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout || '').trim();
  if (pts0 !== '0') return [0];   // encoder priming (negative first pts): leave it to the muxer's edit list
  const n = Math.round(sec * sr), keep = Math.ceil(n / 1024);
  return [keep, n - (keep - 1) * 1024];
}
