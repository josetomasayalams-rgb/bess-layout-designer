---
name: bess-data-auditor
description: Audit BESS equipment data, classify values as certified, preliminary, or pending validation, and prevent unsafe assumptions from being treated as engineering rules.
---

# BESS Data Auditor Skill

Use this skill whenever the task involves:
- equipment dimensions
- BESS capacity
- PCS power
- spacing rules
- fire safety assumptions
- manufacturer datasheets
- electrical constraints
- project design assumptions

## Main objective
Ensure that every technical value in the repository is classified as:
1. certified_data
2. preliminary_assumption
3. pending_validation

## Rules
- Never present preliminary spacing as a certified design requirement.
- Never invent manufacturer data.
- Never mix AC usable capacity with DC BOL capacity without labeling it.
- Always distinguish between:
  - DC BOL energy
  - AC usable energy
  - contractual capacity
  - degraded capacity
- Always include source notes in equipment data.
- If a value lacks source, mark it as pending_validation.

## Initial certified values

### ST2752UX-US
- Energy: 2752 kWh DC BOL
- Dimensions: 9340 x 2600 x 1730 mm
- Footprint: 9.34 m x 1.73 m
- Height: 2.60 m
- Weight: 26,400 kg
- Chemistry: LFP
- Cooling: liquid
- Protection: IP54 / Type 3R
- Voltage range: 1160 to 1500 V

### SC5000UD-MV-US-P3
- AC output power: 5000 kVA at 45 °C
- Dimensions: 6058 x 2896 x 2438 mm
- Footprint: 6.058 m x 2.438 m
- Height: 2.896 m
- Weight: up to 17,000 kg
- DC voltage range: 1000 to 1500 V
- LV/MV voltage: 0.69 kV / 34.5 kV
- Max converter efficiency: 99.0 %
- Max efficiency including transformer: 98.3 %

## Output format
When auditing, return:
- confirmed values
- questionable values
- missing sources
- required corrections
- recommended data model changes
