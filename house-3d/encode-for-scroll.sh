#!/usr/bin/env bash
# Re-encode a video so it scrubs smoothly on scroll.
#
# THE KEY: every frame becomes a keyframe (-g 1, no B-frames). This lets the
# browser jump to ANY currentTime instantly instead of decoding forward from a
# distant keyframe (which causes the classic scroll-scrub stutter).
# Trade-off: 3-5x larger file. Worth it — this is what makes it buttery.
#
# Usage:  ./encode-for-scroll.sh input.mp4 [output_basename] [fps] [width]
# Example:./encode-for-scroll.sh orbit.mp4 house 30 1280

set -e
IN="${1:?Usage: ./encode-for-scroll.sh input.mp4 [out] [fps] [width]}"
OUT="${2:-house_scroll}"
FPS="${3:-30}"
W="${4:-1280}"

echo "Encoding $IN -> ${OUT}.mp4 / ${OUT}.webm  (all-keyframe, ${FPS}fps, ${W}px wide)"

# H.264 MP4 — every frame a keyframe, faststart so it streams before fully loaded
ffmpeg -y -i "$IN" \
  -vf "scale=${W}:-2:flags=lanczos,fps=${FPS}" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -g 1 -keyint_min 1 -bf 0 -sc_threshold 0 \
  -crf 20 -movflags +faststart -an \
  "${OUT}.mp4"

# VP9 WebM fallback (smaller, also all-keyframe via -g 1)
ffmpeg -y -i "$IN" \
  -vf "scale=${W}:-2:flags=lanczos,fps=${FPS}" \
  -c:v libvpx-vp9 -pix_fmt yuv420p \
  -g 1 -keyint_min 1 \
  -b:v 0 -crf 32 -an \
  "${OUT}.webm"

echo "Done:"
ls -lh "${OUT}.mp4" "${OUT}.webm"
echo "Frame count check (should equal keyframe count for clean scrubbing):"
echo -n "  total frames: "; ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "${OUT}.mp4"
echo -n "  keyframes:    "; ffprobe -v error -select_streams v:0 -show_entries frame=key_frame -of csv=p=0 "${OUT}.mp4" | grep -c '^1$' || true
