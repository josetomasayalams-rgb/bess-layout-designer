# 07 — Preset BESS del Desierto

Caso base **parametrizable** que sirve como ancla del catálogo y como fixture de tests. Todos los datos llevan `EvidenceRef` o se marcan como `assumption`/`missing`.

**Fuente primaria** (los 3 PDFs en `06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/INFORMES_TECNICOS_CASO/`):
- **DOC-1092**: `EE-EN-2025-1092-RB_PPyD_BESS_del_Desierto.pdf` (Procesos Partida/Detención, 60 pg)
- **DOC-1129**: `EE-EN-2025-1129-RB_Informe_Final_MT_BESS_del_Desierto.pdf` (Mínimo Técnico, 57 pg)
- **DOC-2611**: `EE-EN-2025-2611-RB_Potencia_Maxima_BESS_del_Desierto.pdf` (Potencia Máxima, 40 pg)

Documento síntesis: `06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/BESS_DESIERTO_Analisis_Tecnico_App_Predimensionamiento.md`.

---

## 1. Datos base con evidencia

### 1.1 Potencia y energía

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `targetPowerMW` | 200 | documented | DOC-1129 p.6 · DOC-2611 p.6 · DOC-1092 p.12 |
| `targetUsableEnergyCommercialMWh` | 800 | documented | DOC-1129 p.6 · DOC-2611 p.6 · DOC-1092 p.12 |
| `targetGrossEnergyMWh` | 880,80384 | derived | 320 × 2,752512 (DOC-1129 p.15 · DOC-2611 p.19 · DOC-1092 p.18) |
| `usableFactor` | 0,9083 | derived | 800 / 880,80384 |
| `durationHours_commercial` | 4,0 | derived | 800 / 200 |
| `durationHours_gross` | 4,404 | derived | 880,80384 / 200 |

### 1.2 Containers BESS

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `manufacturer` | Sungrow | documented | DOC-1129 p.6 |
| `model` | ST2752UX | documented (con conflicto) | DOC-1129 p.6 — pero aparece también ST2725UX → `DocumentInconsistency` |
| `count` | 320 | documented | DOC-1129 p.6 · DOC-2611 p.6 |
| `grossEnergyMWh_each` | 2,752512 | documented | DOC-1129 p.15 · DOC-2611 p.19 |
| `racks_each` | 8 | documented | DOC-1129 p.15 |
| `modulesPerRack` | 6 | documented | DOC-1129 p.15 |
| `cellsPerModule` | 64 | documented | DOC-1129 p.15 |
| `cells_total_per_container` | 3072 | derived | 64 × 6 × 8 |
| `cells_total_plant` | 983.040 | derived | 3072 × 320 |
| `cell_Wh` | 896 | documented | DOC-1129 p.15 |
| `cellChemistry` | LFP | documented | DOC-1129 p.15 |
| `cellVoltageNominalV` | 3,2 | documented | DOC-1129 p.55 |
| `cellAh` | 280 | documented | DOC-1129 p.55 |
| `cellCycleLife` | 6500 | documented | DOC-1129 p.55 |
| `cellEfficiencyPct` | 92,5 | documented | DOC-1129 p.55 |
| `cellManufacturer` | CATL | documented | DOC-1129 p.55 |
| **`dimensions_m`** | **PENDIENTE** | **missing** | No aparece en informes. Se necesita datasheet ST2752UX-V15 o manual oficial |
| **`weight_kg`** | **PENDIENTE** | **missing** | Idem |
| **`clearances`** | **PENDIENTE** | **missing** | Manual de instalación oficial pendiente |
| **`hvacLoadKw`** | **PENDIENTE** | **missing** | Idem |

### 1.3 Estaciones de conversión (PCS + transformador integrado)

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `manufacturer` | Sungrow | documented | DOC-1129 p.6 |
| `model` | SC5000UD-MV | documented | DOC-1129 p.6 |
| `count` | 40 | documented | DOC-1129 p.6 · DOC-2611 p.6 |
| `ratedPowerMVA` | 5 | documented | DOC-1129 p.6 |
| `containersPerStation` | 8 | derived | 320 / 40 (coherente con energía) |
| `pcsModules_per_station` | 2 | documented | DOC-1129 p.14 · DOC-2611 p.17 |
| `pcsModuleMVA` | 2,5 | documented | DOC-1129 p.14 · DOC-2611 p.17 |
| `lvVoltageKv` | 0,9 | documented (con conflicto) | DOC-1129 p.14/p.16 — pero DOC-2611 p.8 dice 0,69 kV → `DocumentInconsistency` |
| `mvVoltageKv` | 33 | documented | DOC-1129 p.13 · DOC-2611 p.15 |
| `dimensions_m` | { 6,058 × 2,896 × 2,438 } | documented | Datasheet embebido DOC-1129 p.14 |
| `weight_kg` | 17000 (hasta) | documented | Datasheet SC5000UD-MV V14/V15 |
| `dcVoltageRangeV` | [1300, 1500] | documented | DOC-1129 p.14 |
| `nominalAcVoltageV` | 900 | documented | DOC-1129 p.14 |

### 1.4 Transformador bloque (integrado en SC5000UD-MV)

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `ratedPowerMVA` | 5 | documented | DOC-1129 p.16 |
| `hvVoltageKv` | 33 | documented | DOC-1129 p.16 · DOC-2611 p.20 |
| `lvVoltageKv` | 0,9 | documented | DOC-1129 p.16 |
| `vectorGroup` | Dy11 | documented | DOC-1129 p.16 · DOC-2611 p.20 |
| `cooling` | ONAN | documented | DOC-1129 p.16 |
| `positiveSequenceReactancePct` | 7,95 | documented | DOC-1129 p.16 |
| `positiveSequenceResistancePct` | 0,91 | documented | DOC-1129 p.16 |
| `loadLossKw` | 45 | documented | DOC-1129 p.16 |
| `noLoadLossKw` | PENDIENTE | missing | Pendiente datasheet completo |
| `tapPositions` | "±2 × 2,5%" | documented | DOC-1129 p.16 |

### 1.5 Red colectora MT (33 kV)

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `nominalVoltageKv` | 33 | documented | DOC-1129 p.13 · DOC-2611 p.15 |
| `feedersCount` | 10 | inferred | Unifilar 33 kV (DOC-1129 p.13) — patrón visual repetido |
| `stationsPerFeeder` | 4 | inferred | Idem; agrupación PB01-PB04, PB05-PB08, ... PB37-PB40 |
| `feederRatedMVA` | 20 | inferred | 4 × 5 MVA |
| `cableType` | "AL/XLPE/CWS/HDPE 18/33 (36) kV" | documented | Etiquetas en DOC-1129 p.13 |
| `mainCircuits` | 2 × 100 MVA | inferred | DOC-1129 p.13 — circuitos de entrada al centro de seccionamiento |

### 1.6 Centro de seccionamiento + Barra 33 kV

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `busbarsCount` | 2 | documented | "BP5" y "BP6" (DOC-1129 p.13/p.47-49) |
| `hasBusCoupler` | true | documented | Acoplador visible en DOC-1129 p.13 |
| `cellsCount` | PENDIENTE | missing | Pendiente datasheet switchgear |
| `dimensions_m` | PENDIENTE | missing | Pendiente |
| `manufacturer` | PENDIENTE | missing | Pendiente |

### 1.7 POI (frontera de medición)

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `voltageKv` | 33 | documented | DOC-1129 p.6 |
| `busName` | "BP5/BP6 33 kV" | documented | DOC-1129 p.13 |
| `boundary` | "mv_33kv" | documented | El POI BESS está aguas abajo del transformador principal, en barras 33 kV |
| `meteringPoints` | CT + TP visibles | documented | DOC-1129 p.12 (CT en recuadro rojo) y marco verde (TP) |

### 1.8 Transformador principal (frontera AT externa)

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `ratedPowerMVA` | 250 / 125 / 125 | documented (con conflicto) | DOC-1129 p.6/p.17 — `DocumentInconsistency` con texto que menciona valores distintos |
| `hvVoltageKv` | 220 | documented (con conflicto) | DOC-1129 p.6 tabla — pero texto menciona 230 → `DocumentInconsistency` |
| `mv1VoltageKv` | 33 | documented | Tabla DOC-1129 p.17 |
| `mv2VoltageKv` | 33 | documented | Tabla DOC-1129 p.17 |
| `scope` | "external_reference" | — | Por default fuera del alcance app BESS |

### 1.9 Servicios auxiliares

| Campo | Valor PMAX descarga | Valor PMAX carga | Confidence | Evidencia |
|---|---|---|---|---|
| `totalSSAA_MW` | 1,563 | 1,3493 | documented | DOC-2611 p.18 + DOC-2611 p.29-31 |
| `perConversionStationKw` | 38,8 | (calculado) | documented | DOC-2611 p.18 |
| `plantFixedKw` | 11 | (calculado) | documented | DOC-2611 p.26-27 |
| `breakdown.hvacKw` | PENDIENTE | PENDIENTE | missing | Falta desglose |
| `breakdown.controlKw` | PENDIENTE | PENDIENTE | missing | Falta desglose |

### 1.10 PPC

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `manufacturer` | Isotrol | documented | DOC-1129 p.6 |
| `productName` | Bluence | documented | DOC-1129 p.6 |
| `controlModes.activePower` | true | documented | DOC-1129 p.6 |
| `controlModes.reactivePower` | true | documented | DOC-1129 p.6 |
| `controlModes.powerFactor` | true | documented | DOC-1129 p.6 |
| `controlModes.voltage` | true | documented | DOC-1129 p.6 |
| `controlModes.qvDroop` | true | documented | DOC-1129 p.6 |
| `controlModes.frequency` | true | documented | DOC-1129 p.6 |
| `controlModes.rampRate` | true | documented | DOC-1129 p.6 |

### 1.11 Pérdidas MT (modo)

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `mvLossesMW_discharge` | 3,7772 | documented | DOC-2611 p.27-28 |
| `mvLossesMW_charge` | 3,6813 | documented | DOC-2611 p.29-30 |

**Nota**: estos valores son del caso BESS del Desierto en PMAX. No deben extrapolarse a otros proyectos.

### 1.12 Mínimo técnico y rampas

| Campo | Valor | Confidence | Evidencia |
|---|---|---|---|
| `minTechnicalChargeMW` | −3,8421 | documented | DOC-1129 p.25-27 |
| `minTechnicalDischargeMW` | +1,2677 | documented | DOC-1129 p.32-34 |
| `plantRampMWperMin` | 38,6 – 40,2 | documented | DOC-1092 p.25-36 |
| `inverterRampMWperSec` | 5 | documented | DOC-1092 p.41-48 |

---

## 2. Inconsistencias documentales del caso

Estas inconsistencias deben aparecer como `DocumentInconsistency[]` en el preset y reportarse al usuario:

| ID | Tópico | Valores en conflicto | Recomendación |
|---|---|---|---|
| INC-001 | Modelo container | ST2752UX (la mayoría) vs ST2725UX (aparición puntual) | Confirmar con fabricante. App usa ST2752UX por mayoría |
| INC-002 | Tensión BT PCS | 0,9 kV (DOC-1129 p.14/p.16) vs 0,69 kV (DOC-2611 p.8) | Confirmar con datasheet SC5000UD-MV. App usa 0,9 kV por convención mayoritaria |
| INC-003 | Tensión AT transformador principal | 220 kV (tabla DOC-1129 p.6) vs 230 kV (texto DOC-1129 p.17) | Confirmar con subestación / EPC. App usa 220 kV por tabla |
| INC-004 | Potencia transformador principal | 250/125/125 MVA en tabla vs valores distintos en texto | Confirmar. App marca como pendiente de validación |

---

## 3. Estructura del preset (pseudo-código)

```ts
// src/data/projectCaseStudies/bessDelDesierto.ts

import { documentRef } from "@/data/documentRegistry";

export const bessDelDesiertoEvidence = {
  doc1092: documentRef("PROJ-BESS-DESIERTO-1092"),
  doc1129: documentRef("PROJ-BESS-DESIERTO-1129"),
  doc2611: documentRef("PROJ-BESS-DESIERTO-2611"),
} as const;

export const bessDelDesiertoPreset: ProjectCaseStudy = {
  id: "bess-del-desierto",
  name: "BESS del Desierto",
  client: "Atlas Renewable Energy",
  location: { region: "Chile", site: "Sol del Desierto" },

  designTargets: {
    powerMW: { value: 200, evidence: [{ documentId: "PROJ-BESS-DESIERTO-1129", page: 6, confidence: "documented" }] },
    usableEnergyCommercialMWh: { value: 800, evidence: [{ documentId: "PROJ-BESS-DESIERTO-1129", page: 6, confidence: "documented" }] },
    grossEnergyMWh: { value: 880.80384, evidence: [{ documentId: "PROJ-BESS-DESIERTO-1129", page: 15, confidence: "derived", note: "320 × 2,752512" }] },
    usableFactor: { value: 0.9083, evidence: [{ confidence: "derived", note: "800 / 880,80384" }] },
  },

  architecture: {
    containers: { count: 320, model: "SUNGROW-ST2752UX", energyEachMWh: 2.752512 },
    conversionStations: { count: 40, model: "SUNGROW-SC5000UD-MV", powerEachMVA: 5, containersEach: 8 },
    mvFeeders: { count: 10, stationsEach: 4, ratedMVA: 20, voltageKv: 33 },
    mvBuses: [{ name: "BP5", voltageKv: 33 }, { name: "BP6", voltageKv: 33 }],
    poi: { voltageKv: 33, busName: "BP5/BP6 33 kV", boundary: "mv_33kv" },
    mainTransformer: {
      scope: "external_reference",
      hvKv: 220,
      mv1Kv: 33,
      mv2Kv: 33,
      ratedMVA: 250, // ver INC-004
    },
  },

  auxiliaryServices: {
    modeSpecific: {
      discharge: { value: 1.563, evidence: [/* DOC-2611 p.18 */], confidence: "documented" },
      charge: { value: 1.3493, evidence: [/* DOC-2611 p.29 */], confidence: "documented" },
    },
  },

  ppc: {
    manufacturer: "Isotrol",
    productName: "Bluence",
    controlModes: {
      activePower: true, reactivePower: true, powerFactor: true,
      voltage: true, qvDroop: true, frequency: true, rampRate: true,
    },
  },

  inconsistencies: [
    {
      id: "INC-001",
      topic: "Modelo container",
      conflictingValues: [
        { value: "ST2752UX", evidence: { documentId: "PROJ-BESS-DESIERTO-1129", page: 6, confidence: "documented" } },
        { value: "ST2725UX", evidence: { documentId: "PROJ-BESS-DESIERTO-1129", page: 14, confidence: "documented" } },
      ],
      recommendation: "Confirmar con fabricante. App usa ST2752UX por mayoría.",
      resolvedValue: "ST2752UX",
    },
    // INC-002, INC-003, INC-004 análogos
  ],

  pendingData: [
    {
      id: "PEND-001",
      description: "Dimensiones físicas exactas del container ST2752UX",
      affectedField: "EquipmentSpec.footprint",
      whereToFind: "Sungrow ST2752UX-US Datasheet V15 / Installation Manual",
      priority: "critical",
    },
    // ... resto de PendingData de §11 del documento ancla
  ],

  // Note: el layout físico georreferenciado NO está disponible.
  // El preset puede generar uno preliminar con `caseStudyLayoutGenerator.ts`.
};
```

---

## 4. Reglas de carga del preset

Al cargar el preset, la app debe:

1. **Inicializar** `ProjectBESS` con todos los datos arriba.
2. **Generar** automáticamente los 320 `PlacedEquipment` + 40 `ConversionStation` usando `caseStudyLayoutGenerator.ts` (ya existe).
3. **Materializar** los 10 `MVFeeder` y los 2 `MVBus` con sus relaciones.
4. **Inyectar** las 4 `DocumentInconsistency[]` y el conjunto `PendingDataItem[]`.
5. **Mostrar** banner: "Preset BESS del Desierto cargado — caso base parametrizable. Las dimensiones físicas y clearances están pendientes de datasheet oficial."
6. **NO** marcar el proyecto como `validated` ni `documented` a nivel global. Cada valor tiene su propia `confidence`.

---

## 5. Tests fixture obligatorios

Test `src/data/projectCaseStudies/bessDelDesierto.test.ts`:

```ts
test("BESS del Desierto preset reproduces documented KPIs", () => {
  const project = loadPreset("bess-del-desierto");

  expect(project.designTargets.powerMW.value).toBe(200);
  expect(project.designTargets.usableEnergyCommercialMWh.value).toBe(800);
  expect(project.designTargets.grossEnergyMWh.value).toBeCloseTo(880.80384, 5);

  expect(project.placedEquipment.filter(p => p.type === "battery_container").length).toBe(320);
  expect(project.conversionStations.length).toBe(40);
  expect(project.mvFeeders.length).toBe(10);
  expect(project.mvBuses.length).toBe(2);

  expect(project.inconsistencies.length).toBeGreaterThanOrEqual(3);
  expect(project.pendingData.some(p => p.id === "PEND-001")).toBe(true);
});
```

---

## 6. Diferencia entre `Demo` y `Preset BESS del Desierto`

- **Demo** (`/Demo` button actual): layout simple de muestra, valores `preliminary_assumption`, sin trazabilidad documental. Para onboarding rápido.
- **Preset BESS del Desierto** (botón nuevo, fase 3+): caso real con evidencia completa, inconsistencies y pendientes documentales visibles. Para evaluación profesional.

Ambos coexisten.

---

## 7. Caso base parametrizable

El preset es **el caso base**, no la ley universal. Una vez cargado, todos sus parámetros son editables:
- Cambiar potencia objetivo → recalcular containers/stations/feeders.
- Cambiar tensión MT (33 → 13,8 / 23 kV) → recalcular topología.
- Cambiar `containersPerStation` (8 → 4 / 6 / 10) → revalidar capacidad.
- Cambiar `stationsPerFeeder` (4 → 2 / 3 / 5) → recalcular cantidad de feeders.

La edición debe marcar el proyecto como "derivado del preset" y dejar el preset original intacto.
