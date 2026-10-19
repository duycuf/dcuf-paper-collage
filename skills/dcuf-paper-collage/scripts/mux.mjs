// Mux a video file and an audio file into one MP4 with ffmpeg (cross-platform twin of mux.swift): video copied as is,
// audio copied when it is already AAC (score.m4a) or first encoded to AAC 256 kb/s with aac.mjs (score.wav, mp3 …),
// trimmed to the video duration (the last AAC packet is shortened, so the file is exactly as long as the picture).
// usage: node mux.mjs <video.mp4> <audio.m4a|wav> <out.mp4>
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [vArg, aArg, outArg] = process.argv.slice(2);
if (!outArg) { console.error('usage: mux <video> <audio> <out>'); process.exit(2); }
const FF = process.env.FFMPEG || 'ffmpeg', FP = process.env.FFPROBE || 'ffprobe';
if (spawnSync(FF, ['-version'], { stdio: 'ignore' }).status !== 0) { console.error('ffmpeg not found on PATH (Windows: winget install Gyan.FFmpeg; or set FFMPEG=/path/to/ffmpeg)'); process.exit(1); }
const probe = (f, stream, entry) => (spawnSync(FP, ['-v', 'error', '-select_streams', stream, '-show_entries', entry, '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout || '').trim().split('\n')[0];
const v = resolve(vArg), out = resolve(outArg); let a = resolve(aArg), tmp = null;
const vdur = parseFloat(probe(v, 'v:0', 'stream=duration')) || parseFloat(probe(v, 'v:0', 'format=duration'));
const acodec = probe(a, 'a:0', 'stream=codec_name');
if (!acodec) { console.log(`failed: no audio stream in ${a}`); process.exit(1); }
if (acodec !== 'aac') {
  tmp = out + '.audio.m4a';
  if (spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'aac.mjs'), a, tmp], { stdio: ['ignore', 'ignore', 'inherit'] }).status !== 0) { console.log('failed: audio encode'); process.exit(1); }
  a = tmp;
}
// keep the packets up to the end of the picture; the last one gets a shorter duration (1/sample_rate ticks)
let trim = [];
const sr = parseInt(probe(a, 'a:0', 'stream=sample_rate')), adur = parseFloat(probe(a, 'a:0', 'stream=duration'));
const pts0 = (spawnSync(FP, ['-v', 'error', '-select_streams', 'a:0', '-read_intervals', '%+#1', '-show_entries', 'packet=pts', '-of', 'csv=p=0', a], { encoding: 'utf8' }).stdout || '').trim();
if (vdur && sr && adur - vdur >= 0.5 / sr && probe(a, 'a:0', 'stream=time_base') === `1/${sr}` && pts0 === '0') {
  const n = Math.round(vdur * sr), keep = Math.ceil(n / 1024);
  trim = ['-frames:a', String(keep), '-bsf:a', `setts=duration='if(eq(N,${keep - 1}),${n - (keep - 1) * 1024},DURATION)'`];
}
rmSync(out, { force: true });
const r = spawnSync(FF, [
  '-v', 'error', '-y', '-i', v, '-i', a, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', ...trim,
  ...(vdur ? ['-t', vdur.toFixed(6)] : ['-shortest']), '-movflags', '+faststart', out,
], { stdio: ['ignore', 'inherit', 'inherit'] });
if (tmp) rmSync(tmp, { force: true });
if (r.status !== 0) { console.log('failed: ffmpeg exit ' + r.status); process.exit(1); }
console.log(`wrote ${out}`);
