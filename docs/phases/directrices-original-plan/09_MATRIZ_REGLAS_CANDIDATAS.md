# 09 — Matriz de reglas candidatas

Cada regla es **candidata**. Para promoverla a regla implementada en el motor, requiere lectura humana del PDF primario + cita formal (página + numeral) + clasificación de severidad.

**Convención**:
- **ID**: `RULE-{CAT}-{NNN}` (CAT = `PHYS` físico, `ELEC` eléctrico, `SEC` SEC, `CNE` CNE, `CEN` CEN, `SEA` SEA, `MINVU` territorial, `MMA` ambiental, `FIRE` incendio internacional).
- **Severidad**: `blocking` impide aceptar layout · `warning` permite avanzar · `info` solo informativo · `checklist` requiere revisión humana · `out_of_scope` no se valida en app.
- **Confianza**: nivel del `EvidenceRef` que respalda.
- **Estado**: pending (toda regla nace pending hasta que se lee el PDF primario).

---

## A. Reglas físicas (layout)

| ID | Severidad | Título | Descripción | Fuente | Parámetro app | Confianza | Estado | Obs |
|---|---|---|---|---|---|---|---|---|
| RULE-PHYS-001 | blocking | Equipo dentro del polígono | Todo `PlacedEquipment` debe quedar dentro del polígono del sitio | Sentido común + buena práctica | `validation.containmentCheck` | derived | pending | Implementable directo |
| RULE-PHYS-002 | blocking | Sin colisiones entre equipos | Footprints rotados no deben solapar | Sentido común | `collision.detect()` | derived | pending | Ya parcialmente implementado |
| RULE-PHYS-003 | warning | Separación container-container ≥ datasheet | Distancia mínima por datasheet/manual fabricante | Sungrow ST2752UX System Manual (DOC-0040) — **pendiente** | `EquipmentSpec.clearances.sameType_m` | missing | pending | Datasheet pendiente |
| RULE-PHYS-004 | warning | Separación container-PCS station | Distancia datasheet o asunción preliminar | Sungrow manual SC5000UD-MV — **pendiente** | `EquipmentSpec.clearances.otherType_m` | missing | pending | Idem |
| RULE-PHYS-005 | warning | Fire setback al perímetro | Separación mínima al perímetro por incendio | NFPA 855 §4.x — **lectura humana** | `FireSafetyZone.boundary_setback_m` | inferred | pending | NFPA es referencia, no ley chilena |
| RULE-PHYS-006 | warning | Camino vehicular accesible | Cada container/station debe tener camino vehicular a ≤ N m | Buena práctica O&M | `AccessRoad.maxDistanceToEquipment_m` | inferred | pending | Default N = 30 m editable |
| RULE-PHYS-007 | warning | Ancho mínimo de camino | Camino interno ≥ ancho operacional (default 6 m) | Buena práctica | `AccessRoad.minWidth_m` | inferred | pending | Default 6 m, editable |
| RULE-PHYS-008 | warning | Radio de giro mínimo | Radio para acceso de camión / grúa | Buena práctica | `AccessRoad.minTurningRadius_m` | inferred | pending | Default 10 m |
| RULE-PHYS-009 | warning | Corredor de cable sin solape | `CableRoute` no solapa con `AccessRoad` ni equipos | Sentido común | `cableRoutes.noOverlap` | derived | pending | |
| RULE-PHYS-010 | warning | Zona de izaje libre | Reserva espacial para grúa al instalar/mantener | Buena práctica O&M | `LayoutZone(maintenance)` | inferred | pending | Opcional v1 |
| RULE-PHYS-011 | blocking | Sin invadir zonas exclusión | Equipos no en `LayoutZone(exclusion)` | Input usuario | `validation.exclusionZones` | derived | pending | |
| RULE-PHYS-012 | warning | Orientación uniforme por bloque | Mismo `rotation_deg` por `BESSBlock` (mejora rutas MT) | Buena práctica | `BESSBlock.uniformOrientation` | inferred | pending | Opcional |

---

## B. Reglas eléctricas

| ID | Severidad | Título | Descripción | Fuente | Parámetro app | Confianza | Estado | Obs |
|---|---|---|---|---|---|---|---|---|
| RULE-ELEC-001 | warning | Containers por estación ≤ 8 (default) | Default editable | DOC-1129 — caso base | `ConversionStation.maxContainers` | documented | pending | Editable |
| RULE-ELEC-002 | warning | Estaciones por feeder ≤ 4 (default) | Default editable | Unifilar DOC-1129 p.13 — patrón inferido | `MVFeeder.maxStations` | inferred | pending | Editable |
| RULE-ELEC-003 | blocking | DC PCS dentro del rango container | Tensión DC del PCS compatible con rango DC del container | Datasheet SUNGROW SC5000UD-MV (DOC-0013): 1300–1500 V | `electrical.compatibility.dcRange` | documented | pending | Ya parcial existente |
| RULE-ELEC-004 | blocking | LV PCS = LV transformador | Tensión BT PCS coincide con LV del transformador bloque | Datasheets | `electrical.compatibility.lvMatch` | documented | pending | Ya parcial existente |
| RULE-ELEC-005 | warning | MV consistente | Tensión MT homogénea en todos los feeders | Buena práctica | `mvFeeders.uniformVoltage` | derived | pending | |
| RULE-ELEC-006 | warning | Feeder rating no excedido | Suma de potencias stations ≤ rating feeder | Buena práctica | `mvFeeders.ratingCheck` | derived | pending | |
| RULE-ELEC-007 | warning | Capacidad bus | Suma de feeders ≤ capacidad de barra | Buena práctica | `mvBuses.capacityCheck` | derived | pending | |
| RULE-ELEC-008 | info | Cable ampacidad estimada | Verificar sección vs corriente estimada (no IFC) | Datasheets cables (DOC-0024..27) | `cableRoutes.ampacityEstimate` | derived | pending | Solo preliminar |
| RULE-ELEC-009 | warning | Pérdidas razonables | Pérdidas MT < 5% de la potencia nominal | Buena práctica | `losses.budget` | inferred | pending | Default 5% editable |
| RULE-ELEC-010 | checklist | Coordinación de protecciones | Pendiente ingeniería detalle | — | — | — | out_of_scope | No validable en v1 |
| RULE-ELEC-011 | checklist | Estudio de cortocircuito | Pendiente ingeniería detalle | — | — | — | out_of_scope | No validable en v1 |
| RULE-ELEC-012 | checklist | Flujo de carga | Pendiente ingeniería detalle | — | — | — | out_of_scope | No validable en v1 |

---

## C. Reglas SEC (Chile)

| ID | Severidad candidata | Título | Descripción | Fuente | Parámetro app | Confianza | Estado | Obs |
|---|---|---|---|---|---|---|---|---|
| RULE-SEC-001 | warning | Cumplimiento marco BESS | Aplicación SEC RGR 06/2024 BESS | SEC_RGR_06_2024_BESS.pdf — **lectura humana** | `compliance.secRgr` | missing | pending | Crítico extraer reglas |
| RULE-SEC-002 | warning | Puesta a tierra | Requisitos de tierra | SEC_RIC_06_Puesta_Tierra.pdf — **lectura humana** | `compliance.grounding` | missing | pending | Checklist + parámetros |
| RULE-SEC-003 | checklist | Presentación de proyecto | Documentos SEC requeridos | SEC_RIC_18 — **lectura humana** | `compliance.secSubmission` | missing | pending | Solo checklist |
| RULE-SEC-004 | checklist | Puesta en servicio | Procedimiento PSS | SEC_RIC_19 — **lectura humana** | `compliance.commissioning` | missing | pending | Solo checklist |
| RULE-SEC-005 | warning | Protección incendio | Sistema requerido | SEC_RPTD_08_Proteccion_Incendios_2020.pdf — **lectura humana** | `fireSafety.systemType` | missing | pending | Aporta a FireSafetyZone |
| RULE-SEC-006 | warning | Franja de seguridad | Distancias eléctricas perimetrales | SEC_RPTD_07_Franja_Distancias_Seguridad_2022.pdf — **lectura humana** | `LayoutZone(fire_setback).distance_m` | missing | pending | |
| RULE-SEC-007 | checklist | Señalización seguridad | Señalética obligatoria | SEC_RPTD_09 — **lectura humana** | `compliance.signage` | missing | pending | |
| RULE-SEC-008 | warning | Subestaciones / salas eléctricas | Distancias accesos | SEC_RIC_13_Subestaciones_Salas_Electricas.pdf — **lectura humana** | `mvBus.layoutRequirements` | missing | pending | Para `mv_yard` |
| RULE-SEC-009 | warning | Canalizaciones | Reglas conductores/canalizaciones | SEC_RIC_04_Conductores_Canalizaciones.pdf — **lectura humana** | `cableRoutes.installMethod` | missing | pending | |
| RULE-SEC-010 | warning | Líneas MT/BT | Reglas para colector MT | SEC_RPTD_13_Lineas_Media_Baja_Tension_2020.pdf — **lectura humana** | `cableRoutes.MTrules` | missing | pending | |

---

## D. Reglas CNE / CEN

| ID | Severidad candidata | Título | Descripción | Fuente | Parámetro app | Confianza | Estado | Obs |
|---|---|---|---|---|---|---|---|---|
| RULE-CNE-001 | warning | NTSyCS aplicable | Calidad y seguridad servicio SEN | CNE_NTSyCS_RES45_2026.pdf — **lectura humana** | `compliance.ntsycs` | missing | pending | |
| RULE-CNE-002 | warning | NTSSCC servicios complementarios | BESS provee SSCC | CNE_NTSSCC_RES45_2026.pdf — **lectura humana** | `ppc.sscc` | missing | pending | |
| RULE-CNE-003 | warning | Requisitos IBR | Inversores requieren conformidad IBR | CNE_AT_IBR_RES45_2026.pdf — **lectura humana** | `ppc.ibr` | missing | pending | |
| RULE-CNE-004 | checklist | Requisitos sísmicos | Equipamiento sísmico | CNE_AT_Requisitos_Sismicos_2025.pdf — **lectura humana** | `compliance.seismic` | missing | pending | Fundaciones fuera v1 |
| RULE-CEN-001 | checklist | Clasificación proyecto | Procedimiento clasificación CEN | CEN_Guia_Tecnica_Criterios_Clasificacion.pdf — **lectura humana** | `compliance.cenClassification` | missing | pending | |
| RULE-CEN-002 | checklist | Procedimiento interconexión NI/MR | Para utility | CEN_Anexo_2.pdf — **lectura humana** | `compliance.cenInterconnection` | missing | pending | |
| RULE-CEN-003 | checklist | PMGD interconexión | Solo si proyecto ≤ 9 MW | CEN_Anexo_1_PMGD.pdf — **lectura humana** | `compliance.pmgdRules` | missing | pending | Perfil aparte |

---

## E. Reglas SEA / MMA / MINSAL

| ID | Severidad candidata | Título | Descripción | Fuente | Parámetro app | Confianza | Estado | Obs |
|---|---|---|---|---|---|---|---|---|
| RULE-SEA-001 | warning | Sometimiento al SEIA | Tipología BESS según DS 40 | DS_40_2012_Reglamento_SEIA.pdf — **lectura humana** | `compliance.seiaTrigger` | missing | pending | |
| RULE-SEA-002 | warning | Criterio almacenamiento DS17/2026 | Criterio SEA específico BESS | SEA_Criterio_Almacenamiento_Energia_DS17_2026.pdf — **lectura humana** | `compliance.seaCriterion` | missing | pending | **Prioritario** |
| RULE-MMA-001 | warning | Ruido perimetral | Niveles dB según zona | DS_38_2011_MMA_Ruido.pdf — **lectura humana** | `compliance.noiseLimit_db` | missing | pending | HVAC genera ruido |
| RULE-MIN-001 | checklist | Residuos peligrosos | Almacenamiento DS 148 | DS_148_2003_MINSAL.pdf — **lectura humana** | `compliance.hazardousWaste` | missing | pending | EOL baterías |
| RULE-MIN-002 | checklist | Sustancias peligrosas | DS 43 — almacenamiento | DS_43_2015_MINSAL.pdf — **lectura humana** | `compliance.hazardousStorage` | missing | pending | |
| RULE-MMA-002 | checklist | Responsabilidad Extendida REP | Ley 20.920 | Ley_20920_REP.pdf — **lectura humana** | `compliance.rep` | missing | pending | EOL baterías |

---

## F. Reglas MINVU / territorial

| ID | Severidad candidata | Título | Descripción | Fuente | Parámetro app | Confianza | Estado | Obs |
|---|---|---|---|---|---|---|---|---|
| RULE-MINVU-001 | warning | Pronunciamiento MINVU DDU 522 BESS | Reglas territoriales BESS Chile | MINVU_DDU_522_BESS.pdf — **lectura humana** | `compliance.minvuDdu522` | missing | pending | **Prioritario** |
| RULE-MINVU-002 | checklist | Permiso DOM | Permiso municipal | DS_47_OGUC.pdf — **lectura humana** | `compliance.domPermit` | missing | pending | |

---

## G. Reglas internacionales (referenciales)

| ID | Severidad candidata | Título | Descripción | Fuente | Parámetro app | Confianza | Estado | Obs |
|---|---|---|---|---|---|---|---|---|
| RULE-FIRE-001 | warning | Separaciones NFPA 855 | Distancias entre ESS y perímetro | NFPA 855 — referencia internacional | `FireSafetyZone.nfpa855` | inferred | pending | No es ley chilena, citar |
| RULE-FIRE-002 | checklist | Certificación UL 9540 | Equipo certificado | UL 9540 reference | `compliance.ul9540` | documented (en datasheet Sungrow) | pending | Sungrow declara conformidad |
| RULE-FIRE-003 | checklist | Test UL 9540A | Propagación térmica | UL 9540A reference | `compliance.ul9540a` | documented (Sungrow tested SwRI) | pending | |

---

## Resumen de severidades

| Severidad | Cantidad de reglas | Comentario |
|---|---|---|
| **blocking** | 4 | Impiden export válido (PHYS-001, PHYS-002, PHYS-011, ELEC-003, ELEC-004) |
| **warning** | 25 | Permiten avanzar pero quedan en reporte |
| **info** | 1 | Solo informativo |
| **checklist** | 22+ | Requieren ingeniería de detalle |
| **out_of_scope** | 3 | No validables en v1 |
| **Total candidatas** | **~55** | |

---

## Política de promoción

Una regla pasa de **candidata** (estado `pending`) a **implementada** cuando:

1. Se lee el PDF primario de la fuente.
2. Se cita página + numeral en `EvidenceRef`.
3. Se decide severidad final con base en lectura.
4. Se implementa función evaluadora.
5. Se añade test que reproduzca un caso positivo y uno negativo.
6. Se incluye en al menos un perfil regulatorio.

Mientras la regla esté pending:
- **No** aparece en el motor de validación.
- **Sí** puede aparecer en checklist informativo si su severidad candidata es `checklist`.
- Su entrada vive en este archivo, no en código.

---

## Política de versionado normativo

Cuando una norma se modifica (REX modificatorio):
- Se actualiza `DocumentRegistry` con nueva entrada + `replacedBy` en la vieja.
- Reglas asociadas a la norma anterior reciben badge "norma reemplazada — revisar".
- Sin revisión humana, las reglas no se borran (auditoría) ni se reemplazan automáticamente.
