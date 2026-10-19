/* film.config.js — EVERYTHING brand-specific of the 10 s promo lives here (load first, before engine.js). scenes.js only reads it.
 * Format: '16x9' (1920×1080) or '9x16' (1080×1920); the URL query ?format=9x16 overrides it, so one project renders both
 * (node tools/render_film.mjs final --format 9x16). Cut-out names = files in ../cutouts/<name>.png (missing ones render as grey cards).
 * Story grammar (fixed timings, 120 BPM): 0–1 hero drops, pops, cursor presses · 1.0 page rips → world 1 (an object flies through diagonal bands,
 * chat bubbles) · 2.5 torn wipe → camera, push into its lens, paper iris · 3.5–4.5 kaleidoscope (3 rings + 3 flyers) · 4.5–5.5 desk: laptop types a
 * prompt, 3 objects slap · 5.5 strip rocket carries the hero away · 6.0 title drops (2 objects cross) · 7.5 page tear → logo band + role, logo
 * flicker · 8.5 CTA button → click → done label, URL, an extra tag.  Words: keep each tag ≤ ~32 characters; title 2 short lines.
 */
(function () {
  const FILM = {
    duration: 10.0,
    format: '16x9',
    palette: null,            // null = engine colours · or a name from comp/grade.js / comp/palettes.js (scripts/brand_palette.mjs writes brand, brandVivid, brandDark)

    // ---- words (every on-screen word) ----
    brand: 'brand',                         // wordmark in the logo band (short: 4–10 letters reads best)
    role: 'WHAT WE DO, IN 3 WORDS',         // under the wordmark
    openTag: 'brand ✦ tagline',             // taped label on the first page
    title: ['MAKE IT', 'HAPPEN.'],          // the big title (2 short lines)
    titleFont: '"Fraunces"',                // ONE face of the family must be loaded in index.html (<link>) + listed in film.js fonts()
    logoFont: 'Baloo 2:800',                // logo letters, Vietnamese-safe: 'Baloo 2:800' | 'Lobster' | 'Gluten:900' | 'Lexend:800' … ('Chewy' = the original look, Latin only: no ă ơ ư đ)
    cta: ['GET IN TOUCH', 'hello@brand.com ✓'],   // button before / after the click
    url: 'brand.com',
    extraTag: '+ ONE MORE THING WE DO',      // taped above the logo band at the end ('' = none)

    // ---- objects (cut-out names) per beat ----
    hero: { cut: 'hero', w: 640 },                              // drops at 0.33–0.5, pressed at 0.875, rides the rocket at 5.5
    pops: ['pop_a', 'pop_b', 'pop_c'], peek: 'peek',           // pop up on the first page; peek = big object rising from the corner
    world1: { cut: 'world1', h: 400, tag: 'SERVICE ONE', bubbles: ['a question?', 'an answer ✓', 'done ✦'] },   // bubbles: [] = none
    lens: { cut: 'cam_front', lensPx: [182, 518], lensR: 172, spriteSize: [1463, 1460], tag: 'SERVICE TWO', props: ['clap', 'reel'] },
    kaleido: { rings: ['ring_a', 'ring_b', 'ring_c'], flyers: ['fly_a', 'fly_b', 'fly_c'] },
    // device: 'laptop' = a laptop photo (cut-out + its screen corners screenQuad, measured in PNG px) · 'phone' = a smartphone drawn in code
    //         (no photo, nothing to measure; app layout: header with ui, order card, full-width button, finger tap). Ordering / booking / chat → 'phone'.
    desk: { device: 'laptop', laptop: 'laptop', screenQuad: [[582, 56], [1434, 108], [1283, 741], [534, 521]], spriteSize: [1503, 1384],
      gear: ['desk_a', 'desk_b', 'desk_c'], ui: 'brand ✦ studio', label: 'PROMPT', placeholder: 'describe it…', prompt: 'your idea ✦', button: 'make ✦',
      result: ['hero', 'pop_a', 'pop_b'], tag: 'SERVICE THREE' },
    titleFly: ['cross_a', 'cross_b'],                            // one crosses above the title, one below
  };
  const qf = new URLSearchParams(location.search).get('format'); if (qf) FILM.format = qf;
  window.FILM = FILM;
  window.FILM_SIZE = FILM.format === '9x16' ? [1080, 1920] : [1920, 1080];
  if (FILM.palette !== undefined) window.PALETTE = FILM.palette;
})();
