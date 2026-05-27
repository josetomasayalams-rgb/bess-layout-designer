# 08 — Matriz directrices → funcionalidades

Conecta cada bloque documental de `DIRECTRICES_APP_BESS/` con funcionalidades concretas de la app. Sirve como tabla de origen para `09_MATRIZ_REGLAS_CANDIDATAS.md` y para `06_BACKLOG_PRIORIZADO.md`.

**Columnas**:
- **ID**: identificador de la directriz extraída.
- **Fuente**: nombre del documento (con ID del DocumentRegistry cuando aplique).
- **Carpeta**: ruta relativa dentro de `DIRECTRICES_APP_BESS/`.
- **Tema**: área temática.
- **Dato/directriz**: descripción concreta de lo extraído.
- **Tipo**: 🟢 DATO · 🟡 REGLA · 🔵 CHECK · ⚪ REF · 🟠 SUP · 🟣 PEND · 🚫 OUT.
- **Funcionalidad app**: a qué módulo / pantalla se conecta.
- **Módulo afectado**: archivo(s) probables.
- **Automatizable**: sí / no / parcial.
- **Severidad**: blocking · warning · info · checklist · out_of_scope.
- **Prioridad**: P1..P3.
- **Estado**: pending.
- **Observaciones**.

---

## A. Datasheets oficiales de equipos

| ID | Fuente | Carpeta | Tema | Dato/directriz | Tipo | Funcionalidad app | Módulo afectado | Auto | Severidad | Prio | Obs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D-A001 | SUNGROW ST2752UX-US V15 (DOC-0009) | 05/01_CONTENEDORES_BATERIAS | Container BESS | Modelo, energía DC BOL, tensiones DC, dimensiones, peso, certificaciones UL 9540 / 9540A / NFPA 855 | 🟢 DATO | Catálogo containers | `bessContainerCatalog.ts` | sí | info | P1 | Lectura humana del PDF |
| D-A002 | SUNGROW SC5000UD-MV-US (DOC-0013) | 05/02_PCS_INVERSORES | PCS / MV skid | Modelo, MVA, tensiones AC/DC, eficiencia, dimensiones, peso | 🟢 DATO | Catálogo MV skids | `mvSkidCatalog.ts`, `pcsCatalog.ts` | sí | info | P1 | Idem |
| D-A003 | SUNGROW PowerTitan2 Whitepaper 2024 (DOC-0032) | 05/08_INCENDIO_SEGURIDAD_BESS | Incendio / seguridad | Sistema de extinción interno container, propagación térmica testada (UL 9540A) | 🟢 DATO + 🔵 CHECK | Compliance / Reporte | `safety.ts`, reporte | parcial | checklist | P2 | Aporta a `compliance.standards` |
| D-A004 | SUNGROW ST2752UX System Manual Ver12 (DOC-0040) | 05/11_DOCUMENTOS_FABRICANTE_MANUALES | Container BESS | Procedimientos LOTO, mantenimiento, accesos | 🟢 DATO + 🔵 CHECK | Checklist O&M, AccessRoad | `engineeringChecklist.ts`, `accessRoads.ts` | parcial | checklist | P2 | Fuente para clearances de mantenimiento |
| D-A005 | SUNGROW Liquid Cooling LOTO (DOC-0039) | 05/11_DOCUMENTOS_FABRICANTE_MANUALES | HVAC / O&M | Procedimientos lock-out tag-out HVAC | 🔵 CHECK | Reporte | reporte | parcial | checklist | P3 | |
| D-A006 | Siemens 8DA/8DB 40,5 kV GIS (DOC-0023) | 05/05_SWITCHGEAR_CELDAS_MT | Switchgear MT | Dimensiones celdas, ratings, configuraciones | 🟢 DATO | Catálogo switchgear | `switchgear.ts` (nuevo) | sí | info | P3 | Referencia, no oficial del caso |
| D-A007 | Cables HES AL/XLPE/CWS 18/30 kV (DOC-0024) | 05/06_CABLES_MT_BT_DC_CANALIZACIONES | Cables MT | Ampacidades, secciones, características | 🟢 DATO | Catálogo cables | `cables.ts` (nuevo) | sí | info | P2 | |
| D-A008 | Cables Nexans AL/XLPE 18/30 kV 630 mm² (DOC-0025) | 05/06_CABLES_MT_BT_DC_CANALIZACIONES | Cables MT | Idem | 🟢 DATO | Catálogo cables | `cables.ts` | sí | info | P2 | |
| D-A009 | Cables Nexans NA2XS2Y 19/33 kV 630 mm² HDPE (DOC-0026) | 05/06_CABLES_MT_BT_DC_CANALIZACIONES | Cables MT | Idem | 🟢 DATO | Catálogo cables | `cables.ts` | sí | info | P2 | |
| D-A010 | Cables Prysmian NA2XS(FL)2Y 19/33 kV (DOC-0027) | 05/06_CABLES_MT_BT_DC_CANALIZACIONES | Cables MT | Idem | 🟢 DATO | Catálogo cables | `cables.ts` | sí | info | P2 | |
| D-A011 | Horizon Power Substation Transformer Spec (DOC-0036) | 05/10_TRANSFORMADOR_PRINCIPAL_POI_REFERENCIAL | Transformador principal | Especificación referencial transformador AT | 🟢 DATO + ⚪ REF | Catálogo MainTransformer | `mainTransformer.ts` (nuevo) | sí | info | P3 | Referencia |
| D-A012 | Tesla Megapack reference (DOC-REF) | 05/REFERENCIAS_FABRICANTES_GENERALES | Container alternativo | Modelo competencia para catálogo extensible | ⚪ REF | Catálogo containers | `bessContainerCatalog.ts` | sí | info | P4 | v2+ |
| D-A013 | Fluence Gridstack Pro reference | 05/REFERENCIAS_FABRICANTES_GENERALES | Container alternativo | Idem | ⚪ REF | Catálogo containers | `bessContainerCatalog.ts` | sí | info | P4 | v2+ |
| D-A014 | Huawei Smart PV ESS Solution Brochure | 05/REFERENCIAS_FABRICANTES_GENERALES | Container alternativo | Idem | ⚪ REF | Catálogo containers | `bessContainerCatalog.ts` | sí | info | P4 | v2+ |
| D-A015 | Sungrow PowerTitan 2.0 Whitepaper (DOC-REF) | 05/REFERENCIAS_FABRICANTES_GENERALES | Container next-gen | Referencia evolución | ⚪ REF | Catálogo containers | `bessContainerCatalog.ts` | sí | info | P3 | |

---

## B. Caso BESS del Desierto

| ID | Fuente | Carpeta | Tema | Dato/directriz | Tipo | Funcionalidad app | Módulo afectado | Auto | Sev | Prio | Obs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D-B001 | DOC-1129 Mínimo Técnico | 06/INFORMES_TECNICOS_CASO | Arquitectura | 200 MW, 800 MWh, 320 containers, 40 stations, 80 inversores, 33 kV | 🟢 DATO | Preset | `bessDelDesierto.ts` | sí | info | P1 | Ancla del caso |
| D-B002 | DOC-1129 + DOC-2611 | 06/INFORMES_TECNICOS_CASO | Container | 2,752512 MWh bruto, 8 racks × 6 mod × 64 celdas | 🟢 DATO | Catálogo + Preset | `bessContainerCatalog.ts`, preset | sí | info | P1 | |
| D-B003 | DOC-1129 p.14 | 06/INFORMES_TECNICOS_CASO | PCS | 80 × 2,5 MVA = 200 MVA, 2 inversores por estación | 🟢 DATO | Arquitectura eléctrica | preset, sizing | sí | info | P1 | |
| D-B004 | DOC-1129 p.16 | 06/INFORMES_TECNICOS_CASO | Transformador bloque | 5 MVA, 0,9/33 kV, Dy11, X=7,95%, R=0,91%, 45 kW carga | 🟢 DATO | Catálogo + Preset | `mvSkidCatalog.ts`, preset | sí | info | P1 | |
| D-B005 | DOC-1129 p.13 | 06/INFORMES_TECNICOS_CASO | Red colectora | 10 feeders × 20 MVA, 4 stations por feeder | 🟢 DATO + 🟠 SUP (patrón inferido) | Generador colector | `architectureSizing.ts`, preset | sí | info | P1 | Patrón visual, parametrizar |
| D-B006 | DOC-1129 p.13/p.47 | 06/INFORMES_TECNICOS_CASO | POI | BP5/BP6 33 kV con acoplador | 🟢 DATO | POI entity | preset, modelo | sí | info | P1 | |
| D-B007 | DOC-1129 p.17 | 06/INFORMES_TECNICOS_CASO | Main TR | 250/125/125 MVA, 220/33/33 con inconsistencia | 🟢 DATO + INC | MainTransformer | preset, inconsistencies | sí | warning | P2 | INC-004 |
| D-B008 | DOC-2611 p.27-30 | 06/INFORMES_TECNICOS_CASO | Pérdidas MT | 3,7772 MW descarga, 3,6813 MW carga (caso PMAX) | 🟢 DATO + 🟠 SUP | Pérdidas | `losses.ts`, preset | sí | info | P2 | No extrapolable |
| D-B009 | DOC-2611 p.18-31 | 06/INFORMES_TECNICOS_CASO | SSAA | 1,563 MW descarga, 1,3493 MW carga | 🟢 DATO | AuxiliaryServices | preset | sí | info | P2 | |
| D-B010 | DOC-1129 p.6 | 06/INFORMES_TECNICOS_CASO | PPC | Bluence / Isotrol, modos P/Q/PF/V/freq/ramp | 🟢 DATO | PPC entity | preset | sí | info | P2 | |
| D-B011 | DOC-1129 p.25-34 | 06/INFORMES_TECNICOS_CASO | Mínimo técnico | +1,2677 MW descarga, −3,8421 MW carga | 🟢 DATO | OperationalLimits | reporte, preset | sí | info | P3 | |
| D-B012 | DOC-1092 p.25-48 | 06/INFORMES_TECNICOS_CASO | Rampas | Planta 38,6-40,2 MW/min; inversor 5 MW/s | 🟢 DATO | OperationalLimits | reporte, preset | sí | info | P3 | |
| D-B013 | Análisis técnico ancla | 06 | Inconsistencies | ST2752/ST2725, 0,9/0,69 kV, 220/230 kV | 🟢 DATO | InconsistencyDetector | `inconsistencyDetector.ts` (nuevo) | sí | warning | P1 | Casos confirmados |
| D-B014 | DOC-1129 p.15/p.55 | 06/INFORMES_TECNICOS_CASO | Bateria | LFP CATL 280 Ah, 3,2 V, 896 Wh, 6500 ciclos, eficiencia 92,5% | 🟢 DATO | BatteryHierarchy | preset | sí | info | P3 | Niveles internos |
| D-B015 | Análisis técnico ancla §11 | 06 | Pendientes | 7+ datasheets faltantes (manual ST2752, switchgear, etc.) | 🟣 PEND | PendingDataItem[] | preset | sí | warning | P1 | |

---

## C. Normativa SEC (RGR, RIC, RPTD)

| ID | Fuente | Carpeta | Tema | Dato/directriz | Tipo | Funcionalidad app | Módulo afectado | Auto | Sev | Prio | Obs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D-C001 | SEC RGR 06/2024 BESS | 01/SEC_RGR_BESS | Reglamento específico BESS | Reglas específicas para sistemas BESS Chile | 🟡 REGLA | RegulatoryRules | `regulatoryRulesCatalog.ts` | parcial | varía | P1 | **Lectura humana obligatoria** |
| D-C002 | SEC RIC 06 (Puesta tierra) | 01/SEC_RIC_PLIEGOS | Tierra | Requisitos puesta tierra | 🟡 REGLA + 🔵 CHECK | Reglas + checklist | reglas, checklist | parcial | checklist | P2 | Para fundación / civil |
| D-C003 | SEC RIC 11 (Especiales) | 01/SEC_RIC_PLIEGOS | Inst. especiales | BESS puede entrar aquí | 🟡 REGLA | Reglas | reglas | parcial | varía | P2 | |
| D-C004 | SEC RIC 13 (Subestaciones) | 01/SEC_RIC_PLIEGOS | Subestaciones / salas eléctricas | Distancias, accesos, ventilación | 🟡 REGLA | Reglas físicas | reglas | parcial | blocking/warning | P2 | Para `mv_yard`, `poi_yard` |
| D-C005 | SEC RIC 17 (O&M) | 01/SEC_RIC_PLIEGOS | O&M | Operación y mantenimiento | 🔵 CHECK | Reporte | reporte | parcial | checklist | P3 | |
| D-C006 | SEC RIC 18 (Presentación proyectos) | 01/SEC_RIC_PLIEGOS | Trámite | Documentación requerida | 🔵 CHECK | Reporte / checklist | reporte | parcial | checklist | P3 | |
| D-C007 | SEC RIC 19 (Puesta en servicio) | 01/SEC_RIC_PLIEGOS | Puesta servicio | Procedimiento PSS | 🔵 CHECK | Checklist | checklist | no | checklist | P3 | |
| D-C008 | SEC RPTD 06 (Tierra) 2021 | 01/SEC_RPTD_* | Tierra | Idem RIC 06 pero para producción/transmisión | 🟡 REGLA + 🔵 CHECK | Checklist | checklist | no | checklist | P2 | Fuera de v1 |
| D-C009 | SEC RPTD 07 (Franja seguridad) 2022 | 01/SEC_RPTD_* | Distancias | Distancias mínimas líneas, equipos | 🟡 REGLA | Reglas físicas | reglas | sí | blocking | P2 | Para perímetro |
| D-C010 | SEC RPTD 08 (Incendio) 2020 | 01/SEC_RPTD_* | Incendio | Protección contra incendios | 🟡 REGLA + 🔵 CHECK | FireSafetyZone | `safety.ts`, reglas | parcial | varía | P1 | **Prioridad alta** |
| D-C011 | SEC RPTD 09 (Señalización) 2020 | 01/SEC_RPTD_* | Señalización | Señalética seguridad | 🔵 CHECK | Checklist | checklist | no | checklist | P3 | |
| D-C012 | SEC RPTD 10 (Centrales/SE) 2020 | 01/SEC_RPTD_* | Subestaciones | Idem RIC 13 | 🟡 REGLA | Reglas | reglas | parcial | varía | P2 | |
| D-C013 | SEC RPTD 11 (Líneas AT) 2022 | 01/SEC_RPTD_* | Líneas AT | Líneas > 23 kV | ⚪ REF + 🔵 CHECK | Checklist | checklist | no | checklist | P3 | Fuera de BESS v1 (es para AT) |
| D-C014 | SEC RPTD 13 (Líneas MT/BT) 2020 | 01/SEC_RPTD_* | Líneas MT/BT | Canalizaciones, ampacidad | 🟡 REGLA | CableRoute | `cableRoutes.ts`, reglas | parcial | varía | P2 | |
| D-C015 | Ley 21.505 Almacenamiento | 01/MARCO_GENERAL_ELECTRICO | Marco legal | Reconocimiento legal BESS en SEN | ⚪ REF | Reporte | reporte | no | info | P2 | Citar en disclaimer |
| D-C016 | DFL 4 LGSE | 01/MARCO_GENERAL_ELECTRICO | Marco legal | Ley general servicios eléctricos | ⚪ REF | Reporte | reporte | no | info | P3 | |
| D-C017 | DS 125/2017 Coord. Op. SEN | 01/MARCO_GENERAL_ELECTRICO | Coordinación | Reglamento coordinación operación | 🟡 REGLA + 🔵 CHECK | Checklist | checklist | no | checklist | P3 | |
| D-C018 | DS 109 Reglamento Seguridad | 01/MARCO_GENERAL_ELECTRICO | Seguridad | Distancias, puesta en servicio | 🟡 REGLA + 🔵 CHECK | Checklist | checklist | parcial | varía | P2 | |
| D-C019 | DS 88/2019 PMGD | 01/MARCO_GENERAL_ELECTRICO | PMGD | Aplica si proyecto es PMGD (≤ 9 MW) | 🟡 REGLA | Perfil regulatorio "PMGD" | `profiles/chilePmgd.ts` (nuevo) | sí | varía | P3 | Solo para proyectos pequeños |

---

## D. Normativa CNE / CEN / SEN

| ID | Fuente | Carpeta | Tema | Dato/directriz | Tipo | Funcionalidad app | Módulo afectado | Auto | Sev | Prio | Obs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D-D001 | CNE NTSyCS RES 45/2026 | 02/CNE_NORMAS_TECNICAS_SEN | Seguridad/calidad | Norma técnica de Seguridad y Calidad de Servicio | 🟡 REGLA | RegulatoryRules | reglas | parcial | varía | P1 | **Lectura humana obligatoria** |
| D-D002 | CNE NTSSCC RES 45/2026 | 02/CNE_NORMAS_TECNICAS_SEN | Servicios complementarios | Norma técnica SSCC | 🟡 REGLA | OperationalLimits / Reporte | reporte | parcial | info | P2 | Para BESS este es relevante |
| D-D003 | CNE REX 45/2026 IBR | 02/CNE_NORMAS_TECNICAS_SEN | Inverter-based resources | Requisitos para IBR | 🟡 REGLA | PPC requirements | PPC, reporte | parcial | varía | P2 | |
| D-D004 | CNE REX 41/2025 Sísmico | 02/CNE_NORMAS_TECNICAS_SEN | Requisitos sísmicos | Aplicables a equipamiento | 🟡 REGLA + 🔵 CHECK | Checklist | checklist | no | checklist | P2 | Fundaciones fuera de v1 |
| D-D005 | CNE NT Indisponibilidad | 02/CNE_NORMAS_TECNICAS_SEN | Indisponibilidad | Compensaciones | ⚪ REF | Reporte | reporte | no | info | P4 | |
| D-D006 | CNE AT SITR / EMDIT / Estudios | 02/CNE_NORMAS_TECNICAS_SEN | Estudios | Información técnica SEN | ⚪ REF | — | — | no | out_of_scope | P4 | Fuera de alcance v1 |
| D-D007 | CEN Anexo 1 PMGD 2024 | 02/CEN_CONEXION_OPERACION | Interconexión PMGD | Requisitos interconexión PMGD | 🟡 REGLA + 🔵 CHECK | Checklist + perfil PMGD | checklist, profiles | parcial | varía | P3 | |
| D-D008 | CEN Anexo 2 NI/MR/MNR 2024 | 02/CEN_CONEXION_OPERACION | Interconexión NI | Nueva instalación / modificación relevante | 🟡 REGLA + 🔵 CHECK | Checklist | checklist | parcial | varía | P2 | Aplica a BESS utility |
| D-D009 | CEN Anexo 3 Desconexión | 02/CEN_CONEXION_OPERACION | Cese operaciones | Retiro/desconexión | ⚪ REF | — | — | no | info | P4 | |
| D-D010 | CEN Guía clasificación proyectos 2024 | 02/CEN_CONEXION_OPERACION | Clasificación | Procedimiento | 🔵 CHECK | Checklist | checklist | parcial | checklist | P2 | |
| D-D011 | CEN Material PMGD / MNR / MR | 02/CEN_CONEXION_OPERACION | Procedimientos | Pasos para interconexión | 🔵 CHECK | Checklist | checklist | no | checklist | P3 | |

---

## E. Normativa territorial / ambiental / permisos

| ID | Fuente | Carpeta | Tema | Dato/directriz | Tipo | Funcionalidad app | Módulo afectado | Auto | Sev | Prio | Obs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D-E001 | SEA Criterio Almacenamiento DS17/2026 | 03/AMBIENTAL_SEA_RUIDO_RESIDUOS | SEIA / BESS | Criterio actualizado SEA para BESS | 🟡 REGLA + 🔵 CHECK | Checklist + reglas | checklist, reglas | parcial | varía | P1 | **Lectura humana obligatoria** |
| D-E002 | SEA Criterio Almacenamiento 2023 No Vigente | 03/AMBIENTAL_SEA_RUIDO_RESIDUOS | SEIA histórico | Reemplazado por DS17/2026 | ⚫ DUP | — | — | no | — | — | Solo referencia |
| D-E003 | Ley 19.300 Bases generales MA | 03/AMBIENTAL_SEA_RUIDO_RESIDUOS | Marco ambiental | Marco general | ⚪ REF | Reporte | reporte | no | info | P3 | |
| D-E004 | DS 40/2012 Reglamento SEIA | 03/AMBIENTAL_SEA_RUIDO_RESIDUOS | SEIA | Sometimiento al SEIA | 🟡 REGLA + 🔵 CHECK | Checklist | checklist | parcial | checklist | P2 | |
| D-E005 | DS 38/2011 MMA Ruido | 03/AMBIENTAL_SEA_RUIDO_RESIDUOS | Ruido | Niveles permitidos por zona | 🟡 REGLA | Reglas (perfil ambiental) | reglas | sí | varía | P2 | Aplicable a HVAC |
| D-E006 | DS 148/2003 MINSAL Res. peligrosos | 03/AMBIENTAL_SEA_RUIDO_RESIDUOS | Residuos | Almacenamiento residuos peligrosos | 🔵 CHECK | Checklist | checklist | no | checklist | P3 | EOL baterías |
| D-E007 | DS 43/2015 MINSAL Almacén sustancias | 03/AMBIENTAL_SEA_RUIDO_RESIDUOS | Sustancias peligrosas | Almacenamiento | 🔵 CHECK | Checklist | checklist | no | checklist | P3 | Electrolito |
| D-E008 | Ley 20.920 REP | 03/AMBIENTAL_SEA_RUIDO_RESIDUOS | REP | Responsabilidad extendida productor | 🔵 CHECK | Checklist | checklist | no | checklist | P3 | EOL baterías |
| D-E009 | DFL 458 LGUC | 03/TERRITORIAL_URBANISMO_PERMISOS | Marco urbanismo | Ley general urbanismo | ⚪ REF | Reporte | reporte | no | info | P3 | |
| D-E010 | DS 47 OGUC | 03/TERRITORIAL_URBANISMO_PERMISOS | Permisos municipales | Permisos DOM | 🟡 REGLA + 🔵 CHECK | Checklist | checklist | parcial | checklist | P2 | |
| D-E011 | MINVU DDU 522 BESS | 03/TERRITORIAL_URBANISMO_PERMISOS | BESS territorial | Pronunciamiento MINVU sobre BESS | 🟡 REGLA | Reglas territoriales | reglas | parcial | varía | P1 | **Lectura humana obligatoria** |

---

## F. Seguridad / incendio (referencias internacionales)

| ID | Fuente | Carpeta | Tema | Dato/directriz | Tipo | Funcionalidad app | Módulo afectado | Auto | Sev | Prio | Obs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D-F001 | NFPA 855 (referencia) | 04 | Incendio | Separaciones, sistemas, normativa USA | 🟡 REGLA (referencial) + 🔵 CHECK | FireSafetyZone | `safety.ts`, reglas | parcial | varía | P2 | No es ley chilena, citar |
| D-F002 | UL 9540 | 04 | Certificación | Certificación sistemas ESS | 🔵 CHECK | Compliance | reporte | parcial | checklist | P2 | Para `compliance.certifications` |
| D-F003 | UL 9540A SwRI | 04 | Test propagación | Test propagación térmica | 🔵 CHECK | Compliance | reporte | parcial | checklist | P2 | Sungrow ST2752UX referencia este test |

---

## G. Planos / unifilares (no automáticos)

| ID | Fuente | Carpeta | Tema | Dato/directriz | Tipo | Funcionalidad app | Módulo afectado | Auto | Sev | Prio | Obs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D-G001 | Unifilar 33 kV BESS Desierto (DOC-1129 p.13) | 07/EXTRACCIONES_VISUALES_BESS_DESIERTO | Arquitectura MT | Validación visual del patrón 4×5 MVA por feeder | ⚪ REF + 🟢 DATO inferido | Preset | preset | parcial | info | P2 | Sirve para validar parámetros del preset |
| D-G002 | Unifilar 220 kV POI (p012 PNG) | 07/EXTRACCIONES_VISUALES_BESS_DESIERTO | POI / AT | Validación frontera AT | ⚪ REF | Preset | preset | no | info | P3 | |
| D-G003 | Páginas key (p010-p057 PNG) | 07/EXTRACCIONES_VISUALES_BESS_DESIERTO | Diagramas | Soporte visual del análisis | ⚪ REF | — | — | no | info | P4 | Solo documentación |

---

## H. Otros documentos (plantillas, índices, resúmenes)

| ID | Fuente | Carpeta | Tema | Dato/directriz | Tipo | Funcionalidad app | Módulo afectado | Auto | Sev | Prio | Obs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D-H001 | INDICE_MAESTRO_DIRECTRICES_APP_BESS.md | 00 | Trazabilidad | Mapeo `DOC-XXXX → archivo` | ⚪ REF | DocumentRegistry seed | `documentRegistry.ts` | parcial | info | P1 | Útil para poblar registro |
| D-H002 | inventario_reorganizacion.json | 00 | Trazabilidad | Inventario en JSON | ⚪ REF | Importador de DocumentRegistry | script de seeding | sí | info | P2 | Automatizable |
| D-H003 | PENDIENTES_CLASIFICACION.md | 00 | Pendientes | Lo que falta clasificar | 🟣 PEND | — | — | no | info | P3 | Para revisión manual |
| D-H004 | Normativa_BESS_Utility-Scale_Chile.pdf | 10 | Resumen interno | Resumen no primario | ⚪ REF | — | — | no | — | P4 | No citar como fuente |
| D-H005 | reglamentos_clave_app_bess_chile.pdf | 10 | Resumen interno | Resumen no primario | ⚪ REF | — | — | no | — | P4 | No citar como fuente |
| D-H006 | PLANTILLA_MATRIZ_NORMATIVA_APP.md (stub) | 09 | Plantilla vacía | Header tabla esperando datos | ⚪ REF | A llenar con `09_MATRIZ_REGLAS_CANDIDATAS.md` de este plan | — | sí | info | P2 | |
| D-H007 | PLANTILLA_MATRIZ_TECNICA_APP.md (stub) | 09 | Plantilla vacía | Header tabla esperando datos | ⚪ REF | A llenar con este mismo archivo | — | sí | info | P2 | |
| D-H008 | PLANTILLA_MODELO_DATOS_APP.md (vacío) | 09 | Plantilla vacía | Esperando contenido | ⚪ REF | A llenar con `04_MODELO_DATOS_PROPUESTO.md` de este plan | — | sí | info | P2 | |
| D-H009 | PLANTILLA_CHECKLIST_REPORTE_TECNICO.md (vacío) | 09 | Plantilla vacía | Esperando contenido | ⚪ REF | A llenar en Fase 11 | — | sí | info | P2 | |

---

## Resumen por funcionalidad

| Funcionalidad app | # directrices que la alimentan |
|---|---|
| DocumentRegistry / Trazabilidad | 5 |
| Catálogos de equipos | 15 |
| Preset BESS del Desierto | 15 |
| Reglas físicas (incendio, distancias, accesos) | 8 |
| Reglas eléctricas | 4 |
| Reglas territoriales / ambientales | 6 |
| PPC / Operational | 3 |
| AuxiliaryServices | 2 |
| Pérdidas | 1 |
| InconsistencyDetector | 1 |
| Compliance / certificaciones | 3 |
| Checklist ingeniería detalle | 25+ |
| Reporte | 10+ |

---

## Notas

- Lectura humana **obligatoria** para extraer reglas de los PDFs marcados con `parcial` en columna "Auto". La extracción OCR de `06/EXTRACCIONES_TEXTO/` **no es suficiente** para citar.
- Las reglas que llegan al motor de validación pasan a `09_MATRIZ_REGLAS_CANDIDATAS.md` con un `RuleID` propio.
- Los documentos con tipo ⚪ REF se usan en el reporte para soporte, no como reglas activas.
