// usage: node sheet.mjs <out.png> <cols> <cellW> "<img>|<caption>" ...   — contact sheet via headless browser (paths relative to cwd)
import { writeFileSync, unlinkSync, renameSync } from 'node:fs'; import { resolve, dirname } from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
const [out, cols, cellW, ...items] = process.argv.slice(2); const C = +cols, CW = +cellW, CH = Math.round(CW * (process.env.SHEET_PORTRAIT ? 16 / 9 : 9 / 16))   /* SHEET_PORTRAIT=1: 9:16 cells (vertical renders) */, cap = 30, gap = 14;
const rows = Math.ceil(items.length / C); const Wd = C * CW + (C + 1) * gap, Hd = rows * (CH + cap) + (rows + 1) * gap;
const cells = items.map((s) => { const [img, c] = s.split('|'); return `<figure><img src="${pathToFileURL(resolve(img)).href}"><figcaption>${c || ''}</figcaption></figure>`; }).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="frame" content="${Wd}x${Hd}"><style>body{margin:0;background:#0a0a0a;font:500 17px Menlo,monospace;color:#ddd}.g{display:grid;grid-template-columns:repeat(${C},${CW}px);gap:${gap}px;padding:${gap}px}figure{margin:0}img{width:${CW}px;height:${CH}px;object-fit:cover;display:block}figcaption{height:${cap}px;line-height:${cap}px;overflow:hidden;white-space:nowrap}</style></head><body><div class="g">${cells}</div></body></html>`;
const tmp = resolve(dirname(resolve(out)), '_sheet_tmp.html'); writeFileSync(tmp, html);
execFileSync(process.execPath, [resolve(dirname(fileURLToPath(import.meta.url)), 'render.mjs'), dirname(resolve(out)), tmp], { stdio: 'inherit' });
renameSync(tmp.replace(/\.html$/, '.png'), resolve(out)); unlinkSync(tmp);
