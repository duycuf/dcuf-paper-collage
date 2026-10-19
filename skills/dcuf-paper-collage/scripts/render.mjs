// Render HTML files to PNG via headless Chrome/Brave (HFT_BROWSER overrides) + Chrome DevTools Protocol (no npm deps).
// usage: node render.mjs <out_dir> <file1.html> [file2.html ...]
// Frame size is read from <meta name="frame" content="1920x1080"> (default 1920x1080).
import { spawn } from 'node:child_process';
import { existsSync as __exists } from 'node:fs';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { basename, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const winApps = (...rel) => [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean).flatMap((d) => rel.map((r) => join(d, r)));
const BRAVE = process.env.HFT_BROWSER || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ...(process.platform === 'win32' ? winApps('Google/Chrome/Application/chrome.exe', 'BraveSoftware/Brave-Browser/Application/brave.exe', 'Microsoft/Edge/Application/msedge.exe') : []),
].find((p) => __exists(p));
if (!BRAVE) { console.error('No Chromium-based browser found. Set HFT_BROWSER=/path/to/chrome'); process.exit(1); }
const [outDir, ...files] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const PROFILE = join(tmpdir(), `brave-render-${process.pid}`);
const proc = spawn(BRAVE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--no-default-browser-check', '--use-mock-keychain', '--password-store=basic',
  '--disable-extensions', '--disable-component-update', '--force-color-profile=srgb',
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
// Node 24's built-in WebSocket forces permessage-deflate and drops any compressed message over ~4 MB (big PNG sheets).
let id = 0, sessionId = null;
const pending = new Map();
const listeners = [];
let chunks = [];
const onMsg = (msg) => {
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.sessionId === sessionId) listeners.forEach((l) => l(msg));
};
proc.stdio[4].on('data', (d) => {
  let s = 0, i;
  while ((i = d.indexOf(0, s)) !== -1) { chunks.push(d.subarray(s, i)); onMsg(JSON.parse(Buffer.concat(chunks).toString('utf8'))); chunks = []; s = i + 1; }
  if (s < d.length) chunks.push(d.subarray(s));
});
proc.stdio[3].on('error', () => {}); proc.on('error', () => {});
const raw = (method, params, sid) => new Promise((res) => {
  const i = ++id; pending.set(i, res); proc.stdio[3].write(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) }) + '\0');
});
const send = (method, params = {}) => raw(method, params, sessionId);
for (let i = 0; i < 60 && !sessionId; i++) {
  const r = await Promise.race([raw('Target.getTargets', {}), sleep(2000).then(() => null)]);
  const page = r?.result?.targetInfos?.find((t) => t.type === 'page');
  if (page) sessionId = (await raw('Target.attachToTarget', { targetId: page.targetId, flatten: true })).result?.sessionId;
  if (!sessionId) await sleep(250);
}
if (!sessionId) { console.error('browser did not start'); await quit(1); }
const waitEvent = (name, timeout = 15000) => new Promise((res) => {
  const t = setTimeout(() => res(null), timeout);
  listeners.push((m) => { if (m.method === name) { clearTimeout(t); res(m); } });
});

await send('Page.enable');
await send('Runtime.enable');
for (const f of files) {
  const html = readFileSync(f, 'utf8');
  const m = html.match(/<meta name="frame" content="(\d+)x(\d+)"/);
  const [w, h] = m ? [+m[1], +m[2]] : [1920, 1080];
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const loaded = waitEvent('Page.loadEventFired');
  await send('Page.navigate', { url: pathToFileURL(resolve(f)).href });
  await loaded;
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>true)', awaitPromise: true });
  await sleep(400);
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  const out = `${outDir}/${basename(f).replace(/\.html$/, '')}.png`;
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('wrote', out, `${w}x${h}`);
}
await quit(0);
