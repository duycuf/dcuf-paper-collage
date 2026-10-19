// usage: node new_project.mjs <output_root> <slug>       (cross-platform twin of new_project.sh: Windows, macOS, Linux)
//   Copies the brand-free 10 s promo template: fill comp/film.config.js (words, cut-out names, format, palette); nothing else needs editing.
// Creates <output_root>/<slug>/ with the collage composition (comp/), the score synth (audio/score.html), tools/ (render + capture + keying),
// and empty cutouts/, keyframes/raw/, refs/, review/, clips/. Instead of compiling the Swift tools it copies their ffmpeg twins
// (extract.mjs, encode.mjs, mux.mjs) and greenkey.py. Needs Node >= 22 (run it with that node), ffmpeg on PATH, Chrome/Edge/Brave.
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), SK = dirname(HERE);
const [ROOT, SLUG] = process.argv.slice(2);
if (!ROOT || !SLUG) { console.log('usage: new_project.mjs <output_root> <slug>'); process.exit(2); }
const P = resolve(ROOT, SLUG);
for (const d of ['comp', 'tools', 'cutouts', 'keyframes/raw', 'refs', 'review', 'audio', 'clips']) mkdirSync(join(P, d), { recursive: true });
const cpNew = (src, dst) => { if (!existsSync(dst)) copyFileSync(src, dst); };   // like cp -n: never overwrite the user's edits
cpSync(join(SK, 'assets/template/comp'), join(P, 'comp'), { recursive: true, force: false });   // comp/ incl. fonts/; never overwrites the user's edits
cpNew(join(SK, 'assets/template/audio/score.html'), join(P, 'audio/score.html'));
const TOOLS = ['capture.mjs', 'render.mjs', 'sheet.mjs', 'render_audio.mjs', 'music_window.py', 'cut_audio.py',
  // cross-platform tools
  'extract.mjs', 'encode.mjs', 'mux.mjs', 'aac.mjs', 'greenkey.py', 'render_film.mjs', 'strip.mjs', 'clips_js.mjs', 'palette_sheet.mjs', 'font_sheet.mjs',
  // free stock search + local cut-out (uv run …), the default instead of generating cut-outs
  'stock_search.py', 'cutout.py',
  // brand palettes (brandPalette → comp/palettes.js) + credits for the video description
  'brand_palette.mjs', 'credits.mjs', 'fonts_fetch.mjs',
  // macOS originals (zsh + Swift), kept so the macOS workflow stays identical
  'render_film.sh', 'strip.sh', 'clips_js.sh', 'palette_sheet.sh', 'font_sheet.sh'];
for (const f of TOOLS) copyFileSync(join(HERE, f), join(P, 'tools', f));
if (process.platform !== 'win32') for (const f of TOOLS) if (/\.(sh|py)$/.test(f)) try { chmodSync(join(P, 'tools', f), 0o755); } catch {}

// macOS: compile the Swift tools as before when swiftc exists (the .sh scripts call them); everywhere else the .mjs twins are used.
if (process.platform === 'darwin' && spawnSync('swiftc', ['--version'], { stdio: 'ignore' }).status === 0) {
  for (const t of ['extract', 'encode', 'mux', 'greenkey']) {
    if (existsSync(join(P, 'tools', t))) continue;
    const r = spawnSync('swiftc', ['-O', join(HERE, t + '.swift'), '-o', join(P, 'tools', t)], { encoding: 'utf8' });
    if (r.status !== 0) { writeFileSync(join(P, 'tools', `.swiftc_${t}.log`), r.stderr || ''); console.log(`swiftc failed for ${t} (the .mjs/.py twins still work)`); }
  }
}
// checks (warn, never install anything)
if (typeof WebSocket !== 'function' || typeof fetch !== 'function') console.log(`WARNING: this node (${process.version}) has no global WebSocket/fetch; the tools need Node >= 22.`);
if (spawnSync(process.env.FFMPEG || 'ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) console.log('WARNING: ffmpeg not found on PATH: encode/mux/extract need it (Windows: winget install Gyan.FFmpeg).');
spawnSync(process.execPath, [join(P, 'tools/clips_js.mjs')], { stdio: 'ignore' });
if (!existsSync(join(P, 'comp/clips.js'))) writeFileSync(join(P, 'comp/clips.js'), 'window.CLIPS_AVAILABLE=[];\n');
console.log(P);
