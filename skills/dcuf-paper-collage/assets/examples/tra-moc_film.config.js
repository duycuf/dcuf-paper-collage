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
    palette: 'brandVivid',    // tools/brand_palette.mjs --primary "#C2542D" --secondary "#2F6B4F" --accent "#E3B04B" --ink "#2A1E17" --paper "#F6EEDF"

    // ---- words: "Trà Mộc", a FICTIONAL tea shop (skill test, 2026-10-19) ----
    brand: 'trà mộc',
    role: 'TRÀ PHA TAY · GIAO TẬN NƠI',
    openTag: 'trà mộc ✦ pha tay mỗi ngày',
    title: ['TRÀ NGON', 'TỚI LIỀN.'],
    titleFont: '"Be Vietnam Pro"',
    logoFont: 'Baloo 2:800',               // Chewy has no Vietnamese
    cta: ['NHẮN ĐẶT NGAY', 'đã nhận đơn ✓'],
    url: 'tramoc.vn',
    extraTag: '+ TRÀ TRÁI CÂY MÙA HÈ',

    // ---- objects ----
    hero: { cut: 'hero', w: 420 },
    pops: ['teapot', 'lemon', 'herbs'], peek: 'lantern',
    world1: { cut: 'scooter', h: 400, tag: 'GIAO TẬN NƠI 15 PHÚT', bubbles: ['1 ly trà sữa nha?', 'tới liền ✓', 'ngon xỉu ✦'] },
    lens: { cut: 'teacup_top', lensPx: [417, 422], lensR: 165, spriteSize: [851, 842], tag: 'PHA TAY TỪNG LY', props: ['herbs', 'lemon'] },
    kaleido: { rings: ['herbs', 'ice', 'lemon'], flyers: ['teapot', 'hero', 'lantern'] },
    desk: { device: 'phone',               // ordering happens on a phone (drawn in code)
      gear: ['cash_register', 'teapot', 'ice'], ui: 'trà mộc ✦ đặt món', label: 'ĐƠN CỦA BẠN', placeholder: 'hôm nay uống gì…', prompt: '1 trà sữa ít đường, thêm trân châu', button: 'ĐẶT NGAY ✦',
      result: ['hero', 'lemon', 'ice'], menu: ['hero', 'teapot', 'lemon'], menuLabel: 'MÓN HOT HÔM NAY', tag: 'ĐẶT MÓN TRÊN ĐIỆN THOẠI' },
    titleFly: ['bird', 'scooter'],
  };
  const qf = new URLSearchParams(location.search).get('format'); if (qf) FILM.format = qf;
  window.FILM = FILM;
  window.FILM_SIZE = FILM.format === '9x16' ? [1080, 1920] : [1920, 1080];
  if (FILM.palette !== undefined) window.PALETTE = FILM.palette;
})();
