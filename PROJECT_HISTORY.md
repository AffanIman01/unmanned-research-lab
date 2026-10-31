# Unmanned Research Lab · Rev V

## Documentation and research lead portrait — 31 October 2026

Documentation is the fifth main tab, immediately after Simulation. It contains
quick launch links, collapsed control/camera/accessory/trial guides and existing
project downloads. Opening it unloads the simulation as with other tabs. The
ROV and Water Operation shortcuts select their matching simulation mode.

The research team now uses the user-supplied portrait of Assoc Prof Dr Wan Yusof
Rahiman. Lossless WebP encoding preserves the original decoded RGB pixels;
the fictional lead portrait and its visible sample caption are removed.



## Free view and instrument cluster — 31 October 2026

Both vehicles now have a fourth camera preset. Drag orbits; right-drag or
Shift-drag pans; scroll zooms. On touch, one finger orbits and two fingers
pan/pinch. Free view stays in world space until Recenter (or double-click).
Camera input does not arm the vehicle or change propulsion commands.

Close follow groups available simulated telemetry into a bottom-right dial:
speed (3D magnitude, m/s and knots), heading, attitude, depth/heave, vertical
velocity, drive limit, position, and applicable tether/lift/lamp/battery values.
The USV also shows vertical acceleration. Gauge scale is a display range, not a
manufacturer performance rating. Battery appears only where a synthetic battery
model exists. Water Operation displays the selected camera vehicle's data even
while the other vehicle is controlled; automatic operation is labelled.

Verification: five camera/input/telemetry checks, nine real pilot-handler checks,
and seven existing camera/leveling checks pass. ROV browser fallback confirms
free orbit/recenter, camera switching and the live dashboard. This browser has
WebGL disabled, so full 3D Water Operation rendering remains unverified.

## Current simulation controls — 30 October 2026

- Space toggles selected-vehicle manual arm/disarm; starts disarmed. No hold required.
- ROV: WASD translation; Z/X yaw left/right; Q/E roll; R/C heave; T/V pitch.
- 0 requests attitude leveling. F cycles lamps; brackets select 25/50/75/100% drive.
- Keys 1/2/3/4 select first person, close follow, third person, free view for the selected camera vehicle.
- Water Operation camera selector exposes USV and ROV; P retains independent USV PTZ.
- Escape stops/disarms; focus loss disarms. Water Operation may pause the ROV trial.
- Automatic USV station holding and scripted deployment/recovery remain separate from manual arm.
- Bridge observation capture is K (moved from X to avoid the yaw shortcut).

Both pilots animate propellers for commanded translation, rotation and leveling;
passive wave drift alone does not animate powered propellers. The ROV Pilot's
surface, paddle and passive ROV disturbance share a finite-depth linear wave
field. Water Operation uses its existing wave/current field and local velocity
gradients to disturb ROV attitude. These are uncalibrated demonstrations.

Selectable official M2 PRO MAX-compatible accessories: Grabber Arm 2 (animated
jaws), Laser Scaler (10 cm reference beams and a raycast target plate), Water
Sampler (synthetic collection progress and depth/position). Mount geometry,
action timing, control gates, and simultaneous fit are illustrative. Disarm stops
tool motion/collection and turns off lasers; it never resumes an old action on
re-arm. Official links are in the tool panels and rov-accessory-data.mjs.

Validation: control, arm/disarm, rotational animation, camera geometry, coherent
wave response and accessory tests pass. Browser QA confirms the ROV Pilot's
Space switch, Z yaw, passive motion, tool selection/actions and sampler stop on
disarm through its perspective fallback. WebGL is disabled in this browser;
actual 3D rendering remains unverified. Production Vite build succeeds.


ME120 + CHASING M2 PRO MAX. Magnetic recovery is the only active mechanism.

## Camera controls

- **ME120 → USV camera:** W/S tilt, A/D pan. Keys aim only the camera, only while this mode is active. On-screen controls support touch. Centre resets aim and zoom; Esc/Exit camera returns to orbit.
- **M2 PRO MAX → ROV camera:** fixed forward lens, following the vehicle. WASD does not move the ROV or its lens. F toggles lights; T previews propeller spin.
- **Assembly:** select either onboard camera while the magnetic deployment/recovery runs. The ROV lens follows its animated vehicle pose.
- Keyboard aim stops on key release, view change, window blur, hidden tab, editable input or dialog. Orbit controls are inactive in camera mode.

Views are synthetic WebGL renderings. The standalone camera test chart is an aiming reference, excluded from GLB exports. No video stream or hardware control is connected. PTZ pan/tilt (−80° to 0°), 70° base field of view, 1–4× zoom, and the ROV's 80° field of view are illustrative settings, not manufacturer specifications. USV anchor follows the existing underside camera on the antenna/lift assembly; ROV anchor follows the modeled front glass.

## Preserved operation

The original detailed vehicle meshes remain photo-derived, not OEM CAD. Nominal hull 2.50 × 1.40 m; ROV 608 × 294 × 196 mm excluding lamps. The header uses a transparent 1863 × 450 official USM APEX asset and the earlier 1642 × 958 SEEUSM cutout on a neutral ivory panel. The blue screenshot backgrounds are removed. Logo sources and the cutout provenance are in `studio/branding/SOURCES.md`.

Lift lower stop: **65%** of the former unmeasured 418 mm reference, **271.7 mm modeled travel**. Applies to manual and automatic magnetic motion. The grey deck enclosure stays removed; a computer mass allowance remains pending installation. Original USV/ROV propellers, ROV lights, translucent motion arrows, simulated positioning, exploded view, current-docking illustration and fault interlocks remain available.

## Magnetic mechanism

Original ring → blank adapter → EPM capture head → two positive mechanical pins → removable ROV yoke. Stern tether guide remains separate from the moving head.

Capture: contact → magnet ON pulse → both pins verified → load-transfer check → magnet OFF pulse → retention recheck → lift. EPM OFF requires a pulse; loss of supply alone does not demagnetize. No magnetic structural credit is used. Release requires full immersion, unloaded support and verified magnet OFF before opening pins.

The current model uses 16.8 kg moving recovery mass, 272 N equivalent lift demand and a 544 N resistance screening target. These are assumptions, not safe working loads. Manufacturer structural ratings, actual mass/CG, clearances, support contacts, wet magnetic performance and tether sweep still require verification. Stock E-Reel routing is not automatically bidirectional. No Gazebo, FEA or real-water validation is claimed.

## Files and checks

`epm-source` contains magnetic CAD parts, parameters, source and existing geometry validation. No alternative mechanisms are included in this revision's download. `studio` contains the complete application and `epm-source/vision_checks.json` records camera/mode verification. CAD component geometry is unchanged.

Run `python -m http.server 8000` inside `studio`, then open localhost:8000. WebGL2 is required. GLB exports the current visible hardware; simulated camera test targets and motion arrows are excluded.

Original model source: ME120 Design Lab, commit `2f26e8bbed6f2376e5a6df6befb3755d56894be6`; see `studio/models/provenance.json`. Camera optical anchors are model-derived and uncalibrated. Primary engineering references remain in Model info and magnetic design notes.

Vehicle titles show OceanAlpha beside ME120 and CHASING beside M2 PRO MAX, using original transparent manufacturer assets. Branding is hidden with the title during onboard camera mode.

## Typography
Interface and canvas labels use the native Apple/system font stack. Apple devices use San Francisco; other platforms use their installed system font. Manufacturer and university logo assets retain their original artwork. No Apple font files are redistributed.

Vehicle headings include ME120’s survey-purpose description and the M2 PRO MAX Industrial ROV label. The university logo panel uses a softer translucent background; logo artwork remains opaque.

## ME120 component inspection
Click a component marker, the sensor/hatch geometry, or choose from Inspect. PTZ opens a Hikvision information card with an optional camera-view action. The two outer antenna-bar units are LALIZAS navigation lights, corrected from the earlier radar labels. One millimetre-wave radar occupies the central white housing below ZED and above PTZ. Its visible housing label is BLD345, not a verified model identifier. The 50 m sensing range is an OceanAlpha ME120 reference; installed make, model and performance remain unconfirmed. Both GNSS antennas and Antennas 1–4 have individual cards; unidentified antenna functions remain pending. Battery hatches open and an illustrative pack lifts out; close or Esc restores the view and packs. Original hatch triangles are separated at runtime; source GLBs remain unchanged. Illustrative battery pack overlays are excluded from GLB export; the original navigation-light housings remain part of the reference model.

Electrical reference: the OceanAlpha-branded Nautikaris ME120 brochure lists 43.2 V / 50 Ah × 4. 2.16 kWh per pack and 8.64 kWh total are calculated nominal values, not measured usable capacity. An older ME120 brochure separately lists 14.5 kg × 4. Documents cover different revisions; verify installed pack nameplates. Pack dimensions and compartment assignment are illustrative. Hikvision identification is user-supplied, exact model pending. All reference links are accessible inside each information card.

## Two-radar demonstration
Open either radar card and choose **Show how it works**. Both original housings remain in place. Outgoing wavefronts and returning echoes illustrate sensing; each channel can be toggled independently. Move the demo obstacle ahead or sideways, pause or replay. Synthetic ranges come from scene geometry; they are not telemetry. The seven-metre display extent and fan shape are teaching choices, not the hardware field of view or range limit. 50 m remains a separately published reference. No actual waveform, update rate, detection performance or OEM avoidance algorithm is inferred. The unit meshes do not rotate. Coverage/rays/obstacle remain outside exported hardware geometry.

Radar principles: https://www.ti.com/lit/wp/spyy005a/spyy005a.pdf . FMCW is described as a common approach only; the installed waveform is unknown. Closing the card, changing vehicle or entering camera/exploded mode stops the demonstration. Hidden tabs pause animation time; reduced-motion preference starts the demo paused.

## Ground equipment and Starlink · Rev S

- **ME120:** the existing Starlink Mini now has a branded specification card. A shore-side folding table holds a laptop, two antenna masts with leads to a radio unit, and a hand controller. The table is beside the boat, not an onboard payload. Its whole-station card links to each item; the Inspect selector also lists each component.
- **M2 PRO MAX:** the existing detailed E-Reel reference stands beside the ROV, with a provisional CHASING-style hand controller and separate phone on its holder. Each item and the ROV open a zoomed information card.
- **Interaction:** click a marker or device, select from Inspect, or follow the short related-equipment buttons. Close or Esc returns to the prior view. Ground equipment and ROV accessories hide in onboard-camera and exploded views.
- **Geometry:** original vehicle, installed reel, Starlink and magnetic hardware geometry remains unchanged. The separate E-Reel copy uses its original reference scale, not the deck display's 0.8 scale. That source is photo-derived and unmeasured; it is not rescaled to imply exact manufacturer dimensions. Ground equipment, controllers, screen content and wiring are provisional until user photographs arrive. The source renders controller aerials in addition to the two separate ground antennas.
- **Data:** Starlink Mini fields are from its official specification sheet. E-Reel fields are the original manual reference, not a verified installed revision. Remote Controller 3 is a compatible reference; the user's installed controller remains unconfirmed. Starlink is proposed internet backhaul, while the ROV tether remains. No live internet, radio, camera, telemetry or hardware control is connected. Ground equipment is not included in the vessel payload estimate.

Reference links are attached to each card. The Starlink logo is the original transparent official asset; provenance is in `studio/branding/SOURCES.md`.

Validation: 15 Node checks using the actual GLBs cover equipment geometry, two antenna leads, independent inspection, subject filtering, related-item navigation, close/restore, camera/explode transitions, existing radar/battery cards, and desktop/mobile camera frustums. The information card area is reserved when framing accessories. Browser visual verification was not performed because the required control-browser capability was unavailable. Results: `verification/accessory-results.json`; earlier checks and screenshots are historical.

## Research title · Rev T

Centered project identity: **Integrated USV–ROV Deployment and Teleoperation**. Team names: Assoc Prof Dr Wan Yusof Rahiman; Affan Iman Azman; Ishtiak Ahmed. Names share equal visual weight; no roles are inferred. Desktop names form a centered row, stacking on compact screens. Header remains in normal document flow. This is a presentation-only update; browser visual preview was unavailable.

## Clearer equipment information · Rev U

The header is a continuous warm ivory strip. The full-colour USM APEX logo is the last/rightmost mark in the first row, with the school mark beside it. Research title and names remain centered below.

Always-visible text bubbles are replaced by faint 5px dots with 28px touch targets. A name appears only on hover or keyboard focus. Inspect and the quick-view links sit below the canvas. Both ME120 and ROV views retain geometry selection and click-to-zoom cards; E-Reel information is also available on the installed ME120 reel.

ROV quick view: **ROV ports · E-Reel · RC controller**. The new port guide covers two Ethernet and three UART accessory interfaces, separate from the rear tether/charging socket. It lists compatible accessory categories, with electrical reference values and manufacturer manuals in expanded details. Port assignments depend on the accessory kit; no generic USB/RJ45 compatibility or summed power budget is claimed. The real connector cluster is on the underside of the forward main cabin. Its precise layout is uncalibrated in the photo-derived model, so the guide does not add misleading slot-specific markers or geometry.

Eighteen Node/actual-GLB checks passed, including external equipment controls, ROV quick-view actions, accessory information, camera transitions and desktop/mobile camera framing. Browser visual verification remains unavailable. See `verification/quiet-info-results.json`.


## USM identity and focused ROV view · Rev V

The lab is now **Unmanned Research Lab**. The full-width header retains the USM mark at the far right; the interface uses USM's web-guideline Royal Purple #5F259F and Gold #FFB81C with a restrained dark plum canvas. Original vehicle and institution artwork is retained. The centered research title and all three names remain.

A compact manufacturer row below the title links OceanAlpha, CHASING, Starlink and Hikvision. A separately labelled **Planned on USV** group adds NVIDIA Jetson Orin NX, Stereolabs ZED stereo camera and RoboSense 3D LiDAR. These are project technology references, not sponsorship claims. Hardware locations, ZED/LiDAR model selections, integration interfaces and power allowances remain pending user photographs and specifications. No speculative onboard parts are added.

Selecting M2 PRO MAX now fits the actual ROV hardware into the unobscured part of the viewport, with aspect-aware framing and measured title/toolbar clearances. The existing light-beam visualization was inflating click-to-inspect camera bounds even when invisible; hardware bounds now exclude those cones while retaining lamps, thrusters and the tether connector. This corrects the ROV popup as well as the default ROV hero. E-Reel and controller remain accessible through their quick-view controls and orbit/zoom.

Nine new actual-GLB camera checks verify beam exclusion with lights on/off, retained physical lamps/rotors, desktop/mobile projection and closer framing. Eighteen equipment checks are rerun after integration. Browser visual verification is unavailable because this managed Sites environment does not expose the required control-browser capability. Existing historical screenshots do not verify this revision.


## Softer header · Rev W

Header background is now muted lavender-grey #BEB4C8. Full-colour USM and school artwork remains unchanged. Action text #51405F and USM purple text #5F259F each achieve approximately 4.69:1 contrast against the header. Browser visual preview remains unavailable.


## Darker header · Rev X

The header is now #94869F, a deeper muted lavender-grey. Header text uses #2C163C / #35144F for readable contrast; original full-colour institution logos are preserved. Browser visual preview remains unavailable.


## Photographed sensor stack and ground antennas · Rev Y

The ME120 now carries a photo-referenced central ZED stereo camera inside its black guard and a cylindrical RoboSense LiDAR above it. Modelled details include twin lenses, lens rings, black optical sleeve, ribbed lower LiDAR band, silver cap and badge, mounting bolts, twin posts, a rigid forward mounting plate, camera support pads and rear cable loops. The central white housing follows the photographs and is identified as the millimetre-wave radar by the user correction of 8 October 2026. Three grey aerials and one ivory aerial match the new photographs. Original LALIZAS side-light housings, lower PTZ, hull and lifter geometry remain.

The new rack is a child of the original antenna assembly: it follows the same 65% lift limit without a separate lift transform. The ME120 exploded view separates the guard, ZED and LiDAR; assembly mode restores them. ZED, 3D LiDAR and Sensor rack have separate quick-view cards and automatic close framing. Sensor rack is quick-view only, so its larger hitbox cannot steal direct sensor clicks. The manufacturer strip now describes perception/compute; only Orin NX remains labelled planned.

Two long ground aerials now stand on yellow telescoping tripods on the floor beside the table. Black collars, T-handles, three braced legs, rubber feet, silver ferrules, ID bands and coax to the radio follow the photograph. Estimated height is 2.45 m, base positions are X ±1.46 m / Z 1.85 m on ground Y −0.28 m. The whole-station view fits both tall stands as well as the USV and table. Laptop, radio and controller are still provisional until their photographs arrive.

**Scale evidence:** Camera reference is 175 × 30 × 33 mm with a 120 mm stereo baseline (published ZED 2 envelope); exact camera version is unconfirmed. LiDAR shape resembles the Helios family; the nominal family body reference is Ø100 × 100 mm, with a separate estimated 12 mm plinth. No exact variant, channel count or range is asserted. Bracket dimensions, tripod height, mount offsets and cable routing are photo estimates. This is a visual model, not measured fabrication CAD. Sensor masses and their effect on the original mast must be verified separately; the recovery-load calculator has not been recalibrated from photographs.

Photo references supplied 7 October 2026: 159583.heic, 159584.heic, 159585.heic, 159586.heic (rack) and 159596.heic (ground antennas). Originals are not redistributed inside the site. Manufacturer reference links are included in the sensor cards.

Validation: 9 actual-geometry checks cover hierarchy, orientation, lift inheritance, explode/reset, tripod clearance and cable endpoints; 18 equipment checks cover all 28 inspection records, lifecycle and desktop/mobile framing. Camera and LiDAR clear the reference inner aerial in the model. A CPU geometry projection was inspected for shape and arrangement; browser/WebGL visual verification remains unavailable. Historical screenshots are not evidence for this revision. Tests: `verification/sensor-rack-results.json`, `verification/photo-equipment-results.json`.


## Hardware working principles · Rev Z

Select **How it works** above the model, or use the same action inside a ZED, LiDAR, communications or reel/controller card.

- **Stereo depth:** actual lens positions connect by passive sightlines to one synthetic feature. Move the target between 2 and 8 m. A small image pair shows horizontal disparity with example calibration f = 320 px and baseline = 0.12 m. These are teaching values, not calibrated sensor output.
- **LiDAR scan:** slowed outgoing and returning pulses, first-surface intersections against synthetic targets, and an accumulating point cloud. Sensor housing remains fixed. The sample pattern, scan timing and targets are illustrative, not specifications of the photographed unit. Vessel self-occlusion, materials, noise, weather and real-world performance are not simulated.
- **Control link:** switch ground radio and Internet/Starlink. Gold commands travel outward, cyan data return. ZED and LiDAR feed the proposed Jetson Orin NX gateway. OEM interfaces remain dashed/pending. The CHASING controller, E-Reel and underwater tether remain in the architecture; replacing the controller is not established.

Pause freezes the scan and packets. Reduced-motion preference starts lessons paused; hidden tabs do not advance them. Closing restores the regular equipment display. Subject/camera/explode changes leave the lesson. Overlays are outside exported hardware assets. The 65% lift limit and original geometry are unchanged.

Primary principle references are linked inside each lesson. ZED: https://support.stereolabs.com/articles/6815914373-how-does-the-zed-3d-perception-work . LiDAR family reference, not exact device identification: https://store.robosense.ai/products/helios-series . Planned compute: https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/ .

Validation: 8 sensing-geometry/lifecycle checks; 13 actual-GLB framing/clearance checks at desktop/tablet/mobile sizes; 18 existing equipment checks after integration; mocked DOM route, readout and pause/close tests. Current checks do not constitute hardware validation. Browser/WebGL visual verification remains unavailable in this managed environment; no historical screenshot is evidence for this revision.


## Default research Overview · Rev AA

The page now opens on Overview. The existing 3D Studio is available in the second tab. Studio JavaScript, model downloads and WebGL initialization are deferred until the first Studio visit. Returning to Overview clears held controls, stops motion and skips scene rendering; returning to the studio preserves the existing research tools.

Overview uses a concise project introduction, hover/focus/tap expanding research panels inspired by the supplied UI recording, real laboratory hardware photographs, a native concept-video player, a future experiment-footage space and three simple team profiles. The supplied profile image is only a layout reference: its person's name and biography are not added to the team. Existing USM identity and related technology logos remain. Profiles use initials until the team's portraits are supplied.

Media provenance: `dist/overview-media/SOURCES.md`. The video is a magnetic-only trim of the earlier concept animation, labelled as such; it is not physical trial evidence. Real hardware photos show laboratory setup, not completed water trials. The new UI-reference screen recording is not published as project footage.

Future additions: replace the 'Experiment footage' placeholder in `dist/index.html` with supplied experiment photos/video and short captions. Replace `.ov-person-initials` with team portrait images when provided. Keep biographies to one line. `dist/overview-content.html` is the authoring fragment; the running page uses its inlined content in `dist/index.html`, with the existing logo strip inserted into `overviewPartners`.

Verification: 16 mocked DOM and lifecycle checks in `verification/overview-checks.mjs`; unique-ID/default-tab/local asset checks; syntax checks; supplied media decoded/inspected. Browser/WebGL visual verification is unavailable in the current managed environment. These checks do not claim field/hardware validation.


## Research readiness Overview · Rev AB

Supersedes the Rev AA Overview content. The default tab retains the formal research title, three names and technology logo strip. Below it are a short project overview, an illustrative concept GIF, problem and proposed solution, four research workstreams, interactive technology readiness, planned validation milestones and simple team profiles. There is no slogan or quotation. Affan Iman Azman is responsible for software integration and control systems; Ishtiak Ahmed for mechanical design.

The procedural ten-second GIF shows a stylised USV, tethered ROV, deployment, inspection, return, magnetic capture and mechanical locking. It is a visual placeholder, not actual experiment footage or evidence of validated recovery. Source and provenance are in `dist/overview-concept/`. The former Overview photos and video are retained only in the source reference directory `reference-overview-media/`, excluded from publication and the downloadable studio bundle. No experiment media is currently displayed.

The integrated research system is provisionally self-assessed at TRL 2. Readiness browsing changes the explanation, not the current rating. Next gates are experimental function proof, integrated lab validation, representative disturbances and a prototype water demonstration. Recovery success, control latency, locked hold power and mission completion have no measured baseline yet; all are labelled planned. Commercial vehicle availability and software checks are not integrated hardware validation. Framework: https://eic.ec.europa.eu/programme-finder-13_en . No sponsorship or investment-return claims are made.

Animation pauses offscreen, on hidden tabs and in 3D Studio. Reduced-motion preference starts it still, with explicit play available. Manual pause persists. The existing Studio geometry and controls remain unchanged. The authoring fragment is `dist/overview-content.html`; `dist/index.html` inlines it and inserts a copy of the existing formal heading into `overviewProjectHeading`.

Validation: 10 new readiness/animation/navigation checks and the 16 existing Overview lifecycle checks pass. The GIF and storyboard were inspected, and static HTML, local assets and JavaScript syntax were checked. Browser/WebGL visual verification remains unavailable in this managed environment. These checks do not constitute field validation.


## Grant support, animated focus and application outlook · Rev AC

The lab-name/Files masthead is hidden on Overview only. The institution artwork remains at the upper right beside the two navigation tabs. The original Studio header and controls are unchanged. A compact foundation strip highlights a research grant led by Dr Wan Yusof as a contribution to the project, the existing hardware foundation and Internet-enabled teleoperation with the underwater tether retained. The grant programme and amount are intentionally omitted; its supplied announcement image is not published. Grant support is based on the user's supplied announcement and statement, not a claim of complete project financing.

Dr Wan Yusof's profile now says Research team lead. Affan's supplied headshot is copied unchanged as `dist/team/affan.png`. The other two headshots are AI-generated fictional placeholders, each visibly labelled Sample portrait. They do not represent the named team members; replace them when actual team photos are supplied. Prompts and generation provenance are in `dist/team/PROVENANCE.md`.

Four lightweight procedural 2D GIFs illustrate teleoperation, stereo/LiDAR perception, magnetic capture followed by mechanical holding with magnet off, and current-disturbed path correction. Hover or keyboard focus starts one preview at a time. The arrow toggles explicit play/pause. Reduced-motion preference suppresses automatic play; hidden, offscreen and Studio states show the static poster. Generation source and provenance are in `dist/focus-motion/`. They are illustrative concepts, not measured experiments.

Research potential is the final section: ports/infrastructure and reservoirs/water assets as initial pilot candidates; aquaculture as a sector adaptation; nearshore energy as a later extension. These are proposed applications subject to field validation and sector requirements, not achieved services, confirmed customers or partnerships. Pilot sites, technical collaboration and validation funding are the suggested next forms of support. Primary sources (checked 7 Oct 2026) are linked under Application basis:
- OceanAlpha ME120: https://www.oceanalpha.com/inland-water-survey/me120-usv/
- CHASING applications: https://forum.chasing.com/d/63-chasing-underwater-drone-chasing-m2-pro-max-promotional-video
- SINTEF AquaStar: https://www.sintef.no/en/projects/2024/aquastar-autonomous-underwater-system-for-targeted-assessment-and-repair/

Validation: 12 new GIF interaction/lifecycle checks pass, along with 16 existing Overview and 10 readiness checks. Four GIFs and both fictional portraits were visually inspected; local assets and HTML structure checked. Browser visual verification remains unavailable under this managed Sites environment. No field or hardware validation is claimed.

## 3D application previews and Videos · Rev AD

Research potential now uses the same hover/focus/tap expanding-card pattern as Research focus. The two accordion groups select independently. Four rendered 3D examples illustrate ports, reservoir structures, aquaculture and nearshore energy. The original ME120 and CHASING reference meshes are used in custom application environments. These are concept animations, not field footage, hydrodynamic simulations or claims of operational readiness. The examples retain their future-application labels and primary-source references. Assets and rendering provenance are in `dist/application-motion/`.

The new **Videos** tab sits beside Overview. Its three-column editorial layout follows the user's RAI Institute reference without copying its content or footage. Three local concept samples have thumbnail images, titles, short descriptions and topic labels. A deliberate click opens native video controls in a modal. Nothing plays when the page or tab opens; hiding the page or leaving Videos stops and releases playback. Escape, close and backdrop actions restore focus appropriately. A poster and short status appear if playback fails.

To replace a sample with a YouTube redirect, set its `externalUrl` in exported `VIDEO_ITEMS` in `dist/videos.mjs` to an HTTPS youtube.com or youtu.be destination, and update the corresponding title/description/thumbnail in `dist/videos-content.html` and its inlined copy in `dist/index.html`. The link then opens YouTube in a separate tab with `noopener noreferrer`; there are no remote embeds or invented sample URLs. Local animations remain illustrative until replaced by actual project footage.

The header now contains only USM/school artwork on every tab. The lab name, logo and Files link are removed. GLB export and model information remain in the Studio toolbar. The shared footer has a project copyright line and working Privacy Policy / Terms & Conditions dialogs. These describe this demonstration and external/hosting services; they are project notices, not institutional policies or endorsements.

Overview remains the default. Videos never initializes the 3D Studio. Navigating from an active or loading Studio to Videos keeps rendering and vehicle controls inactive. Research GIFs respect reduced motion, offscreen state and current page. The existing TRL 2 provisional assessment, grant anonymity, supplied Affan portrait and labelled sample portraits remain.

Validation covers video dialog lifecycle, external-URL validation, three-page navigation, prior Overview/TRL/animation behavior, media decoding and static integration. Browser/WebGL visual verification remains unavailable in the managed environment. The RAI UI reference was inspected through the user screenshots and https://rai-inst.com/resources/?_type=videos .

Rev AD verification total: 55 software checks passed (9 video, 8 navigation/dialog integration, 16 Overview, 12 focus animation, 10 readiness). All four 3D GIFs/MP4s decode successfully at 720×450, 40 frames, 4 seconds; H.264 video uses yuv420p. Final rendered contact sheet was inspected. This is not browser layout verification.


## Antenna identification and Overview trim · Rev AE

Removed the entire three-item foundation strip from Overview at the user’s request. Existing antenna numbering and geometry are unchanged. User-supplied labels: 1 = 1.4 GHz, 2 = 4G cellular, 3 = 2.4 GHz, 4 = 1.4 GHz. Antennas 1 and 4 match the ground-control antenna pair. Updated USV/ground inspection cards and the communication lesson. 4G is a cellular generation, not a 4 GHz frequency. Exact cellular band, 2.4 GHz role, radio protocol, gain and individual ground-to-vessel pairing remain unconfirmed. These identifications are from the user, not inferred OEM specifications. Browser visual verification remains unavailable.


## Title credits · Rev AF

Added Wan Abdul Syaqur Norzam immediately after Assoc Prof Dr Wan Yusof Rahiman in both title credit rows (Overview and Studio). No role or biography assigned.


## Footer credit · Rev AG

Added Designed by Affan Iman Azman to the shared footer. Existing responsive footer wrapping applies across all tabs.


## White footer and fourth profile · Rev AH

Shared footer is full-width white with dark text and purple links. Added Wan Abdul Syaqur Norzam immediately after the research lead in the team profiles, with a neutral Research team label and initials/photo-pending placeholder. No specific role or portrait was supplied. Four-column desktop grid reduces to two columns and one column on smaller screens. Browser visual verification remains unavailable.

## Overview · Rev AJ
Expanded section titles to Technology Readiness Level (TRL) and Meet our Research Team. The readiness pathway uses nine colour stages and one 2.7-second entry sweep, with optional replay. The assessed integration level remains TRL 2, provisional; selecting a tile or playing the sweep does not change it. Animation respects reduced motion and stops when the page, tab or section is hidden. Syaqur now has a fictional image explicitly marked Sample portrait; replace it when an approved photo is supplied.

## Component identification · Rev AL
Two LALIZAS navigation lights and one central mmWave radar. Radar teaching waves and the single Forward radar readout are anchored to the central housing only. Reference images: user 160063.heic and 160064.heic. Navigation-light series and radar manufacturer remain unconfirmed. Source GLBs and hull, lifter, antenna, ZED and LiDAR geometry are preserved.

## Component branding and Studio entry · Rev AM
3D Studio opens on ME120, including when returning from another vehicle view. Explicit ROV and Assembly shortcuts still open their requested views. Component detail cards show known manufacturer logos; both navigation lights now show LALIZAS. Unconfirmed suppliers use OceanAlpha with a clearly labelled platform or ground-setup caption. Overview remains the initial page. Browser visual verification remains unavailable in this environment.

## Imported water simulation · Rev AO
The Simulation tab imports the browser water-operation trial from project `appgprj_6aaefca7fe7481918e4010d512f00b33`, source commit `2f26e8bbed6f2376e5a6df6befb3755d56894be6`. It runs locally within this site; the source site is unchanged. Open sea is the initial environment, with the source animated ocean and daylight horizon. Pool and bridge scenarios remain available. The source simulation is an uncalibrated approximation with guided deployment/recovery and geometric tether limits, not Gazebo or validated vessel dynamics.

The main site loads this standalone simulation only on selection, verifies its ready/error message against the same origin and iframe window, and destroys it when leaving Simulation or hiding the browser page. Reopening starts a new trial. Existing Overview and ME120 Studio defaults remain. The imported trial retains its source lift geometry/datum; the separate Recovery Studio limit is unchanged.

The supplied background reference was only a 25 × 7 pixel colour strip, so matching the intended video is pending a usable reference. Browser visual verification was unavailable; source, build and lifecycle checks are recorded separately.

## Black grid and water wakes · Rev AP
Matched the newly supplied video reference with a near-black square grid and pointer highlight. Added water-relative twin-hull wake packets, decaying foam/propwash, steady-current controls and shared CPU/render surface equations. USV power-off coasting replaces instantaneous velocity cancellation. Details, source references and model limitations are in `simulation-source/README.md`. The interface remains explicitly uncalibrated. Physics, wake and coordinate/normal checks pass; browser GPU/visual verification remains unavailable.

## Studio model alignment and restored theme · Rev AQ
Simulation now includes the Studio ME120 sensor stack and antenna appearance, sharing the same procedural geometry source. Restored daylight sky and haze while retaining Rev AP water physics and wakes. The site returns to the earlier purple background, slightly darker, with the full-width muted-lavender logo strip and purple navigation shown in the user reference. Overview remains the initial tab and Studio defaults to ME120. Browser visual verification remains unavailable.

## GNSS identification · Rev AR
Both front and rear GNSS antennas identified by the owner as Harxon HX-CSX627A. Detail cards include official Harxon branding, dimensions, connector, electrical ratings, protection and mass, plus a product source link. Receiver/RTK/heading configuration remains unconfirmed; no positioning accuracy is inferred. Existing model geometry and mounting locations are unchanged. Official source: https://en.harxon.com/product/gnss-antenna-hx-csx627a.html (checked 24 October 2026). Logo from https://en.harxon.com/attachment/222/source/logo_211291.png.

## M2 PRO MAX training reference · Rev AS
Added a compact 10-section training guide to the M2 PRO MAX Studio view and contextual entry buttons on the ROV, ports, E-Reel and controller cards (including the deck-mounted E-Reel). All 39 original slides are available in a lazy-loaded slide viewer with page navigation, original diagrams and the unchanged PDF download. Source: user-supplied “m2_pro_max (1).pdf”, 39 pages, PDF creation metadata July 2023. The contents mentions hands-on activity but no separate activity section is supplied. Port electrical ratings and 2 × 4,000 lm lights now appear in component cards. Training controller details are distinguished from earlier RC3 web references. Historical mobile OS requirements, battery recovery procedure and charger variants are clearly attributed rather than promoted as verified current instructions. Models, mounting geometry and simulation remain unchanged. Guide, accordion and slide navigation were exercised in the browser; the browser's WebGL context is disabled, so 3D rendering could not be verified.

## ROV detail update
14 inspectable components with close-up framing, training references and camera/light/rotor actions. Five capped interfaces moved beneath the main cabin; microSD cap, sensor and battery retention details follow the supplied deck. Service dimensions remain approximate. Verification: 15 geometry, picking and interaction checks passed. Browser review was blocked by an automatic approval usage limit.

## RC3 and pilot controls · October 2026
Yellow RC3 visual reference replaces the generic handset in 3D Studio and ROV Pilot. Physical keys, indicators, shoulder wheels and ports follow the supplied photo and training deck; dimensions remain estimated. Both simulators use WASD linear motion, Q/E roll, R/C heave, T/V pitch, F light 0/50/100/0, brackets drive-limit 25/50/75/100 with bounded endpoints. Arrow keys provide ROV yaw. ROV Pilot retains unlock + Space hold-to-run; Water Operation uses deployment state gating, with B for ROV camera. Heading tape wraps through 0/360 at the top center.
Validation: eight cross-simulator control checks, existing tank constraints, and 15 ROV anatomy checks passed. Browser confirmed the compass, yellow controller, light cycle and drive-limit steps using the schematic fallback; browser WebGL is unavailable, so GPU rendering was not verified.


## ROV camera presets and leveling — 2026-10-29

Both ROV Pilot and Water Operation offer three ROV camera buttons and shortcuts:
1: first person at the optical viewpoint; 2: close follow just behind the body;
3: third person with the complete vehicle visible. External views follow heading
with a level horizon; first person follows vehicle attitude. Water Operation
retains its existing orbit/top and USV PTZ modes.

Arrow left/right commands yaw, with hold buttons beside the controller.
0 (including numpad 0) requests simulated pitch/roll leveling without resetting
heading or position. It is available when the pilot is unlocked, or when the
Water Operation ROV is deployed and unpaused. Rotation input cancels leveling;
lock/stop, tab hiding, and focus loss cancel it. It is a simulated attitude action,
not station holding or an OEM autopilot integration. Existing movement bindings,
lights, drive steps and simulator-specific stop/deadman behaviour are preserved.

Validation: seven new camera/leveling/yaw checks and eight existing RC3 checks
pass. Production Vite build succeeds. Browser QA verifies three selected camera
states, keyboard shortcuts and yaw control in the perspective schematic fallback.
This browser disables WebGL; actual 3D rendering remains unverified here.


### Accessory studio and deliberate recovery control · 30 October 2026
- Water Operation: hold **L** (or the on-screen button) for **1.5 s** to deploy from docked or retrieve from free. Early release, focus loss, hidden page, stop, invalid stage or loss of eligibility cancels; no key repeat retriggers. Keep station and existing corridor gates.
- **K** toggles the accessory panel in both simulators and the M2 PRO MAX accessory showroom. Bridge observation capture is **J**; Studio's isolated ME120 lift preview uses **H**.
- Four illustrative tools: Grabber Arm 2, Laser Scaler, Water Sampler, and Ping360 with CHASING kit. Separate plinths sit away from the unchanged reference ROV; individual framing and pause/play show each function.
- Sonar sweep/echoes illustrate the scanning principle only. No acoustic propagation, measured range, verified mounting dimensions or real device command interface is claimed. Other tool limits remain in the UI.
- Official source checked read-only: https://www.chasing.com/en/chasing-ping-360-sonar-kit.html and the M2 PRO MAX accessory listing, 30 October 2026.
