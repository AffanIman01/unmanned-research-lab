# Unmanned Research Lab — USV–ROV Recovery Studio

Research interface for OceanAlpha ME120 and CHASING M2 PRO MAX integration.

- Project overview, research team and documentation
- Interactive 3D studio, magnetic recovery concept and four animated accessories
- ROV pilot and integrated USV–ROV Water Operation simulation
- Keyboard controls, camera views, telemetry and trial recording

**Live studio:** https://unmanned-lab-recovery-mechanisms.fannximan.chatgpt.site

## Run locally

The ready-to-serve website is in `dist/`. From the repository root:

```sh
python -m http.server 8000 --directory dist
```

Open http://localhost:8000. Use a browser with WebGL enabled for the 3D views.

## Rebuild Water Operation

Use Node.js 24 and npm:

```sh
cd simulation-source
npm ci
npm run build
```

The build writes to `dist/water-simulation/`. The remaining site is plain HTML, CSS and JavaScript.

## Controls

WASD: translation; Z/X: yaw; Q/E: roll; R/C: ascend/descend; T/V: pitch.
Space: arm/disarm; 0: level; F: lights; brackets: speed limit; 1–4: camera views.
Hold L for 1.5 seconds to deploy/retrieve in Water Operation. K opens accessories.

## Research status

Browser simulations and accessory animations are illustrative and uncalibrated.
They do not establish real hardware reliability or safe operating limits.

See `PROJECT_HISTORY.md`, `verification/`, and the in-app Documentation tab for development notes and checks.

## Team

Assoc Prof Dr Wan Yusof Rahiman — Research team lead  
Wan Abdul Syaqur Norzam — Research team  
Affan Iman Azman — Software integration and control systems  
Ishtiak Ahmed — Mechanical design

Confidential research project. Third-party assets retain their existing notices.
