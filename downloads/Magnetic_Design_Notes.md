# D · EPM capture with mechanical pins

The existing round mount carries a compact head. A removable padded yoke stays on the ROV and presents a ferromagnetic strike plate, two guide receivers and two keeper ears. Do not rely on the ROV housing being magnetic. The yoke/contact regions, its buoyancy and clearance require measurement and approval.

## Power and capture

Use a pulse-switched electro-permanent magnet (EPM), not a continuously energized holding coil. An EPM retains its current magnetic state with no coil holding current. It does not capture from a distance. The two positive pins and structural yoke carry lifting loads; no magnetic strength is credited. Sensors, controller, driver standby and the reel still consume power.

Illustrative switching energy: 24 V × 3 A × 0.2 s × 2 pulses / 3600 = 0.008 Wh per return-capture cycle. This is arithmetic with assumed values, not a product specification or whole-system consumption prediction. Electrical pulse duration is independent of the slowed visual animation.

No underwater-rated EPM, pin actuator, driver or sensor has been selected. Qualification must cover pressure, seals, corrosion, pole gap/coating/fouling, strike-plate material/thickness, residual magnetism, thermal behavior, force measurement and magnetic interference with both vehicles’ heading sensors. Each engaged mechanical load path requires sizing; no equal load sharing is assumed by default.

## Release and return

1. Lower while mechanically captured; confirm full immersion, support/unloaded condition, tether clearance and healthy ROV control.
2. Verify magnet OFF while both pins retain the yoke. If still ON, issue and verify an OFF pulse; do not interpret loss of supply as OFF.
3. Confirm release readiness, retract both pins and verify open.
4. Separate downward below guide tips; swim clear. Do not use tether tension to separate the vehicle.
5. Track the moving mount; align below it, match its motion, then rise slowly during a stable alignment window.
6. Verify contact; pulse magnet ON and confirm state. Close and independently confirm both pins fully engaged, not just actuator command completion.
7. Check the mechanical load path and absence of slip using an instrumented, limited preload or supported transfer procedure. Neutral buoyancy alone cannot prove pin loading. Maintain appropriate ROV control until the yoke is retained; then verify thrusters neutral.
8. Pulse magnet OFF while both pins remain engaged. Verify magnetic state, seats, pin engagement and a stable post-OFF dwell. Only then permit supervised lift. Continue monitoring during lift.
9. On a fault after contact, stop carrier/reel movement and preserve engaged restraints. Do not automatically retreat a partially engaged ROV. Power loss does not automatically change an EPM's magnetic state; restart requires recovered sensor evidence.

The proposed mechanical pins must retain passively after engagement. A continuous solenoid holding force is unsuitable for the intended zero holding-actuator power behavior. Sensors and controller remain powered. A submerged transfer check is not a dry lifting proof test or structural qualification.

An EPM already has no coil holding-current demand. Its OFF pulse removes attraction and may reduce magnetic interference; it does not create additional EPM holding-energy savings. A conventional electromagnet instead loses its commanded field when de-energized, subject to residual magnetism, and would save coil energy after mechanical takeover. The current concept is the EPM option.

The browser uses synthetic confirmations and illustrates a sequence. It is not a controller for the CHASING hardware. See `FLOW_RECOVERY.md` for current-relative docking and model limits.

## Tether path

Deck-fixed E-Reel → dancer/load sensor → captive stern sheave → free tether → ROV strain relief. The fairlead center at X = −1.48 m is aft of the reference propeller plane near X = −1.243 m; this is a visual-model placement, not a full swept-clearance or yaw check. Keep the free span outside both propulsion envelopes. Reserve slack through the 271.7 mm limited illustrated mast travel (65% of the unmeasured 418 mm reference), monitor tension and angle, and stop take-up on high tension. No blind payout when routing is uncertain. No lifting or docking by tether.

The 80 mm illustrative sheave radius is not an approved cable bend radius. Confirm cable diameter, minimum bend radius, load limits, connector strain relief, retention guards and service access.

The OEM E-Reel requires the cable to be removed from the straightener for manual payout and reinserted for powered winding. The separate guide does not automate this change. Automatic bidirectional service needs a manufacturer-approved interface/mechanism or a replacement reel; it is not a stock capability shown as completed. The reel also needs splash protection consistent with its manual.

## Preliminary demand

8 kg ROV + 2 kg accessories + 1.8 kg removable yoke + 3.5 kg moving head + 1 kg retained water + 0.5 kg supported tether = 16.8 kg. With multiplier 1.5 and 25 N friction: 272.2 N equivalent lift demand. A screening factor of 2 gives 544.4 N demand target. These are unweighed allowances, not a SWL or approved safety factor. The mount, pins, lugs, guide keys and ROV support require structural design, fatigue/corrosion review and controlled testing. Current raised pose remains wet.

## Sources

- EPM switching/hold principle only; this large industrial product is not a selected subsea part: https://www.wagner-magnete.com/en/industry-solutions/detail/138-electro-permanent-lifting-magnet-5180n/
- Official CHASING E-Reel manual, payout/take-up procedure and water precautions: https://web.file.chasing.com/lvX6ye-v0YP6j1dCz6_hN4Y6tnUA
- Heading-sensor magnetic interference background: https://ardupilot.org/copter/docs/common-magnetic-interference.html

Updated guard and browser results are supplied in `flow_test_results.json` and `flow_browser_checks.json`. Prior six STEP exports reopened with valid solids; this update changes control illustration only. None of these checks establish physical fit, magnetic force, structural capacity or hydrodynamic performance.
