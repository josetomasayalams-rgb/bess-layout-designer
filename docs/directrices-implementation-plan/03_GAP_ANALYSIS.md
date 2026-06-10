# 03 — Gap analysis

Comparación entre el estado actual (`01_MAPEO_APP_ACTUAL.md`) y lo que exigen las directrices (`02_MAPEO_DIRECTRICES_APPB.md` + análisis técnico ancla del caso BESS del Desierto).

Convención de severidad: **A**=alto · **M**=medio · **B**=bajo.

---

## Tabla maestra de brechas

| ID | Área | Funcionalidad esperada | Existe actualmente | Estado actual | Brecha | Impacto | Prioridad | Esfuerzo | Archivos probables | Criterio de aceptación |
|---|---|---|---|---|---|---|---|---|---|---|
| GAP-001 | Trazabilidad documental | Cada valor técnico tiene `EvidenceRef` con archivo + página + nivel confianza (documented / derived / inferred / assumption / missing) | Solo `source.notes` libre + `SourceReliability` (3 niveles) en `equipmentCatalog.ts` | Parcial | Falta archivo + página + nivel formal | A — toda regla nueva nace inválida sin esto | Crítica | M | `src/types/evidence.ts` (nuevo), `src/data/documentRegistry.ts` (nuevo), todos los catálogos | Cada `EquipmentSpec` puede tener N `EvidenceRef[]`; export JSON incluye `evidence` por dato |
| GAP-002 | Modelo de datos eléctrico | Jerarquía completa: `Container → ConversionStation → BlockTransformer → MVFeeder → MVBus → POI → MainTransformer` | Solo `EquipmentSpec` + `PlacedEquipment` | Insuficiente | Faltan `MVFeeder`, `MVBus`, `POI`, `MainTransformer` como entidades de primera clase | A — no se modela arquitectura eléctrica | Crítica | A | `src/types/electrical.ts` (nuevo), `src/store/projectStore.ts`, `src/lib/export/exportJson.ts` | Para BESS del Desierto se pueden representar 10 feeders, 1 sectioning center, 2 barras BP5/BP6 y 1 POI 33 kV |
| GAP-003 | Distinción capacidad bruta / usable / nominal | `targetGrossEnergyMWh` ≠ `targetUsableEnergyMWh` ≠ `targetCommercialMWh` con `usableFactor` editable | Solo `energy_mwh_dc_bol` por equipo | Insuficiente | No se separan los tres conceptos | A — KPIs y reporte ambiguos | Crítica | M | `src/types/project.ts`, `src/lib/bessCalculations.ts`, `src/components/sidebar/BessParkSummaryPanel.tsx` | Para caso base muestra 880,80384 MWh bruto, 800 MWh usable comercial, `usableFactor = 0.9083` con evidencia |
| GAP-004 | Servicios auxiliares (SSAA) | `AuxiliaryServices` con `plantFixedKw`, `perStationKw`, `perContainerKw`, `modeSpecific` (charge/discharge/standby/startup) | No existe | Ausente | Sin balance de potencia neta | A — reporte de MW falso | Alta | M | `src/types/electrical.ts`, `src/lib/electrical/aux.ts` (nuevo) | Caso BESS del Desierto reproduce: SSAA descarga 1,563 MW, carga 1,3493 MW |
| GAP-005 | PPC / SCADA como metadato | `PPC` con `manufacturer`, modos `P/Q/PF/V/freq/ramp`, `rampRateLimit`, protocolos | No existe | Ausente | Reporte operacional incompleto | M — necesario para reporte profesional | Alta | B | `src/types/electrical.ts`, `src/components/sidebar/` (nuevo panel) | Caso base reporta Bluence / Isotrol con modos identificados |
| GAP-006 | Pérdidas eléctricas preliminares | Pérdidas MT por feeder + por transformador bloque + factor planta | Solo compatibilidad PCS-trafo | Insuficiente | Sin estimación de pérdidas | M | Alta | M | `src/lib/electrical/losses.ts` (nuevo) | Caso base PMAX reproduce pérdidas MT 3,7772 MW descarga / 3,6813 MW carga (con badge de "caso base, no extrapolable") |
| GAP-007 | Cable corridors / Rutas MT | `CableRoute` parametrizado con ancho corredor, tipo cable, sección, ampacidad estimada | No existe | Ausente | Sin reserva espacial real | A — layout colisiona con caminos reales | Alta | A | `src/types/cable.ts` (nuevo), `src/lib/layout/cableRoutes.ts` (nuevo), `BessMap.tsx` | Se dibujan corredores parametrizados (banda) en el mapa |
| GAP-008 | Caminos y accesos | `AccessRoad` con ancho, radio de giro, zonas de maniobra/izaje | No existe | Ausente | Equipos pueden quedar inaccesibles | A — layout físicamente imposible | Alta | A | `src/types/road.ts` (nuevo), `src/lib/layout/accessRoads.ts` (nuevo) | Se modela camino perimetral y caminos internos como capa |
| GAP-009 | Zonas contra incendio | `FireSafetyZone` con separaciones, barreras, sistema | No existe | Ausente | Sin separaciones HSE explícitas | A — riesgo HSE | Alta | M | `src/types/safety.ts` (nuevo), `src/rules/bessRegulatoryProfiles.ts` (extender) | Se renderizan zonas de retiro y se validan vs separación entre containers |
| GAP-010 | Reglas regulatorias con citas | Cada regla en `bessRegulatoryProfiles.ts` tiene `EvidenceRef[]` (archivo PDF + página + numeral) | Reglas tienen valores pero no citas | Parcial | Sin trazabilidad normativa | A — toda regla queda como "preliminary_assumption" | Alta | M | `src/rules/bessRegulatoryProfiles.ts`, `src/rules/bessValidationEngine.ts` | Cada regla muestra su fuente al hacer click; export las incluye |
| GAP-011 | Detector de inconsistencias | `InconsistencyDetector` que alerta sobre conflictos de datos (ej. ST2752UX vs ST2725UX en informes) | No existe | Ausente | Errores pasan desapercibidos | M | Alta | B | `src/rules/inconsistencyDetector.ts` (nuevo) | Caso base muestra al menos 3 alertas: modelo container, tensión BT (0,9 vs 0,69), tensión AT (220 vs 230) |
| GAP-012 | Sizing engine completo | `sizingEngine` calcula MW, MWh bruto/usable, duración, containers, stations, feeders | `preliminarySizing.ts` simplificado | Parcial | Falta agrupación 8:1 y 4:1 con limites | A | Alta | M | `src/lib/sizing/preliminarySizing.ts`, `src/lib/sizing/architectureSizing.ts` (nuevo) | Para 200 MW / 800 MWh devuelve 320 containers + 40 stations + 10 feeders |
| GAP-013 | Generador de unifilar | Diagrama eléctrico Container → PCS → TR → Feeder → Bus → POI | No existe | Ausente | Falta visual eléctrico | M | Alta | A | `src/components/electrical/SingleLineDiagram.tsx` (nuevo) | Para caso base genera unifilar simplificado de 200 MW |
| GAP-014 | Reporte técnico profesional | Reporte HTML/PDF con secciones (resumen, equipos, arquitectura, supuestos, exclusiones, checklist, pendientes, fuentes) | Solo export JSON 1.1 | Insuficiente | Reporte humano-legible inexistente | A — credibilidad industrial | Crítica | A | `src/lib/report/` (nuevo), `src/components/report/` (nuevo) | Reporte exportable con todas las secciones de la planilla del análisis ancla |
| GAP-015 | Checklist ingeniería detalle | Lista visible de pendientes: cortocircuito, malla tierra, fundaciones, incendio, civil, etc. | No existe en UI | Ausente | Usuario puede creer que la app reemplaza ingeniería | A — riesgo de uso indebido | Crítica | B | `src/components/sidebar/EngineeringChecklistPanel.tsx` (nuevo), `src/data/engineeringChecklist.ts` (nuevo) | Cada export incluye sección "exclusiones" con los ~12 ítems del documento ancla |
| GAP-016 | Catálogo de equipos extendido | Catálogo con switchgear MT, cables MT, transformador principal, HVAC | Solo container + PCS + trafo + skid | Parcial | Cables, switchgear, HVAC, main transformer no son entidades | M | Media-alta | M | `src/data/catalogs/cables.ts` (nuevo), `src/data/catalogs/switchgear.ts` (nuevo), `src/data/catalogs/mainTransformer.ts` (nuevo) | Cables HES / Nexans / Prysmian; Siemens 8DA/8DB; Horizon Power transformer cargables como referencias |
| GAP-017 | Plantillas BESS del Desierto | Preset formal con todos los datos del caso, marcados con evidencia | Existe `bessDelDesierto.ts` en `projectCaseStudies` | Parcial | Falta sistema de evidencia + supuestos visibles | A | Alta | M | `src/data/projectCaseStudies/bessDelDesierto.ts`, `src/data/projectCaseStudies/bessDelDesiertoEvidence.ts` (nuevo) | Cargar preset reproduce sin error 320/40/10 + KPIs documentados |
| GAP-018 | Niveles batería | `BatteryCell`, `BatteryModule`, `BatteryRack`, `BatteryContainer` como niveles trazables | Solo `BatteryContainer` | Parcial | Sin trazabilidad de capacidad interna | B — opcional para v1 | Media | M | `src/types/battery.ts` (nuevo) | Caso base reporta: 983.040 celdas, 64 celdas/módulo, 6 módulos/rack, 8 racks/container |
| GAP-019 | Mínimo técnico y rampas | Modelos para reportar mín. técnico carga/descarga, rampas planta/inversor | No existe | Ausente | Parámetros operacionales no reportados | B — solo para reporte | Media | B | `src/types/electrical.ts`, `src/lib/electrical/operationalLimits.ts` (nuevo) | Caso base reporta mín. técnico descarga +1,2677 MW, carga −3,8421 MW, rampas 38–40 MW/min |
| GAP-020 | Importador CAD (DWG/DXF) | Lectura de capas, bloques, distancias | No existe | Ausente | Layouts reales no se importan | B — diferido para fase futura | Baja | A | `src/lib/cad-import/` (futuro) | No bloqueante para v1; documentar como backlog |
| GAP-021 | Detector de polígono / topografía | Lectura de topografía o KMZ/GeoJSON externo | Solo dibujo manual | Insuficiente | Imposible cargar terreno real con curvas | B | Media | M | `src/lib/terrain/` (extender) | Aceptar GeoJSON polígono importado |
| GAP-022 | Resolución de inconsistencias documentales | Modelo `DocumentInconsistency` con tipo, fuente, valores en conflicto | No existe | Ausente | Usuario no ve conflictos del propio caso | M | Media | B | `src/rules/inconsistencyDetector.ts` (nuevo) | Lista al menos: ST2752UX vs ST2725UX, 0,9 vs 0,69 kV, 220 vs 230 kV |
| GAP-023 | i18n para reglas y reporte | Strings de reglas y reporte en `en` / `es` | i18n existe pero reglas/reporte hardcoded | Parcial | Reporte solo en un idioma | B | Baja | M | `src/lib/i18n.ts` | Reporte se exporta en idioma seleccionado |
| GAP-024 | Versionado de evidencia | Cuando una norma cambia (REX/REX modifica), trazar versión vigente | No existe | Ausente | Reglas se vuelven obsoletas sin aviso | M | Media | M | `src/data/documentRegistry.ts` (nuevo) | Cada documento tiene `version` + `validFrom` + `replacedBy` |

---

## Brechas por capa

### Capa 1 — Layout físico
- GAP-007 (cable corridors), GAP-008 (caminos/accesos), GAP-009 (zonas incendio), GAP-021 (topografía externa).

### Capa 2 — Arquitectura eléctrica
- GAP-002 (jerarquía completa), GAP-004 (SSAA), GAP-005 (PPC), GAP-006 (pérdidas), GAP-012 (sizing engine), GAP-013 (unifilar), GAP-016 (catálogo MT extendido), GAP-018 (niveles batería), GAP-019 (mín. técnico / rampas).

### Capa 3 — Validación / normativa / reporte
- GAP-010 (reglas con citas), GAP-014 (reporte profesional), GAP-015 (checklist ingeniería), GAP-017 (preset formal), GAP-022 (resolución inconsistencias).

### Sistema transversal
- GAP-001 (EvidenceRef), GAP-003 (bruto/usable/nominal), GAP-011 (detector inconsistencias), GAP-023 (i18n reglas), GAP-024 (versionado evidencia).

---

## Brechas críticas (top 5)

| ID | Razón |
|---|---|
| **GAP-001** | Trazabilidad documental bloquea toda la lógica normativa: sin esto, toda regla nace inválida |
| **GAP-002** | Sin modelo eléctrico completo, la app sigue siendo "layout sobre mapa", no predimensionador |
| **GAP-003** | Sin distinguir bruto/usable/nominal, los KPIs principales son ambiguos |
| **GAP-014** | Sin reporte profesional, no hay producto entregable a EPC / cliente |
| **GAP-015** | Sin checklist de ingeniería detalle, riesgo de uso indebido como herramienta de IFC |

---

## Brechas que pueden esperar

| ID | Por qué |
|---|---|
| GAP-018 | Niveles internos de batería son trazabilidad, no afectan layout |
| GAP-019 | Mín. técnico y rampas son metadatos de reporte |
| GAP-020 | Importador CAD requiere librerías externas grandes; diferir |
| GAP-021 | Topografía externa requiere parser GeoJSON + altimetría |
| GAP-023 | i18n del reporte se hace al final |

---

## Próximo paso

`05_ARQUITECTURA_IMPLEMENTACION.md` ordena estas 24 brechas en fases ejecutables.
