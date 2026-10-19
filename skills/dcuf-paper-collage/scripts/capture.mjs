// Deterministic frame capture of a code-based motion composition (DOM/CSS/SVG/Canvas/WebGL) via headless Chrome/Brave (HFT_BROWSER overrides) + CDP.
// The page MUST expose:
//   window.__comp = { width, height, fps, duration }      (seconds)
//   window.__seek = async (t) => { ...render the frame at time t...; }   (pure function of t)
// usage:
//   node capture.mjs <page.html[?query]> <out_dir> [--query "style=luxury-serif&scheme=light"] [--stills 0.5,1.2,...] [--from s] [--to s] [--every n] [--jpg]
// (system/proof copy of motion/tools/capture.mjs: adds query-string support so one page renders any style)
// Frames are written as out_dir/f_00000.png (or stills as out_dir/still_<t>.png).
import { spawn } from 'node:child_process';
import { existsSync as __exists } from 'node:fs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const WIN = process.platform === 'win32', MAC = process.platform === 'darwin';
const winApps = (...rel) => [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean).flatMap((d) => rel.map((r) => join(d, r)));
const BRAVE = process.env.HFT_BROWSER || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ...(WIN ? winApps('Google/Chrome/Application/chrome.exe', 'BraveSoftware/Brave-Browser/Application/brave.exe', 'Microsoft/Edge/Application/msedge.exe') : []),
].find((p) => __exists(p));
if (!BRAVE) { console.error('No Chromium-based browser found. Set HFT_BROWSER=/path/to/chrome'); process.exit(1); }
const args = process.argv.slice(2);
const isUrl = /^https?:\/\//.test(args[0]);   // http(s)://… pages too (dcuf-archival-edit serves its project over a local server)
const [pagePath, inlineQuery] = isUrl ? [args[0], ''] : args[0].split('?');
const page = isUrl ? pagePath : resolve(pagePath);
const outDir = resolve(args[1]);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const stills = opt('--stills', null);
const from = parseFloat(opt('--from', '0'));
const toArg = opt('--to', null);
const every = parseInt(opt('--every', '1'));
const jpg = args.includes('--jpg');
const query = opt('--query', inlineQuery || '');
mkdirSync(outDir, { recursive: true });

const PROFILE = join(tmpdir(), `lf-cap-${process.pid}`);
const proc = spawn(BRAVE, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--use-mock-keychain', '--password-store=basic', '--disable-extensions', '--disable-component-update',
  '--force-color-profile=srgb', '--ignore-gpu-blocklist', '--enable-webgl', ...(MAC ? ['--use-angle=metal'] : []),
  '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files',
  '--remote-debugging-pipe', `--user-data-dir=${PROFILE}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });

// kill the browser, then remove its throw-away profile (on Windows its files stay locked until the process is gone)
async function quit(code) {
  const gone = new Promise((r) => { if (proc.exitCode !== null) r(); else { proc.once('exit', r); setTimeout(r, 3000); } });
  proc.kill(); await gone;
  try { rmSync(PROFILE, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  process.exit(code);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// CDP over --remote-debugging-pipe (fd 3 in, fd 4 out, NUL-separated JSON) instead of the DevTools WebSocket:
// Node 24's built-in WebSocket forces permessage-deflate and drops any compressed message over ~4 MB, i.e. full-HD PNG frames.
let id = 0, sessionId = null; const pending = new Map(); const listeners = []; let chunks = [];
const onMsg = (m) => { if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.sessionId === sessionId) listeners.forEach((l) => l(m)); };
proc.stdio[4].on('data', (d) => { let s = 0, i; while ((i = d.indexOf(0, s)) !== -1) { chunks.push(d.subarray(s, i)); onMsg(JSON.parse(Buffer.concat(chunks).toString('utf8'))); chunks = []; s = i + 1; } if (s < d.length) chunks.push(d.subarray(s)); });
proc.stdio[3].on('error', () => {}); proc.on('error', () => {});
const raw = (method, params, sid) => new Promise((res) => { const i = ++id; pending.set(i, res); proc.stdio[3].write(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) }) + '\0'); });
const send = (method, params = {}) => raw(method, params, sessionId);
const within = (p, ms) => Promise.race([p, sleep(ms).then(() => null)]);
for (let i = 0; i < 160 && !sessionId; i++) {
  const r = await within(raw('Target.getTargets', {}), 2000);
  const pg = r?.result?.targetInfos?.find((t) => t.type === 'page');
  if (pg) sessionId = (await raw('Target.attachToTarget', { targetId: pg.targetId, flatten: true })).result?.sessionId;
  if (!sessionId) await sleep(250);
}
if (!sessionId) { console.error('browser did not start'); await quit(1); }
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 800));
  return r.result?.result?.value;
};
const consoleMsgs = [];
listeners.push((m) => { if (m.method === 'Runtime.consoleAPICalled') consoleMsgs.push(m.params.args.map((a) => a.value).join(' ')); if (m.method === 'Runtime.exceptionThrown') consoleMsgs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400)); });

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
const loaded = new Promise((r) => { const t = setTimeout(r, 20000); listeners.push((m) => { if (m.method === 'Page.loadEventFired') { clearTimeout(t); r(); } }); });
await send('Page.navigate', { url: (isUrl ? page + (query ? (page.includes('?') ? '&' : '?') + query.replace(/^\?/, '') : '') : pathToFileURL(page).href + (query ? '?' + query.replace(/^\?/, '') : '')) });
await loaded;
// wait for the composition to declare itself
let comp = null;
for (let i = 0; i < 120 && !comp; i++) { comp = await evaluate('window.__comp && window.__seek ? window.__comp : null').catch(() => null); if (!comp) await sleep(250); }
if (!comp) { console.error('page did not expose __comp/__seek. console:', consoleMsgs.slice(-10)); await quit(1); }
await send('Emulation.setDeviceMetricsOverride', { width: comp.width, height: comp.height, deviceScaleFactor: 1, mobile: false });
console.log('comp:', JSON.stringify(comp));
await evaluate('document.fonts.ready.then(()=>true)');
if (window_ready_wait()) await evaluate('window.__ready ? window.__ready : true');

function window_ready_wait() { return true; }

async function shot(t, file) {
  await evaluate(`(async()=>{await window.__seek(${t}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return true})()`);
  const s = await send('Page.captureScreenshot', { format: jpg ? 'jpeg' : 'png', quality: jpg ? 95 : undefined, clip: { x: 0, y: 0, width: comp.width, height: comp.height, scale: 1 }, captureBeyondViewport: false });
  writeFileSync(file, Buffer.from(s.result.data, 'base64'));
}

const t0 = Date.now();
if (stills) {
  const reports = [];   // --report: after each still, the page's window.__report() (dcuf-archival-edit layout check) → <out_dir>/report.json
  for (const t of stills.split(',').map(Number)) { await shot(t, `${outDir}/still_${t.toFixed(2)}.png`); if (args.includes('--report')) reports.push({ t, ...(await evaluate('window.__report ? window.__report() : null') || {}) }); }
  if (args.includes('--report')) writeFileSync(`${outDir}/report.json`, JSON.stringify(reports, null, 1));
  console.log(`stills: ${stills} -> ${outDir}`);
} else {
  const fps = comp.fps, dur = toArg ? parseFloat(toArg) : comp.duration;
  const n0 = Math.round(from * fps), n1 = Math.round(dur * fps);
  for (let n = n0; n < n1; n += every) {
    await shot(n / fps, `${outDir}/f_${String(n).padStart(5, '0')}.${jpg ? 'jpg' : 'png'}`);
    if (n % (fps * 2) === 0) console.log(`frame ${n}/${n1} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  console.log(`done ${n1 - n0} frames @${fps}fps -> ${outDir}`);
}
if (consoleMsgs.length) console.log('console:', consoleMsgs.slice(-8).join(' | '));
await quit(0);
