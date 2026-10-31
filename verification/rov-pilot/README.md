ROV pilot revision: third-person wave tank, GO1-inspired overlay, animated RC3 illustration.

Checks: node check.mjs validates ascend/descend sign, horizontal motion, tank clamps, depth hold, yaw and attitude bounds. JavaScript syntax checks passed. Browser preview verified rendering, simulation unlock, input active state, +100% left vertical stick from Space+R and trial recording.

Cloud browser has WebGL disabled: detailed GLB rendering could not be visually verified there. A labelled 2D schematic fallback renders in that environment. The full renderer uses the existing CHASING GLB and packaged Three.js/GLTFLoader. No live vehicle endpoint is used. Wave motion is illustrative surface motion; this is not a calibrated hydrodynamic solver. Controller mapping is a keyboard visualization, not a verified RC3 protocol map.
