# Imported water-operation simulation

Source: **Unmanned Lab (USV-UUV) Water Operation**, project `appgprj_6aaefca7fe7481918e4010d512f00b33`. The original source site is unchanged.

This standalone client bundle imports its existing simulation engine, five GLB models, ocean shader, wave tank, bridge scenario, deployment/recovery sequence, virtual PTZ, avoidance controls and synthetic inspection log. It is hosted at `dist/water-simulation/` inside Recovery Studio.

The initial import was limited to standalone packaging, relative model paths, an Open sea default, a plum theme, compact controls with expandable settings, browser-native inspection images, and parent readiness/error notifications. Source SHA-256 hashes are recorded in `SOURCE-PROVENANCE.json`.

## Build

Node 22.13+:

```sh
cd simulation-source
npm install
npm run build
npm run check:physics
```

The build emits directly to `../dist/water-simulation`. This import was built with the pinned versions in `package.json`, using already installed matching dependencies. No source-server or remote iframe dependency is required at runtime.

The parent creates the iframe only on entering Simulation and removes it on exit. Model and WebGL startup failures emit `water-simulation-error`. Successful model loading emits `water-simulation-ready`. Both are sent only to the same origin; the parent must check both origin and source window.

## Model limits

This is an **uncalibrated synthetic simulation**. It is not connected to Gazebo or real hardware. Its original lift uses 47.6–53% with its own GLB datum; the separate Recovery Studio model uses a different lift display. Neither percentage establishes a measured stroke. Recovery is scripted. Cable forces, real radar measurements, communication quality and real-vessel operating limits are not validated here. Original detailed assumptions remain available inside the simulation.

## Water and wake update · Rev AP
Rev AP introduced a near-black grid from the supplied reference. Rev AQ supersedes that appearance with the earlier plum theme and daylight sky. Water retains its reflective physical material, analytic wave normals and denser geometry around the vessel.

A steady current advects the incident waves and wake; drag is evaluated relative to water. Current changes restart the trial to preserve phase consistency. Cutting USV drive allows inertial coast-down. Released effective mass also scales rotational inertia.

Two stern sources emit bounded, dispersive gravity-wave packets from water-relative speed. They retain world-space history through turns, reverse, advect with current and decay after stopping. The CPU field and GPU displacement share the packet parameters and formulas. ROV motion and buoy markers sample the combined field; USV forces exclude its own uncalibrated wake. Foam and propwash are visual approximations, clipped at the wave-tank edges. No CFD, calibrated propeller model, wave-resistance calculation or tank-wall reflection is claimed.

Checks: `npm run check:physics`, `npm run check:wake`, `npm run check:surface`, `npm run build`. CPU/render equation checks do not replace browser GPU compilation or visual inspection, unavailable in this environment.

Primary references:
- Gravity-wave dispersion: https://web.mit.edu/fluids-modules/www/potential_flows/LecturesHTML/lec19/node5.html
- Marine relative-flow dynamics: https://www.fossen.biz/html/marineCraftModel.html
- Wake-angle limits: https://arxiv.org/abs/1304.2653 and https://arxiv.org/abs/1309.6751
- Physical material/environment lighting: https://threejs.org/docs/pages/MeshPhysicalMaterial.html and https://threejs.org/docs/pages/RoomEnvironment.html

## Studio ME120 and restored daylight · Rev AQ
The simulation uses the same detailed ME120 GLB and sensor-rack geometry as 3D Studio: ZED stereo camera, RoboSense LiDAR, central radar, and the photo-matched ivory antenna. Existing PTZ, navigation lights and four aerials are retained. Geometry and mounting dimensions remain photo estimates. The existing simulation lift datum, deployment sequence and water physics are retained.

Restored the earlier daylight ocean sky and haze. The main page returns to a slightly darker plum background with the full-width muted-lavender university header. The black grid is removed. No changes to wake, current or buoyancy equations. Browser/WebGL visual inspection remains unavailable.

Model alignment check: `npm run check:model`. The editable source imports `../dist/sensor-rack.mjs` and `../dist/component-data.mjs`; keep these shared Studio dependencies in place. The download includes them at these paths, plus the identical `dist/models/me120-reference.glb` used by the comparison check. The browsable static site is also supplied under `studio/`.
