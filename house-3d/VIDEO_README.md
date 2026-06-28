# Scroll-scrubbed video house (Apple-style)

Scroll position drives `video.currentTime`. Scroll down → orbit plays forward →
house rotates. Scroll up → reverses. Every angle is a real rendered frame, so
it's smoother than cross-faded images. One file, no frame ordering.

## Files
| File | What |
|---|---|
| `ScrollVideoHouse.jsx` | React/Next.js scroll-scrub component. |
| `video-viewer.html` | Standalone demo. |
| `encode-for-scroll.sh` | **Required** re-encode step (all-keyframe). |

## The one thing that makes or breaks this
A normal MP4 has keyframes every 1–2s. Seeking between them forces the browser to
decode forward from the last keyframe → **stutter on scroll**. The fix: re-encode
so *every frame is a keyframe*. That's what `encode-for-scroll.sh` does (`-g 1`).
File gets 3–5× bigger; scrubbing becomes instant. Non-negotiable.

```bash
cd house-3d
./encode-for-scroll.sh your_orbit_clip.mp4 house_scroll 30 1280
# -> house_scroll.mp4 + house_scroll.webm, all-keyframe
```
(I can run this for you — just drop the clip in this folder and tell me the name.)

## Run the demo
```
python3 -m http.server 8000
# open http://localhost:8000/video-viewer.html  and scroll
```

## Use in Next.js
1. Put `house_scroll.mp4` + `.webm` in `/public`.
2. ```jsx
   import ScrollVideoHouse from './house-3d/ScrollVideoHouse';
   <ScrollVideoHouse mp4="/house_scroll.mp4" webm="/house_scroll.webm" height="300vh" />
   ```

## Generating a clean orbit clip (the quality risk)
AI video models drift and warp geometry — a house can wobble or fail to loop. Tips:
- Prompt for a **locked, slow 360° turntable orbit, camera circling, subject perfectly still, seamless loop, white background**.
- Keep it short (3–6s). Shorter = less drift.
- Generate a few, pick the one that returns closest to its start angle (for a clean loop).
- If wobble is unacceptable, the bulletproof route is a real `.glb` (Meshy/Tripo from your
  4 photos) → I render a flawless turntable video from it. Geometrically perfect, loops exactly.

## When NOT to use video
If you need the loop to be *perfect* and the AI clip drifts, fall back to the
4-image cross-fade (`ScrollSpinHouse.jsx`) — geometrically exact, just softer.
```
