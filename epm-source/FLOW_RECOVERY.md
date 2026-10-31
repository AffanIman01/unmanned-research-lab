# Moving-mount recovery · Rev F

## Proposed flow

| Stage | Action | Advance only when |
|---|---|---|
| 1. Prepare | USV holds position and adopts a feasible current-facing heading. Lower head, open pins, verify magnet OFF. | Propeller, tether and approach corridors clear; station-keeping authority and ROV control available. |
| 2. Standoff | ROV waits below and clear of the head, downstream only when the propwash corridor permits. | Fresh relative pose and independent range/clearance evidence. |
| 3. Match | Track the mount's translation and rotation; correct fore-aft, lateral, depth and yaw errors. | Closing speed, attitude, pose confidence and available thrust margin acceptable. |
| 4. Insert | Rise slowly through tapered guides; pause vertical advance when lateral/yaw error grows. | Alignment stays within entry bounds for a dwell period; smaller entry/larger exit bounds avoid chatter. |
| 5. Contact | Confirm both seat observations; pulse magnet ON and verify attraction/contact. | No impact/slip, guide engagement, tether clear. Magnet is a seating aid, not a remote pull-in device. |
| 6. Lock | Engage two positive pins independently, confirm full travel and keeper engagement. | Both load paths verified; limited supported preload/load transfer and no-slip check pass; thrusters neutral after retention. |
| 7. Magnet OFF | Issue OFF pulse while pins remain locked. | Field/release-state evidence, seats and both pins stable through post-OFF dwell. |
| 8. Recover | Lift slowly with load, position, tether and vessel-motion monitoring. | Evidence remains fresh; no overload, jam, slip or disagreement. |

Keep the tether on the protected stern fairlead with a dancer and load/angle monitoring. Pay out or take up slack only. The reel must never pull the ROV into the mount. Stock CHASING E-Reel does not provide demonstrated automatic bidirectional management.

## Position correction

Estimate the ROV yoke pose **relative to the docking head**. GPS alone cannot supply this underwater relationship. A close-range camera and fixed marker geometry can support visual servoing; imaging sonar may provide relative range/bearing when visibility degrades. DVL, depth and IMU support vehicle motion estimation but do not independently observe the moving head. Sensor mounting, calibration, latency, dropouts and magnetic interference must be tested.

Use a local supervisory state machine around bounded relative-velocity control: mount velocity/rotation feedforward plus proportional position correction and a limited integral disturbance term. Apply anti-windup, acceleration limits and conservative contact speeds; use confidence, covariance and sensor-age gates. Current compensation must be coordinated with the inner velocity controller to avoid adding the same compensation twice. Real thrust reserve must come from actuator allocation/limits, not velocity alone. Keep final control local to the USV/ROV; the remote Internet link authorises and monitors it.

Before contact, growing error returns to a measured standoff only through an independently verified clear corridor. Limit retries and require operator review. On lost pose without a verified retreat corridor, stop insertion and invoke a tested local contingency; a software HOLD does not physically hold the ROV against current. After contact or partial engagement, stop mechanism/reel, preserve existing restraints and diagnose before separation. No automatic pull-away, lock opening, blind reeling or surfacing.

## Magnet and load-transfer check

The selected concept is pulse-switched EPM: ON for seating, positive locks for structure, OFF after handover. Removing supply leaves an EPM in its existing state. OFF requires a deliberate pulse and verification. It already has zero coil holding-current demand; electronics still consume energy. Mechanical latch retention must not require continuous powered actuation.

Check pin engagement independently of the command or an actuator-only end switch. Proposed keeper overlap plus independent pin-position/seat observations must be engineered. Where near-neutral buoyancy gives little natural load, use a controlled supported preload or instrumented keeper reaction to check transfer. Do not lift an unqualified load merely to discover whether the pins work. An underwater no-slip check does not certify dry-load strength, wet magnet force, fatigue or wave/slam capacity.

## What the current demo actually simulates

- Reduced mount-relative translation/yaw kinematics, not Gazebo/hydrodynamics.
- Synthetic cross-current, mount translation/yaw motion and 80%-accurate current estimate. PI absorbs residual bias; feedforward includes rotating-frame velocity.
- First-order velocity response of 0.25 s; no mass/inertia, thrust allocation, tether forces, roll/pitch or collision/contact mechanics.
- Assumed water-relative speed cap 0.25 m/s; assumed current cutoff 0.18 m/s. These are **not M2 PRO MAX specifications or tested operating limits**.
- Assumed alignment entry 18 mm / 0.04 rad, exit 35 mm / 0.075 rad, 1 s dwell, nominal final closing command 0.015 m/s, two retries, 100 s timeout.
- “Speed margin” is unused command-speed headroom, not actual thrust reserve. The model assumes valid synthetic measurements unless a fault is injected.
- Contact snaps the final pose within a small tolerance to ideal seating; it does not calculate guide friction or impact.
- HOLD freezes the illustration for review. Drift, physical station keeping and recovery from HOLD are not simulated. Start a fresh trial explicitly.
- Current contact checks hand over to the illustrated capture timeline; electrical ON/OFF pulse length is not derived from animation timing.
- The controls, gains, fault responses, lock verification and EPM field state remain a proposal. No approved CHASING command interface or real sensors are connected.

## First physical validation gates

Bench-check pin engagement and passive retention with an unloaded supported fixture; qualify magnet release/air-gap/wet contact and compass separation. In a calm pool, record relative-pose error, closing speed, engagement success and aborted attempts. Only after that, increase measured current in small steps and test motion/dropout/slack disturbances with independent recovery support. Set operating limits from measured authority, capture forces and clearances, not from the demo slider.

Primary reference for EPM switching principle (industrial reference, not selected subsea hardware): https://www.wagner-magnete.com/en/industry-solutions/detail/138-electro-permanent-lifting-magnet-5180n/
Blue Robotics DVL integration example (not proof of CHASING compatibility): https://bluerobotics.com/learn/dvl-a50-integration/
