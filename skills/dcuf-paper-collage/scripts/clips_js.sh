#!/bin/zsh
# Writes comp/clips.js = the list of clips whose frames exist (clips/<ID>.json written by fetch_clip.sh).
P="${0:A:h:h}"; setopt null_glob; L=""; for f in "$P"/clips/*.json; do L="$L\"${${f:t}%.json}\","; done
echo "window.CLIPS_AVAILABLE=[${L%,}];" > "$P/comp/clips.js"; cat "$P/comp/clips.js"
