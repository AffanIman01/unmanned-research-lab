# Research application concept animations

Four original, procedurally rendered 3D application examples for the Research potential section and dummy Videos cards:

- `ports`: underwater inspection around quay piles.
- `reservoir`: water-intake and retaining infrastructure inspection.
- `aquaculture`: inspection beside a circular fish-farm net.
- `energy`: nearshore turbine-foundation inspection.

Each has a looping 720 × 450 GIF, PNG poster and silent H.264 MP4: 40 frames, 10 fps, 4 seconds. The MP4s are placeholder concept clips, ready to be replaced by the owner's YouTube videos. They are not field recordings, measured results or evidence of a deployed capability.

The renderer uses the existing ME120 and CHASING M2 PRO MAX reference GLB meshes from `dist/models/`. These are approximate visual reference models, not OEM engineering CAD. No original GLB files were changed. A connecting mast is added only inside this render because the standalone ME120 GLB antenna crossbar is separated from the adjustable support normally provided by the interactive scene. Relative scene and ROV sizes are adjusted for legibility; these images are not 1:1 design drawings.

All environmental geometry, camera projection, lighting, motion, tether curve and light beams are generated locally by `generate.py`. The scenes use true 3D triangle geometry and a CPU painter renderer with translucent cutaway water. The ROV follows a seamless slow route while its tether remains slack. This is an illustrative motion sequence, not a hydrodynamic, tether-force or collision simulation.

Rebuild from the repository root:

```
python dist/application-motion/generate.py
```

Dependencies: Python, NumPy, Pillow, FFmpeg. No external photos, stock footage, people or browser screenshots were used. `contact-sheet.jpg` provides one frame of each concept for visual inspection.
