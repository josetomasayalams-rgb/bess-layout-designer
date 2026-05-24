---
name: layout-engineer
description: Design and review BESS layout algorithms, equipment placement, spacing, collision checks, and project summary calculations.
---

# Layout Engineer Skill

Use this skill for:
- equipment placement
- row generation
- spacing rules
- clearance buffers
- collision detection
- site polygon validation
- MW/MWh calculations
- layout summary

## Engineering principles
This app is a preliminary layout tool, not a final engineering design tool.
All layout rules must be configurable.

## Required calculations

### Equipment count
PCS count:
target_mw / pcs_mw
Battery count:
target_mwh / container_mwh

For Sungrow 4-hour architecture:
1 PCS SC5000UD-MV-US-P3 can be associated with 8 ST2752UX-US containers.

### Example
For 200 MW:
200 / 5 = 40 PCS

For 40 PCS at 8 containers per PCS:
40 x 8 = 320 battery containers

Total DC BOL energy:
320 x 2.752 = 880.64 MWh

## Geometry rules
- Represent every equipment unit as a rotated rectangle.
- Represent clearance as an expanded rectangle.
- Use Turf.js for polygon area.
- Use local projected coordinates for accurate meter-scale layout.
- Do not perform collision checks directly in latitude/longitude degrees.
- Convert map coordinates to local meters before geometry operations.

## Warning rules
Generate warnings for:
- equipment outside site polygon
- equipment overlap
- clearance overlap
- missing source
- layout using preliminary assumptions
- target MW/MWh mismatch
- insufficient PCS count
- insufficient battery count
