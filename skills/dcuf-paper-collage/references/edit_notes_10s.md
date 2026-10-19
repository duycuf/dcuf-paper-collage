# Edit notes — the 10 s example (assets/template/comp/scenes.js)

Written by the edit agent; picture-side timings as built, numbers are measurements. The score side is in music_notes_10s.md.

The 10.0 s cut (24 fps, AAC, 10.0 s) uses the music agent's new 10 s `score.m4a`, whose cue map matches script.md. I rewrote `comp/scenes.js` (duration 10.0) from the 30 s scene functions. `collage.js` and `collage_fx.js` are untouched (the 30 s scenes ship as assets/examples/kaye_30s_scenes.js). I looked at the stills, the 1 s strip and the 4 fps sheet, fixed what I found, and re-rendered.

**Timings as built** (motion is on twos; t = time in seconds, so 0.333, 0.417 etc. are successive drawings 1/12 s apart):
- **0–1.0, page:** the ▶ drops over 3 drawings (0.333 bottom edge only, 0.417 mid-air at −8°, lands 0.5 at scale 1.035), settles at 0.583. The channel tag appears at 0.5, small cut-outs pop up from 0.583, the helmet peeks from 0.667. The cursor slides in 0.583–0.833 and presses at 0.875, with a 2-frame yellow star.
- **1.0, rip:** the page rips over 3 drawings with confetti. The channel tag stays taped on top, gets swept left at 1.167 and 1.25, and is gone at 1.333 (visible 0.83 s).
- **F1:** the car passes frame centre at 1.75; the helmet comes in at 1.833 and 1.917 and slaps at 2.0. Tag `F1 COMMERCIAL · AI + BLENDER` from 1.083.
- **2.5, camera:** torn wipe into the film camera. The accelerating push into the lens runs 2.65–3.46. The iris pops in at 2.75 and opens 2.9–3.4, with the kaleidoscope already in its centre. The push end is set so the 3.417 drawing already shows the kaleidoscope at about 1000 px radius, and the 3.5 cut carries on as a zoom. Tag `AI REALISM` 2.583–3.417.
- **3.5–4.5, kaleidoscope:** no rotation; the scale doubles every 0.385 s. Flyers (helmet, clap, cam_side) peak at 4.2 R, 4.3 L, 4.4 R. The hex hole is about 35% of frame width at 4.333, about 130% at 4.417, then the full desk at 4.5.
- **4.5–5.5, desk:** the laptop lands at 4.5, then headphones 4.75, MIDI 5.0, gimbal 5.25. `pink race car ✦` types from 4.6 and is complete on the 5.083 drawing. The `generate ✦` press is 5.15 (first pressed drawing 5.167), then the pink car result.
- **5.5–5.92, tilt-up:** the ▶ slaps out of the laptop screen at the head of the strip rocket and shoots off the top by 5.917, while the desk sheet drops away and the cloud banks part.
- **6.0, title:** expo-out over 9 drawings, landing 6.75 with no overshoot, following the reference's bottom-edge positions. Radial burst at 6.0. The biplane crosses 6.3–7.4.
- **7.5–7.92, tear:** page tear, then the band tag from 7.917.
- **8.0–8.5, logo flicker:** clipped to the band only, frame holds 2-1-2-3-2-2, ordered light to dark: posters, pink, lime, orange, streak, glitter. The only dark-to-light jump is back to the lockup at 8.5.
- **End card:** SUBSCRIBE slaps at 8.5, the URL appears at 8.75, click at 9.0 → SUBSCRIBED ✓, bell first wiggle on the 9.167 drawing (≈9.15). Slow push to 10.0.

Punch zooms are on 1.0, 2.5, 4.5, 6.0, 7.5 and 8.5. Every tag is 38–46 px and on screen for at least 0.83 s.

**Things the orchestrator should know:**
1. **On twos:** I checked frame pairs by hash. The only odd-frame changes are 0.875 and 0.958 (the press cue and its 2-frame star) and 8.125 and 8.208 (the specified 1- and 3-frame flicker holds). To get there I quantised two things the 30 s version ran on ones: the F1 background scroll and the glitter/streak noise.
2. **Kaleidoscope stickers:** keeping one car and one reel in the source is not enough, because the mirror repeats each sticker 8× on every ring. I took them out of the source and drew them as two rings in `scenes.js`, each on a single tunnel level. Eight cars run around one ring (3.5 to about 4.1); eight reels sit on the next level, between the cars' angles (about 3.7–4.4). Then the hole and flyers are drawn on top in a second pass with no levels.
3. **Posters flicker look:** CLX's built-in posters style puts the clean band over the poster wall, so inside the band it looked like the lockup. Its generic poster background also shows fragments like "AF/RIC/ZO" from the San Diego Zoo ref. I draw the channel's own poster wall (`CL.posters`) instead, with chrome letters; red letters were unreadable on it.
4. **Bell timing:** CLX rings the bell 0.2 s after the click. To hit 9.15 I draw it in a second, clipped pass with the click time set 0.05 s earlier, so no shared library file was edited.
5. **Cursor and URL:** the button sits at y 876 (h 128) and the URL at y 1004. The cursor is smaller (116), tilted, and clicks the upper-right of SUBSCRIBE, so it never covers the URL; it then leaves to the right.
6. **Weakest moment:** at 5.583–5.667 the strip plume fans out from mid-laptop, like a skirt under the ▶. It is gone in two drawings. I left it as is.
