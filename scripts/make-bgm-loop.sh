#!/usr/bin/env bash
# Turn a long music track into a small, seamlessly looping background file.
#
#   ./scripts/make-bgm-loop.sh my-song.mp3 [loop_seconds] [bitrate]
#
# Writes public/bgm.mp3.
#
# Why the crossfade: a plain cut leaves a click at the loop point, and a plain
# fade-out leaves an audible dip every time the track wraps. Instead we blend
# the seconds just AFTER the loop point over the opening seconds, so the moment
# the track wraps it is already mid-crossfade and the seam is inaudible.
set -euo pipefail

SRC="${1:?usage: make-bgm-loop.sh <source-audio> [loop_seconds] [bitrate]}"
LOOP="${2:-180}"   # length of the finished loop, in seconds
BR="${3:-128k}"    # keep stereo unless the source is genuinely mono
XF=6               # crossfade length, in seconds

OUT="public/bgm.mp3"
mkdir -p public

# ffmpeg exits non-zero when probing with no output file, so guard it.
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC" 2>/dev/null || echo "?")
echo "source: $SRC (duration ${DUR}s)"
echo "building a ${LOOP}s seamless loop at $BR ..."

# The source is opened three times on purpose. Referencing [0:a] from three
# filter branches makes ffmpeg insert an asplit, and the branches then need
# wildly different parts of the file at once (0s, 6s and 180s) -- amix ends
# early and the crossfade seam silently vanishes. Separate decoders avoid it.
ffmpeg -hide_banner -loglevel error -i "$SRC" -i "$SRC" -i "$SRC" -filter_complex "
  [0:a]atrim=0:${XF},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${XF}[head];
  [1:a]atrim=${LOOP}:$((LOOP + XF)),asetpts=PTS-STARTPTS,afade=t=out:st=0:d=${XF}[tail];
  [head][tail]amix=inputs=2:normalize=0[seam];
  [2:a]atrim=${XF}:${LOOP},asetpts=PTS-STARTPTS[body];
  [seam][body]concat=n=2:v=0:a=1[out]
" -map "[out]" -b:a "$BR" -y "$OUT"

echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
