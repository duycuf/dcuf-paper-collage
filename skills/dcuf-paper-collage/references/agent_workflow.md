# Running it with parallel agents (what worked)

The user likes speed via several agents. The proven shape (one Workflow run per stage, you stay in the loop between them):

1. **Ref analysis** (only if a new ref): one agent per reference — extract 12 fps frames (`tools/extract <mp4> <dir> 12 960 0.85`), contact sheets (`tools/sheet.mjs`), exact cut times, motion curves, palette hexes, font look-alikes, "must copy" list → `refs/analysis_<ref>.md`. For GIF refs split frames with ImageIO (Swift) — ffmpeg is not installed.
2. **Build (parallel)** — only when the engine needs new devices; the template already ships CL/CLX:
   - `dev:collage-core` (collage.js) and `dev:collage-fx` (collage_fx.js): each writes its module + a test page (`test_*.html` + `test_*_scenes.js`, see assets/examples), renders stills, compares with the ref sheets ≥3 rounds, reports the API.
   - `music:score`: re-arranges `audio/score.html` to the cue map, renders `score.wav/m4a`, measures with `tools/music_window.py`, writes `audio/NOTES.md`.
   - `docs:share-copy` (low effort): share_copy.md.
3. **Edit**: rewrite `comp/scenes.js` to the beat table (COPY object holds every word), render draft, strip + stills at transitions, look, fix.
4. **Review (art director, read-only)**: compare draft frames with the ref sheets and the script → ≤14 prioritised fixes with times and exact params.
5. **Fix**: apply, re-render, re-check.
6. For a cut-down: `edit:cut` + `music:cut` in parallel, then one `review:fix` agent that re-renders with the new score, checks sync by `music_window.py --timeline`, checks "on twos" by frame hashes, and fixes leftovers.

Rules that keep parallel agents from colliding:
- Each agent owns specific files; nobody else edits them.
- Only one agent renders at a time — `render_film.sh` wipes `.frames_draft` / `.frames_final`.
- Agents need `export PATH=<project>/tools/bin:$PATH` for direct `node tools/*.mjs` calls if node isn't installed system-wide (tools/*.sh add it themselves).
- Every frame stays a pure function of t; seeded RNG (`CL.R`, mulberry32 — `ENG.rng(0)` is constant 0).
