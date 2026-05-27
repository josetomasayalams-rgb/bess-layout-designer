# CLAUDE.md (bess-layout-designer)

Domain reference for the BESS layout designer. For repository layout, commands, stores, and architecture invariants, see the outer [`../CLAUDE.md`](../CLAUDE.md). For PR and contribution conventions, see [AGENTS.md](AGENTS.md).

## What this app is

A web application for **preliminary** BESS layout design on a map:
- draw a site polygon
- place BESS equipment at real scale (manually or via auto-layout)
- compute area, MW, MWh, equipment count, occupation
- detect collisions, spacing and out-of-bound violations
- generate conceptual cable routes and access roads
- export a technical PDF report and a JSON project file

It is **not** a substitute for detailed electrical engineering, manufacturer installation manuals, civil engineering, fire protection engineering, local permitting, utility interconnection studies, or authority-having-jurisdiction review.

## Data classification (mandatory)

Every technical value in `src/data/`, `src/rules/`, or anywhere it is presented to the user must be classified as one of:

1. **`certified_data`** — from manufacturer datasheets, standards, or official documents. Include a source note.
2. **`preliminary_assumption`** — editable default for conceptual layout only. Must be visually distinguishable from certified data in the UI.
3. **`pending_validation`** — must be confirmed by manufacturer, EPC, fire engineer, electrical engineer, authority, or insurer.

**Never present a `preliminary_assumption` as a certified design rule.** Validation warnings live in `src/rules/bessValidationEngine.ts`.

## Certified equipment reference (Sungrow)

These two models anchor the case study `bessDelDesierto`. Authoritative copies live in `src/data/catalogs/` and `src/data/equipmentCatalog.ts` — do not duplicate these values inline in components.

### Sungrow ST2752UX-US (battery container)
- Chemistry: LFP
- Energy: 2752 kWh DC BOL
- DC voltage range: 1160 – 1500 V
- Dimensions (L × W × H): 9340 × 2600 × 1730 mm — footprint 9.34 m × 1.73 m, height 2.60 m  *(Note: catalog model id ends in `-US`; tests should match the full string.)*
- Weight: 26,400 kg
- Protection: IP54 / Type 3R
- Cooling: liquid
- Communication: RS485, Ethernet (Modbus RTU/TCP)
- Compliance declared in datasheet: UL 9540, UL 9540A / NFPA 855

### Sungrow SC5000UD-MV-US-P3 (PCS + MV station)
- AC output power: 5000 kVA at 45 °C
- DC voltage range: 1000 – 1500 V (max 1500 V)
- LV / MV voltage: 0.69 kV / 34.5 kV
- Frequency: 60 Hz (range 55 – 65 Hz)
- Max converter efficiency: 99.0 % (98.3 % including transformer)
- Dimensions (L × W × H): 6058 × 2896 × 2438 mm — footprint 6.058 m × 2.438 m
- Weight: up to 17,000 kg
- Protection: Type 3R
- Cooling: forced air + KNAN
- Communication: RS485, CAN, Ethernet, optical fiber

## Default layout assumptions

Editable defaults — **all classified as `preliminary_assumption`**, not certified spacing rules. Authoritative copies live in `src/data/defaultConstraints.ts` and the regulatory profiles under `src/rules/profiles/`.

| Parameter | Default |
|---|---|
| Battery container spacing | 3 m |
| PCS spacing | 3 m |
| Access road width | 6 m |
| Internal service corridor | 4 m |
| Cable trench width | 1 m |
| Fence setback | 5 m |

Jurisdiction-specific values (e.g. Chile SEC/RIC, NFPA 855) override these via the active regulatory profile.

## MVP phase status

All four MVP phases are implemented and wired end-to-end. This section is kept as a reference of what each phase covers, not as a build plan.

| Phase | Scope | Entry points |
|---|---|---|
| 1 | Map view, polygon drawing, area calc, equipment catalog, manual placement, project summary | `BessMap`, `EquipmentCatalogPanel`, `ProjectSummaryPanel` |
| 2 | Rotation, clearance zones, collision detection, out-of-bound checks, warnings | `bessValidationEngine`, `WarningsPanel` |
| 3 | Auto-layout (target MW/MWh → containers + PCS), spacing, JSON export, conceptual cable routes and access roads | `PreliminaryDesignToolsPanel` → `generatePreliminaryLayout`; `BessMap` auto-renders `generateConceptualPhysicalInfrastructure` |
| 4 | Technical PDF report (cover, coordinates, map capture, electrical architecture, regulatory matrix, traceability, exclusions) | `TechnicalReportPanel` → `downloadTechnicalReportPdf` → `ReportDocument` |

Multiple equipment catalogs, the regulatory profile system, the BESS del Desierto case study, and the parametric terrain tool are all live beyond the original MVP scope.

## UI principles

- **Professional engineering interface.** Clear separation of map, sidebar, and warnings.
- **Metric SI units** throughout (m, m², ha, MW, MWh, kV, Hz, kg, t, °C, %). See [`docs/unit-system.md`](docs/unit-system.md).
- **Show MW, MWh, m², ha and equipment count** prominently in the metric bar.
- **Show warnings prominently** — collisions, out-of-bound, spacing violations, regulatory failures, pending validation.
- **Do not hide uncertainty.** A `preliminary_assumption` must look different from `certified_data`. A computed value derived from assumptions inherits their uncertainty.

## Where to put new code

| Concern | Location |
|---|---|
| Engineering constants | `src/data/` (or a regulatory profile under `src/rules/profiles/`) |
| Geometry / area / collision / spacing | `src/lib/geometry/` and `src/lib/layout/` |
| Sizing math (containers, PCS, energy) | `src/lib/sizing/` |
| Regulatory rules | `src/rules/regulatoryRulesCatalog.ts` (definition) + profile under `src/rules/profiles/` (binding) |
| UI primitives | `src/components/ui/` |
| Domain panels | `src/components/sidebar/` |
| Map layers | `src/components/map/` and `src/lib/layout/mapFeatures.ts` |
| Report sections | `src/components/report/ReportDocument.tsx` (PDF) + `ReportPreview.tsx` (in-app preview) |

Never put engineering constants or regulatory thresholds inside UI components.
