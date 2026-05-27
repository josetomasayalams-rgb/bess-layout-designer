# 00 — Resumen ejecutivo

Plan maestro para incorporar el contenido de `DIRECTRICES_APP_BESS/` dentro de la aplicación **bess-layout-designer**, transformándola desde una herramienta de **layout preliminar sobre mapa** hacia un **predimensionador profesional de BESS utility-scale** para etapas tempranas de evaluación técnica en Chile.

Esta planificación **no implementa código**. Es el mapa maestro a partir del cual se autoriza una segunda etapa de implementación fase por fase.

---

## 1. Alcance del plan

- App objetivo: `bess-layout-designer/` (Next.js 16 + React 19 + Zustand + MapLibre).
- Fuente documental: `DIRECTRICES_APP_BESS/` (~330 archivos: 80+ PDFs normativos, 10 datasheets oficiales, 60+ extractos de texto del caso BESS del Desierto, 50+ imágenes de unifilares/planos, 30+ índices markdown).
- Caso ancla: **BESS del Desierto** (Atlas Renewable, Chile) — 200 MW / 800 MWh nominal comercial (880,80384 MWh bruto), 320 contenedores Sungrow ST2752UX, 40 estaciones SC5000UD-MV de 5 MVA, red colectora 33 kV.

---

## 2. Diagnóstico de la app actual

| Capa | Estado | Observación |
|---|---|---|
| Mapa y polígono de sitio | ✅ Implementado | MapLibre/react-map-gl, proyección local, área en m² y ha |
| Catálogo de equipos | 🟨 Parcial | Catálogos separados (`bessContainer`, `pcs`, `mvSkid`, `transformer`) unificados por `technicalEquipmentSpecs[]`; clasificación de fiabilidad existe (`certified_data` / `preliminary_assumption` / `pending_validation`) |
| Layout físico | ✅ Implementado | Colocación manual, edición por selección, lazo, lock, repair, compact |
| Layout automático | 🟨 Parcial | `preliminaryLayoutGenerator`, `caseStudyLayoutGenerator` (BESS del Desierto), `bessArrayGenerator` |
| Validaciones físicas | ✅ Implementado | Colisiones, fuera de polígono, separaciones, buffers regulatorios |
| Validaciones eléctricas | 🟨 Mínimo | `electrical/compatibility.ts` — solo compatibilidad PCS↔transformador |
| Sizing preliminar | 🟨 Mínimo | `sizing/preliminarySizing.ts` — falta arquitectura completa (containers→PCS→TR→feeder→POI) |
| Reglas normativas | 🟨 Parcial | `rules/bessValidationEngine.ts` + `bessRegulatoryProfiles.ts` — perfiles activos pero no anclados a citas normativas trazables |
| Modelo de datos | 🟥 Insuficiente | Falta jerarquía electrica completa: no hay `MVFeeder`, `MVBus`, `POI`, `MainTransformer`, `AuxiliaryServices`, `PPC`, `CableRoute`, `AccessRoad`, `FireSafetyZone` como entidades de primer nivel |
| Trazabilidad documental | 🟥 Insuficiente | Existen `source.notes` puntuales pero no hay sistema `EvidenceRef` formal (archivo/página/nivel de confianza) |
| Reporte técnico | 🟥 No existe | Solo `exportJson` schema 1.1, sin reporte profesional (supuestos, exclusiones, checklist, pendientes) |
| Checklist ingeniería detalle | 🟥 No existe | Falta separar lo preliminar de lo que requiere protecciones/tierra/incendio/civil |

Leyenda: ✅ implementado · 🟨 parcial · 🟥 ausente.

---

## 3. Hipótesis técnica de evolución

La app debe organizarse en **tres capas simultáneas** y un **sistema transversal de trazabilidad**:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Capa 1 — Layout físico                                              │
│ Contenedores · PCS · transformadores · centros · caminos · buffers  │
│ zonas de mantenimiento · zonas bloqueadas · accesos                 │
├─────────────────────────────────────────────────────────────────────┤
│ Capa 2 — Arquitectura eléctrica preliminar                          │
│ Container → PCS → trafo bloque → MV feeder → MV bus → POI 33 kV     │
│ servicios auxiliares · PPC/SCADA (metadatos)                        │
├─────────────────────────────────────────────────────────────────────┤
│ Capa 3 — Validación, normativa y reporte                            │
│ Validaciones físicas · eléctricas · matriz normativa candidata      │
│ checklist · supuestos · exclusiones · reporte exportable            │
├─────────────────────────────────────────────────────────────────────┤
│ Sistema transversal — Trazabilidad y evidencia                      │
│ EvidenceRef (archivo, página, confianza) · ProjectAssumption        │
│ DocumentRegistry · InconsistencyDetector                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Brechas principales (top 7)

1. **Sin entidad `POI`, `MVBus`, `MVFeeder`**. El modelo termina en el equipo, no llega al colector ni a la frontera de medición.
2. **Sin sistema de evidencia documental formal**. Hoy hay un `source: { reliability, notes }` por equipo, pero no se pueden citar páginas de un PDF normativo ni marcar un dato como `inferred` o `missing`.
3. **Sin separación entre potencia nominal, capacidad bruta y capacidad usable**. El cálculo actual usa `energy_mwh_dc_bol` sin un `usableFactor` con evidencia.
4. **Sin reporte técnico profesional**. La exportación JSON es útil pero no replica el reporte que un EPC esperaría (supuestos, exclusiones, checklist, pendientes, fuentes).
5. **Reglas regulatorias sin anclaje normativo trazable**. `bessRegulatoryProfiles.ts` opera con valores pero sin citar el numeral del RGR/RIC/RPTD/CEN/NFPA que origina cada regla.
6. **Sin servicios auxiliares modelados**. SSAA HVAC + control + bombeo + incendio no entran en el balance MW neto.
7. **Sin checklist de ingeniería de detalle**. La app no comunica al usuario que cortocircuito, malla de tierra, protección incendio y fundaciones quedan fuera de alcance preliminar.

Detalle completo en `03_GAP_ANALYSIS.md`.

---

## 5. Fases recomendadas (resumen)

| Fase | Nombre | Bloqueante para | Prioridad |
|---|---|---|---|
| 0 | Diagnóstico app + clasificación documental | Todas | Crítica |
| 1 | Modelo de datos extendido + trazabilidad (`EvidenceRef`) | 2..11 | Crítica |
| 2 | Catálogo técnico ampliado con datasheets oficiales | 4..11 | Crítica |
| 3 | Preset BESS del Desierto formalizado | 4, 11 | Alta |
| 4 | Calculadora técnica MW/MWh con bruto/usable/duración | 5..11 | Alta |
| 5 | Generador de bloques BESS (8:1, 4:1) | 6, 7 | Alta |
| 6 | Layout físico profesional con MVBus/POI | 7, 11 | Alta |
| 7 | Validaciones físicas extendidas | 11 | Alta |
| 8 | Validaciones eléctricas preliminares | 11 | Media-alta |
| 9 | Matriz normativa candidata con citas | 10 | Media |
| 10 | Motor de validaciones normativas | 11 | Media |
| 11 | Reporte técnico exportable | — | Alta |
| 12 | QA, pruebas y documentación | — | Alta |

Detalle completo en `05_ARQUITECTURA_IMPLEMENTACION.md` y `06_BACKLOG_PRIORIZADO.md`.

---

## 6. Primera fase recomendada

**Fase 1 — Modelo de datos extendido y sistema de trazabilidad.**

Razones:
- Bloquea todas las demás (sin `EvidenceRef` y sin entidades eléctricas completas, cualquier regla nueva nace inválida).
- Es 100 % planificable sin tocar UI todavía.
- Permite migrar `equipmentCatalog` legacy hacia un modelo con evidencia explícita, manteniendo retrocompatibilidad gracias al campo `SourceReliability` existente.
- Habilita el detector de inconsistencias (ST2752UX vs ST2725UX, 0,9 vs 0,69 kV, 220 vs 230 kV) detectado en el análisis del caso BESS del Desierto.

Detalle completo en `11_PLAN_PRIMERA_IMPLEMENTACION.md`.

---

## 7. Riesgos críticos antes de programar

| ID | Riesgo | Mitigación |
|---|---|---|
| R-001 | Tratar `preliminary_assumption` como ley normativa | Toda regla nueva exige `EvidenceRef` o queda como `assumption` con badge visible |
| R-002 | Importar números desde extracciones OCR sin validar contra el PDF original | Toda cifra del caso BESS del Desierto debe trazarse al PDF + página en `INFORMES_TECNICOS_CASO/` |
| R-003 | Inconsistencias internas en informes (ST2752 vs ST2725, 0,9 vs 0,69 kV, 220 vs 230 kV) | Implementar `InconsistencyDetector` que las muestre al usuario |
| R-004 | Pretender ser herramienta de ingeniería de detalle | Cada export debe declarar exclusiones (cortocircuito, tierra, incendio, civil) |
| R-005 | Mezclar el caso BESS del Desierto con la arquitectura genérica | El preset es **caso base parametrizable**, no ley universal |
| R-006 | Datasheets PDF binarios no leídos automáticamente | Marcar valores derivados de OCR como `derived` o `inferred`, nunca `documented` |
| R-007 | Carpeta `directrices-implementation-plan/` confundida con docs públicos | Convención: estos archivos son planificación interna, no contenido de la app |

Detalle completo en `10_RIESGOS_SUPUESTOS_PENDIENTES.md`.

---

## 8. Información que falta validar

- Datasheet completo Sungrow ST2752UX (dimensiones físicas exactas, peso, clearances, HVAC, incendio).
- Manual de instalación / layout guide del contenedor.
- Datasheet completo SC5000UD-MV (clearances, derating, configuración DC real).
- Switchgear / centro de seccionamiento 33 kV (dimensiones, número de celdas, configuración).
- Planos georreferenciados o DWG/DXF (no existen archivos nativos CAD en la carpeta).
- Criterios contra incendio aplicables Chile (NFPA 855 está como referencia, pero no como regla local validada).
- Confirmar tensión BT real (0,9 kV vs 0,69 kV) — inconsistencia interna del caso.
- Confirmar tensión AT real (220 kV vs 230 kV) — inconsistencia interna del caso.

---

## 9. Entregables de esta planificación

| Archivo | Contenido |
|---|---|
| `00_RESUMEN_EJECUTIVO.md` | Este documento |
| `01_MAPEO_APP_ACTUAL.md` | Estado real del código en `bess-layout-designer/src/` |
| `02_MAPEO_DIRECTRICES_APPB.md` | Inventario y clasificación de la carpeta `DIRECTRICES_APP_BESS/` |
| `03_GAP_ANALYSIS.md` | Brecha entre app actual y app objetivo |
| `04_MODELO_DATOS_PROPUESTO.md` | Entidades, campos, relaciones |
| `05_ARQUITECTURA_IMPLEMENTACION.md` | Las 12 fases en detalle |
| `06_BACKLOG_PRIORIZADO.md` | Backlog accionable ordenado |
| `07_PRESET_BESS_DEL_DESIERTO.md` | Caso base parametrizable con evidencia |
| `08_MATRIZ_DIRECTRICES_A_FUNCIONALIDADES.md` | Cada documento → funcionalidad |
| `09_MATRIZ_REGLAS_CANDIDATAS.md` | Reglas candidatas con tipo (bloqueo/aviso/checklist) |
| `10_RIESGOS_SUPUESTOS_PENDIENTES.md` | Riesgos, supuestos y pendientes |
| `11_PLAN_PRIMERA_IMPLEMENTACION.md` | Fase 1 en detalle accionable |
| `12_CRITERIOS_QA_Y_VALIDACION.md` | Criterios de aceptación y QA |

---

## 10. Carácter de esta app — siempre presente en cada export

La app es una **herramienta preliminar de evaluación temprana**. **No reemplaza**:

- Estudios eléctricos definitivos (cortocircuito, flujo de carga, RMS/EMT).
- Coordinación de protecciones y ajustes de relés.
- Diseño de malla de tierra.
- Ingeniería de canalizaciones y zanjas definitivas.
- Fundaciones y civil estructural.
- Diseño final de protección contra incendio (NFPA 855, UL 9540 / 9540A, aseguradora).
- Estudios ambientales (SEIA, ruido, residuos peligrosos).
- Permisos sectoriales (DOM/MINVU, SEC, CNE/CEN).
- Revisión de ingeniería del fabricante.
- Aprobación del Coordinador, SEC, CNE, SEA u otra autoridad.

Esta declaración debe aparecer **textualmente en cada reporte exportado**.
