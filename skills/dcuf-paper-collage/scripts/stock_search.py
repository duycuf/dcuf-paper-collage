# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10.1"]
# ///
"""Free stock search + download with provenance: the replacement for generating photo cut-outs / B-roll.

  uv run stock_search.py search "vintage film camera" [--kind image|video] [--src openverse,commons,archive,pexels,pixabay]
                         [--n 8] [--out refs/stock/<slug>] [--transparent] [--collection prelinger]
      -> <out>/results.json (numbered), <out>/thumbs/, <out>/sheet.jpg (numbered contact sheet: LOOK at it before picking)
  uv run stock_search.py get <out>/results.json 3 [7 ...] --name cam_side [--dest keyframes/raw] [--credits cutouts/credits.md]
      -> downloads the full file(s) (<name>.ext, or <name>_1, _2 … for several) and appends one credit row each

Sources (all free for commercial use within their licence; the licence of EVERY file is written to credits.md):
  openverse  CC / public-domain images from Flickr, Wikimedia, museums …   no key   (commercial + modification allowed only)
  commons    Wikimedia Commons images / video                              no key   (NC/ND and unknown licences skipped)
  archive    Internet Archive (films, photos; --collection prelinger = public-domain ephemeral films)   no key, licence often unstated: check the page
  pexels     photos + video, Pexels License (no attribution required)      env PEXELS_API_KEY  (free key: pexels.com/api)
  pixabay    photos, PNG with transparency (--transparent), video          env PIXABAY_API_KEY (free key: pixabay.com/api/docs)
Default --src = every source that works right now (keyless ones + those whose key is set).
Pure stdlib networking; Pillow only for the contact sheet. Never puts keys in files.
"""
import argparse, json, math, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from html import unescape
from pathlib import Path

UA = 'stock-search/1.0 (dcuf-paper-collage skill; video editing)'
TIMEOUT = 40


def http_json(url, headers=None, timeout=TIMEOUT):
    req = urllib.request.Request(url, headers={'User-Agent': UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def lic_from_url(u):
    """https://creativecommons.org/licenses/by-sa/4.0/ -> 'CC BY-SA 4.0'; publicdomain/zero -> CC0; publicdomain/mark -> PDM."""
    if not u: return ''
    if 'publicdomain/zero' in u: return 'CC0'
    if 'publicdomain/mark' in u: return 'PDM'
    if 'licenses/publicdomain' in u: return 'Public domain'
    m = re.search(r'creativecommons\.org/licenses/([a-z-]+)/([\d.]+)', u)
    return f'CC {m[1].upper()} {m[2]}' if m else u


def download(url, path, headers=None):
    req = urllib.request.Request(url, headers={'User-Agent': UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=TIMEOUT * 3) as r, open(path, 'wb') as f:
        while chunk := r.read(1 << 16):
            f.write(chunk)
    return path


def strip_html(s):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', '', s or ''))).strip()


def item(**k):
    base = dict(src='', id='', title='', page='', thumb='', full='', creator='', license='', license_url='',
                attribution_required=True, w=0, h=0, duration=None, kind='image', ext='')
    base.update(k)
    return base


# ---------------------------------------------------------------- sources
def s_openverse(q, kind, n, a):
    if kind != 'image':
        return []
    p = {'q': q, 'page_size': min(n, 20), 'license_type': 'commercial,modification', 'mature': 'false'}
    d = http_json('https://api.openverse.org/v1/images/?' + urllib.parse.urlencode(p), timeout=20)   # often slow / 504: fail fast
    out = []
    for r in d.get('results', []):
        lic = (r.get('license') or '').lower()
        out.append(item(src='openverse', id=r['id'], title=r.get('title') or '', page=r.get('foreign_landing_url') or '',
                        thumb=r.get('thumbnail') or r.get('url'), full=r.get('url'), creator=r.get('creator') or '',
                        license=f"{lic.upper()} {r.get('license_version') or ''}".strip(), license_url=r.get('license_url') or '',
                        attribution_required=lic not in ('cc0', 'pdm'), w=r.get('width') or 0, h=r.get('height') or 0,
                        ext=(r.get('filetype') or '').lower()))
    return out


OK_LIC = re.compile(r'public domain|^pd|cc0|cc[ -]by(-sa)?[ -]?\d|cc[ -]by(-sa)?$', re.I)


def s_commons(q, kind, n, a):
    ft = 'filetype:video' if kind == 'video' else 'filetype:bitmap'
    p = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': f'{q} {ft}', 'gsrnamespace': 6,
         'gsrlimit': min(n * 2, 40), 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata|mime', 'iiurlwidth': 480}
    d = http_json('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(p))
    pages = sorted(d.get('query', {}).get('pages', {}).values(), key=lambda x: x.get('index', 0))
    out = []
    for pg in pages:
        ii = (pg.get('imageinfo') or [{}])[0]; m = ii.get('extmetadata', {})
        lic = (m.get('LicenseShortName', {}).get('value') or '').strip()
        if not OK_LIC.search(lic) or re.search(r'\bnc\b|\bnd\b|non-?commercial|no-?deriv', lic, re.I):
            continue
        out.append(item(src='commons', id=pg['title'], title=pg['title'].removeprefix('File:'), page=ii.get('descriptionurl', ''),
                        thumb=ii.get('thumburl') or ii.get('url'), full=ii.get('url'), creator=strip_html(m.get('Artist', {}).get('value')),
                        license=lic, license_url=m.get('LicenseUrl', {}).get('value', ''),
                        attribution_required=(m.get('AttributionRequired', {}).get('value', 'true') != 'false'),
                        w=ii.get('width', 0), h=ii.get('height', 0), duration=ii.get('duration'),
                        kind=kind, ext=Path(urllib.parse.urlparse(ii.get('url', '')).path).suffix.lstrip('.').lower()))
        if len(out) >= n:
            break
    return out


def s_archive(q, kind, n, a):
    mt = 'movies' if kind == 'video' else 'image'
    query = f'({q}) AND mediatype:{mt}' + (f' AND collection:{a.collection}' if a.collection else '')
    p = [('q', query), ('rows', n), ('output', 'json'), ('sort[]', 'downloads desc')] + \
        [('fl[]', f) for f in ('identifier', 'title', 'creator', 'licenseurl', 'year', 'collection')]
    d = http_json('https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(p))
    out = []
    for r in d.get('response', {}).get('docs', []):
        i = r['identifier']; coll = r.get('collection') or []
        lic = lic_from_url(r.get('licenseurl')) or ('Public domain (Prelinger)' if 'prelinger' in coll else 'unstated: check page')
        if re.search(r'\bNC\b|\bND\b', lic):
            continue
        cr = r.get('creator'); cr = ', '.join(cr) if isinstance(cr, list) else (cr or '')
        out.append(item(src='archive', id=i, title=str(r.get('title', '')), page=f'https://archive.org/details/{i}',
                        thumb=f'https://archive.org/services/img/{i}', full='', creator=cr, license=lic,
                        license_url=r.get('licenseurl') or '', attribution_required=not re.search(r'public domain|CC0|PDM', lic, re.I), kind=kind))
    return out


def s_pexels(q, kind, n, a):
    key = os.environ.get('PEXELS_API_KEY')
    if not key:
        return []
    H = {'Authorization': key}
    if kind == 'video':
        d = http_json('https://api.pexels.com/videos/search?' + urllib.parse.urlencode({'query': q, 'per_page': min(n, 40)}), H)
        out = []
        for v in d.get('videos', []):
            files = [f for f in v.get('video_files', []) if f.get('file_type') == 'video/mp4' and f.get('width')]
            best = max([f for f in files if f['width'] <= 1920] or files, key=lambda f: f['width'], default=None)
            out.append(item(src='pexels', id=v['id'], title=v.get('url', '').rstrip('/').split('/')[-1], page=v.get('url', ''),
                            thumb=v.get('image'), full=best and best['link'], creator=(v.get('user') or {}).get('name', ''),
                            license='Pexels License', license_url='https://www.pexels.com/license/', attribution_required=False,
                            w=best and best['width'] or 0, h=best and best['height'] or 0, duration=v.get('duration'), kind='video', ext='mp4'))
        return out
    d = http_json('https://api.pexels.com/v1/search?' + urllib.parse.urlencode({'query': q, 'per_page': min(n, 80)}), H)
    return [item(src='pexels', id=p['id'], title=p.get('alt') or '', page=p.get('url', ''), thumb=p['src']['medium'],
                 full=p['src']['original'], creator=p.get('photographer', ''), license='Pexels License',
                 license_url='https://www.pexels.com/license/', attribution_required=False, w=p.get('width', 0), h=p.get('height', 0),
                 ext=Path(urllib.parse.urlparse(p['src']['original']).path).suffix.lstrip('.').lower())
            for p in d.get('photos', [])]


def s_pixabay(q, kind, n, a):
    key = os.environ.get('PIXABAY_API_KEY')
    if not key:
        return []
    base = {'key': key, 'q': q, 'per_page': max(3, min(n, 200)), 'safesearch': 'true'}
    lic = dict(license='Pixabay Content License', license_url='https://pixabay.com/service/license-summary/', attribution_required=False)
    if kind == 'video':
        d = http_json('https://pixabay.com/api/videos/?' + urllib.parse.urlencode(base))
        out = []
        for v in d.get('hits', []):
            vs = v.get('videos', {}); best = vs.get('large') if (vs.get('large') or {}).get('url') else vs.get('medium', {})
            out.append(item(src='pixabay', id=v['id'], title=v.get('tags', ''), page=v.get('pageURL', ''), thumb=best.get('thumbnail'),
                            full=best.get('url'), creator=v.get('user', ''), w=best.get('width', 0), h=best.get('height', 0),
                            duration=v.get('duration'), kind='video', ext='mp4', **lic))
        return out
    p = dict(base, image_type='photo')
    if a.transparent:
        p.update(colors='transparent', image_type='all')
    d = http_json('https://pixabay.com/api/?' + urllib.parse.urlencode(p))
    return [item(src='pixabay', id=h['id'], title=h.get('tags', ''), page=h.get('pageURL', ''), thumb=h.get('webformatURL'),
                 full=h.get('largeImageURL'), creator=h.get('user', ''), w=h.get('imageWidth', 0), h=h.get('imageHeight', 0),
                 ext=Path(urllib.parse.urlparse(h.get('largeImageURL', '')).path).suffix.lstrip('.').lower(), **lic)
            for h in d.get('hits', [])]


SOURCES = {'openverse': s_openverse, 'commons': s_commons, 'archive': s_archive, 'pexels': s_pexels, 'pixabay': s_pixabay}


def default_sources():
    s = ['openverse', 'commons', 'archive']
    if os.environ.get('PEXELS_API_KEY'): s.insert(0, 'pexels')
    if os.environ.get('PIXABAY_API_KEY'): s.insert(0, 'pixabay')
    return s


# ---------------------------------------------------------------- contact sheet
def sheet(items, thumbs_dir, out):
    from PIL import Image, ImageDraw, ImageFont
    CW, CH, CAP, G, C = 360, 240, 44, 10, 4
    rows = max(1, math.ceil(len(items) / C))
    S = Image.new('RGB', (C * CW + (C + 1) * G, rows * (CH + CAP) + (rows + 1) * G), (18, 18, 20))
    try:
        f1, f2 = ImageFont.load_default(22), ImageFont.load_default(15)
    except TypeError:
        f1 = f2 = ImageFont.load_default()
    d = ImageDraw.Draw(S)
    for k, it in enumerate(items):
        x, y = G + (k % C) * (CW + G), G + (k // C) * (CH + CAP + G)
        d.rectangle([x, y, x + CW, y + CH], fill=(60, 60, 64))
        tp = thumbs_dir / f"{it['n']:02d}.jpg"
        if tp.exists():
            try:
                im = Image.open(tp); im.thumbnail((CW, CH))
                if im.mode in ('RGBA', 'LA', 'P'):   # show transparency on a checkerboard
                    im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, (200, 200, 200, 255))
                    cd = ImageDraw.Draw(bg)
                    for yy in range(0, im.size[1], 16):
                        for xx in range((yy // 16 % 2) * 16, im.size[0], 32): cd.rectangle([xx, yy, xx + 15, yy + 15], fill=(150, 150, 150, 255))
                    im = Image.alpha_composite(bg, im)
                S.paste(im.convert('RGB'), (x + (CW - im.size[0]) // 2, y + (CH - im.size[1]) // 2))
            except Exception:
                pass
        d.text((x + 4, y + CH + 2), f"{it['n']}  {it['src']}", font=f1, fill=(255, 220, 90))
        meta = f"{it['license'][:26]}  {it['w']}x{it['h']}" + (f"  {it['duration']:.0f}s" if it.get('duration') else '')
        d.text((x + 4, y + CH + 26), meta, font=f2, fill=(200, 200, 200))
    S.save(out, quality=88)


# ---------------------------------------------------------------- commands
def cmd_search(a):
    out = Path(a.out or f"refs/stock/{re.sub(r'[^a-z0-9]+', '-', a.query.lower()).strip('-')}"); (out / 'thumbs').mkdir(parents=True, exist_ok=True)
    srcs = a.src.split(',') if a.src else default_sources()
    res, notes = [], []
    for s in srcs:
        if s not in SOURCES:
            notes.append(f'{s}: unknown source'); continue
        if s == 'pexels' and not os.environ.get('PEXELS_API_KEY'): notes.append('pexels: skipped (no PEXELS_API_KEY)'); continue
        if s == 'pixabay' and not os.environ.get('PIXABAY_API_KEY'): notes.append('pixabay: skipped (no PIXABAY_API_KEY)'); continue
        try:
            got = SOURCES[s](a.query, a.kind, a.n, a); res += got; notes.append(f'{s}: {len(got)}')
        except Exception as e:
            notes.append(f'{s}: ERROR {type(e).__name__}: {str(e)[:120]}')
    for k, it in enumerate(res, 1):
        it['n'] = k
        if it.get('thumb'):
            try: download(it['thumb'], out / 'thumbs' / f'{k:02d}.jpg')
            except Exception: pass
    json.dump({'query': a.query, 'kind': a.kind, 'items': res}, open(out / 'results.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if res: sheet(res, out / 'thumbs', out / 'sheet.jpg')
    print(' · '.join(notes))
    for it in res:
        print(f"{it['n']:>3} {it['src']:<9} {it['w']}x{it['h']} {it['license'][:28]:<28} {it['title'][:60]}")
    print(f"\n{out / 'results.json'}\n{out / 'sheet.jpg'}" if res else 'no results')


def archive_file(ident, kind):
    md = http_json(f'https://archive.org/metadata/{ident}')
    files = md.get('files', [])
    if kind == 'video':
        prefs = ['h.264 HD', 'h.264', 'MPEG4', '512Kb MPEG4', 'h.264 IA']
        for p in prefs:
            c = [f for f in files if f.get('format') == p and f['name'].lower().endswith('.mp4')]
            if c: return max(c, key=lambda f: int(f.get('size', 0))), md
        c = [f for f in files if f['name'].lower().endswith('.mp4')]
    else:
        c = [f for f in files if f.get('format') in ('JPEG', 'PNG', 'TIFF') or f['name'].lower().endswith(('.jpg', '.jpeg', '.png'))]
        c = [f for f in c if f.get('source') == 'original'] or c
    if not c: sys.exit(f'archive {ident}: no {kind} file found, open https://archive.org/details/{ident}')
    return max(c, key=lambda f: int(f.get('size', 0))), md


def download_full(url, path, it):
    """Full file with retries. Wikimedia often answers bursts of originals with 429/403: back off, then fall back to
    its 1920 px rendering of the same file (same licence; good enough for cut-outs and inserts)."""
    for wait in (0, 4, 10):
        if wait: time.sleep(wait)
        try:
            return download(url, path)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 403, 503): raise
            last = e
    thumb = it.get('thumb') or ''
    if it['src'] == 'commons' and re.search(r'/\d+px-', thumb):
        big = re.sub(r'/\d+px-', '/1920px-', thumb)
        print(f'note: {it["src"]} refused the original ({last.code}); using its 1920 px rendering', file=sys.stderr)
        time.sleep(2)
        return download(big, path)
    raise last


def cmd_get(a):
    data = json.load(open(a.results, encoding='utf-8')); items = {it['n']: it for it in data['items']}
    dest = Path(a.dest); dest.mkdir(parents=True, exist_ok=True)
    cred = Path(a.credits); cred.parent.mkdir(parents=True, exist_ok=True)
    if not cred.exists():
        cred.write_text('# Credits: sources of downloaded media\n\n| file | source | creator | licence | attribution needed | page |\n|---|---|---|---|---|---|\n', encoding='utf-8')
    for j, n in enumerate(a.n):
        it = items.get(n) or sys.exit(f'no item {n} in {a.results}')
        url, ext = it.get('full'), it.get('ext')
        if it['src'] == 'archive':
            f, md = archive_file(it['id'], it['kind'])
            url = f"https://archive.org/download/{it['id']}/{urllib.parse.quote(f['name'])}"; ext = Path(f['name']).suffix.lstrip('.').lower()
            lic = (md.get('metadata') or {}).get('licenseurl')
            if lic:
                it['license'], it['license_url'] = lic_from_url(lic), lic
                it['attribution_required'] = not re.search(r'public domain|CC0|PDM', it['license'], re.I)
        if not url: sys.exit(f'item {n}: no downloadable url')
        ext = (ext or Path(urllib.parse.urlparse(url).path).suffix.lstrip('.') or ('mp4' if it['kind'] == 'video' else 'jpg')).lower()
        ext = 'jpg' if ext == 'jpeg' else ext
        name = a.name if len(a.n) == 1 else f'{a.name}_{j + 1}'
        p = dest / f'{name}.{ext}'
        download_full(url, p, it)
        att = 'yes' if it['attribution_required'] else 'no'
        row = f"| {p.as_posix()} | {it['src']} | {it['creator'] or '—'} | [{it['license']}]({it['license_url']}) | {att} | {it['page']} |\n"
        with open(cred, 'a', encoding='utf-8') as fh: fh.write(row)
        print(json.dumps({'file': str(p), 'bytes': p.stat().st_size, 'license': it['license'], 'attribution_required': it['attribution_required'],
                          'creator': it['creator'], 'page': it['page']}, ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('search'); s.add_argument('query'); s.add_argument('--kind', choices=['image', 'video'], default='image')
    s.add_argument('--src'); s.add_argument('--n', type=int, default=8); s.add_argument('--out')
    s.add_argument('--transparent', action='store_true', help='pixabay: only images with transparency')
    s.add_argument('--collection', help='archive: limit to a collection, e.g. prelinger')
    g = sp.add_parser('get'); g.add_argument('results'); g.add_argument('n', type=int, nargs='+'); g.add_argument('--name', required=True)
    g.add_argument('--dest', default='keyframes/raw'); g.add_argument('--credits', default='cutouts/credits.md')
    a = ap.parse_args()
    (cmd_search if a.cmd == 'search' else cmd_get)(a)


if __name__ == '__main__':
    main()
