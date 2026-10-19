// usage: node tools/clips_js.mjs   (cross-platform twin of clips_js.sh)
// Writes comp/clips.js = the list of clips whose frames exist (clips/<ID>.json written by fetch_clip.sh).
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const P = dirname(dirname(fileURLToPath(import.meta.url)));
const ids = existsSync(join(P, 'clips')) ? readdirSync(join(P, 'clips')).filter((f) => f.endsWith('.json')).sort().map((f) => f.slice(0, -5)) : [];
const js = `window.CLIPS_AVAILABLE=[${ids.map((i) => JSON.stringify(i)).join(',')}];`;
writeFileSync(join(P, 'comp/clips.js'), js + '\n'); console.log(js);
