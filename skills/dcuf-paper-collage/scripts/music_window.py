#!/usr/bin/env python3
"""Find the best N-second window of a music track for a film cut, and map its structure.

usage:
  music_window.py <track.mp3|wav|m4a> --len 30 [--after 60] [--before 150] [--start 106.4] [--json out.json]
  music_window.py <score.wav> --sections 0.3-1.7,2.5-9.9,10.3-17.9,19.55-19.95,20.3-27.9   (loudness check per section)
  music_window.py <score.wav> --hits 2.0,20.0,28.0 [--peaks 10] [--hitwin 1.5]   (true stereo peak, hit transients vs their surroundings)
  music_window.py <score.wav> --hits 0.5:1.2,2.0,24.0:1.0   (per-hit window override: time:seconds either side)
  music_window.py <score.wav> --timeline 0.25 [--from 0 --to 30]   (RMS dB per step, for reading the shape of a score)

  --after/--before limit where the window may START (seconds). --start evaluates one fixed window instead of searching.
Prints the top candidates with: breath (dip) → DROP hit → LIFT (step up) → strong accents → final hit / outro,
all in film time (0 = window start), so cuts can be placed on them. Pure stdlib; decodes with macOS afconvert (or ffmpeg).
"""
import argparse, array, json, math, os, shutil, subprocess, sys, tempfile, wave

def decode(path, sr):
    tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
    if shutil.which('afconvert'):
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{sr}', '-c', '1', path, tmp], check=True)
    elif shutil.which('ffmpeg'):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', tmp], check=True)
    else:
        sys.exit('need afconvert (macOS) or ffmpeg to decode audio')
    w = wave.open(tmp, 'rb'); a = array.array('h', w.readframes(w.getnframes())); w.close(); os.unlink(tmp)
    return [v / 32768.0 for v in a]

def read_wav16(path):
    """16-bit PCM WAV reader that also accepts WAVE_FORMAT_EXTENSIBLE (what afconvert writes for stereo)."""
    import struct
    with open(path, 'rb') as f: d = f.read()
    assert d[:4] == b'RIFF' and d[8:12] == b'WAVE', 'not a WAV file'
    i, ch, rate, bits, data = 12, 0, 0, 0, None
    while i + 8 <= len(d):
        cid, sz = d[i:i + 4], struct.unpack('<I', d[i + 4:i + 8])[0]
        if cid == b'fmt ': _, ch, rate, _, _, bits = struct.unpack('<HHIIHH', d[i + 8:i + 24])
        elif cid == b'data': data = d[i + 8:i + 8 + sz]
        i += 8 + sz + (sz & 1)
    assert bits == 16 and data is not None, 'need 16-bit PCM audio'
    a = array.array('h'); a.frombytes(data[:len(data) - len(data) % 2]); return ch, rate, a

def read_stereo(path, sr=48000):
    """16-bit stereo samples at the file's own rate (WAV read directly, anything else decoded to 48 kHz)."""
    tmp = None
    if not path.lower().endswith('.wav'):
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
        if shutil.which('afconvert'): subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{sr}', '-c', '2', path, tmp], check=True)
        else: subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-ac', '2', '-ar', str(sr), '-c:a', 'pcm_s16le', tmp], check=True)
        path = tmp
    ch, rate, a = read_wav16(path)
    if tmp: os.unlink(tmp)
    L = a[0::ch]; R = a[1::ch] if ch > 1 else L
    return rate, L, R

def db(v): return 20 * math.log10(max(v, 1e-9))

def hits_report(path, hits, npeaks=10, hitwin=1.5):
    rate, L, R = read_stereo(path); n = len(L)
    def peak(t0, t1):
        a, b = max(0, int(t0 * rate)), min(n, int(t1 * rate))
        if b <= a: return 0.0
        return max(max(L[a:b]), -min(L[a:b]), max(R[a:b]), -min(R[a:b])) / 32768.0
    def rms(t0, t1):
        a, b = max(0, int(t0 * rate)), min(n, int(t1 * rate))
        if b <= a: return 0.0
        s = sum(((L[i] + R[i]) * 0.5) ** 2 for i in range(a, b, 2)); return math.sqrt(s / max(1, len(range(a, b, 2)))) / 32768.0
    gp = peak(0, n / rate); win = 0.05; pk = []
    t = 0.0
    while t < n / rate: pk.append((peak(t, t + win), t)); t += win
    i_g = max(range(len(pk)), key=lambda i: pk[i][0])
    print(f'true peak {db(gp):.2f} dBFS at {pk[i_g][1]:.2f}s ({"OK" if db(gp) <= -1.0 + 0.05 else "OVER -1 dBFS"})')
    top = []
    for v, t in sorted(pk, reverse=True):
        if all(abs(t - u) > 0.25 for _, u in top): top.append((v, t))
        if len(top) >= npeaks: break
    print('loudest peaks (50 ms windows, >=0.25 s apart): ' + ', '.join(f'{t:.2f}s {db(v):.1f}' for v, t in top))
    for hspec in hits:
        th, hw = (float(hspec.split(':')[0]), float(hspec.split(':')[1])) if ':' in hspec else (float(hspec), hitwin)
        hp, hr = peak(th - 0.01, th + 0.06), rms(th, th + 0.1)
        ow, op = [], []
        t = th - hw
        while t < th + hw:
            if t + 0.1 <= th - 0.03 or t >= th + 0.35: ow.append((rms(t, t + 0.1), t)); op.append((peak(t, t + 0.06), t))
            t += 0.025
        if not ow or not op:
            print(f'hit {th:6.2f} (±{hw:.1f}s): peak {db(hp):6.1f} dBFS  rms100ms {db(hr):6.1f} dB | window too small to compare (needs > 0.35 s)'); continue
        mr, mp = max(ow), max(op)
        ok = hr > mr[0] and hp >= mp[0] * 0.98
        print(f'hit {th:6.2f} (±{hw:.1f}s): peak {db(hp):6.1f} dBFS  rms100ms {db(hr):6.1f} dB | loudest other: rms {db(mr[0]):6.1f} @ {mr[1]:.2f}  peak {db(mp[0]):6.1f} @ {mp[1]:.2f}  → margin rms {db(hr) - db(mr[0]):+.1f} dB, peak {db(hp) - db(mp[0]):+.1f} dB  {"LOUDEST" if ok else "NOT LOUDEST"}')

def envelopes(x, sr):
    def onepole(x, fc):
        k = math.exp(-2 * math.pi * fc / sr); y = 0.0; out = [0.0] * len(x)
        for i, v in enumerate(x): y = (1 - k) * v + k * y; out[i] = y
        return out
    lo = onepole(x, 120.0); hop = sr // 100; n = len(x) // hop
    E, B = [], []
    for f in range(n):
        s, e = f * hop, f * hop + hop
        E.append(10 * math.log10(1e-9 + sum(v * v for v in x[s:e]) / hop))
        B.append(10 * math.log10(1e-9 + sum(v * v for v in lo[s:e]) / hop))
    O = [0.0] + [max(0.0, E[i] - E[i - 1]) + max(0.0, B[i] - B[i - 1]) for i in range(1, n)]
    return E, O  # 100 fps

def mean(a): return sum(a) / max(1, len(a))

def analyse(E, O, fps=100):
    n = len(E); sm = [mean(E[max(0, i - 10):i + 10]) for i in range(n)]  # 0.2 s smoothing
    drops, lifts, accents = [], [], []
    for i in range(4 * fps, n - fps):
        dip = mean(sm[i - int(1.2 * fps):i - 5]); before = mean(sm[i - 4 * fps:i - int(1.5 * fps)]); after = mean(sm[i:i + fps // 2])
        if before - dip >= 3.5 and after - dip >= 6.0 and O[i] == max(O[i - 30:i + 30]):
            if not drops or i - drops[-1][0] > 3 * fps: drops.append((i, round(after - dip, 1)))
    for i in range(3 * fps, n - 3 * fps, 5):
        a, b = mean(sm[i - 2 * fps:i]), mean(sm[i:i + 2 * fps])
        if b - a >= 2.0 and all(abs(i - d) > 2 * fps for d, _ in drops):
            j = max(range(i - 30, i + 30), key=lambda k: O[k])
            if not lifts or j - lifts[-1][0] > 4 * fps: lifts.append((j, round(b - a, 1)))
    thr = sorted(O)[int(len(O) * 0.97)]
    for i in range(8, n - 8):
        if O[i] >= thr and O[i] == max(O[i - 8:i + 9]): accents.append(i)
    return sm, drops, lifts, accents

def describe(start, L, sm, drops, lifts, accents, fps=100):
    s, e = int(start * fps), int((start + L) * fps)
    rel = lambda i: round(i / fps - start, 2)
    d = [(rel(i), g) for i, g in drops if s <= i < e]; l = [(rel(i), g) for i, g in lifts if s <= i < e]
    acc = [rel(i) for i in accents if s <= i < e]
    seg = sm[s:e]; loud = mean(seg)
    tail_hit = [a for a in acc if L - 0.9 <= a <= L - 0.1]
    return {'start': round(start, 2), 'end': round(start + L, 2), 'mean_db': round(loud, 1), 'drops': d, 'lifts': l,
            'final_hit': tail_hit[-1] if tail_hit else None, 'accents': acc}

def score(desc, L):
    sc = desc['mean_db']
    if any(0.03 * L <= t <= 0.25 * L for t, _ in desc['drops']): sc += 8          # a breath + drop near the top
    if any(0.5 * L <= t <= 0.85 * L for t, _ in desc['lifts'] + desc['drops']): sc += 5   # a lift into the climax
    if desc['final_hit'] is not None: sc += 4                                       # a hit to end on
    return sc

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('track'); ap.add_argument('--len', type=float, default=30)
    ap.add_argument('--after', type=float, default=0); ap.add_argument('--before', type=float, default=None)
    ap.add_argument('--start', type=float, default=None); ap.add_argument('--json'); ap.add_argument('--top', type=int, default=3)
    ap.add_argument('--sections', default=None, help='loudness per range, e.g. 0.3-1.7,2.5-9.9,20.3-27.9')
    ap.add_argument('--hits', default=None, help='hit times to verify as the loudest local events, e.g. 2.0,20.0,28.0')
    ap.add_argument('--peaks', type=int, default=10, help='with --hits: how many loudest peaks to list')
    ap.add_argument('--hitwin', type=float, default=1.5, help='with --hits: seconds either side to compare against (or time:sec per hit)')
    ap.add_argument('--timeline', type=float, default=None, help='print RMS dB every N seconds')
    ap.add_argument('--from', dest='t_from', type=float, default=0.0); ap.add_argument('--to', dest='t_to', type=float, default=None)
    a = ap.parse_args()
    if a.hits:
        hits_report(a.track, a.hits.split(','), a.peaks, a.hitwin)
        if not a.sections and not a.timeline: return
    if a.timeline:
        rate, L, R = read_stereo(a.track); n = len(L); st = a.timeline; t = a.t_from; end = min(n / rate, a.t_to or n / rate); row = []
        while t < end - 1e-9:
            i0, i1 = int(t * rate), min(n, int((t + st) * rate))
            v = math.sqrt(sum(((L[i] + R[i]) * 0.5) ** 2 for i in range(i0, i1, 4)) / max(1, len(range(i0, i1, 4)))) / 32768.0
            row.append(f'{t:5.2f} {db(v):6.1f}'); t += st
        for i in range(0, len(row), 8): print('  '.join(row[i:i + 8]))
        if not a.sections: return
    x = decode(a.track, 11025); dur = len(x) / 11025; E, O = envelopes(x, 11025); sm, drops, lifts, accents = analyse(E, O)
    if a.sections:
        for r in a.sections.split(','):
            x0, x1 = (float(v) for v in r.split('-')); seg = sm[int(x0 * 100):int(x1 * 100)]
            print(f'section {x0:>6.2f}–{x1:<6.2f}  mean {mean(seg):6.1f} dB')
        return
    print(f'track {dur:.1f}s · drops at {[round(i/100,2) for i,_ in drops]} · lifts at {[round(i/100,2) for i,_ in lifts]}')
    if a.start is not None:
        cands = [describe(a.start, a.len, sm, drops, lifts, accents)]
    else:
        hi = min(dur - a.len, a.before if a.before is not None else dur); cands = []
        t = a.after
        while t <= hi:
            d = describe(t, a.len, sm, drops, lifts, accents); d['score'] = round(score(d, a.len), 2); cands.append(d); t += 0.1
        cands.sort(key=lambda d: -d['score']); picked = []
        for c in cands:
            if all(abs(c['start'] - p['start']) > a.len * 0.4 for p in picked): picked.append(c)
            if len(picked) >= a.top: break
        cands = picked
    for c in cands:
        m, s = divmod(c['start'], 60)
        print(f"\nwindow {int(m)}:{s:04.1f}–{int((c['end'])//60)}:{c['end']%60:04.1f}  mean {c['mean_db']} dB  score {c.get('score','-')}")
        print(f"  drops (film time, gain dB): {c['drops']}\n  lifts: {c['lifts']}\n  final hit: {c['final_hit']}")
        print(f"  strong accents: {c['accents'][:40]}")
    if a.json: json.dump(cands, open(a.json, 'w'), indent=1); print(f'\nwrote {a.json}')

if __name__ == '__main__': main()
