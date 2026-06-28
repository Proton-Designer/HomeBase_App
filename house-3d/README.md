# House 3D — depth reconstruction

Generated from `house.png` using monocular depth estimation (MiDaS) → displaced textured mesh.

## What this is (and isn't)
- **Is:** a real, textured, watertight `.glb`/`.obj`. The front face has true depth displacement (roofline, balconies, chimneys, recessed windows read as 3D). Looks great from the front and ±40° either side.
- **Isn't:** a full walk-around model. The back is a flat closed shell — single-photo depth can't see the rear of the house. Rotating past ~60° shows the flat backing. That's the hard limit of one-image reconstruction without a GPU image-to-3D model.

## Files
| File | Use |
|---|---|
| `house_model.glb` | Full-res mesh (84k faces). Production asset. |
| `house_model.obj` | Same mesh, OBJ format (for Blender etc.). |
| `house_preview.glb` | Lightweight (8.8k faces) for fast web loading. |
| `viewer.html` | Open in a browser to orbit the model (uses your GPU). |
| `ScrollHouse.jsx` | React/Next.js component: house re-angles as you scroll. |

## Run the viewer
Local file loading needs a server (browsers block `file://` glb loads):
```
cd house-3d
python3 -m http.server 8000
# open http://localhost:8000/viewer.html
```

## Use in Next.js
1. Copy `house_model.glb` (or `house_preview.glb`) into `/public`.
2. `npm i three`
3. Render `<ScrollHouse src="/house_preview.glb" turns={0.75} />` inside a page.
   Scroll through the section → the house rotates. Stays within the front-facing arc by default.

## The honest recommendation
For a hero that rotates a *full* 360°, this relief mesh isn't the right asset past ~60°.
Either (a) keep rotation within the front arc (looks excellent, ships today), or
(b) generate a true mesh with a hosted image-to-3D model (Meshy / Tripo / Rodin) and swap the glb in — `ScrollHouse.jsx` will render it unchanged.
