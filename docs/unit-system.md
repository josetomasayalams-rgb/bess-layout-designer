# Unit System

The app defaults to `metric_si`, aligned with Chilean preliminary BESS design
workflows.

Primary UI units:

- Length, clearances, setbacks and equipment dimensions: `m`
- Area: `m²` and `ha`
- Power: `MW` and `MVA`
- Energy: `MWh`
- Voltage: `V` and `kV`
- Frequency: `Hz`
- Mass: `kg` in raw data and `t` in UI for large equipment
- Temperature: `°C`
- Efficiency, humidity and occupation: `%`
- Counts: integer units

Formatting and conversion helpers live in:

- `src/data/unitSystem.ts`
- `src/lib/units/conversions.ts`
- `src/lib/units/formatUnits.ts`

The UI store carries `unitSystem: "metric_si"` so a future unit selector can be
added without rewriting calculations. Calculations and geometry remain in SI
base fields such as `length_m`, `area_m2`, `weight_kg`, `frequency_hz` and
`operating_temp_max_c`.

Imperial references from source datasheets, such as container format classes,
must not be used as primary UI units. They may remain only as source notes for
traceability.
