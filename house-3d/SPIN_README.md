# Scroll-spin house — 4-angle cross-fade

The right approach for your floating-island house: rotate it as the user scrolls
by cross-fading your 4 real renders. No 3D mesh, no WebGL. Each frame is a
finished render, so every angle is pixel-perfect. Tiny and works on every device.

## Files
| File | What |
|---|---|
| `spin-viewer.html` | Standalone demo. Open it to see the scroll-rotate effect. |
| `ScrollSpinHouse.jsx` | Drop-in React/Next.js component. |
| `angle1..4.jpg` | Your 4 angles in rotation order (front → right → back → left). |

## ⚠️ The images are currently low-res thumbnails
The mount kept dropping your full-size `Gemini_Generated_Image_*.png` files, so
`angle1..4.jpg` are ~360px previews — enough to see the effect, not for production.

To ship full quality: save your four full-res renders into this folder, named
`angle1.jpg` … `angle4.jpg`, in this exact rotation order:
1. **angle1** = front (entrance, door, path)  — was `dijpyi`
2. **angle2** = right side (wood cladding right) — was `38326k`
3. **angle3** = back (plain stucco gable)        — was `7kil9t`
4. **angle4** = left side (wood cladding left)    — was `rgmxda`

Order matters — wrong order = the house jumps instead of turning.

## Run the demo
```
cd house-3d
python3 -m http.server 8000
# open http://localhost:8000/spin-viewer.html  and scroll
```

## Use in Next.js
1. Put `angle1..4.jpg` in `/public`.
2. Render inside a page:
```jsx
import ScrollSpinHouse from './house-3d/ScrollSpinHouse';

<ScrollSpinHouse
  frames={['/angle1.jpg','/angle2.jpg','/angle3.jpg','/angle4.jpg']}
  turns={1}        // 1 full revolution across the scroll section
  height="300vh"   // taller = slower, more deliberate turn
  loop             // blends the back frame around to the front
/>
```

## Knobs
- `turns` — revolutions across the section. `1` = one full spin. `0.5` = half turn.
- `height` — how much scroll distance the rotation occupies.
- `loop` — set true so frame 4 fades back into frame 1 seamlessly.

## Making it smoother later
4 frames cross-faded reads as a turn but is slightly soft mid-blend. For a
crisper spin, generate intermediate angles (45°, 135°, 225°, 315°) and add them
to the `frames` array — the component handles any frame count automatically.
