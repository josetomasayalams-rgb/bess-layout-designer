# BESS Layout Designer - Technical Data Model

This document outlines the structured data model representing Battery Energy Storage Systems (BESS) utility-scale sites, electrical configurations, and documentation traceability.

---

## 1. Naming & Units Conventions

To maintain consistency across engineering calculations, the codebase enforces the **Metric SI** system:

*   **Distance/Length**: Meters, represented with the `_m` suffix (e.g., `length_m`, `clearance_m`).
*   **Mass**: Kilograms or tons, represented with the `_kg` or `_t` suffix (e.g., `weight_kg`).
*   **Power**: Megawatts or Megavolt-amperes, represented with the `_mw` or `_mva` suffix (e.g., `power_mw`, `ratedPowerMVA`).
*   **Energy**: Megawatt-hours, represented with the `_mwh` suffix (e.g., `energy_mwh_dc_bol`).
*   **Voltage**: Kilovolts or Volts, represented with the `_kv` or `_v` suffix (e.g., `voltage_kv`, `nominalAcVoltageV`).
*   **Frequency**: Hertz, represented with the `_hz` suffix.
*   **Percentage/Ratio**: Float values representing ratios or percentages with the `_pct` suffix (e.g., `efficiency_pct`).

---

## 2. Transversal Evidence System

The evidence framework enables documenting the source and reliability of any technical parameter, preventing unverified assumptions from being presented as final engineering rules.

### Confidence Levels (`EvidenceConfidence`)
Located in `src/types/evidence.ts`:
*   `documented`: Official PDF source + page number + section numeral.
*   `derived`: Formally calculated from documented parameters.
*   `inferred`: Deduced from patterns or unifilar diagrams (e.g., visual layouts).
*   `assumption`: Default editable benchmark or pre-design value.
*   `missing`: No source found, requires verification.

### Evidence Reference (`EvidenceRef`)
Contains document references:
```typescript
export type EvidenceRef = {
  documentId: string;        // Refers to an entry in DocumentRegistry
  page?: number;             // 1-indexed page number in the PDF
  section?: string;          // Numeral, clause, or subsection
  note?: string;             // Interpretation or reasoning
  confidence: EvidenceConfidence;
};
```

### Evidenced Value (`EvidencedValue<T>`)
Wraps any parameter with its source history:
```typescript
export type EvidencedValue<T> = {
  value: T;
  unit?: string;
  evidence: EvidenceRef[];
  mustVerifyBeforeIFC?: boolean;
};
```

---

## 3. Data Layers

The BESS project is modeled across three distinct conceptual layers in `ProjectBESS` (`src/types/project.ts`):

```
ProjectBESS
├── Capa 1: Physical Layer (Zones, PlacedEquipment, CableRoutes, Roads)
├── Capa 2: Electrical Architecture (BESSBlocks, Stations, Feeders, POI)
└── Capa 3: Traceability (Assumptions, Inconsistencies, Exclusions, Registry)
```

### Capa 1 — Physical Layer
Represents physical entities rendered on the geographical canvas:
*   **`LayoutZone`**: Polygonal boundaries defining site spaces (`bess_block`, `road`, `cable_corridor`, `exclusion`, `mv_yard`, `poi_yard`).
*   **`PlacedEquipment`**: Spatially positioned hardware (`id`, `equipmentSpecId`, `anchor` point, `rotation_deg`). Physical dimensions are resolved using the `EquipmentSpec` catalogs.
*   **`CableRoute`**: Represents underground/overhead cabling routes (`path`, `voltageLevel`, `corridorWidth_m`).
*   **`AccessRoad`**: Defines roadways (`centerLine`, `width_m`, `surface`).

### Capa 2 — Electrical Architecture
Represents topology and electrical connections:
*   **`BESSBlock`**: Logical grouping (typically 8 containers connected to 1 Conversion Station).
*   **`ConversionStation`**: Integrates PCS power modules and the step-up Block Transformer (e.g. 0.9 kV to 33 kV).
*   **`MVFeeder`**: Colector feeder lines collecting power from Conversion Stations to the medium voltage bus.
*   **`MVBus`**: Collects feeders and hosts the incoming switchgear assembly.
*   **`POI` (Point of Interconnection)**: Metering boundary and interconnection point.
*   **`MainTransformer`**: The high-voltage step-up transformer (typically considered external reference in predesign).
*   **`AuxiliaryServices`**: Plant-wide house loads (HVAC, control, safety, lighting) calculated under different operating modes.
*   **`PPC` (Power Plant Controller)**: Represents active control modes (frequency regulation, voltage droop, ramp limits).

### Capa 3 — Traceability & Validation
Provides auditing and documentation reports:
*   **`ProjectAssumption`**: Tracked technical assumptions made in lieu of verified data.
*   **`DocumentInconsistency`**: Declared conflicts between different reference documents (e.g., conflicting voltage or catalog ratings).
*   **`ProjectExclusion`**: Explicit detail engineering tasks declared out-of-scope for the predesign.
*   **`PendingDataItem`**: Actionable checklist items representing missing data to be provided by the client or EPC.
*   **`DocumentRegistryEntry`**: Database of all primary and secondary document sources cited in the project.
