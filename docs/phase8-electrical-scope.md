# Fase 8 — Validaciones eléctricas preliminares defendibles

**Estado:** propuesta de diseño. Pendiente de revisión humana y decisión sobre §4.
**Restricción rectora:** ningún check de Fase 8 puede convertir el predimensionamiento en estudio eléctrico cerrado. Si un check no se puede justificar a nivel preliminar con la matriz L1–L7, va a §2 como exclusión, no a §1.

## 1. Checks eléctricos admisibles en predimensionamiento

Cada uno se modela como `RegulatoryRuleDefinition` en `regulatoryRulesCatalog.ts`, se ata a perfil(es) vía `appliesToProfiles`, y pasa por `effectiveSeverity` antes de mostrarse.

### 1.1 RULE-ELEC-007 — MV bus capacity screening (**activar**)

Ya existe como stub. Activarlo.

| Campo | Valor |
|---|---|
| Input | `MVBus.switchgear.busbarCurrentA` (escalar, no `EvidencedValue` aún → ver §3 cambio T1), `MVFeeder.ratedPowerMVA` agregada, `MVBus.nominalVoltageKv` |
| Output | Estimación: `aggregatedMVA_per_bus`, comparada contra `busbarCurrentA × √3 × kV / 1000`. Output: ratio uso. Unidad: % |
| DocumentLevel mín. | L2 (datasheet GIS Siemens 8DA o equivalente) para `busbarCurrentA`. Si L7, ceiling = checklist. |
| declaredSeverity | `warning` |
| Ceiling efectivo | warning (L2 documented) o checklist (L7) |
| Warning ES | `"La suma de potencia de los alimentadores sobre la barra MT supera el % del rating preliminar de barra."` |
| Warning EN | `"Aggregated feeder rating on the MV bus exceeds the preliminary busbar rating."` |
| Perfiles | `chile-utility-predesign`, `chile-pmgd-predesign`, `bess-del-desierto-reference` |

### 1.2 RULE-ELEC-008 — Cable ampacity screening (**refinar**)

Ya existe como `info` con `automation: "partial"`. Mantener como `info`, refinar el cálculo y dejarlo *preliminar*.

| Campo | Valor |
|---|---|
| Input | `MVFeeder.ratedPowerMVA`, `MVFeeder.nominalVoltageKv`, sección y aislación del cable de referencia (catálogo). |
| Output | Corriente conceptual = `MVA × 1000 / (√3 × kV)`. Comparar contra ampacidad nominal del cable de referencia *al aire 30 °C*. Output: ratio. Unidad: %. |
| DocumentLevel mín. | L2 (datasheet Nexans NA2XSY genérico). Nunca L1, salvo que el proyecto haya seleccionado un cable específico. |
| declaredSeverity | `info` (es screening, no diseño) |
| Ceiling efectivo | info (L2) o checklist (L7) |
| Warning ES | `"La corriente preliminar del alimentador supera el % de la ampacidad nominal del cable de referencia. La ampacidad final depende de instalación, agrupamiento y temperatura del suelo."` |
| Warning EN | `"Preliminary feeder current exceeds % of the reference cable's rated ampacity. Final ampacity depends on installation, grouping and soil temperature."` |
| Perfiles | `chile-utility-predesign`, `chile-pmgd-predesign`, `bess-del-desierto-reference` |

**Justificación de no-blocking:** la ampacidad real depende de condiciones de instalación que la app no modela (ver §2.a). Marcar `blocking` sería falsificar un estudio.

### 1.3 RULE-ELEC-009 — Conceptual loss budget (**activar**)

Ya existe como stub `warning`. Activarlo.

| Campo | Valor |
|---|---|
| Input | `PCSModule.maxEfficiencyPct` (L1), `BlockTransformer.loadLossKw`, `BlockTransformer.noLoadLossKw` (L1 si datasheet), `MVFeeder.ratedPowerMVA`, longitud aproximada del corredor MT (de `cableRoutes`). |
| Output | Pérdidas totales preliminares en MW para modo *discharge nominal*: `pcsLossesMW + transformerLossesMW + mvLossesMW_estimate`. Comparar contra un *budget* editable (defaultConstraints: `LOSS_BUDGET_PCT = 3%`). |
| DocumentLevel mín. | L1 para PCS y trafo (datasheet); L2 para resistividad del cable. |
| declaredSeverity | `warning` |
| Ceiling efectivo | warning (L1+documented) o info (mezclado) |
| Warning ES | `"Las pérdidas conceptuales estimadas (% del POI) superan el budget editable. Este cálculo no reemplaza un estudio de pérdidas detallado."` |
| Warning EN | `"Estimated conceptual losses (% of POI) exceed the editable budget. This is not a substitute for a detailed loss study."` |
| Perfiles | `chile-utility-predesign`, `chile-pmgd-predesign`, `bess-del-desierto-reference` |

### 1.4 RULE-ELEC-013 — Plant MVA fits POI declared capacity (**nueva**)

| Campo | Valor |
|---|---|
| Input | `ratedPowerMVA` agregada de todas las estaciones, `POI.voltageKv`, capacidad declarada del POI (campo nuevo opcional en POI; ver §3 T3) o aporte agregado de feeders. |
| Output | Ratio `plantMVA / poiCapacityMVA`. |
| DocumentLevel mín. | L4 si la capacidad POI viene de un informe/estudio de conexión; L7 si es supuesto interno. |
| declaredSeverity | `warning` |
| Ceiling efectivo | warning (L4) o checklist (L7) |
| Warning ES | `"La potencia agregada de la planta excede la capacidad declarada del POI o no hay capacidad POI registrada. Confirmar con estudio de interconexión CEN/CNE."` |
| Warning EN | `"Aggregated plant power exceeds the declared POI capacity, or no POI capacity is registered. Confirm with a CEN/CNE interconnection study."` |
| Perfiles | `chile-utility-predesign`, `chile-pmgd-predesign` |

### 1.5 RULE-ELEC-014 — Auxiliary services budget (**nueva**)

| Campo | Valor |
|---|---|
| Input | `AuxiliaryServices.plantFixedKw`, `perConversionStationKw`, `perContainerKw` (`EvidencedValue<number>`); número de estaciones y contenedores; potencia POI. |
| Output | `ssaaTotal_kW` y `ssaaTotal_pctPoi`. |
| DocumentLevel mín. | L1 si vienen de datasheet; L6 si vienen del catálogo de defaults. |
| declaredSeverity | `info` |
| Ceiling efectivo | info (L1) o info (L6 = warning capa confidence, intersección = info) |
| Warning ES | `"Los servicios auxiliares estimados representan el % del POI. Validar con manual de fabricante y plano eléctrico definitivo."` |
| Warning EN | `"Estimated auxiliary services represent % of POI. Validate against manufacturer manual and final electrical drawings."` |
| Perfiles | `chile-utility-predesign`, `chile-pmgd-predesign`, `bess-del-desierto-reference` |

### 1.6 RULE-ELEC-015 — Ramp rate within declared CEN NTSyCS preliminary limits (**nueva, checklist**)

| Campo | Valor |
|---|---|
| Input | `OperationalLimits.plantRampUpMWperMin`, `PPC.rampRateLimit_mw_per_min`, requisito CEN NTSyCS aplicable. |
| Output | Ratio rampa declarada / rampa solicitada por norma. |
| DocumentLevel mín. | L3 (CNE-NTSyCS-RES45-2026). |
| declaredSeverity | `warning` |
| Ceiling efectivo | warning (L3 documented) o checklist (missing) |
| Warning ES | `"La rampa declarada de la planta no se ha confrontado con NTSyCS. Confirmar tras estudio dinámico."` |
| Warning EN | `"Declared plant ramp rate has not been verified against NTSyCS. Confirm after dynamic study."` |
| Perfiles | `chile-utility-predesign` |

### 1.7 RULE-ELEC-016 — Declared PPC control modes coverage (**nueva, checklist**)

Puramente declarativo. La app NO ejecuta los modos.

| Campo | Valor |
|---|---|
| Input | `PPC.controlModes` (booleans). |
| Output | Lista de modos faltantes versus requeridos por NTSyCS (mínimo: `activePower`, `reactivePower`, `voltage`, `frequency`). |
| DocumentLevel mín. | L3 (NTSyCS) para la lista mínima requerida. |
| declaredSeverity | `checklist` |
| Ceiling efectivo | checklist |
| Warning ES | `"Modos de control PPC declarados incompletos para NTSyCS. Faltan: {lista}."` |
| Warning EN | `"Declared PPC control modes incomplete for NTSyCS. Missing: {list}."` |
| Perfiles | `chile-utility-predesign`, `chile-pmgd-predesign` |

### 1.8 RULE-ELEC-017 — Transformer no-load losses 24×7 budget (**nueva, info**)

| Campo | Valor |
|---|---|
| Input | `BlockTransformer.noLoadLossKw` × cantidad de estaciones × 8760 h/año. |
| Output | Energía perdida estimada anual (`MWh/year`), comparada con %POI×Energía-de-referencia. |
| DocumentLevel mín. | L1 (datasheet). |
| declaredSeverity | `info` |
| Ceiling efectivo | info |
| Warning ES | `"Las pérdidas estáticas anuales del banco de transformadores (MWh) son significativas. Considerar al dimensionar SSAA y disponibilidad."` |
| Warning EN | `"Annual no-load losses of the transformer bank (MWh) are significant. Consider for auxiliary sizing and availability."` |
| Perfiles | `chile-utility-predesign`, `chile-pmgd-predesign`, `bess-del-desierto-reference` |

**Tabla resumen § 1**

| ID | Acción | Severidad declarada | Ceiling típico | Perfil |
|---|---|---|---|---|
| RULE-ELEC-007 | activar stub | warning | warning/checklist | utility/PMGD/desierto |
| RULE-ELEC-008 | refinar | info | info/checklist | utility/PMGD/desierto |
| RULE-ELEC-009 | activar stub | warning | warning/info | utility/PMGD/desierto |
| RULE-ELEC-013 | nueva | warning | warning/checklist | utility/PMGD |
| RULE-ELEC-014 | nueva | info | info | utility/PMGD/desierto |
| RULE-ELEC-015 | nueva | warning | warning/checklist | utility |
| RULE-ELEC-016 | nueva | checklist | checklist | utility/PMGD |
| RULE-ELEC-017 | nueva | info | info | utility/PMGD/desierto |

**Reglas existentes que NO se tocan** (ya implementadas correctamente): RULE-ELEC-001, 002, 003, 004, 005, 006. RULE-ELEC-010, 011, 012 permanecen como `engineering_detail` `out_of_scope`.

## 2. Checks que NO se implementan (exclusiones)

Cubiertos por exclusiones existentes:

| Check potencial | Cubierto por exclusión | ¿Ampliar? |
|---|---|---|
| Flujo de carga real (load-flow PSS/E, DIgSILENT) | `ex-load-flow` | No |
| Cortocircuito (Ik'', Ip) | `ex-short-circuit` | No |
| Coordinación de protecciones (curvas TC) | `ex-protections-coordination` | No |
| Estabilidad transitoria/EMT, FRT, SCR | `ex-rms-emt-stability` | No |
| THD, IHD, flicker | `ex-harmonics` | No |
| Resistividad ρ, tensiones paso/contacto, malla | `ex-grounding-grid` | No |

Nuevas exclusiones a agregar (3):

| ID propuesto | Label | Categoría | reportText ES | Razón breve |
|---|---|---|---|---|
| `ex-arc-flash` | Estudio de arco eléctrico | electrical | `"Estudio de arc flash IEEE 1584"` | App no calcula incidencia ni distancias de aproximación segura. |
| `ex-insulation-coordination` | Coordinación de aislamiento (BIL) | electrical | `"Estudio de coordinacion de aislamiento"` | App no modela sobretensiones de maniobra ni atmosféricas. |
| `ex-power-quality-pcc` | Calidad de suministro en PCC | electrical | `"Estudio de calidad de suministro en PCC"` | THD/desbalance/flicker requieren mediciones y modelo. |

**Lista de tentaciones a rechazar explícitamente:**

- Ampacidad real (con suelo, agrupamiento, temperatura) — solo screening L2 conceptual (RULE-ELEC-008).
- Caída de tensión a lo largo del corredor — sólo si se modela como derivado L7+`derived`, pero **no se implementa en Fase 8**.
- Selección de protecciones y ajustes — excluido.
- Análisis dinámico/RMS — excluido.

## 3. Diagrama de integración

```
┌─────────────────────────────────────────────────────────────────┐
│ src/types/electrical.ts        (TIPOS DE DOMINIO)               │
│   POI ─► +declaredCapacityMVA?: EvidencedValue<number>   [T3]   │
│   MVBus.switchgear.busbarCurrentA ──► EvidencedValue<number>    │
│                                                          [T1]   │
│   (resto de tipos: sin cambios)                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ src/data/defaultConstraints.ts (CONSTANTES EDITABLES)           │
│   + LOSS_BUDGET_PCT = 0.03                                      │
│   + SSAA_BUDGET_PCT = 0.02                                      │
│   + BUSBAR_UTILIZATION_THRESHOLD_PCT = 0.80                     │
│   + CABLE_AMPACITY_UTILIZATION_THRESHOLD_PCT = 0.90             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ src/lib/electrical/topologyValidation.ts                        │
│   + checkBusbarCapacity()       → emite rule-elec-007-…         │
│   + checkCableAmpacity()        → emite rule-elec-008-…         │
│   + checkLossBudget()           → emite rule-elec-009-…         │
│   + checkPoiCapacityFit()       → emite rule-elec-013-…         │
│   + checkAuxiliaryBudget()      → emite rule-elec-014-…         │
│   + checkRampRate()             → emite rule-elec-015-…         │
│   + checkPpcControlCoverage()   → emite rule-elec-016-…         │
│   + checkNoLoadLossesAnnual()   → emite rule-elec-017-…         │
│   (cada uno produce ElectricalCompatibilityIssue con basis +    │
│    affectedIds; severidad declarada antes de ceiling)           │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ src/rules/regulatoryRulesCatalog.ts (CATÁLOGO DECLARATIVO)      │
│   – RULE-ELEC-007/008/009: completar appliesToProfiles + texto. │
│   + RULE-ELEC-013..017: nuevas entradas con evidence L1–L7.     │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ src/rules/regulatoryProfileEvaluator.ts                         │
│   ELEC_RULE_PREFIX += {                                         │
│     "mvBuses.capacityCheck":     "rule-elec-007-",              │
│     "cableRoutes.ampacityEstimate":"rule-elec-008-",            │
│     "losses.budget":             "rule-elec-009-",              │
│     "poi.capacityFit":           "rule-elec-013-",              │
│     "ssaa.budget":               "rule-elec-014-",              │
│     "ppc.rampRate":              "rule-elec-015-",              │
│     "ppc.controlCoverage":       "rule-elec-016-",              │
│     "transformer.noLoadAnnual":  "rule-elec-017-",              │
│   }                                                              │
│   (severityCeiling.ts ya aplica techo por nivel y confidence)   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ src/components/sidebar/RegulatoryCompliancePanel.tsx            │
│   nueva sección "Validaciones eléctricas preliminares"          │
│   muestra issue.severity (effective) + severityCappedBy badge   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ src/lib/report/buildReportData.ts + ReportDocument.tsx          │
│   nueva subsección bajo "Arquitectura eléctrica preliminar"     │
│   tabla: check / valor estimado / referencia / nivel / severidad│
│   recuadro: "Estas estimaciones no constituyen estudio eléctrico│
│   detallado; ver exclusiones."                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Cambios de tipo necesarios:**

- **T1** `MVBus.switchgear.busbarCurrentA`: pasar de `number` a `EvidencedValue<number>` para que RULE-ELEC-007 tenga trazabilidad. Migración: envolver en `asMissing(0)` en presets que no lo tengan.
- **T2** `MVFeeder.ratedPowerMVA`: ya es `number?`. Mantener; sin cambio.
- **T3** `POI`: agregar `declaredCapacityMVA?: EvidencedValue<number>` (opcional). Sin migración forzada.

**Sin nuevos archivos en `src/types/`.** Todo entra en `electrical.ts` existente.

## 4. Plan de retirada de `bessRegulatoryProfiles.ts` legacy

**Inventario actual de imports** (10 archivos):

| Archivo | Símbolo importado |
|---|---|
| `src/components/sidebar/BessParkSummaryPanel.tsx` | `getRegulatoryProfile` |
| `src/components/sidebar/PreliminaryDesignToolsPanel.tsx` | `getRegulatoryProfile` |
| `src/components/sidebar/BessQuickSizingPanel.tsx` | `getRegulatoryProfile` |
| `src/components/sidebar/RegulatoryCompliancePanel.tsx` | `getRegulatoryProfile` |
| `src/components/sidebar/RegulatoryConfigPanel.tsx` | `REGULATORY_PROFILES` |
| `src/components/map/BessMap.tsx` | `getRegulatoryProfile` |
| `src/components/report/ReportPreview.tsx` | `getRegulatoryProfile` |
| `src/lib/report/downloadTechnicalReport.tsx` | `getRegulatoryProfile` |
| `src/store/regulatoryStore.ts` | `DEFAULT_REGULATORY_CONTEXT` |
| (tests) | varios |

El legacy expone constantes numéricas (`spacingBetweenContainersM`, `setbackFromFenceM`, etc.) que consumen layout y reporte. El sistema declarativo (`regulatoryRulesCatalog` + `regulatoryRuleProfiles`) NO expone esas constantes — sólo reglas con evidencia. Por eso la migración no es 1:1.

**Orden de retirada propuesto:**

1. **Mover constantes numéricas del legacy a `src/data/defaultConstraints.ts`** (o a una nueva `src/data/jurisdictionConstraints.ts` si las constantes son por jurisdicción). Marcar todas como `preliminary_assumption`. *Sin tocar consumidores.*
2. **Crear adaptador transitorio** `src/rules/legacyRegulatoryAdapter.ts` con la misma firma `getRegulatoryProfile(id)` y `REGULATORY_PROFILES`, pero leyendo de las nuevas constantes + perfiles declarativos. Todos los imports redirigen al adaptador. Una sola línea de cambio por archivo.
3. **Migrar consumidor por consumidor** del adaptador al consumo directo del catálogo + constantes:
   - Orden sugerido (por riesgo creciente): `RegulatoryConfigPanel` → `BessParkSummaryPanel` → `BessQuickSizingPanel` → `PreliminaryDesignToolsPanel` → `RegulatoryCompliancePanel` → `BessMap` → `ReportPreview` → `downloadTechnicalReport` → `regulatoryStore`.
   - Cada migración: un commit, typecheck + test verdes.
4. **Borrar `bessRegulatoryProfiles.ts`, su test y el adaptador.** Verificar `grep -r bessRegulatoryProfiles src/` = 0 resultados.
5. **Punto de no retorno:** después del paso 3. Si una migración revela un dato numérico que no está en el catálogo declarativo, el doc de Fase 8 debe registrarlo antes de borrar el legacy.

**Riesgos:**

- `DEFAULT_REGULATORY_CONTEXT` del store contiene la lista activa de perfiles; cambiarlo puede resetear preferencias del usuario en `localStorage`. Mitigación: versionar el storage key o mantener compatibilidad lectora.
- Algunos componentes (e.g. `BessMap`) usan el legacy para pintar zonas de seguridad. Hay que garantizar que las distancias salen ahora de `defaultConstraints` con la misma semántica.
- Tests legacy pueden tener fixtures hardcodeados en numéricos del archivo viejo. Plan: revisar `bessRegulatoryProfiles.test.ts` y migrar las assertions a las constantes.

**Estimación:** 8–12 commits, ~1 jornada de trabajo de un agente `/sparc/coder`.

## 5. Criterios de aceptación Fase 8

Fase 8 se considera cerrada cuando se cumplen TODOS los siguientes:

1. **Catálogo:** 8 reglas eléctricas nuevas/refinadas (1.1–1.8) presentes en `regulatoryRulesCatalog.ts`, con evidencia explícita y `appliesToProfiles` correcto.
2. **Engine:** `topologyValidation.ts` emite el `ElectricalCompatibilityIssue.id` esperado por cada `appParameter` mapeado en `ELEC_RULE_PREFIX`.
3. **Ceilings:** ninguna regla nueva emite severidad efectiva `blocking` excepto vía evidencia L1+`documented` (verificable con un test `Array.every`).
4. **Tipos:** T1 y T3 aplicados; presets BESS Desierto y demoProject re-validados sin fallos de tipo.
5. **Tests:** cobertura mínima:
   - 1 test por regla nueva, caso pasa y caso falla.
   - 1 test e2e en `bessDelDesiertoFlow.test.tsx` que verifique que el reporte BESS Desierto incluye las 8 reglas y ninguna emite blocking.
   - 1 test invariante: para toda regla en `regulatoryRulesCatalog`, `effectiveSeverity(r).severity` respeta `maxSeverityForLevel`.
6. **UI:** sección "Validaciones eléctricas preliminares" en `RegulatoryCompliancePanel` muestra cada regla con su `severityCappedBy` cuando aplica.
7. **Reporte:** nueva subsección en PDF con tabla check/valor/nivel/severidad, y disclaimer explícito enlazado a `exclusionRegistry` (incluidas las 3 exclusiones nuevas de §2).
8. **Legacy:** decisión sobre `bessRegulatoryProfiles.ts` registrada al final de este documento (sección "Decisión de retirada", abajo). Si la decisión es "aprobado", el merge de Fase 8 incluye el borrado; si es "postergado", se documenta el motivo.
9. **Calidad:** `npm run typecheck && npm run test && npm run lint && npm run build` verdes.
10. **Trazabilidad:** los documentos citados (CNE-NTSyCS-RES45-2026, datasheets Sungrow, datasheets Siemens/Nexans usados) existen en `documentRegistry.ts` con `level` y `pathActive`.

---

## Decisión de retirada de `bessRegulatoryProfiles.ts`

> _Pendiente de decisión humana. Marcar una opción al cerrar este bloque:_
>
> - [ ] **Aprobado** — ejecutar Prompt 3 (`/sparc/coder`) inmediatamente después de Fase 8 implementada.
> - [ ] **Postergado** — mantener el legacy hasta Fase N; consignar razón:
> - [ ] **Modificado** — ajustes propuestos al plan:

---

**Próximo paso recomendado:** revisar este doc, anotar la decisión §4 al pie, y recién entonces lanzar `/sparc/coder` con el Prompt 3 (retirada legacy) o un Prompt 5 nuevo (implementación de Fase 8 según este diseño).
