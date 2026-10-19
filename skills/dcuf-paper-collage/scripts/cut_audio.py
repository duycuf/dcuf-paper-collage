#!/usr/bin/env python3
"""Cut a music segment for the film: 48 kHz stereo, short fade-in, shaped fade-out, AAC 256 kbps.
usage: cut_audio.py <track> <start_s> <len_s> <out.m4a> [--fade 0.25] [--fadein 0.012]"""
import argparse, array, os, shutil, subprocess, sys, tempfile, wave
ap = argparse.ArgumentParser(); ap.add_argument('track'); ap.add_argument('start', type=float); ap.add_argument('length', type=float); ap.add_argument('out')
ap.add_argument('--fade', type=float, default=0.25); ap.add_argument('--fadein', type=float, default=0.012); a = ap.parse_args()
tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
if shutil.which('afconvert'): subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@48000', '-c', '2', a.track, tmp], check=True)
else: subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.track, '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', tmp], check=True)
w = wave.open(tmp, 'rb'); sr, ch = w.getframerate(), w.getnchannels(); d = array.array('h', w.readframes(w.getnframes())); w.close()
s0 = int(a.start * sr); N = int(a.length * sr); seg = d[s0 * ch:(s0 + N) * ch]; N = len(seg) // ch
for i in range(N):
    t = i / sr; g = 1.0
    if t < a.fadein: g = t / a.fadein
    if t > a.length - a.fade: g = max(0.0, (a.length - t) / a.fade) ** 1.5
    if g < 1.0:
        for c in range(ch): seg[i * ch + c] = int(seg[i * ch + c] * g)
o = wave.open(tmp, 'wb'); o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr); o.writeframes(seg.tobytes()); o.close()
if a.out.endswith('.wav'): os.replace(tmp, a.out)
elif shutil.which('afconvert'): subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '256000', tmp, a.out], check=True); os.unlink(tmp)
else:  # aac_mf (Windows) keeps the peak like afconvert; ffmpeg's built-in aac overshoots ~1.5 dB
    enc = 'aac_mf' if ' aac_mf ' in subprocess.run(['ffmpeg', '-hide_banner', '-encoders'], capture_output=True, text=True).stdout else 'aac'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-c:a', enc, '-b:a', '256k', a.out], check=True); os.unlink(tmp)
print(f'wrote {a.out} ({N / sr:.2f}s from {a.start:.2f}s)')
