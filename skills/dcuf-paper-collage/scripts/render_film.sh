#!/bin/zsh
# usage: render_film.sh <draft|final> [audio.m4a] [out.mp4] [index.html]
#   draft: JPEG frames, 4 browsers, 20 Mbps — about 30 s for 30 s of film.  final: PNG frames, 6 browsers, 30 Mbps.
set -e
P="${0:A:h:h}"; MODE="${1:-draft}"; AUD="${2:-$P/audio/score.m4a}"; OUT="${3:-$P/${P:t}_$MODE.mp4}"; PAGE="${4:-$P/comp/index.html}"
export PATH="$P/tools/bin:$PATH"   # node fallback linked by new_project.sh (harmless when node is on PATH)
FR="$P/.frames_$MODE"; rm -rf "$FR"; mkdir -p "$FR"; "$P/tools/clips_js.sh" >/dev/null
DUR=$(node -e "const s=require('fs').readFileSync('$P/comp/scenes.js','utf8');const m=s.match(/duration\s*:\s*([0-9.]+)/);console.log(m?m[1]:30)")
N=$([ "$MODE" = final ] && echo 6 || echo 4); EXT=$([ "$MODE" = final ] && echo "" || echo "--jpg"); MB=$([ "$MODE" = final ] && echo 30 || echo 20)
T0=$(date +%s)
for i in $(seq 0 $((N-1))); do A=$(python3 -c "print(round($DUR*$i/$N,4))"); B=$(python3 -c "print(round($DUR*($i+1)/$N,4))"); node "$P/tools/capture.mjs" "$PAGE" "$FR" --from $A --to $B ${=EXT} > "$FR.log$i" 2>&1 & sleep 1.5; done; wait
# verify every frame exists; re-capture missing runs one by one (a worker can fail to start under load)
TOTAL=$(python3 -c "print(round($DUR*24))")
for pass in 1 2 3; do
  MISS=$(python3 - "$FR" "$TOTAL" <<'PY'
import os, sys
d, n = sys.argv[1], int(sys.argv[2]); have = {int(f[2:7]) for f in os.listdir(d) if f.startswith('f_')}
miss = [i for i in range(n) if i not in have]; runs = []
for i in miss:
    if runs and i == runs[-1][1] + 1: runs[-1][1] = i
    else: runs.append([i, i])
print(' '.join(f'{a/24:.4f}:{(b+1)/24:.4f}' for a, b in runs))
PY
)
  [ -z "$MISS" ] && break
  echo "pass $pass: re-capturing $MISS"; for r in ${=MISS}; do node "$P/tools/capture.mjs" "$PAGE" "$FR" --from ${r%%:*} --to ${r##*:} ${=EXT} >> "$FR.retry" 2>&1; done
done
CNT=$(ls "$FR" | wc -l | tr -d ' '); echo "captured $CNT/$TOTAL frames in $(( $(date +%s)-T0 ))s"; grep -h "EXC" "$FR".log* "$FR.retry" 2>/dev/null | head -3 || true
[ "$CNT" -lt "$TOTAL" ] && { echo "missing frames — see logs in $FR.log*"; exit 1; }
"$P/tools/encode" "$FR" 24 "$P/.silent.mp4" $MB >/dev/null
if [ -f "$AUD" ]; then "$P/tools/mux" "$P/.silent.mp4" "$AUD" "$OUT" >/dev/null; rm -f "$P/.silent.mp4"; else mv "$P/.silent.mp4" "$OUT"; echo "(no audio found at $AUD — silent render)"; fi
"$P/tools/strip.sh" "$FR" "$P/review/strip_$MODE.png" 1 >/dev/null 2>&1 || true
rm -f "$FR".log* "$FR.retry"; echo "$OUT"
