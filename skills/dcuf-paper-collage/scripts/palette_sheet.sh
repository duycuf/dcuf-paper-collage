#!/bin/zsh
# usage: tools/palette_sheet.sh [times...]   (run from anywhere; project = parent of tools/)
# Renders stills of the current film in every palette of comp/grade.js (+ the original) at the given times and builds review/palettes_sheet.png.
set -e
P="${0:A:h:h}"; T=(${@:-0.75 3.75 6.9 8.75}); TS=${(j:,:)T}
export PATH="$P/tools/bin:$PATH"   # node fallback linked by new_project.sh (harmless when node is on PATH)
PALS=(orig $(node -e "const s=require('fs').readFileSync('$P/comp/grade.js','utf8');const m=s.match(/const PALS = \{([\s\S]*?)\n  \};/);console.log([...m[1].matchAll(/^    (\w+): \{/gm)].map(x=>x[1]).join(' '))"))
rm -rf "$P/review/pal"; for p in $PALS; do node "$P/tools/capture.mjs" "$P/comp/index.html" "$P/review/pal/$p" --stills $TS --query "pal=$p" >/dev/null 2>&1 & done; wait
a=(); i=0; for p in $PALS; do for t in $T; do f="$P/review/pal/$p/still_$(printf %.2f $t).png"; a+=("$f|$i $p · $t"); done; i=$((i+1)); done
node "$P/tools/sheet.mjs" "$P/review/palettes_sheet.png" ${#T} 470 "${a[@]}" >/dev/null && echo "$P/review/palettes_sheet.png  (0 = original; numbers = order in grade.js)"
