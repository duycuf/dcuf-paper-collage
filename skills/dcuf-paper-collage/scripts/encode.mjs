// Encode a numbered PNG/JPEG frame sequence into an H.264 MP4 with ffmpeg (cross-platform twin of encode.swift).
// usage: node encode.mjs <frames_dir> <fps> <out.mp4> [bitrate_mbps=24]
// Frames must share one name pattern with a running number (f_00000.png …, as capture.mjs writes them). BT.709, yuv420p, High profile.
import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [dirArg, fpsArg, outArg, mbpsArg] = process.argv.slice(2);
if (!outArg) { console.error('usage: encode <frames_dir> <fps> <out.mp4> [mbps]'); process.exit(2); }
const FF = process.env.FFMPEG || 'ffmpeg';
if (spawnSync(FF, ['-version'], { stdio: 'ignore' }).status !== 0) { console.error('ffmpeg not found on PATH (Windows: winget install Gyan.FFmpeg; or set FFMPEG=/path/to/ffmpeg)'); process.exit(1); }
// NTSC rates as exact rationals (29.97 → 30000/1001), so long videos stay in sync with their original sound
const fpsN = parseFloat(fpsArg) || 30, NTSC = { 23.976: '24000/1001', 29.97: '30000/1001', 59.94: '60000/1001' }, RATE = NTSC[fpsN] || String(fpsN);
const dir = resolve(dirArg), fps = fpsN, out = resolve(outArg), mbps = parseFloat(mbpsArg) || 24;

const files = readdirSync(dir).filter((f) => /\.(png|jpg)$/i.test(f)).sort();
const m = files[0] && files[0].match(/^(.*?)(\d+)\.(png|jpg)$/i);
if (!m) { console.error('no frames'); process.exit(1); }
const [, prefix, digits, ext] = m;
const odd = files.filter((f) => !f.startsWith(prefix) || !f.endsWith('.' + ext));
if (odd.length) { console.error(`frames must share one pattern ${prefix}N.${ext}; found e.g. ${odd[0]}`); process.exit(1); }
const pattern = join(dir, `${prefix}%0${digits.length}d.${ext}`);

rmSync(out, { force: true });
const r = spawnSync(FF, [
  '-v', 'error', '-y', '-framerate', RATE, '-start_number', String(parseInt(digits, 10)), '-i', pattern,
  '-frames:v', String(files.length),
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
  '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium',
  '-b:v', `${mbps}M`, '-maxrate', `${(mbps * 1.5).toFixed(1)}M`, '-bufsize', `${mbps * 2}M`, '-g', String(Math.round(fps * 2)),
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-movflags', '+faststart', '-r', RATE, out,
], { stdio: ['ignore', 'inherit', 'inherit'] });
if (r.status !== 0) { console.log('failed: ffmpeg exit ' + r.status); process.exit(1); }
const p = spawnSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', out], { encoding: 'utf8' });
const [W, H] = (p.stdout || '').trim().split(',');
console.log(`wrote ${out} ${W}x${H} ${files.length} frames @${fps}fps`);
