export const trainingSections=[
  {
    "id": "structure",
    "title": "ROV structure",
    "pages": [
      4,
      5
    ],
    "rows": [
      [
        "1–4",
        "Camera · thrusters / propellers · 2 × 4,000 lm lights · microSD slot"
      ],
      [
        "5–9",
        "Main cabin · battery cabin · buckle bracket · light adjustment knob · upper/lower hand grips"
      ],
      [
        "10–11",
        "Ethernet 1/2 · UART 1/2/3 peripheral interfaces"
      ],
      [
        "12–16",
        "Battery twist locks · depth/temperature sensor · battery pull ring · tether/charging socket · battery fastener"
      ]
    ],
    "items": [
      "The pull ring is for removing the battery cabin. Use the body grips to handle the ROV.",
      "Keep exposed tether/charging connector pins out of salt water."
    ],
    "note": "Numbering follows the original diagrams; the 3D reference does not establish exact connector or mounting geometry."
  },
  {
    "id": "ports",
    "title": "Peripheral interfaces",
    "pages": [
      5
    ],
    "rows": [
      [
        "Ethernet 1 / 2",
        "10/100 Mbps · +16 V · 40 W"
      ],
      [
        "UART 1 / 2",
        "3.3 V TTL · +15 V · 30 W"
      ],
      [
        "UART 3",
        "3.3 V TTL · +18 to +25.2 V · 50 W"
      ]
    ],
    "items": [
      "Tether / charging uses a separate socket.",
      "Confirm approved cable, pinout and accessory compatibility before connection. These port ratings are not a summed simultaneous power budget."
    ],
    "note": "This deck documents interfaces; it does not provide a command API or establish direct Jetson control."
  },
  {
    "id": "controller",
    "title": "Remote controller · all controls",
    "pages": [
      6,
      7,
      8
    ],
    "rows": [
      [
        "1–3 · Link indicators",
        "ROV steady = connected; blinking = disconnected. 2.4G / 5G stay lit while the selected Wi-Fi band operates."
      ],
      [
        "4 · Wi-Fi switch",
        "Short press: switch 2.4 / 5 GHz."
      ],
      [
        "5–6 · Power",
        "Controller on/off. Power indicator: green high, blue medium, red low. The slide also associates a blue light with unlocking."
      ],
      [
        "7 · Unlock",
        "Lock/unlock thrusters; app shows the state."
      ],
      [
        "8 · LED control",
        "Off, 1–99%, or 100% brightness."
      ],
      [
        "9 · Safety buckle",
        "Attachment for a safety rope."
      ],
      [
        "10–11 · Joysticks",
        "Right and left navigation sticks."
      ],
      [
        "12 · One-key reset",
        "Short press: return to horizontal. Long press: switch control mode. Blue light indicates a non-horizontal position per the deck."
      ],
      [
        "13 · Device clamp",
        "Phone/tablet up to 10.5 inches; pull ends apart, then use the rear button to tighten."
      ],
      [
        "14 · Robotic arm control",
        "Long press: enable/disable grabber function. Short press: switch floodlight brightness level."
      ],
      [
        "15 · Right wheel",
        "Roll angle or grabber opening/closing."
      ],
      [
        "16 · Photo / video",
        "Short press: photo. Long press: start/end video recording."
      ],
      [
        "17 · Left wheel",
        "Pitch angle."
      ],
      [
        "18 · USB-C",
        "Wired connection to phone/tablet."
      ],
      [
        "19 · HDMI",
        "1080p real-time image output."
      ],
      [
        "20 · Socket",
        "Tether connection / charging."
      ]
    ],
    "items": [],
    "note": "Controls describe the controller pictured in the supplied training deck. Existing RC3 web-reference specifications remain separate; verify the installed revision."
  },
  {
    "id": "ereel",
    "title": "E-Reel",
    "pages": [
      9,
      10,
      23,
      24
    ],
    "rows": [
      [
        "1–3",
        "Power switch · 3 m tether/charging socket · stop/slow/fast speed knob"
      ],
      [
        "4 · Battery indicator",
        "Green 100–60% · blue 59–20% · red 19–0%; flashes while motor runs."
      ],
      [
        "5–7",
        "Handle interface · manual winding handle · straightener"
      ],
      [
        "Capacity / battery",
        "Up to 200 m tether · 4,800 mAh"
      ],
      [
        "Protection",
        "IP65; no immersion or splashing."
      ]
    ],
    "items": [
      "The deck claims up to 30 winding cycles per full charge; test conditions are not specified.",
      "Manual winding is available with the handle if power is unavailable.",
      "The first speed selection after power-on has a stated 4-second wait.",
      "Payout: remove tether from the straightener and feed it by hand. Take-up: route it through the straightener and use slow/fast. Consult the original illustrated steps on slides 23–24."
    ],
    "note": "Keep the E-Reel dry and secured. The deck does not establish automatic powered payout or a remote reel-control API."
  },
  {
    "id": "setup",
    "title": "Setup & first use",
    "pages": [
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21
    ],
    "rows": [],
    "items": [
      "Install CHASING GO1. The deck lists iOS 9.0 / Android 4.4 or later and the App Store, Google Play or CHASING website; these are historical requirements, not current compatibility verification.",
      "Floodlights: turn the adjustment knob anticlockwise to unfold, then clockwise to secure. The deck also shows alternative mounting on the lower sides of the ROV.",
      "Connect the E-Reel to the controller using the 3 m lead and tighten its nut. Attach the ROV tether buckle before connecting and tightening the ROV plug.",
      "Power on the controller. After a few seconds, the selected Wi-Fi indicator stays lit and the ROV emits two self-test sounds.",
      "Wi-Fi: read the controller serial label, wait 5–10 seconds for Chasing_xxxx (the deck says the final six serial digits), then connect. Factory password shown: 12345678. Actual settings may differ.",
      "Wired mobile connection: use the included suitable adapter cable; the end with a phone symbol goes to the phone/tablet.",
      "Open GO1 and enter the camera screen to view live imagery.",
      "Hold the ROV by its side grips and lower it gently into the water before unlocking thrusters. The deck recommends water deeper than 1 m."
    ],
    "note": "Connection diagrams and the original app screenshot are included in the slide viewer. This site does not connect to the ROV."
  },
  {
    "id": "media",
    "title": "Photo & video transfer",
    "pages": [
      25,
      26,
      27,
      28
    ],
    "rows": [
      [
        "GO1 download",
        "Open Media at the lower right, choose a photo/video, then Download. Android: download folder; iPhone: album, per the deck."
      ],
      [
        "microSD copy",
        "Power off the controller and keep the ROV and slot dry. Unscrew the cover anticlockwise, remove the card and copy using a card reader."
      ],
      [
        "Computer download",
        "Connect the computer to the controller Wi-Fi. Enter 192.168.1.88 in the browser, select media and download. Chrome or Firefox is recommended in the deck."
      ]
    ],
    "items": [],
    "note": "192.168.1.88 is the documented local media-download address, not proof of a teleoperation API. Power off and dry the equipment before inserting/removing microSD."
  },
  {
    "id": "battery",
    "title": "Battery removal & installation",
    "pages": [
      29,
      30
    ],
    "rows": [],
    "items": [
      "Removal 1: unlock both side knobs and rotate them 90° into the shallow slots.",
      "Removal 2: pull the slider switch and lift the locking assembly while holding the chute.",
      "Removal 3: pull the lower pressure-plate sides down to release its buckle from the rear bracket.",
      "Removal 4: use the battery pull ring to slide the cabin out slowly.",
      "Install 1: rotate both knobs 90° to the deep slots.",
      "Install 2: slide the battery along the underside chute; seat it until it clicks and the knobs close.",
      "Install 3: pull the pressure plate down and fasten its buckle to the rear bracket.",
      "Install 4: press the locking-assembly chute until it clicks into place."
    ],
    "note": "Use the numbered diagrams on slides 29–30 for component identification. The battery pull ring is not an ROV lifting point."
  },
  {
    "id": "shields",
    "title": "Thruster shields",
    "pages": [
      31,
      32
    ],
    "rows": [],
    "items": [
      "Installation: align the three shield clips with the corresponding duct brackets, then press gently until each seats.",
      "Removal: use a screwdriver or suitable tool to gently release the clips around the edge one at a time, then remove the shield."
    ],
    "note": "Work with power off; keep hands away from rotating propellers."
  },
  {
    "id": "charging",
    "title": "Charging reference",
    "pages": [
      33,
      34
    ],
    "rows": [
      [
        "ROV charger",
        "25.2 V · 8 A; approximately 2.5 h."
      ],
      [
        "Controller charger",
        "25.2 V · 8 A; approximately 2 h."
      ],
      [
        "E-Reel chargers listed",
        "25.2 V · 8 A or 12.6 V · 3 A."
      ],
      [
        "E-Reel times listed",
        "2 h with 12.6 V; 4 h with 25.2 V."
      ],
      [
        "Charger indicator",
        "Red: charging. Green: fully charged."
      ]
    ],
    "items": [
      "Disconnect the charger after charging. Time varies with conditions, including temperature.",
      "Use the CHASING-approved adapter for the actual device/revision. The two E-Reel ratings are reproduced from the deck, not a recommendation to interchange chargers."
    ],
    "note": ""
  },
  {
    "id": "care",
    "title": "Maintenance & cautions",
    "pages": [
      36,
      37,
      38,
      39
    ],
    "rows": [],
    "items": [
      "Navigation: the deck recommends open, relatively clear water without dense algae, with initial practice to learn the controls. Keep the tether clear of boat propellers, passing boats, ropes, rocks and other obstacles.",
      "Battery: shipping mode may require charging before first use. Recharge before dropping below 25%. During long storage, the deck specifies 50–70% charge and checking/charging every 2–3 months. Use only the standard CHASING adapter.",
      "Legacy battery note: slide 37 describes a complete discharge, 1-hour rest and at least 12-hour charge after prolonged idle storage. This is retained in the original source; confirm the current procedure with CHASING before applying it to your battery.",
      "Motors: never touch rotating propellers. The deck sets a maximum of 30 seconds unlocked in air to avoid overheating; avoid dry-running for routine checks.",
      "Replace severely worn propellers with CHASING after-sales guidance.",
      "After saltwater use: the deck describes approximately 1 hour in fresh water, followed by 10 minutes of submerged running, then towel-drying. It recommends GO1 → upper-right menu → Help → Machine maintenance → ROV → To maintain.",
      "Before diving: secure peripheral and microSD covers; inspect tether, battery-socket and SD-slot O-rings and replace missing/damaged seals.",
      "Keep plugs, sockets and tether dry and clean before connection. Fresh-water clean affected interfaces if contaminated, then fully dry; salt and moisture cause corrosion.",
      "Storage: avoid sunlight; store in a cool place or the case. The controller is not waterproof—no splashing or washing; clean with a towel."
    ],
    "note": "Training-deck guidance, not a replacement for the current manual or model-specific service advice."
  }
];
