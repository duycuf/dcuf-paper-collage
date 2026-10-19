---
name: dcuf-paper-collage
description: >-
  Torn-paper collage motion video, 10–16 s, for any brand: channel intro, shop ad, product launch, portfolio, service promo. Renders 16:9 and
  9:16 from one project (a real vertical re-layout, not a crop). Stop-motion "on twos", built entirely in code; object photos come from free
  stock sites and are cut out locally. Asks the user one question at a time in their own language
  (Vietnamese-ready), with ready-made choices, for non-technical users. Brand palettes from brand colours, numbered font and
  palette sheets, bundled fonts with Vietnamese glyphs, synthesised score with paper foley, photo credits.
  Use for collage / scrapbook / cut-out / ripped-paper / magazine-cutout / mixed-media / zine-style videos, or when someone sends a collage
  reference and says "make it like this" (San Diego Zoo "Africa Rocks" technique). VI: video cắt dán, giấy xé, collage, scrapbook, intro kênh.
  Not for static photo collages, moodboards, split-screen clip grids or a single transition.
---

# dcuf-paper-collage

A collage film is **one continuous stop-motion camera journey through layers of torn paper**, cut to the music. It ends on a big title, a page tear to the logo and a call to action. Everything is code except the photographic object cut-outs.

**The users are shop owners, content creators and marketers, not technical people.** They don't type commands or edit files.
- Talk in the user's language (Vietnamese users: Vietnamese). Ask in plain words, **one question at a time** with the choice tool, always with a recommended option first.
- Skip questions the input already answers. If they say "you decide", pick the default and report it.
- Show anything visual (script table, cut-out sheet, fonts, palettes, drafts) instead of only naming it.
- Commands and paths in this file are Claude's job; never hand them to the user.

`<SKILL>` = the folder of this file. `<CORE>` = the `dcuf-video-core` skill if installed (its `scripts/deliver.mjs` for delivery); without it use the ffmpeg fallback in section 8. HyperFrames is not needed.

## Principles (why: references/lessons.md)
- **Technique from the reference, story from the brand.** Keep the motion grammar; never copy the plot.
- **Metaphor with real objects**: each thing the brand does = one real object + a paper tag. Only one screen in the whole film (the desk). No real screenshots of the client's work, no people, no characters unless asked.
- **Choices as pictures**: fonts → a numbered font sheet, colours → a numbered palette sheet. The user answers with a number.
- **Fast and visible**: send the script table, the cut-out sheet and a draft early; give clock-time ETAs.
- No full-frame flashing (photosensitivity). The logo flicker stays inside the paper band.

## 0 · Machine setup (Claude does it, one line of report)
Needs Node ≥ 22, `ffmpeg`/`ffprobe` on PATH, Chrome/Edge/Brave, `uv` (Python for stock search + cut-outs), internet for stock search. If something is missing, ask "Shall I install …?" and install it (Windows: `winget install OpenJS.NodeJS.LTS` / `Gyan.FFmpeg` / `astral-sh.uv`; macOS: `brew install node ffmpeg uv`). The first cut-out downloads a ~180 MB model to `$U2NET_HOME` (default `~/.u2net`).
macOS can also run the older `.sh`/Swift tools; every command below is the Node/Python version that runs everywhere.

## 1 · Questions (one at a time)
| # | Ask (plain words) | Choices (default in bold) | Goes into |
|---|---|---|---|
| 1 | "What is this video for?" | **Brand ad / introduction** · YouTube channel intro · Product launch · Personal portfolio | `script.md` |
| 2 | "Send me the exact brand name, website/page link, logo, product photos if you have them" | (they drop files / links) | `brief.md` |
| 3 | "Where will you post it?" | **Both: Reels/TikTok (vertical) + YouTube/web (horizontal)** · Vertical 9:16 only · Horizontal 16:9 only | `format` |
| 4 | "Which language for the on-screen words?" | **The user's language** · English · Vietnamese | fonts (section 5) |
| 5 | Script: Claude **proposes** 2 versions from their material (section 3) and shows the table | Version A · Version B · Edit the words | `script.md` |
| 6 | Colours: **send the palette sheet** (section 6) | number 0–3 | `palette` |
| 7 | Title font: **send the font sheet** (section 6) | number 1–8 | `titleFont` |
| 8 | "What should viewers do at the end?" | **Message / contact** · Visit the website · Follow the channel · Order | `cta`, `url` |

- Music defaults to the bundled synthesised score, already cut to the beats. Use their own track only if they bring it up (section 7).
- **Summarise before building**: "you chose" and "I decided", then ask "Shall I go ahead?". Picking an option is not a go-ahead.

Say it the user's way:
| Don't say | Say (EN) | Say (VI) |
|---|---|---|
| cut-out, sprite | object photo | ảnh vật cắt rời |
| palette, grade | colour set | bảng màu |
| keyframe, beat, cue | moment, beat of the music | khoảnh khắc, nhịp |
| render, draft | export the video, draft | xuất video, bản nháp |
| 9:16 / 16:9 | vertical (phone) / horizontal (computer) | khổ dọc / khổ ngang |

## 2 · Project (1 minute)
```bash
node <SKILL>/scripts/new_project.mjs <folder> <slug>
cd <folder>/<slug>      # every command below runs inside the project (agents: prefix each call with `cd <project> &&`)
```
Creates `comp/` (the film), `audio/score.html` (the music), `tools/`, `cutouts/`, `keyframes/raw/`, `refs/`, `review/`. **Everything brand-specific lives in one file: `comp/film.config.js`** (words, cut-out names per beat, format, palette, fonts). `comp/scenes.js` only reads it; no code edits for the 10 s film.
Missing cut-outs render as **labelled grey cards**, so a draft works from minute one. Background cut-outs (grass, rocks, trees, clouds, `cassette`) are optional: without them the engine draws plain paper.

## 3 · Story + script table (send within ~15 minutes)
Read the brand's website / material, pick **3 things they do** (or 3 products), one real object each. Write `script.md`: `seconds | music | what we see | on-screen words (verbatim)`. 120 BPM grid, 24 fps. Each tag ≤ ~32 characters, title 2 short lines.

**The 10 s frame (bundled template, `film.config.js`)**
| seconds | beat | config field |
|---|---|---|
| 0–1.0 | paper page; the hero object drops (lands 0.5), 3 small objects pop up, opening tag, cursor presses 0.875 | `hero`, `pops`, `peek`, `openTag` |
| 1.0–2.5 | the page rips from the centre → **thing 1**: an object flies through diagonal bands, 3 chat bubbles | `world1` |
| 2.5–3.5 | torn wipe → **thing 2**: camera push into a round shape (lens, cup mouth, clock face), paper iris | `lens` |
| 3.5–4.5 | kaleidoscope, 3 rings + 3 flyers, hexagon hole → desk | `kaleido` |
| 4.5–5.5 | **thing 3**: phone or laptop on a desk, an order / prompt types, button press, 3 objects slap down | `desk` (`device`) |
| 5.5–6.0 | tilt up, a plume of paper strips carries the hero away | `hero` |
| 6.0–7.5 | **big title** drops, 2 objects cross | `title`, `titleFont`, `titleFly` |
| 7.5–8.5 | page tear → logo band + role line, logo flicker inside the band | `brand`, `role`, `logoFont`, `extraTag` |
| 8.5–10 | call-to-action button slaps, click at 9.0 → label changes, URL | `cta`, `url` |

Mapping examples:
| beat | bubble-tea shop | photo studio | furniture shop |
|---|---|---|---|
| hero | a glass of milk tea | a camera | an armchair |
| thing 1 (flies through bands) | delivery scooter + bubble "1 boba tea please" | a lens | a delivery van |
| thing 2 (round shape) | the cup seen from above | the lens | a round mirror |
| kaleidoscope | tapioca pearls, tea leaves, ice | film rolls, flash | cushions, lamps |
| desk | **phone** ordering + cash register | laptop editing photos | phone booking a consultation |

Other stories than the 10 s frame (edit `scenes.js`, see `assets/examples/README.md`): 12 s in chapters (one page per thing, at the end every object flies into a book), 16 s with its own vertical version, 30 s (phone ad, ransom letters, thumbnail wall). **Send the script table and wait for the go-ahead before searching photos.**

**Phone or laptop** (`desk.device`): use the device the brand's customers use for that thing. Ordering, booking, messaging, online shopping → `'phone'` (drawn in code, no photo, nothing to measure; app-style screen: header `ui`, order card `label` + `prompt`, button `button`, item row `menu` + `menuLabel`, finger tap). Working, designing, writing, coding → `'laptop'` (laptop photo + `screenQuad`).

## 4 · Object cut-outs (free stock + local cut-out)
Only what code can't draw. Order: the client's own photos (products, logo) → free stock. Details: references/cutouts.md.
```bash
uv run tools/stock_search.py search "<object> isolated white background"          # → refs/stock/<q>/sheet.jpg (numbered)
uv run tools/stock_search.py get refs/stock/<q>/results.json 3 --name <name>_raw  # → keyframes/raw/ + a credit row in cutouts/credits.md
uv run tools/cutout.py keyframes/raw/<name>_raw.jpg cutouts/<name>.png            # background removal + white paper border
```
- **Look at `sheet.jpg` before picking**: one object, plain background, sharp, ≥ 1200 px, no other brands' logos, no people.
- Keyless sources: Wikimedia Commons, Openverse, Internet Archive. Pexels/Pixabay only with `PEXELS_API_KEY`/`PIXABAY_API_KEY` in the environment. **Never write keys into files.**
- **Safe sources only**: no political material or politically sensitive topics, even when public domain. Read the source name and subject before downloading.
- Agents can search in parallel (references/agent_workflow.md). Every agent brief says: never put the user's email, name or personal details into a User-Agent or any request.
- **Measure on the new photo** (pixel coordinates of the cut-out, open the PNG and look):
  - `lens.lensPx` + `lens.lensR`: centre and radius of the round shape to push into; `lens.spriteSize` = the PNG size.
  - `desk.screenQuad`: the laptop screen's 4 corners (top-left, top-right, bottom-right, bottom-left); `desk.spriteSize`. Skip for the drawn phone.
- A logo file → `cutouts/logo.png`. A text logo → `brand` + `logoFont`.
- Send a sheet of the cut-outs on a coloured background (red + cyan) for approval: no halo of the old background, nothing missing.
- When the photos are done: `node tools/credits.mjs [--lang vi]` → `cutouts/credits_all.md` + a credit block to paste into the video description (CC BY / BY-SA photos require it).

## 5 · Words and fonts
- Every on-screen word lives in `film.config.js`. On-screen UI words: `desk.ui`, `desk.label`, `desk.placeholder`, `desk.prompt`, `desk.button`, `desk.menuLabel`.
- **Fonts are bundled in the project** (`comp/fonts/`, woff2 with the Vietnamese + Latin subsets; no Google Fonts download at render), so accented letters always come from the right face, never from a fallback.
- **With Vietnamese glyphs**: Be Vietnam Pro, Inter Tight, Lexend, Unbounded, Baloo 2, Lobster, Yeseva One, Playfair Display, Fraunces, Alfa Slab One, Bevan, Anton, Bungee, Gluten, JetBrains Mono. The CTA button, ransom letters, tags and bubbles already use these.
- **Without Vietnamese glyphs** (Latin decoration only): Chewy, Ultra, Rubik, Lilita One, Shrikhand, Chango, Rye, Cinzel, Abril Fatface, Special Elite, Permanent Marker, Instrument Serif. The default logo font is `'Baloo 2:800'`; `'Chewy'` only for names without accents.
- **Add a font** (the brand's font on Google Fonts):
  ```bash
  node tools/fonts_fetch.mjs --check "Font Name"        # does it have Vietnamese?
  node tools/fonts_fetch.mjs "Font Name:900"            # download to comp/fonts/ + update fonts.css
  ```
  Then add the face to `fonts()` in `comp/film.js` (e.g. `'900 96px "Font Name"'`) and set `titleFont`/`logoFont`. Load **one** weight per family for the title (the engine draws with the loaded face).
- Commercial "Vietnamised" fonts (SVN-/UTM- families) are often free for personal use only: use them only when the client owns the file and the right to use it. Copy the .woff2/.ttf into `comp/fonts/` and add an `@font-face` line at the end of `fonts.css`.
- Check accents on stills: zoom into every text (tags, bubbles, screen, button, URL); accented letters in the same face as the rest, marks clear of the paper border, the second title line keeps its marks.

## 6 · Colours and title font: chosen from pictures
```bash
node tools/brand_palette.mjs --primary "#hex" [--secondary "#hex"] [--accent "#hex"] [--ink "#hex"] [--paper "#hex"]
node tools/palette_sheet.mjs 1.5 4.3 6.9 8.75 --pals orig,brand,brandVivid,brandDark [--format 9x16]
node tools/font_sheet.mjs "LINE 1|LINE 2" "Be Vietnam Pro:900|Playfair Display:italic 900|Yeseva One|Lobster|Unbounded:900|Lexend:800|Baloo 2:800|Fraunces:italic 900"
```
- The primary colour comes from the brand's logo / website. The script writes 3 palettes into `comp/palettes.js`:
  - `brand`: light paper ground, closest to the website but flatter.
  - `brandVivid`: big fields in a contrasting colour, the collage pops most. **Recommend this one.**
  - `brandDark`: dark ground.
- Send `review/palettes_sheet.png` (row 0 = the engine's original colours). The user picks a number → `palette:` in the config.
- **Check for a mauve cast**: the palette remaps every pixel, product photos and logo included. The engine's sky blues can turn mauve; `unblue` (0–1) in a palette fixes it. Products must keep their true colours.
- Font sheet: `review/title_fonts_sheet.png`, numbered, already graded with the chosen palette.

## 7 · Music
`audio/score.html` synthesises the score in the browser (funk + paper foley: slaps, rips, whooshes, pops, typing, clicks), already cut to the 10 s frame.
- Re-time: `window.SCORE_CONFIG` {dur, drop, mid, build, vac, lift, end} and `window.SCORE_CUES` in the first `<script>` of the file.
- Remove sounds for events the film doesn't have: delete the line in `paper()`; don't set a cue to null (it throws).
```bash
node tools/render_audio.mjs "<project>/audio/score.html" audio/score.wav
node tools/aac.mjs audio/score.wav audio/score.m4a
python tools/music_window.py audio/score.wav --hits 0.5:0.35,1.0:1.0,6.0:1.0,7.5:0.45,8.5:1.0   # each big hit loudest in its window
```
The client's own track: `python tools/music_window.py track.mp3 --len 10` → pick a window → `python tools/cut_audio.py track.mp3 <start> 10 audio/score.m4a`, then move the picture to the track's beats. Claude cannot hear: verify by numbers (references/music_notes_10s.md) and say so.

## 8 · Draft → review → final → delivery
```bash
node tools/render_film.mjs draft                                   # ~30 s → <slug>_draft.mp4
node tools/render_film.mjs draft --format 9x16                     # vertical from the same config → <slug>_draft_9x16.mp4
node tools/strip.mjs .frames_draft review/strip.png 1              # a frame strip to check yourself
node tools/capture.mjs comp/index.html review/st --stills 0.5,1.75,3.0,4.1,5.0,6.9,8.2,9.5 [--query format=9x16]
node tools/render_film.mjs final audio/score.m4a <slug>_final.mp4 [--format 9x16]
node <CORE>/scripts/deliver.mjs <slug>_final.mp4 --out <delivery folder> --name "<Brand> - Intro" --version "v1" --cover-at 6.9
```
- Send the draft with a few stills. Apply the feedback, then render the final.
- Only **one** render per project at a time (a render wipes its frames folder).
- `deliver.mjs`: −14 LUFS, file name `<name> - 16x9|9x16 - <version>.mp4`, cover image.
- Without dcuf-video-core: loudness `ffmpeg -i <slug>_final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 256k "<Brand> - Intro - 16x9 - v1.mp4"`, cover `ffmpeg -ss 6.9 -i <slug>_final.mp4 -frames:v 1 cover.png`.

## Motion grammar (San Diego measurements, references/reference_san_diego.md)
- Everything **on twos** (12 drawings/s): `q(t) = floor(t*12)/12`, 1–2 px layer boil per drawing.
- **No hard cuts before the logo**: zoom-throughs, page rip, torn wipe, hexagon hole, tilt-up behind a strip plume.
- Drop-in: 3 drawings (edge enters → mid-air −8° → lands) + 1 settle drawing (1.03→1). Pop-ups: 1–2 drawings.
- Push into a detail: exponential zoom ~1→6× over ~1 s, the zoom centre slides onto the detail.
- Kaleidoscope: mirrored rings, **no rotation**, scale doubles every ~0.35–0.38 s; a repeated object only as one ring.
- The title lands from above, expo-out over 9 drawings, no overshoot, white paper outline + perspective extrusion.
- Page tear ~0.42 s with a dark curling back → a paper band with the wordmark; logo looks held 2-1-2-3-2-2 frames, inside the band only.
- When the user sends a reference clip, **its measurements win** over the numbers above: extract 12 fps frames (`tools/extract.mjs`), make sheets (`tools/sheet.mjs`), write `refs/analysis.md` with the headings of reference_san_diego.md.

## Vertical 9:16
Same project, same config, add `--format 9x16`. `scenes.js` has a separate vertical layout table (`L = pick({landscape}, {vertical})`), not a crop of the horizontal film:
- backgrounds designed for landscape go through `landCover()` (scaled ×1.78 to cover 1080×1920);
- foreground objects re-placed for portrait, type ×1.3;
- **keep the bottom 15 % free** for the Reels/TikTok UI: no title, URL or CTA there.

## Check before sending (look at the frames yourself)
- Sync: picture events vs the `--hits` / `--timeline` peaks, ≤ 1 frame.
- On twos: frame pairs identical except deliberate 1-frame events.
- Joins: no empty or jumping frames; nothing static > ~1 s except title / logo holds.
- Nothing covers the hero object, the title, the button label, the URL (watch cursor paths and objects crossing the title).
- The logo reads on the chosen palette's ground (enough contrast).
- Paper tags ≥ 36 px, each ≥ 0.8 s; title ≥ 1.5 s; logo ≥ 1.5 s.
- No grey "missing cut-out" cards left in the foreground. No odd mauve cast. Accented letters in the right font.
- Vertical: nothing important in the bottom 15 %.
- Exact duration (`ffprobe`), sound present, peak ≤ −1 dBFS.
- CC BY / BY-SA photos credited.

## Files
| need | where |
|---|---|
| story examples (10 s, 12 s chapters, 16 s landscape + vertical, 30 s) | assets/examples/README.md |
| San Diego grammar measured frame by frame, palette, fonts | references/reference_san_diego.md |
| API of CL / CLX / DV (ready-made devices) | references/api.md + headers of collage.js, collage_fx.js, devices.js |
| photo sources, search tips, cut-outs | references/cutouts.md |
| score cue map + measurements | references/music_notes_10s.md |
| as-built timings of the 10 s frame, editing gotchas | references/edit_notes_10s.md |
| running several agents in parallel | references/agent_workflow.md |
| why the defaults are what they are | references/lessons.md |
| device test pages | assets/examples/test_collage_scenes.js, test_fx_scenes.js |
