# Collage engine API (CL = comp/collage.js, CLX = comp/collage_fx.js)

Both modules are pure functions of time `t` (seconds). Everything random is seeded; motion is quantised "on twos" by the caller (`q(t) = floor(t*12)/12`). Expensive, time-independent things (paper textures, torn paths, sprites) are cached. Header comments in both files hold the same API in short form — read them when in doubt.

Note: `CLX.title` takes `o.font` (e.g. `'"Fraunces"'`) — the 10 s example uses Fraunces Black Italic; the default face is Ultra. Load only the face you want so the browser picks it (e.g. `Fraunces:ital,opsz,wght@1,144,900`).

## CL — paper world (collage.js)

**API** (all async unless marked pure; every scene and sprite call needs `await`)

*Materials*
- `CL.paper(color, seed=1, o)` → cached 512 px tileable texture canvas: colour plus mottling, fibres and grain. `o`: `tex` (strength, default 1), `brush` (true or 0..1, horizontal paint streaks), `speck`, `size`.
- `CL.watercolor(seed, o)` → cached canvas, default 2048×1152: cyan wash with pigment-edged blooms, granulation and painted cumulus clouds. `o`: `w`, `h`, `base`, `light`, `deep`, `tone`, `wash`, `bloom`, `clouds` (0..1), `cloudY` `[y0,y1]`, `dots` (sparse white halftone, like ref 0 s), `fine` (fine light print dots, like ref 10 s), `vgrad`.
- `CL.halftoneTile(color, cell=14, angle=45, r=.34)` → small tile canvas; rotate it with `CL.pat(ctx, tile, {rot})`.
- `CL.halftone(ctx, shape, color, o)` draws dots clipped to a Path2D or `[x,y,w,h]`. `o`: `cell`, `angle`, `r` (number, `[r0,r1]` with `grad` `[x0,y0,x1,y1]`, or `fn(X,Y)`), `alpha`.
- `CL.dotsGrid(ctx, bbox, o)` is the same without a clip.
- `CL.newsprint(ctx, shape, o)` draws columns of fake illegible print. `o`: `angle`, `alpha` (.5), `x` (x-height 4.2), `lead`, `col`, `gutter`, `head`, `color`, `seed`.

*Torn geometry*
- `CL.torn(shape, seed, o)` → Path2D of the outer white-edge outline, with `.inner` (Path2D of the coloured face), `.bbox`, `.cx`, `.cy` and point arrays. Cached.
  - Shapes: `[x,y,w,h]`, `{rect, edges:[t,r,b,l]}`, `{band:[x0,y0,x1,y1,w0,w1], edges, tips, tipLen}`, `{ridge:[[x,y]..], bottom}`, `{hill:[...]}`, `{poly:[[x,y,m]]}`, `{circle}`, `{ellipse}`, `{star:[cx,cy,r1,r0,n,rot]}`.
  - Band ends tear into shards; an edge multiplier `m` of 0 gives a straight scissor cut.
  - `o`: `amp` (9), `white` (`[2,14]` px edge band), `bite`, `wob`, `rot` (baked in), `pivot`.
- `CL.piece(ctx, shape, fill, o)` draws a torn paper piece and returns its sprite.
  - Fills: `'#hex'` (auto paper texture), a canvas, `{color, brush, tex, speck}`, `{img:'grass_strip', crop, filter, scale, tile:'x'|true, base}`, or `async fn(ctx, bbox)`.
  - Cached options: `seed`, `rot`, `amp`, `white`, `shadow {dx,dy,blur,alpha}|false`, `contact`, `fibres`, `res`, `halftone`, `news`, `dotgrid`, `fx:[{type:'lines'|'memphis'|'grunge'|'stripes'|'zigzag'|'circle'|'rings'|'glyph'|'mottle'|'shade'|...}]`, `draw`, `key`.
  - Per-draw options, free to animate without re-rendering: `x`, `y`, `spin`, `sc`, `sx`, `sy`, `px`, `py`, `alpha`.
- `CL.pieceSprite(shape, fill, o)` → Promise of the cached sprite; draw it with `CL.drawSprite(ctx, sprite, o)`.
- `CL.strip(ctx, x0,y0,x1,y1, width, o)` is a torn band; `o.fill` defaults to red, `o.w1` tapers it.

*Scenes* (`async (ctx, t, o)`)
- `CL.page`: 5 layers (sky .22, upper strips .42, far hills .6, mid grass .8, foreground 1.0).
  - `o.cam {x, y, zoom, fx, fy, rot}` with per-layer parallax.
  - `o.insert {i: async (ctx, t, cam)}` draws in layer i's camera space, e.g. things behind the hills.
  - `o.only` draws a subset of layers; `o.res` sets layer render scale; `o.boil` (layer jitter, .5 px).
- `CL.diag`: diagonal torn bands with b/w rock cut-outs and confetti. `o.angle` (-24), `o.speed` (1100 px/s), `o.offset`, `o.rocks`, `o.confetti`, `o.mid` (drawn between the bands and the rocks).
- `CL.posters`: two-layer torn poster wall with glyph fragments that never spell a word. `o.cam`, `o.drift`, `o.insert`.
- `CL.cloudsky`: `o.fly` 0..1 moves the camera in z (`o.depth` 5) through cloud cut-outs and torn white cloud strips, over yellow/orange strips in the lower third. `o.mid` is drawn behind the nearest elements (use it for the plane).
- `CL.desk`: yellow centre sheet at about `[470,200,990,690]` plus paper stars boiling on twos. `o.cam`, `o.insert[0]` (drawn before the stars), `o.stars`.
- `CL.sky`: `o.tilt` 0..1 tilts the camera up 1500 px through long torn white strips. `o.mid` draws between the back and front strips.

*Sprites*
- `CL.sprite(ctx, name, x, y, o)` → `{w, h}`. `o`:
  - `ax`, `ay` (anchor), `h` | `w` | `scale`, `rot` (deg), `sx`, `sy`, `alpha`, `flipX`
  - `shadow {dx,dy,blur,alpha}` (screen-space offsets; default 7/11/12/.38) or `false`
  - `boil` (amplitude) together with `t`, re-seeded every 2 frames
  - `clip` (Path2D)
- `CL.img(name)` loads `../cutouts/NAME.png`; `CL.preload()` warms all of them.

*Motion helpers* (pure)
- `CL.drop(t, t0, {h, tilt, bounce, squash, dur})` → `{dy, rot, sx, sy, on, k}`. Near-linear 4-frame fall, then squash (sy .9, sx 1.06), one bounce, settled by +0.3 s. Use `ay: 1` and set `h` ≈ the landing y so frame 1 shows the bottom edge entering.
- `CL.pop(t, t0, {h, frames, over})` → `{dy, sx, sy, on}`.
- `CL.slap(t, t0, {from: 1.35, rot0})` → `{s, rot, on, shadow}`; `shadow` is a multiplier for the shadow size.
- `CL.bob(t, i, amp)` → `{dx, dy, rot}`, on twos.
- `CL.fly(t, t0, t1, {from:{x,y,s}, to:{x,y,s}, cx, cy, ease})` → `{x, y, s, k, on}`, perspective-correct with accelerating scale.

*Overlay and helpers*
- `CL.printGrain(ctx, t, amt=.06)` adds static paper tooth plus grain re-seeded on twos.
- Also exported: `CL.C` (palette), `CL.R` (seeded PRNG), `CL.noise`, `CL.pat`, `CL.layer`, `CL.camXf`, `CL.f12`, `CL.clearCache()`.

**Performance**
- Warm frames: page 6 ms, diag 8, posters 4, cloudsky 8, desk 34, sky 4–5. These include a `getImageData` call to force the GPU to finish.
- First frame of each scene pays one-off build costs: page about 0.8 s, cloudsky about 0.5 s. Capture handles this fine, but calling `await CL.preload()` early in `scenes.js` would warm the cut-outs.

**Limits**
- Layers have 150 px bleed. Keep page `cam.zoom` ≤ about 1.3 and pans ≤ about 150 px; use `o.res: 1.5` for stronger pushes.
- PRNG: I use my own seeded generator (`CL.R`, mulberry32) instead of `ENG.rng`, because `ENG.rng(0)` always returns 0. It is just as deterministic.
- The cut-outs are not drawn with any CSS filters; the grass fill does use canvas filters.
- `cloud_*` PNGs have faint keying haze; it is cleaned at load by zeroing low alpha. If the browser refuses pixel reads it silently falls back to the original image.
- Cache keys: an `o.draw` callback or a function fill re-renders every call unless you give it `o.key`. Static `rot` is baked into the shape, so animate rotation with `spin`.

## CLX — transitions, type, UI (collage_fx.js)

**API.** Every device is async, so always `await` it. `t` is in seconds and `t0` is the event start. Defaults are in brackets.
- **`iris(ctx, cx, cy, r, k, t, o)`** — a paper iris clipped to a torn circle; `k` 0→1 grows and opens it. Layers: yellow hex centre, cyan blade spiral, red folded triangles. `o`: `n`[6], `spin`, `rot`, `open`, `grow`, `drawCenter(ctx,cx,cy,r,t)`, `tris`, `bg`. For `cam_front` drawn at height `h`: lens centre = `(cx + (400 - 724)·s, cy + (605 - 596)·s)` with `s = h/1192`, and `r = 228·s`.
- **`kaleido(ctx, t, drawSrc, o)`** — mirrors `async drawSrc(ctx2, t)` into wedges and builds a zoom tunnel of nested torn n-gons with coloured rims. `o`:
  - `segments`[8], `rot`, `zoom`[0.55 levels/s], `ratio`[0.5], `levels`[6]
  - `srcScale`, `srcX`, `srcY`, `srcRot`, `rims[]`
  - `flyers: [{name, t0, dur[0.7], angle, spin, scale, rot}]`
  - `hole` 0..1, `drawNext(ctx, t)`, `holeColor`, `holeSx`[1.18]
- **`rocket(ctx, t, t0, o)` → `{x, y}`** — paper strips shoot from the bottom edge to `(vx, vy)`, with spindle shards and sparks. `o`: `vx`, `vy`, `by`, `bx`, `width`[1000], `narrow`[0.62], `n`[50], `dur`[0.9], `seed`, `rider` (cut-out name), `riderH`, `drawRider(ctx, x, y, t)`.
- **`burst(ctx, t, t0, o)`** — strips fly radially out of a centre. `o`: `cx`, `cy`, `n`[26], `dur`[0.65], `r`, `r0`, `width`, `rot`, `seed`.
- **`title(ctx, lines, cx, cy, t, t0, o)` → `{x, y, w, h, size}`** — Ultra letters: red mottled face with halftone, a white paper border on each letter, a cobalt extrusion toward a vanishing point, and tiny per-letter jitter. Drops in 3 frames, squashes, then pushes in slowly. `o`:
  - size: `size`, or `width`[0.6·W] which makes "KAYE / CREATES" about 60 % of frame width
  - `extrude` 'vp' | 'offset', `depth`[0.15], `vpy`[1.1 em], `offset`
  - `zoom`[0.03/s], `inline`, `drop`, `seed`, `alpha`
- **`tear(ctx, k, drawOver, drawUnder, o)`** — the band `o.y0..o.y1`[0.36H..0.64H] peels left→right as `k` goes 0→1. The curling flap is cobalt with white fibrous edges and a heavy shadow. `drawOver` / `drawUnder` take an async `(ctx2) => {}` or a canvas. `o`: `seed`, `flapW`.
- **`logoBand(ctx, text, t, o)`** — a torn white band with navy/green/yellow scraps and the logo in red Chewy. `o.style`: 'band' | 'glitter' | 'posters' (calls `CL.posters(ctx, t, o.posters)` if present, otherwise its own) | 'lime' | 'orange' | 'streak' | 'pink'. Also `x`, `y`, `h`[300], `size`, `font` ('Chewy' | 'Gluten'), `rot`, `seed`, `boil`.
- **`flashSeq(t, t0, styles?, frames = 2)`** — returns the flash style name at `t`, or null once the sequence is over.
- **`ransom(ctx, str, cx, cy, t, t0, o)`** — one torn chip per letter, mixing 9 fonts and 13 paper/ink pairs; letters slap in every `o.step`[0.125] at scale 1.45→1. `o`: `size`[140], `seed`, `gap`, `align`, `spaceBeat`, `scale`. Returns the total width.
- **`play(ctx, cx, cy, size, t, o)`** — red paper ▶ button, `size` = width. `o`: `press` 0..1, `t0` (4-frame drop with squash), `rot`, `alpha`.
- **`cursor(ctx, x, y, t, o)`** — paper arrow with its tip at `(x, y)`. `o`: `size`[90], `click` 0..1.
- **`subscribe(ctx, cx, cy, t, o)`** — red SUBSCRIBE; at `o.tClick` it squashes and flips to a grey SUBSCRIBED ✓, and a bell wiggles with ring lines. `o`: `h`[110], `t0` (drop), `bell`.
- **`tag(ctx, x, y, str, o)`** — torn chip with tape. `o`:
  - `color`: white | yellow | red | ink | cobalt | pink | cyan | #hex
  - `font` 'mono' | 'sans', `size`[30], `rot`, `scale`
  - `pop` 0..1, or `t` + `t0` for a 3-frame slap
  - `tape` 'left' | 'right' | 'top' | false, `anchor`
- **`thumb(ctx, [x, y, w, h], t, o)`** — paper video card with progress bar and duration chip. `o`: `draw(ctx, [0,0,w,h], t)` or `name` + `bg`, `progress`, `dur`['12:04'], `t0` (slap), `rot`, `seed`.
- **`screen(ctx, quad, t, t0, o)`** — prompt UI on a rect `[x,y,w,h]` or a perspective quad `[[x,y]×4]` (TL, TR, BR, BL). Types `o.text` at `o.cps`[20] with a red caret; a cursor moves to "generate ✦", clicks at `o.tClick`, a flash follows, then `o.drawResult(ctx, [0,0,w,h], t)` is shown. For `laptop.png` the screen quad in source pixels is `[[800,105],[1838,150],[1745,915],[668,792]]`.
- **`confetti(ctx, t, t0, o)`** — paper triangles/chips/slivers. `o.mode` 'burst' | 'rain'; also `x`, `y`, `n`[40], `speed`, `spread`, `gravity`, `size`, `dur`, `keep`, `colors`.
- **`speed(ctx, t, o)`** — torn white slivers. `o`: `n`, `angle`, `speed`, `rect`, `alpha`, `len`, `thick`.
- **`star(ctx, cx, cy, r, t, o)`** — paper starburst. `o`: `points`, `inner`, `color`, `text`, `spin`, `pop`.

**Helpers**
- `drop(t, t0, o)` → `{dy, sx, sy, on}`; `slap(t, t0, n, from)` → scale.
- `warm(o)` pre-builds the caches: `{iris, kaleido, title: {lines}, band, logo: {text}, play, subscribe, tear, cuts: []}`.
- `CLX.PAL` is the palette. `CLX._` exposes the internals: `piece`, `drawPiece`, `cut`, `drawCut`, `torn`, `halftone`, `patR`, `pool` and others.

**Perf.** Measured in headless Chrome with a GPU flush, scene included.
- Warm frames take 3–45 ms.
- The first use of a device builds its caches: 100–500 ms, once.
- `warm()` at the start of a cut moves all of that into one ~0.8 s frame, which keeps every later frame under 250 ms.
- Before `warm()` was added, cold first uses measured kaleido ~200 ms, title ~300 ms, tear ~400 ms and play ~580 ms. After it, the remaining first-use costs were kaleido ~90 ms and the posters flash ~105 ms.

**Limits and notes**
- `CL` is only touched for `CL.posters`, so the module runs without `collage.js`.
- Sprites are cached by key and baked with whatever font is loaded at that moment. Call devices and `warm()` only inside `__seek`, which waits for fonts.
- The tear's band and flap geometry is cached per `(seed, y0, y1, flapW)`. Animating `y0`/`y1` would rebuild it every frame, so keep them constant.
- `kaleido` and `tear` reuse shared offscreen canvases, so don't nest one call inside another of the same kind. `drawSrc` and `drawNext` must not call `kaleido` themselves.
- Cut-outs draw through a halving mip chain. This stops moiré on the halftone photos and makes repeat renders match within ±2 levels; without it, the same frame rendered differently depending on draw order.
- Our hex-hole rim reads thinner and less mandala-like than the ref because the test source is simple. Feed `kaleido` a denser `drawSrc` for the real scene.