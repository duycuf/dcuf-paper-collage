#!/bin/zsh
# usage: tools/font_sheet.sh "LINE1|LINE2" ["Family:weight|Family|..."] [palette]
# Renders the title in each font with the real CLX.title treatment (paper border + extrusion) → review/title_fonts_sheet.png, numbered.
# Graded with the palette baked in comp/index.html (window.PALETTE), so the fonts are judged in the film's colours; pass "orig" for the original colours.
# Families must be in comp/font_sheet.html's <link>; after the user picks, add the family to comp/index.html + film.js and set COPY.titleFont.
set -e
P="${0:A:h:h}"; L="${1:-KAYE|CREATIVES}"; F="${2:-Cinzel:900|Fraunces:italic 900|Shrikhand|Abril Fatface|Bevan|Chango|Rye|Lilita One}"
export PATH="$P/tools/bin:$PATH"   # node fallback linked by new_project.sh (harmless when node is on PATH)
N=$(echo "$F" | tr '|' '\n' | wc -l | tr -d ' '); TS=$(python3 -c "print(','.join(str(i+0.5) for i in range($N)))")
PAL="${3:-$(sed -n "s/.*window\.PALETTE *= *'\([A-Za-z0-9_]*\)'.*/\1/p" "$P/comp/index.html" | head -1)}"
Q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.urlencode({'lines':sys.argv[1],'fonts':sys.argv[2],'pal':sys.argv[3] or 'orig'}))" "$L" "$F" "$PAL")
rm -rf "$P/review/title_fonts"; node "$P/tools/capture.mjs" "$P/comp/font_sheet.html" "$P/review/title_fonts" --stills $TS --query "$Q" >/dev/null
a=(); i=1; for f in $(ls "$P/review/title_fonts"/still_*.png | sort -t_ -k2 -n); do a+=("$f|$i $(echo "$F" | cut -d'|' -f$i)"); i=$((i+1)); done
node "$P/tools/sheet.mjs" "$P/review/title_fonts_sheet.png" 2 900 "${a[@]}" >/dev/null && echo "$P/review/title_fonts_sheet.png"
