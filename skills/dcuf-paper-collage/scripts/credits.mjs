// credits.mjs — merge every cutouts/credits*.md row (written by stock_search.py get) into cutouts/credits_all.md and print
// the attribution block to paste into the video description (CC BY / BY-SA need it; CC0, public domain, Pexels and Pixabay don't).
//   node tools/credits.mjs [--lang vi|en]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const P = dirname(dirname(fileURLToPath(import.meta.url))), D = join(P, 'cutouts');
const lang = (process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'vi');
const files = existsSync(D) ? readdirSync(D).filter((f) => /^credits.*\.md$/.test(f) && f !== 'credits_all.md') : [];
const seen = new Set(), rows = [];
for (const f of files) for (const line of readFileSync(join(D, f), 'utf8').split(/\r?\n/)) {
  if (!/^\| (keyframes|cutouts|dl|assets)\//.test(line) || line.includes('(edit)')) continue;
  const c = line.split('|').map((s) => s.trim()); const key = c[6] || c[1]; if (seen.has(key)) continue; seen.add(key); rows.push(c);
}
const head = '# Credits: sources of downloaded media\n\n| file | source | creator | licence | attribution needed | page |\n|---|---|---|---|---|---|\n';
writeFileSync(join(D, 'credits_all.md'), head + rows.map((c) => `| ${c.slice(1, 7).join(' | ')} |`).join('\n') + '\n');
const need = rows.filter((c) => c[5] === 'yes');
const lic = (s) => (s.match(/\[([^\]]+)\]/) || [, s])[1];
console.log(`${rows.length} files, ${need.length} need a credit → ${join(D, 'credits_all.md')}\n`);
console.log(lang === 'en' ? 'Photo credits:' : 'Ảnh sử dụng (ghi công):');
for (const c of need) console.log(`- ${c[3] || '—'}, ${lic(c[4])}, ${c[6]}`);
