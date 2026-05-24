# CLAUDE.md

See also: [AGENTS.md](AGENTS.md) for domain context, equipment data, layout assumptions, and MVP phases.

## Project
This repository is a web application for preliminary BESS layout design on a map.
The app allows users to:
- draw a site polygon on a map
- place BESS equipment at real scale
- calculate area, MW, MWh, equipment count and occupation
- detect collisions and spacing violations
- export a preliminary project layout

## Technical scope
This is a preliminary engineering and visualization tool. It does not replace:
- detailed electrical engineering
- manufacturer installation manuals
- civil engineering
- fire protection engineering
- local permitting
- utility interconnection studies
- authority having jurisdiction review

## Mandatory distinction
Always classify each technical value as one of:
1. certified_data
Data coming from manufacturer datasheets, standards or official documents.
2. preliminary_assumption
Editable value used for conceptual layout only.
3. pending_validation
Value that must be confirmed by the manufacturer, EPC, fire engineer, electrical engineer, authority or insurer.

Never present a preliminary assumption as a certified design rule.

## Initial certified equipment

### Sungrow ST2752UX-US
- Type: battery_container
- Chemistry: LFP
- Energy: 2752 kWh DC BOL
- Voltage range: 1160 to 1500 V
- Dimensions: 9340 x 2600 x 1730 mm
- Plant footprint: 9.34 m x 1.73 m
- Height: 2.60 m
- Weight: 26,400 kg
- Protection: IP54 / Type 3R
- Cooling: liquid cooling
- Communication: RS485, Ethernet
- Protocols: Modbus RTU, Modbus TCP
- Compliance declared in datasheet: UL 9540, UL 9540A / NFPA 855

### Sungrow SC5000UD-MV-US-P3
- Type: pcs_mv_station
- AC output power: 5000 kVA at 45 °C
- DC voltage range: 1000 to 1500 V
- Max DC voltage: 1500 V
- LV/MV voltage: 0.69 kV / 34.5 kV
- Frequency: 60 Hz
- Grid frequency range: 55 to 65 Hz
- Max converter efficiency: 99.0 %
- Max efficiency including transformer: 98.3 %
- Dimensions: 6058 x 2896 x 2438 mm
- Plant footprint: 6.058 m x 2.438 m
- Height: 2.896 m
- Weight: up to 17,000 kg
- Protection: Type 3R
- Cooling: forced air + KNAN
- Communication: RS485, CAN, Ethernet, optical fiber

## Initial layout assumptions
Use these only as editable defaults:
- battery container spacing: 3 m
- PCS spacing: 3 m
- access road width: 6 m
- internal service corridor: 4 m
- cable trench width: 1 m
- fence setback: 5 m

Mark all these values as preliminary_assumption.

## MVP requirements
Build the app in phases.

### Phase 1
- Map view
- Site polygon drawing
- Area calculation in m2 and hectares
- Equipment catalog
- Manual placement of equipment
- Project summary panel

### Phase 2
- Rotation of equipment
- Clearance zone rendering
- Collision detection
- Out-of-bound detection
- Warning panel

### Phase 3
- Auto layout generator
- Target MW and MWh input
- Automatic number of PCS and battery containers
- Row spacing and aisle spacing
- JSON export

### Phase 4
- Cable route layer
- Access road layer
- PDF report export
- Multiple equipment catalogs

## Preferred stack
- Next.js
- TypeScript
- Tailwind
- MapLibre through react-map-gl
- Turf.js
- Zustand
- Zod
- Vitest

## Coding rules
- Use TypeScript strictly.
- Keep all engineering constants in src/data or docs.
- Do not hardcode certified values inside UI components.
- Add source notes to every equipment value.
- Add warnings when assumptions are used.
- Prefer small components.
- Prefer pure functions for geometry and calculations.
- Add tests for geometry, area, collision and summary calculations.

## UI principles
- Professional engineering interface.
- Clear distinction between map, sidebar and warnings.
- Use metric units.
- Show MW, MWh, m2, ha and equipment count.
- Show warnings prominently.
- Do not hide uncertainty.
