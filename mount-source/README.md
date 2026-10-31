# ME120 ring-mounted ROV cradle · Rev D

**Concept only. Millimetres in STEP; parameters in metres.**

The blank annular adapter sits directly under the existing ME120 mounting ring. Four spider members and four drop hangers carry an open cradle. The existing ME120 tubes provide the lifting/guidance reference; no additional mast is proposed.

| Item | Provisional size |
|---|---:|
| Reference ring OD / ID | 170 / 74 mm |
| Blank adapter thickness | 8 mm |
| Frame | 800 × 560 mm |
| Clear frame width | 520 mm |
| Funnel extension / mouth | 220 / 580 mm |
| ROV body reference, excluding lights | 608 × 294 × 196 mm |
| ROV support plane | Z = 85 mm |
| Adapter top / existing ring lower face | Z = 458 mm |

- `ME120_Ring_Adapter_Concept.step`: closed gate, assembled layout.
- `ME120_Ring_Adapter_Exploded.step`: separated component groups.
- `Mount_Interface_Blank.step`: ring reference, adapter and spider.
- `ROV_Support_Shoe.step`: removable shoe and four pads.
- `BOM.csv`: concept members, not a purchasing specification.
- `CAD_Validation.json`: solid validity and STEP reopening checks.
- `build_mount_adapter.py`: editable CadQuery source; run with CadQuery 2.7.

**Coordinates:** X forward, stern −X, Y transverse, Z up. Frame bottom Z = 0. Gate hinge: X = −410, Z = 390 mm, axis Y; gate opens upward. Split top rail leaves a 70 mm tether notch. Two capture dogs engage the shoe; their actuator, sensing, pivots and bearing hardware remain to be designed.

**Before fabrication:** measure the actual ring, bolt pattern, tube/lifter geometry, configured ROV and clearances. Ring dimensions are photo-derived. Adapter holes are intentionally absent. OEM load capacity, stroke, allowable moments, engagement and joint details are unknown. Original lifter connection and captured-shoe interfaces require structural design. Solid members represent envelopes, not validated stock selections or joining details. These STEP files do not certify interference-free integration with the ME120 hull.

The nominal moving adapter/cradle allowance is **6 kg**, an input assumption. It is not derived from these solid volumes. The original detailed vehicle assets are unchanged; the transparent ROV block in this CAD is only a dimension reference. This mount position leaves the assembly wet when raised: dry transit is not established.
