# 11 — Plan de primera implementación (Fase 1)

Detalle accionable de la **Fase 1 — Modelo de datos extendido + sistema de trazabilidad**. Es la primera fase que toca código.

**Pre-condiciones**: tareas T-001 y T-002 de la Fase 0 completadas (es decir, este propio plan terminado y la convención de IDs definida).

**Objetivo único de esta fase**: dejar el modelo de datos preparado para que las fases siguientes puedan citar fuentes y crear entidades eléctricas, sin tocar UI todavía.

**Tiempo estimado**: 5–10 días de desarrollo concentrado.

---

## 1. Por qué empezar por aquí

1. **Bloquea todo**: sin `EvidenceRef`, ninguna regla nueva es trazable.
2. **No requiere lectura humana de PDFs**: la lectura humana viene después (Fase 9). Esta fase es puro modelo TypeScript.
3. **Es retrocompatible**: campos opcionales, schema bumpeado, lector v1.1 conservado.
4. **Permite migrar `equipmentCatalog` legacy** sin romper la app.
5. **Habilita el `InconsistencyDetector`** desde la fase 3.

---

## 2. Estructura propuesta de archivos nuevos

```
src/
├── types/
│   ├── evidence.ts            ← NUEVO (EvidenceConfidence, EvidenceRef, EvidencedValue)
│   ├── electrical.ts          ← NUEVO (ConversionStation, MVFeeder, MVBus, POI, etc.)
│   ├── cable.ts               ← NUEVO (CableRoute)
│   ├── road.ts                ← NUEVO (AccessRoad)
│   ├── safety.ts              ← NUEVO (FireSafetyZone)
│   ├── equipment.ts           ← EXTENDER (clearances, batteryHierarchy, source.evidence)
│   └── project.ts             ← EXTENDER (todos los nuevos campos)
│
├── data/
│   ├── documentRegistry.ts    ← NUEVO (~80 entries con isPrimary)
│   └── equipmentCatalog.ts    ← MIGRACIÓN ADITIVA (no romper consumidores)
│
├── store/
│   └── projectStore.ts        ← EXTENDER slices (sin acciones todavía)
│
├── lib/
│   └── export/
│       └── exportJson.ts      ← BUMP a schema_version "1.2" + lector v1.1
│
└── rules/
    └── inconsistencyDetector.ts  ← NUEVO (stub, sin reglas todavía)
```

---

## 3. Tareas detalladas

### T-101 — Crear tipos de evidencia

**Archivo**: `src/types/evidence.ts`

**Contenido** (mismo del `04_MODELO_DATOS_PROPUESTO.md` §1):

```ts
export type EvidenceConfidence =
  | "documented" | "derived" | "inferred" | "assumption" | "missing";

export type EvidenceRef = {
  documentId: string;
  page?: number;
  section?: string;
  note?: string;
  confidence: EvidenceConfidence;
};

export type EvidencedValue<T> = {
  value: T;
  unit?: string;
  evidence: EvidenceRef[];
  mustVerifyBeforeIFC?: boolean;
};

/** Utilidad para crear un EvidencedValue rápido sin evidencia */
export function asAssumption<T>(value: T, note?: string, unit?: string): EvidencedValue<T> {
  return {
    value,
    unit,
    evidence: [{ documentId: "__none__", confidence: "assumption", note }],
  };
}

/** Utilidad para crear un EvidencedValue con confianza derived */
export function asDerived<T>(value: T, note: string, unit?: string): EvidencedValue<T> {
  return {
    value,
    unit,
    evidence: [{ documentId: "__none__", confidence: "derived", note }],
  };
}
```

**Tests**: `src/types/evidence.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { asAssumption, asDerived } from "./evidence";

describe("evidence helpers", () => {
  it("asAssumption marca confidence correctamente", () => {
    const v = asAssumption(200, "default MW objetivo", "MW");
    expect(v.value).toBe(200);
    expect(v.unit).toBe("MW");
    expect(v.evidence[0].confidence).toBe("assumption");
  });

  it("asDerived marca confidence correctamente", () => {
    const v = asDerived(0.9083, "800 / 880,80384");
    expect(v.evidence[0].confidence).toBe("derived");
  });
});
```

**Criterio**: tests pasan. Tipos exportados desde `src/types/index.ts` si existe (si no, importarlos directo).

---

### T-102 — DocumentRegistry inicial

**Archivo**: `src/data/documentRegistry.ts`

**Estrategia**:
1. Cargar **solo los ~30 documentos más importantes** primero, no los 330. El resto se agrega en fases siguientes a medida que se citen.
2. Usar IDs legibles: `SEC-RGR-06-2024`, `SUNGROW-ST2752UX-V15`, `PROJ-BESS-DESIERTO-1129`.
3. Ruta relativa desde la raíz de `DIRECTRICES_APP_BESS/`.
4. `isPrimary = true` para PDFs originales, `false` para resúmenes y OCR.

**Ejemplo inicial** (snippet):

```ts
import type { DocumentRegistryEntry } from "@/types/evidence";

export const documentRegistry: DocumentRegistryEntry[] = [
  // === Normativa SEC ===
  {
    id: "SEC-RGR-06-2024",
    title: "SEC RGR 06/2024 BESS",
    source: "sec_rgr",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RGR_BESS/SEC_RGR_06_2024_BESS.pdf",
    isPrimary: true,
    publishedAt: "2024",
  },
  {
    id: "SEC-RPTD-08-2020",
    title: "SEC RPTD 08 — Protección contra incendios",
    source: "sec_rptd",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_08_Proteccion_Incendios_2020.pdf",
    isPrimary: true,
    publishedAt: "2020",
  },
  // ... resto SEC, CNE, CEN, SEA, MINVU
  // === Datasheets oficiales ===
  {
    id: "SUNGROW-ST2752UX-V15",
    title: "Sungrow ST2752UX-US Datasheet V15",
    source: "manufacturer_datasheet",
    path: "05_DATASHEETS_EQUIPOS_BESS/01_CONTENEDORES_BATERIAS/SUNGROW_ST2752UX-US_Datasheet_V15_EN_OFICIAL.pdf",
    isPrimary: true,
    version: "V15",
  },
  // ... resto datasheets
  // === Informes BESS del Desierto ===
  {
    id: "PROJ-BESS-DESIERTO-1129",
    title: "EE-EN-2025-1129 — Informe Final Mínimo Técnico BESS del Desierto",
    source: "project_report",
    path: "06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/INFORMES_TECNICOS_CASO/BESS_DESIERTO_Informe_Minimo_Tecnico_EE_EN_2025_1129.pdf",
    isPrimary: true,
  },
  // PROJ-BESS-DESIERTO-1092 y PROJ-BESS-DESIERTO-2611 análogos
];

export function documentRef(id: string): DocumentRegistryEntry {
  const entry = documentRegistry.find((d) => d.id === id);
  if (!entry) throw new Error(`Document not in registry: ${id}`);
  return entry;
}
```

**Tests**: `src/data/documentRegistry.test.ts`

```ts
import { documentRegistry, documentRef } from "./documentRegistry";

describe("documentRegistry", () => {
  it("tiene IDs únicos", () => {
    const ids = documentRegistry.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todos los entries marcados isPrimary tienen path", () => {
    documentRegistry
      .filter((d) => d.isPrimary)
      .forEach((d) => expect(d.path).toBeTruthy());
  });

  it("documentRef recupera por id", () => {
    expect(documentRef("SEC-RGR-06-2024").title).toContain("RGR");
  });

  it("documentRef lanza si no existe", () => {
    expect(() => documentRef("ID-INEXISTENTE")).toThrow();
  });
});
```

---

### T-103 — Tipos eléctricos extendidos

**Archivo**: `src/types/electrical.ts`

**Contenido** (copiar de `04_MODELO_DATOS_PROPUESTO.md` §5):

- `ConversionStation`
- `PCSModule`
- `BlockTransformer`
- `MVFeeder`
- `MVBus`
- `SwitchgearSummary`
- `POI`
- `MeteringPoint`
- `MainTransformer`
- `BESSBlock`
- `AuxiliaryServices`
- `PPC`
- `OperationalLimits`
- `LossEstimate`

Sin lógica, solo tipos.

**Tests**: smoke test que importa cada tipo y verifica que existe.

---

### T-104 — Tipos cable / road / safety

**Archivos**:
- `src/types/cable.ts` con `CableRoute`.
- `src/types/road.ts` con `AccessRoad`.
- `src/types/safety.ts` con `FireSafetyZone`.

Sin lógica, solo tipos.

---

### T-105 — Extender EquipmentSpec

**Archivo**: `src/types/equipment.ts` (existente).

**Cambios**:
1. Añadir interfaz opcional `clearances` con todos los sub-campos como `EvidencedValue<number>`.
2. Añadir interfaz opcional `compliance` con `standards: string[]` y `certifications: EvidenceRef[]`.
3. Añadir interfaz opcional `batteryHierarchy: BatteryHierarchy`.
4. Extender `source` con `evidence: EvidenceRef[]` opcional (coexiste con `notes`).
5. Mantener todos los campos existentes (`SourceReliability`, `reliability`, `notes`).

**Migración**:
- Los equipos existentes en `bessContainerCatalog.ts`, `pcsCatalog.ts`, `mvSkidCatalog.ts`, `transformerCatalog.ts` siguen funcionando sin cambios.
- `clearances`, `compliance`, `batteryHierarchy` son opcionales.

**Tests**: existing `src/data/equipmentCatalog.test.ts` no debe romperse.

---

### T-106 — Extender ProjectBESS

**Archivo**: `src/types/project.ts`

**Cambios** (todos opcionales en v1.2):
- `designTargets: { powerMW?: EvidencedValue<number>; ... }`
- `cableRoutes: CableRoute[]` (default `[]`)
- `accessRoads: AccessRoad[]` (default `[]`)
- `fireSafetyZones: FireSafetyZone[]` (default `[]`)
- `blocks: BESSBlock[]` (default `[]`)
- `conversionStations: ConversionStation[]` (default `[]`)
- `mvFeeders: MVFeeder[]` (default `[]`)
- `mvBuses: MVBus[]` (default `[]`)
- `poi?: POI`
- `mainTransformer?: MainTransformer`
- `auxiliaryServices?: AuxiliaryServices`
- `ppc?: PPC`
- `assumptions: ProjectAssumption[]` (default `[]`)
- `inconsistencies: DocumentInconsistency[]` (default `[]`)
- `exclusions: ProjectExclusion[]` (default `[]`)
- `pendingData: PendingDataItem[]` (default `[]`)

**Tests**: el `ExportedProject` v1.1 actual sigue siendo válido.

---

### T-107 — Extender ProjectStore con slices nuevos (read-only)

**Archivo**: `src/store/projectStore.ts`

**Cambios**:
- Añadir slices al estado inicial:
  ```ts
  cableRoutes: [] as CableRoute[],
  accessRoads: [] as AccessRoad[],
  fireSafetyZones: [] as FireSafetyZone[],
  blocks: [] as BESSBlock[],
  conversionStations: [] as ConversionStation[],
  mvFeeders: [] as MVFeeder[],
  mvBuses: [] as MVBus[],
  poi: null as POI | null,
  mainTransformer: null as MainTransformer | null,
  auxiliaryServices: null as AuxiliaryServices | null,
  ppc: null as PPC | null,
  assumptions: [] as ProjectAssumption[],
  inconsistencies: [] as DocumentInconsistency[],
  pendingData: [] as PendingDataItem[],
  ```
- **NO añadir acciones todavía** (las acciones de mutación vienen en fases siguientes cuando haya UI).
- Mantener todos los reducers de undo/redo del proyecto intactos.

**Tests**: `src/store/projectStore.test.ts` existente debe seguir pasando.

**Smoke test**: `useProjectStore.getState().cableRoutes` retorna `[]`.

---

### T-108 — Schema export 1.2 con lector retrocompatible

**Archivo**: `src/lib/export/exportJson.ts`

**Cambios**:
1. Cambiar `schema_version: "1.1"` a `schema_version: "1.2"`.
2. Añadir nuevos campos al export:
   - `cable_routes`, `access_roads`, `fire_safety_zones`
   - `blocks`, `conversion_stations`, `mv_feeders`, `mv_buses`
   - `poi`, `main_transformer`, `auxiliary_services`, `ppc`
   - `assumptions`, `inconsistencies`, `pending_data`
   - `evidence` (a nivel proyecto)
3. Crear función `importProject(json)` que detecta `schema_version` y aplica defaults para campos faltantes en v1.1.

**Tests**:
- Importar fixture v1.1 y validar que se cargan defaults `[]`.
- Exportar un proyecto vacío v1.2 y reimportarlo: igualdad estructural.

---

### T-109 — Tests adicionales

- `src/types/evidence.test.ts`
- `src/data/documentRegistry.test.ts`
- `src/lib/export/schemaV12.test.ts`
- Smoke test del store con los nuevos slices.

---

### T-110 — Smoke test app

**Comando**: `npm run dev` + abrir Demo + verificar:
- Mapa carga.
- Demo coloca equipos.
- Editar layout funciona.
- Export JSON tiene `schema_version: "1.2"` y los nuevos campos vacíos.

Sin crashes en consola del navegador.

---

## 4. Definición de "Fase 1 completa"

Checklist final:

- [ ] `src/types/evidence.ts` existe con tests pasando.
- [ ] `src/data/documentRegistry.ts` tiene ≥ 30 entries con IDs únicos y tests pasando.
- [ ] `src/types/electrical.ts`, `cable.ts`, `road.ts`, `safety.ts` existen, exportan los tipos, sin lógica.
- [ ] `src/types/equipment.ts` extendido (clearances, compliance, batteryHierarchy, source.evidence) sin romper consumidores.
- [ ] `src/types/project.ts` extendido (15+ campos opcionales nuevos).
- [ ] `src/store/projectStore.ts` tiene los slices nuevos (sin acciones todavía).
- [ ] `src/lib/export/exportJson.ts` con `schema_version: "1.2"` + lector v1.1.
- [ ] `npm run typecheck` pasa.
- [ ] `npm run lint` pasa.
- [ ] `npm run test` pasa (todos los tests existentes + los nuevos).
- [ ] `npm run build` pasa.
- [ ] App arranca con `npm run dev` y demo carga sin errores en consola.
- [ ] Export JSON nuevo es retrocompatible con import de fixture v1.1.

---

## 5. Qué NO hacer en esta fase

- ❌ No tocar UI (`src/components/`). Los nuevos paneles vienen en Fase 6+.
- ❌ No leer PDFs normativos línea por línea. Eso es Fase 9.
- ❌ No crear el `InconsistencyDetector` con reglas. Solo el stub vacío (recibe `Project`, devuelve `[]`).
- ❌ No crear el reporte HTML/PDF. Eso es Fase 11.
- ❌ No crear el preset BESS del Desierto extendido. Eso es Fase 3 (depende de Fase 2).
- ❌ No empezar Fase 2 (catálogos evidenciados) hasta cerrar Fase 1.

---

## 6. Riesgos específicos de Fase 1

| Riesgo | Mitigación |
|---|---|
| Sobre-modelar entidades nadie usa | Cada tipo nuevo debe poder representar **al menos** el caso BESS del Desierto. Si no, no incluirlo. |
| Romper backward compatibility de export | Tests con fixture v1.1 obligatorios |
| Confundir `SourceReliability` (3 niveles) con `EvidenceConfidence` (5 niveles) | Documentar en comentario JSDoc en cada tipo |
| Performance del store con muchos slices nuevos vacíos | Slices arrancan como `[]` o `null`; no impacto |
| Migración rompe tests existentes | Cambios aditivos, no mutativos; correr suite completa antes de merge |

---

## 7. Quién aprueba el cierre de Fase 1

- ✅ Lead técnico: code review.
- ✅ Compliance: revisión del `DocumentRegistry` (¿los IDs y rutas son correctos?).
- ✅ QA: ejecución manual del smoke test.

---

## 8. Después de Fase 1, qué se desbloquea

1. **Fase 2** (catálogos con evidencia): poblar `clearances`, `compliance` de ST2752UX y SC5000UD-MV con datasheet + página.
2. **Fase 3** (preset formal): convertir `bessDelDesierto.ts` en preset con evidencia.
3. **Fase 4** (sizing engine): ya puede consumir `EvidencedValue<T>` de targets.
4. **Inicio paralelo de Fase 9** (lectura humana de PDFs normativos): puede empezar en cuanto `DocumentRegistry` tenga los IDs definidos.

---

## 9. Resumen de impacto Fase 1

| Métrica | Antes | Después |
|---|---|---|
| Tipos exportados | ~10 | ~30 |
| Slices en ProjectStore | ~8 | ~22 |
| Campos opcionales en `EquipmentSpec` | ~12 | ~16 |
| Documents en registry | 0 | ≥30 |
| Schema version | 1.1 | 1.2 |
| Tests existentes rotos | — | 0 (objetivo) |
| Nuevos tests | — | ≥5 |
| Líneas de UI tocadas | — | 0 |
| Riesgo de regresión | — | bajo |

---

## 10. Comando único de cierre

```bash
cd bess-layout-designer
npm run lint && npm run typecheck && npm run test && npm run build && echo "FASE 1 OK"
```

Si todos los comandos pasan + app arranca sin crashes + export JSON v1.2 es retrocompatible: **Fase 1 está completa**. Avanzar a Fase 2.
