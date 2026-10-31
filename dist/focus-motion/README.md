# Research focus motion illustrations

Four original procedural 2-D placeholders. No uploaded photographs or real video are used.

| Asset | Meaning |
|---|---|
| `teleoperation.gif` | Gold command packets toward a surface vehicle and tethered ROV; cyan telemetry returns. Network paths are illustrative integration concepts. |
| `perception.gif` | Two passive stereo sightlines, a stationary LiDAR housing, illustrative laser returns and synthetic points. |
| `recovery.gif` | ROV alignment, brief powered magnetic capture, mechanical locks engaging, then magnet power off while the locks retain the ROV. |
| `validation.gif` | Synthetic current disturbances, steering correction, reference path and an illustrative position gate. No completed hardware result is implied. |

Each is 600 × 360, generated from 50 frames at 10 fps as a five-second infinite loop. The GIF encoder merges identical still frames while preserving duration (the recovery loop has 40 stored frames). Corresponding `*-poster.png` files are for paused, inactive or reduced-motion states. `contact-sheet.jpg` is for visual review.

`generate.py` reproduces the assets using Pillow and DejaVu Sans. Geometry, timings, measurements and performance are not OEM data or physical validation.
