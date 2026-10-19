#!/bin/zsh
# usage: new_project.sh <output_root> <slug> [--example]
#   --example keeps the shipped kaye.creatives look (night palette); without it the palette is off (original paper colours) for a new brand.
# Creates <output_root>/<slug>/ with the collage composition (comp/), the score synth (audio/score.html), tools/ (render + capture + keying),
# and empty cutouts/, keyframes/raw/, refs/, review/. Compiles the Swift tools (extract, encode, mux, greenkey). macOS only.
set -e
HERE="${0:A:h}"; SK="${HERE:h}"; ROOT="$1"; SLUG="$2"; EXAMPLE="$3"
[ -z "$ROOT" -o -z "$SLUG" ] && { echo "usage: new_project.sh <output_root> <slug> [--example]"; exit 2; }
P="$ROOT/$SLUG"; mkdir -p "$P"/{comp,tools,cutouts,keyframes/raw,refs,review,audio,clips}
cp -Rn "$SK/assets/template/comp/"* "$P/comp/" 2>/dev/null || true
cp -n "$SK/assets/template/audio/score.html" "$P/audio/score.html" 2>/dev/null || true
for f in capture.mjs render.mjs sheet.mjs render_audio.mjs render_film.sh strip.sh clips_js.sh music_window.py cut_audio.py palette_sheet.sh font_sheet.sh \
         extract.mjs encode.mjs mux.mjs aac.mjs greenkey.py render_film.mjs strip.mjs clips_js.mjs palette_sheet.mjs font_sheet.mjs stock_search.py cutout.py brand_palette.mjs credits.mjs fonts_fetch.mjs; do cp "$HERE/$f" "$P/tools/"; done   # .mjs/.py = cross-platform twins (new_project.mjs)
chmod +x "$P/tools/"*.sh "$P/tools/"*.py 2>/dev/null || true
# Swift tools → binaries (once per project; ~20 s)
command -v swiftc >/dev/null || { echo "swiftc missing: install Xcode command line tools (xcode-select --install)"; exit 1; }
for t in extract encode mux greenkey; do [ -x "$P/tools/$t" ] || swiftc -O "$HERE/$t.swift" -o "$P/tools/$t" 2> "$P/tools/.swiftc_$t.log" || { echo "swiftc failed for $t — see $P/tools/.swiftc_$t.log"; exit 1; }; done
# node >= 22 (tools need global fetch + WebSocket): the system one, else the first good fallback, linked into tools/bin.
# tools/*.sh put tools/bin on PATH themselves; direct `node tools/*.mjs` calls need: export PATH="<project>/tools/bin:$PATH". NODE_BIN=/path/to/node forces one.
okn() { [ -n "$1" ] && [ -x "$1" ] && "$1" -e 'process.exit(typeof WebSocket==="function"&&typeof fetch==="function"?0:1)' 2>/dev/null; }
if [ -n "$NODE_BIN" ] || ! okn "$(command -v node)"; then
  NODE_OK=""
  for n in "$NODE_BIN" /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.volta/bin/node" $HOME/.nvm/versions/node/*/bin/node(NOn) "$HOME/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; do
    okn "$n" && { mkdir -p "$P/tools/bin"; ln -sf "$n" "$P/tools/bin/node"; NODE_OK=1; echo "node: linked $n → tools/bin/node; for direct node calls run: export PATH=\"$P/tools/bin:\$PATH\""; break; }
  done
  [ -z "$NODE_OK" ] && echo "WARNING: no Node >= 22 found (needs global WebSocket). Install Node 22+ or re-run with NODE_BIN=/path/to/node."
fi
"$P/tools/clips_js.sh" >/dev/null 2>&1 || echo 'window.CLIPS_AVAILABLE=[];' > "$P/comp/clips.js"
echo "$P"
