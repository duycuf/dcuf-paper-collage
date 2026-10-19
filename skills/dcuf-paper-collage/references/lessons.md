# Lessons from the kaye.creatives session (what the user corrected, in order)

The first film went through these corrections. Each one is now a default of the skill — read them as "why the skill works this way".

1. **"Make it exactly like the ref; the character generations from previous intros aren't needed; analyse the refs."** First draft put the channel's AI twin (Karima) into every generated shot and used the refs only for palette. → Open every ref link the user sends, analyse it frame by frame (12 fps sheets), and when there are several refs ask/notice which one they love most. No people/characters unless asked.
2. **"Use pure code; generations only where code can't do it."** Full collage plates had been generated. → Paper, strips, sky, type, transitions = code. Generation = photo cut-outs on green only.
3. **"Don't copy the cut-outs 1:1, adapt to our YouTube."** A beat-for-beat clone (boombox → camera, meerkats → meerkat film crew) was rejected. → Keep the ref's *technique and motion grammar*; invent the story from the brand (YouTube play button → the creator's worlds → "how it's done" → title → logo → subscribe).
4. **"Cut it to 10 s."** → Keep the long version (here: assets/examples/kaye_30s_scenes.js + kaye_30s_score.html) and re-time the same scene functions; re-arrange the score to the new cue map; re-check sync.
5. **"Change the font and the word."** → Don't guess fonts: render 6–8 candidates in the real title treatment (`tools/font_sheet.sh`) and let the user pick by number. Fraunces Black Italic won.
6. **"Don't like the colours."** → Don't guess palettes: render 4 key frames in 6 palettes (`tools/palette_sheet.sh`, grade.js) and let the user pick. "night" won.
7. **Speed.** The user asked for parallel agents twice ("подключи несколько агентов чтоб ускорить работу") and asked "when will it be ready" — send drafts early, give ETAs, keep a tasks pane / progress visible.
8. The user reads only Russian: all messages in the user's language; on-screen copy in English unless asked.

Photosensitivity: the ref's logo flicker is full-frame at 12 Hz; for YouTube keep flicker inside the logo band and order looks so brightness only steps down.

# Lessons from the first brand re-skins (portfolio intros, 2026-10-19)

9. **Propose, then wait.** The user picking an option ("option 2") is a choice, not a go-ahead: send the plan or sketch and wait for an explicit "go ahead". Thinking out loud with them (brainstorm) means proposals only.
10. **What they do, not their journey.** A portfolio/brand film shows what the brand makes and for whom, not a career timeline. Keep the list short (3 things); merge sub-services into one ("AI creative", not video + photo + landing page).
11. **Metaphor with real objects, not screenshots.** Each service = one real object + a paper tag (phone ringing = AI agent, cash register printing a receipt = automation). Only one screen in the film (the desk). The user rejected real work screenshots: the original kaye film limits screens too.
12. **Brand colours flatten the collage.** A cream ground equal to the paper edges loses depth → offer brandVivid (fields in a contrasting colour) and brandDark next to the plain brand palette, on one sheet. Check the remap for a mauve cast on the engine's blues (`unblue`).
13. **Vertical is a re-layout.** A centre crop of 16:9 would cut the title and the side objects; the user chose a real re-layout. Every foreground element is re-placed; backgrounds cover-scale; keep the bottom 15 % free for the platform UI.
14. **Vietnamese type needs a VN font and a VN sample at load.** Google Fonts ships Vietnamese glyphs in a separate unicode-range file: `document.fonts.load(font, sample)` with accented letters, else sprites bake with a fallback face.
15. **Agents must not leak the user's details** (an agent put the user's email in a User-Agent header). Every agent brief says so.
