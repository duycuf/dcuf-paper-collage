// Extract frames from a video (or GIF) at a fixed fps into JPEGs with ffmpeg (cross-platform twin of extract.swift).
// usage: node extract.mjs <in.mp4|gif> <out_dir> <fps> [maxWidth=1920] [quality=0.9]
// Writes out_dir/f_0000.jpg … (frame i = time (i+0.5)/fps), fits inside maxWidth×maxWidth, never upscales; prints JSON like the Swift tool.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const a = process.argv.slice(2);
if (a.length < 3) { console.log('usage: extract <in> <out_dir> <fps> [maxW] [q]'); process.exit(2); }
const FF = process.env.FFMPEG || 'ffmpeg', FP = process.env.FFPROBE || 'ffprobe';
if (spawnSync(FF, ['-version'], { stdio: 'ignore' }).status !== 0) { console.error('ffmpeg not found on PATH (Windows: winget install Gyan.FFmpeg; or set FFMPEG=/path/to/ffmpeg)'); process.exit(1); }
const src = resolve(a[0]), out = resolve(a[1]), fps = parseFloat(a[2]) || 24;
const maxW = parseFloat(a[3]) || 1920, q = a[4] !== undefined ? parseFloat(a[4]) : 0.9;
mkdirSync(out, { recursive: true });

const pr = spawnSync(FP, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate,r_frame_rate:format=duration', '-of', 'json', src], { encoding: 'utf8' });
const info = JSON.parse(pr.stdout || '{}'); const st = (info.streams || [])[0] || {};
const dur = parseFloat(info.format?.duration) || 0;
const rate = (s) => { const [n, d] = String(s || '0/1').split('/').map(Number); return d ? n / d : 0; };
const nfps = rate(st.avg_frame_rate) || rate(st.r_frame_rate);
const n = Math.floor(dur * fps + 1e-6);
const qv = Math.max(2, Math.min(31, Math.round(2 + (1 - q) * 29)));   // AVFoundation 0..1 quality → mjpeg qscale (0.9 ≈ 5)

// sample at the middle of each output interval, like the Swift tool's (i+0.5)/fps
const r = spawnSync(FF, [
  '-v', 'error', '-y', '-ss', (0.5 / fps).toFixed(6), '-i', src,
  '-vf', `fps=${fps}:round=near,scale='min(iw,${maxW})':'min(ih,${maxW})':force_original_aspect_ratio=decrease`,
  '-frames:v', String(n), '-q:v', String(qv), '-start_number', '0', join(out, 'f_%04d.jpg'),
], { stdio: ['ignore', 'inherit', 'inherit'] });
if (r.status !== 0) { console.error('ffmpeg failed'); process.exit(1); }
const written = readdirSync(out).filter((f) => /^f_\d{4}\.jpg$/.test(f)).length;
console.log(JSON.stringify({ frames: written, duration: dur, src_fps: nfps, w: st.width || 0, h: st.height || 0 }));
