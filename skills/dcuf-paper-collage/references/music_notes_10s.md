# Score notes — the 10 s example (assets/template/audio/score.html)

Written by the music agent for the kaye.creatives 10 s cut; every number is a measurement (nobody can hear the render). Use it as the model for re-arranging the synth to a new cue map and for the QA numbers. The picture-side notes for the same cut are in edit_notes_10s.md.

10.0 s · 120 BPM (beat 0.5 s = 12 frames, bar 2 s) · key +2 (E-dorian funk vamp, E-major final chord) · 48 kHz stereo.
Synthesised in code (OfflineAudioContext, no samples). The sound palette is the 30 s one: breakbeat, funk bass, clav, FM e-piano, pad, square-lead hook, bells, and synthesised paper foley.
I can't hear the result, so everything below was checked with numbers only.

## Files
- `audio/score.html`: the 10 s arrangement. Its defaults are in `window.SCORE_CONFIG`, so it renders the same with or without URL params.
- `audio/score.wav`: 16-bit, 48 kHz, exactly 10.000 s, peak −2.20 dBFS. Use it for measurements.
- `audio/score.m4a`: AAC 256 kb/s, 10.000 s, peak **−1.60 dBFS**. This is the file `tools/render_film.sh` muxes.
- 30 s version of the same score: `assets/examples/kaye_30s_score.html` (scenes: `kaye_30s_scenes.js`).

## Render
```bash
node tools/render_audio.mjs "audio/score.html?preset=pulse&bpm=120&dur=10&drop=1&vac=5.95&lift=6&end=8.5&key=2" audio/score.wav
afconvert -f m4af -d aac -b 256000 audio/score.wav audio/score.m4a
```
A render takes about 4 s. Two renders can differ by up to 3 LSB in about 0.1 % of samples, because Chrome's threaded convolver isn't bit-exact. This has no effect on any number below.
Stems: `lv_<layer>=0` mutes a layer, for example `&lv_groove=0` (foley + hits only) or `&lv_foley=0&lv_hit=0` (groove only). Add `&drive=0&stutter=0` for raw stems.

## Parameters (SCORE_CONFIG, overridable from the URL)
| key | value | meaning |
|---|---|---|
| dur / drop / build / mid / vac / lift / end | 10 / 1.0 / 5.5 / 3.0 / 5.95 / 6.0 / 8.5 | length, drop, riser start, groove A→B, breath, lift, final hit |
| key, bpm | 2, 120 | |
| drive, rel, hitgain, ceil, ref | 15.2, 0.012, 0.45, −2.2, 4.56 | same gain staging as the 30 s mix |
| hitpad | 1.0 (default) | **new**: hit emphasis. Only the 5 big hits may reach the ceiling. Everything else is limited 1 dB lower (dB ramps: 5 ms in, 60 ms out, full ceiling from hit −0.01 to +0.30 s). This keeps the hits the true peaks after AAC, whose ~1–1.4 dB transient overshoot otherwise let a snare at 6.5 out-peak the 6.0 slam in the m4a. |
| stutter | on | `0` turns off the second render pass |

All cue times are in `CUE` and can be moved with `window.SCORE_CUES`. They are: `slap, slide, press, car[t0,peak,t1], helmet, wipe, lens[a,b], iris[a,b], swirl[a,b], fly[3], pops[4], type[a,b], gen, plane[t0,peak,t1], rip, ripLen, stut[a,b], stutFrames, stutSemi, subClick, ding, fade`.

## Cue map (film seconds) and what plays
| t | film | sound |
|---|---|---|
| 0–1.0 | collage page | Light intro groove behind a 1.2 kHz low-pass (2-beat pickup): breakbeat, clav, e-piano, pad, paper crackle bed. |
| **0.50** | ▶ plate lands | Paper SLAP on the hit bus (crack, flap, thud, crinkle) + kick + small boom. Short falling air over 0.33–0.5. Settle slap at 0.583. |
| 0.60–0.85 | cursor slides in | Soft paper slide, R→C. |
| 0.875 | cursor presses ▶ | Mouse click + paper press. The low-pass opens 0.875→1.0. Snare pickups at 0.75 and 0.9375, reverse swell into 1.0. |
| **1.00 DROP** | page tears from the centre | Big hit: kick, 808 boom, crash, noise burst, Dm9 stab, plus two outward paper RIPs of 0.25 s (L and R). Full groove (bars start on 1.0: Dm9 1–3, G13 3–5, Dm9 5–5.5). |
| 1.1–2.45 | F1 car | Doppler car pass, loudest at **1.75**. Pan L→R: +21 dB L at 1.3, centre at 1.78, −21 dB at 2.25. Plus a tyre swoosh. |
| 2.00 | helmet lands | Paper slap (size 1.2). |
| 2.50 | torn wipe | Short paper rip (0.17 s, R→L). |
| 2.5–3.5 | push into the lens | Rising whoosh + pitched riser ending exactly on **3.5**. Iris-blade flicks, one per drawing, at 2.917…3.333. Small boom on 3.5. |
| 3.5–4.5 | kaleidoscope | Swirl (three LFO band-passes circling the stereo field, full after 0.1 s). Zoom-through swoosh at 3.53. The groove gets a +9 dB peaking sweep 400→4500→600 Hz. Cut-out whooshes peak at **4.2 / 4.3 / 4.4** (R, L, R, rising). Reverse swell into the hexagon hole at 4.5. |
| 4.5–5.25 | desk | Item landings, each a paper slap + rising "bwip" pop: laptop 4.5 (bigger), headphones 4.75, MIDI 5.0, gimbal 5.25. |
| 4.6–5.1 | prompt types | **Typing**: 13 laptop key ticks, one per frame (1/24 s). Click + low thock, with lower "space" keys at 4.767 and 4.975. Each tick is about +10 dB over the background in the high band. |
| 5.15 | click "generate ✦" | Mouse click + paper press + three bell glints. |
| 5.5–5.95 | strip rocket | Riser over A7sus→A7: 32nd bass climbing octaves, accelerating snare roll (32nds → 35 ms), clav 16ths, synth riser, rising whoosh, reverse cymbal. It cuts dead at 5.95. |
| 5.95–6.0 | breath | **Digital silence** from 5.962 to 5.998. Mean over 5.95–6.00 is −48.8 dB. |
| **6.00 LIFT** | KAYE / CREATES lands | Title SLAM: big hit + paper slab slap + crash, Bbmaj9 stab (deceptive from A7), outward strip-burst swoosh, sparkle. Climax groove with the square-lead hook. |
| 6.3–7.4 | biplane | Doppler fly-by with propeller chop (23 Hz), loudest at **6.87**. Pan L→R: +7.6 dB L at 6.5, −7.4 dB at 7.2. |
| **7.50–7.92** | page tear → logo band | Long paper RIP panned L→R (L +1.6 dB at 7.5, R +5.5 dB at 7.85). Strong first tear, boom, kick, C6/9 clav push (anticipates the 8.0 bar). The groove ducks to −9 dB (×0.35) until 7.87 and is back by 7.98. The curl lands at 7.92 (soft slap, R). |
| **8.00–8.50** | logo style flicker | GLITCH STUTTER (second render pass). 6 slices of **2-1-2-3-2-2 frames** (onsets 8.000 / 8.083 / 8.125 / 8.208 / 8.333 / 8.417). Each re-triggers the 8.0 downbeat (kick, bass, C6/9). Pitch +0, 0, +1, +3, +5 semitones. Treatments in order: clean · 3-bit crush · telephone · octave up · dark low-pass. The last slice is reversed, so it swells into the 8.5 hit. |
| **8.50 FINAL** | SUBSCRIBE slaps down | Final hit (D6/9, Picardy major; Bb→C→D = bVI–bVII–I) + paper slab slap + crash, sparkle, held pad, e-piano, bass. |
| 9.00 | cursor clicks SUBSCRIBE | Click + paper press + pop. |
| 9.15 | bell | Desk-bell "ding" (F#6). |
| 9.35–9.98 | tail | Master **and** hit bus fade linearly to 0 at 9.98. The last 20 ms is digital silence. |

## Measurements (final files, `tools/music_window.py`)
Sections (WAV, mean of the 0.2 s smoothed envelope):

| section | range (s) | result | 30 s reference |
|---|---|---|---|
| intro | 0.12–0.38 / 0.62–0.85 | **−24.9 / −25.1** | −24.0 |
| groove | 1.3–5.4 | **−18.2** | −18.5 |
| F1 / lens / kaleido / desk | 1.3–2.45 / 2.6–3.4 / 3.6–4.4 / 4.6–5.4 | −17.6 / −17.1 / −18.7 / −18.1 | |
| riser | 5.5–5.9 | −17.7 | −16.2 |
| climax incl. plane | 6.3–7.4 | **−15.8** | −16.7 |
| rip | 7.55–7.92 | −16.5 | |
| stutter | 8.0–8.45 | −19.1 | −19.1 |
| final hit + tail | 8.6–9.3 | −13.0 | |
| fade | 9.4–9.95 | −31.5 | |

Breath (`--timeline 0.01`):
- 5.95: −42.3
- 5.96: −67.0
- 5.97 and 5.98: digital silence
- 5.99: −59.6

The 0.2 s smoothing in `--sections` can't resolve a 50 ms gap, so use `--timeline` for the breath.

Hits (`--hits 0.5:0.35,1.0:1.0,6.0:1.0,7.5:0.45,8.5:1.0`). A hit counts as loudest when its 100 ms RMS beats every other 100 ms window in the range, and its peak is not lower than any other peak there.

| hit | window | WAV RMS margin | WAV peak | m4a RMS margin | m4a peak | loudest (WAV / m4a) | nearest rival |
|---|---|---|---|---|---|---|---|
| 0.50 | ±0.35 | **+10.1 dB** | +10.8 | +10.1 | +11.1 | yes / yes | intro groove |
| 1.00 | ±1.0 | **+4.1 dB** | tied | +4.0 | tied | yes / yes | the 0.5 slap |
| 6.00 | ±1.0 | **+4.1 dB** | +1.0 | +4.0 | +0.1 | yes / yes | kick at 6.73; riser at 5.70 (peak) |
| 7.50 | ±0.45 | **+1.9 dB** | +1.0 | +1.8 | +1.2 | yes / yes | climax kick at 7.35 |
| 8.50 | ±1.0 | **+2.0 dB** | tied | +2.1 | −0.1 (inside 0.98 tolerance) | yes / yes | the 7.5 rip |

`--timeline 0.25` shows each hit as a local maximum: 0.5 −16.8, 1.0 −9.7, 6.0 −8.4, 7.5 −12.3, 8.5 −8.4.

Peaks and length:
- WAV: −2.20 dBFS. Non-hit material peaks at −3.2 because of `hitpad`.
- m4a: **−1.60 dBFS** at 1.20, inside the drop (≤ −1 ✓).
- `afinfo` reports 10.000000 s for both files.
- The limiter is active for 2.95 s in total.

Onsets (foley + hits stem, 1 ms resolution, offset from the cue):
- 0 ms: 0.5, 0.583, 0.875, 1.0, 2.5, 4.5, 4.75, 5.0, 5.15, 5.25, 6.0, 7.5, 8.5 and the typing ticks.
- The helmet (2.0), the clicks/ding at 9.0 and 9.15, and the iris flicks sit on top of louder sounds, so the onset detector can't see them. They're placed in code on the exact frame. The high band shows them as clear bursts: helmet +18 dB, 9.0 click +9.8 dB, 9.15 ding +11 dB, 5.15 click +12.5 dB.

## Changes from the 30 s score
- `paper()` arrangement is rewritten to the 10 s map. Dropped (no room on the map): the shutter, the hook bell preview, magazine letters, thumbnail cards, the scratch, and the 32nd fill after the stutter.
- Added: `keyTick()` (laptop typing), the 2.5 wipe rip, the 3.53 zoom-through swoosh, the generate click with bell glints, and an explicit hit-bus fade.
- `stutterPass()` now takes variable slice lengths (`CUE.stutFrames`) and per-slice semitones (`CUE.stutSemi`). The reversed slice ends on the downbeat transient, so it works as a reverse swell into 8.5.
- Helpers got optional arguments, with defaults that keep the 30 s behaviour:
  - `swirl(..., att)`: faster swell.
  - `riseWhoosh(..., {floor})`: audible earlier on a short push.
  - `paperRip(..., {sus, endLv})`: the 7.5 rip uses sus 0.33 / endLv 0.38 / dens 0.75, so its crackle body stays about 1 dB under the limiter. At 0.6 its HF grains clipped and AAC overshot to −0.84 dBFS.
  - `limitInPlace(..., ceilAt)`: per-sample ceiling, used for `hitpad`.
- Foley was raised wherever the 30 s levels would be masked in the denser 10 s groove: kaleido whooshes ×2, swirl ×3, lens whoosh 0.3 with an early floor, flicks ×2, clicks on 5.15 and 9.0.

## Limits / notes
- Reading the m4a with `music_window.py --sections` shows about +2.6 dB more than the WAV, because afconvert's mono downmix sums L+R. `--hits` and `--timeline` read stereo as (L+R)/2 and match the WAV.
- The 6.0 m4a peak margin over the riser is small (+0.1 dB). The RMS margin (+4 dB) is what you hear. If a later re-render (for example after a cue move) flips it, raise `hitpad` to 1.3.
- Groove bars restart on each big section: groove from 1.0, climax from 6.0, tail from 8.5. The intro is a 2-beat pickup. Every hit (1.0, 6.0, 8.0 stutter) is a downbeat, and 7.5 is the beat-4 push.
