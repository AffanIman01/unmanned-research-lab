# Concept D — pulse-switched capture + positive locks

**Unmeasured concept. Not fabrication or load-rated CAD.** Metre parameters → millimetre STEP, Z up.

Existing round mount → blank adapter → compact head → two locking pins → removable padded ROV yoke.

- EPM gives brief magnetic capture. After full pin engagement and load transfer are checked, pulse OFF and recheck retention before lifting. Mechanical pins carry the suspended load; **zero magnetic structural credit**.
- Proposed pulse-switched magnet avoids continuous hold-coil power. Subsea-qualified magnet and driver are not selected.
- New ferromagnetic armature stays on the removable yoke. No assumption that the ROV frame is magnetic.
- Independent pin feedback, seated feedback and guide engagement must agree before lifting.
- Release only fully submerged and unloaded: confirm magnet OFF while pins still retain (issue an OFF pulse if still ON); confirm demagnetized, retract both pins, verify open, then separate below the guides and swim clear. EPM can remain magnetised after power loss.
- Captive fairlead is fixed to verified USV structure, separately from the moving head. Centre at X −1480 mm is provisional; propeller clearance remains unverified.
- Tether path: deck reel → calibrated tension measurement → stern fairlead → ROV strain relief. Reel must not drag ROV into capture.
- Stock E-Reel payout/take-up routing and automation limitations are recorded in `parameters.json`; this CAD does not make it automatically bidirectional.

| File | Content |
|---|---|
| ME120_EPM_Lock_Concept.step | Closed pins, magnetic faces together; ROV body reference |
| ME120_EPM_Lock_Exploded.step | Separated groups for inspection |
| ME120_EPM_Lock_Released.step | Pins retracted 74 mm; yoke and ROV lowered 180 mm |
| Mount_EPM_Pin_Head.step | Blank interface, EPM, guides and lock head |
| ROV_Removable_Yoke.step | Padded yoke, armature, keeper ears and guide receivers |
| Stern_Tether_Fairlead.step | Separate illustrative sheave, captive keepers and sensor envelope |

Mount adapter OD/ID/thickness: 170/74/8 mm. Original mounting holes intentionally omitted. The reference ring is 4 mm thick, also unmeasured.

ROV reference: 608 × 294 × 196 mm, excluding lights and tether. Body bottom is Z 85 mm. The real lamp, thruster, connector, manipulator and body-contact envelopes must be surveyed before yoke development.

New pin/lug concept: Ø12 mm pin in Ø14 mm bore, axis Y. Each 85 mm pin has 74 mm retraction. Closed pins leave 23.5 mm radial clearance to the central Ø74 mm mounting bore projection; released tips clear keeper ears axially by 21.5 mm. These are geometric clearances, **not tolerance or strength acceptance**.

The 80 mm sheave outside radius is illustrative. Cable bend radius, diameter, pinching clearance, fairlead orientation and tension working limits need OEM confirmation. Sensor envelope is not a calibrated instrument design.

Current reference mast stroke does not raise the assembly dry. Pin shear/bending, lug bearing/tear-out, fatigue, corrosion, joints, fasteners, actuator sealing, yoke stiffness and OEM mount loading remain unvalidated. Validate physical load paths and collisions, then test with a dummy in supervised calm water.

Run `python build_epm_mechanism.py` with CadQuery 2.7.0. `CAD_Validation.json` records valid BReps, successful STEP reimports and pin/bore geometric checks. No FEA, hydrodynamics, magnetic simulation or hardware tests are claimed.

## Rev F control update

`FLOW_RECOVERY.md` describes moving-mount docking and the magnet-OFF handover. The current-adjustable browser demo is kinematic only. `flow_tests.mjs` and the JSON results cover the updated guards and reduced model. Existing CAD geometry is unchanged.
