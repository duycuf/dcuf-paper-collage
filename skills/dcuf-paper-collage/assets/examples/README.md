# Story examples

The main template is `assets/template/` (the 10 s frame: fill in `comp/film.config.js`, no code edits). The files here are **other stories** to read and borrow scenes from. Each file is self-contained, with the original project's words and cut-out names hard-coded (the `COPY` block at the top): copy it into the new project's `comp/scenes.js` (and `audio/score.html`), then replace `COPY`, the cut-out names and `duration`.

| file | length | format | story | worth borrowing |
|---|---|---|---|---|
| `tra-moc_film.config.js` + `tra-moc_palettes.js` | 10 s | 16:9 + 9:16 | **a filled-in 10 s frame**: "Trà Mộc", a fictional tea shop, Vietnamese on-screen words (milk tea glass → delivery scooter → push into the teacup → kaleidoscope → ordering on a phone → TRÀ NGON / TỚI LIỀN. → logo → NHẮN ĐẶT NGAY) | copy over `comp/film.config.js` + `comp/palettes.js` to see a complete config, and how accented words render; photos: search again by name (references/cutouts.md) |
| `kaye_10s_scenes.js` + `kaye_10s_score.html` | 10 s | 16:9 | the skill's original film: a YouTube channel intro (▶ button → F1 car → camera → kaleidoscope → editing desk → title → logo → SUBSCRIBE) | the original of the 10 s frame, to compare against when the template misbehaves |
| `kaye_30s_scenes.js` + `kaye_30s_score.html` | 30 s | 16:9 | the long version of the film above: phone ad, ransom-note letters, a wall of thumbnails | `CLX.ransom`, the thumbnail wall, the phone scene |
| `chapters_12s_scenes.js` + `chapters_12s_score.html` | 12 s | 16:9 | a portfolio in chapters: each service gets its own coloured page and one object (ringing phone + chat bubbles · toolbox + card fan · cash register + printed receipt · poster wall), and at the end every object flies into a book that closes | the card fan (`skillScene`), the printed receipt (`autoScene`), the book swallowing everything (`bookScene`), chapter pages with their own paper strip. `comp/devices.js` has shared versions: `DV.cardFan`, `DV.receipt` |
| `promo_16s_scenes.js` + `promo_16s_score.html` | 16 s | 16:9 | the 10 s frame stretched, more objects per beat | how to stretch each scene with time mapping |
| `promo_16s_9x16_scenes.js` | 16 s | 9:16 | the vertical re-layout of the file above (set `format: '9x16'` in the config) | re-placing the foreground, `landCover`, the bottom 15 % safe zone |
| `test_collage_scenes.js`, `test_fx_scenes.js` | — | 16:9 | test pages for every device in `collage.js` / `collage_fx.js` | when writing a new device |

The `chapters_12s` and `promo_16s*` files were built for a portfolio intro (2026-10-19). Their cut-outs are not included: missing photos render as labelled grey cards; read the `COPY` block and `cuts:` to see which objects they need.

## Changing the length without rewriting scenes
Map time instead of editing the numbers inside a scene: `Cut(a, b, (ctx, t) => titleScene(ctx, t + (6.0 - a)))`. Keep offsets a multiple of 1/12 s. Scenes that draw their neighbour (kaleidoscope → desk via `drawNext`, title → desk before 71/12, last scene → title) must move as one block. Then update `K.setup({bars})`, the music cues and the still times. Times past the film's length hold the last frame.
