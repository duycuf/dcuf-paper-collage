# Photo cut-outs — the only photographic images

Code draws every paper layer, edge, halftone, sky, strip, transition and letter. A photo is needed only when code cannot fake it convincingly: **photographic objects** (cameras, cars, planes, devices, props, animals, plants, rocks, clouds, grass texture). Never whole backgrounds/plates, people or characters unless the user explicitly asks.

## Default: free stock + local cut-out (no credits)

Order of sources: the user's own photos (products, logo, their gear) → free stock. `tools/stock_search.py` and `tools/cutout.py` run with `uv run` (uv installs their Python deps; nothing global).

**Search → look → pick**
```bash
uv run tools/stock_search.py search "<object> isolated white background" --n 8          # all sources that work now
uv run tools/stock_search.py search "<object>" --src pixabay --transparent              # PNGs that already have alpha (needs PIXABAY_API_KEY)
uv run tools/stock_search.py get refs/stock/<q>/results.json <n> --name <name>_raw      # full file → keyframes/raw/, credit row → cutouts/credits.md
```
| source | what | key | licence handling |
|---|---|---|---|
| `commons` (Wikimedia) | best for vintage objects, product shots on white | none | NC/ND and unknown licences dropped; most need attribution (CC BY / BY-SA) |
| `openverse` | Flickr, museums, Commons… | none | only "commercial + modification" licences; the API is slow and sometimes returns 504, so the tool gives up after 20 s |
| `archive` (Internet Archive) | old photos/films; `--collection prelinger` = public-domain films | none | licence often unstated: open the page, skip if unclear |
| `pexels` | modern photos/video, Pexels License, no attribution | `PEXELS_API_KEY` | — |
| `pixabay` | photos, transparent PNGs (`--transparent`), video | `PIXABAY_API_KEY` | Pixabay Content License, no attribution |
Keys are free (pexels.com/api, pixabay.com/api/docs) and live only in environment variables, never in files.

Search words that work: add "isolated", "white background", "studio", "product", "vintage"; the object's real name ("Bell & Howell super 8", "biplane") beats generic words. Read `sheet.jpg` (numbered, licence + size under each): pick **one** object, plain or simple background, sharp, ≥ 1200 px, whole object in frame, no readable brand logos or people. A logo on a vintage object is usually fine; a modern brand mark is not. Clouds/skies: a single cloud on blue sky.

**Cut out**
```bash
uv run tools/cutout.py keyframes/raw/<name>_raw.jpg cutouts/<name>.png                 # objects: rembg isnet-general-use + paper border
uv run tools/cutout.py … --model birefnet-general                                        # hair/fine edges/complex shapes (900 MB model, slower)
uv run tools/cutout.py … --key sky --bw --halftone 0.6                                   # clouds (colour key; rembg grabs the sky too)
uv run tools/cutout.py … --bw --halftone 0.5                                             # b/w halftone rocks, trees (the San Diego look)
uv run tools/cutout.py … --all                                                           # keep several pieces (a sheet of objects; default keeps the largest)
```
It removes the background, keeps the largest piece, then bakes the **hand-cut white paper border** the engine expects (`--border 0.018` of the object's long side, `--rough 0..2` wobble; `--no-border` for a clean cut), tight-crops with 6 px padding. collage.js adds the drop shadow itself. Models download once to `$U2NET_HOME` (default `~/.u2net`; point it at one shared cache folder per machine). Check every cut-out on red + cyan before use: no halo of the old background, no missing parts (thin straps, wheels), border even.

`cutouts/credits.md` is the list of every file used: copy its CC BY / BY-SA credits into the video description (creator, licence, link). Pexels/Pixabay/CC0/PD need no credit, but keep the rows.

**Measure every stock cut-out that the config positions by pixels** (open the PNG, read its size, find the points):
- `lens`: `lensPx` = centre of the round thing to push into (lens, cup mouth, clock face, mirror), `lensR` = its radius, `spriteSize` = PNG size.
- `desk`: `screenQuad` = the laptop screen's 4 corners (top-left, top-right, bottom-right, bottom-left), `spriteSize` = PNG size. The UI text is drawn into that quad.

## Slots of the 10 s template (`comp/film.config.js`)
| slot | default name | what to find (examples) |
|---|---|---|
| hero | `hero` | the brand's main object: product, cup, camera, chair. Drops at 0.5 s, rides the rocket at 5.5 s. 3/4 view, ≥ 1500 px |
| pops ×3, peek | `pop_a…c`, `peek` | small props of the same world; `peek` is a big one that rises from the corner |
| world1 | `world1` | something that *moves*: scooter, van, plane, paper plane, bike (flies through the diagonal bands) |
| lens | `cam_front` | an object with a big round face seen from the front (camera lens, cup from above, clock, mirror, plate) |
| kaleido rings ×3, flyers ×3 | `ring_a…c`, `fly_a…c` | small objects that read at 120 px: beans, leaves, coins, stars; flyers = 3 bigger objects |
| desk laptop + gear ×3 | `laptop`, `desk_a…c` | an open laptop 3/4 (screen visible, any content: it is covered by the UI); 3 tools of the trade |
| titleFly ×2 | `cross_a`, `cross_b` | two objects that cross above / below the title (keep them clear of the letters) |
| backgrounds (optional) | `grass_strip`, `rocks_a…c`, `tree_a/b`, `cloud_1…4`, `cassette` | the San Diego textures; missing ones draw plain paper. Re-skin them: grass_strip = a torn strip of any texture (tea leaves, fabric), rocks = b/w halftone objects (`--bw --halftone 0.5`) |
Names are free: write the file name you used into the config.

## Optional: AI generation, only when the user asks for it by name (e.g. a Higgsfield connector)
- Tool: `generate_image_batch` (up to 12 per call), model `nano_banana_pro`, `aspect_ratio: "16:9"`, `resolution: "2k"`. ~2 credits each, ~1 min per batch. Poll with `jobs_wait`.
- Download: `curl -sSL --fail --retry 4 -o keyframes/raw/<name>.png <result_url>`.
- Several small objects can share one sheet ("four separate … in a 2x2 grid with generous green space, they do not touch") — the keyer splits them.

### Prompt template (single object)
> Photographic cut-out sticker of **{object, view, details}**, with a rough hand-cut white paper border about 2 percent of the width, slight halftone print texture, isolated on a perfectly flat pure green background (#00FF00), no shadow on the background, nothing else in frame. No text, no letters, no logos.

Add "no numbers" for vehicles; "blank slate (no writing)" for clapperboards; "screen a flat pastel sky gradient, nothing readable" for laptops; "screen completely flat pure black (screen off)" for phones.

### Set used in the original kaye.creatives film (assets/examples/kaye_*; names = file names in cutouts/)
| name | object |
|---|---|
| cam_side | vintage silver-and-black Super 8 film camera, 3/4, slightly tilted |
| cam_front | same camera, front 3/4, big round lens prominent (iris lens centre ≈ (400,605) of a 1448×1192 sprite, r ≈ 228) |
| car | sleek pastel-pink open-wheel race car, 3/4 front, diagonal, no logos/numbers |
| helmet | glossy white-and-pink full-face racing helmet, dark visor |
| phone | sleek smartphone straight from the front, flat black glossy screen (came out landscape) |
| plane_front | vintage pastel-blue biplane flying toward camera, 3/4 front, propeller blurred |
| plane_side | same biplane, clean side view flying right |
| clap | open black-and-white clapperboard, blank slate |
| reel | vintage metal film reel with a curl of film strip |
| laptop | open silver laptop 3/4, screen = flat pastel sky with pink clouds |
| headphones, midi, phone_gimbal, cassette | one 2×2 sheet: white/silver headphones · 25-key MIDI keyboard with pads · phone on a black gimbal · cassette with blank pink label |
| rocks_a/b/c, tree_a/b, grass_strip | one sheet: long torn strip of photo savanna grass + 3 b/w rock cut-outs + 2 acacia tree cut-outs |
| cloud_1..4 | one sheet: four b/w halftone cumulus cut-outs |

## Keying → alpha PNGs
`tools/greenkey <in.png> <out_prefix> [minAreaFrac=0.002]`
- alpha from greenness `g − max(r,b)`: > 90 → transparent, 25…90 → ramp; hard cut for g>160 & r,b<110; despill (green pulled down to max(r,b)).
- splits connected components (4× downscaled mask, 8-neighbour), sorts them top→bottom/left→right, writes `<prefix>.png` (one piece) or `<prefix>_1.png, _2.png …`, tight crop + 6 px pad, prints JSON with sizes.
- Then rename pieces to meaningful names and write `cutouts.txt` (`name w h`).
- Check them on a coloured background (red + striped cyan) before use: the white paper border must be clean, no green fringe.

`CL.img(name)` loads `../cutouts/<name>.png`; `CL.preload()` warms all of them (list them in collage.js if you add new names, or load on demand).
