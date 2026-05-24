# 10 — Riesgos, supuestos y pendientes

Inventario explícito de lo que **no se sabe**, lo que **se asume** y lo que **se inventaría si nadie lo controla**. Cada ítem tiene mitigación.

---

## 1. Riesgos críticos

| ID | Riesgo | Probabilidad | Impacto | Severidad | Mitigación | Owner |
|---|---|---|---|---|---|---|
| R-001 | Tratar `preliminary_assumption` como ley normativa | Alta | Alto | 🔴 Crítica | Toda regla nueva exige `EvidenceRef` documental; sin esto queda como `assumption` con badge visible. Implementar en Fase 1 | Backend / catálogo |
| R-002 | Citar reglas a partir de extracciones OCR (`page_NNN.txt`) | Alta | Alto | 🔴 Crítica | Sólo citar PDFs primarios. Las extracciones OCR son auxiliares de búsqueda, no fuente. Validar en code review | Backend / docs |
| R-003 | Inconsistencias internas no detectadas (ST2752/ST2725, 0,9/0,69 kV, 220/230 kV) | Alta | Alto | 🔴 Crítica | `InconsistencyDetector` implementado en Fase 3 con casos concretos | Backend |
| R-004 | App presentada como herramienta de ingeniería de detalle | Media | Alto | 🔴 Crítica | Disclaimer obligatorio en cada export + en home screen. Exclusiones explícitas en el reporte | UX / Reporte |
| R-005 | Preset BESS del Desierto usado como ley universal | Media | Medio | 🟠 Alta | Etiquetar como "caso base parametrizable"; todos los parámetros editables | UX / Backend |
| R-006 | Valores derivados de OCR marcados como `documented` | Media | Alto | 🟠 Alta | Convención: si la fuente es OCR → `confidence: "derived"` o `"inferred"`, nunca `"documented"` | Backend |
| R-007 | DIRECTRICES_APP_BESS expuesto en producción | Baja | Alto | 🟠 Alta | `.gitignore`, no servir desde Next.js, validar en CI | DevOps |
| R-008 | Reglas regulatorias quedan obsoletas sin aviso | Media | Medio | 🟠 Alta | `DocumentRegistry` con `validFrom`, `replacedBy`; check periódico manual | Compliance |
| R-009 | UI sobrecargada con nuevas entidades (PPC, AuxiliaryServices, etc.) | Media | Medio | 🟡 Media | Diseñar paneles colapsables; entidades nuevas son **opcionales** en la UI v1 | UX |
| R-010 | Bloqueo por requerir lectura humana de muchos PDFs en Fase 9 | Alta | Medio | 🟠 Alta | Priorizar: SEC RGR 06/2024, SEC RPTD 08 Incendios, SEA Criterio DS17, MINVU DDU 522. El resto puede esperar | Backend / Legal |
| R-011 | Esquemas JSON v1.1 dejan de cargarse al introducir v1.2 | Baja | Alto | 🟠 Alta | Mantener lector retrocompatible con tests de fixtures | Backend |
| R-012 | Generación PDF en producción falla por dependencias servidor | Media | Medio | 🟡 Media | Usar print-to-PDF client-side por default; servidor solo como alternativa | DevOps |
| R-013 | Cambios en `equipmentCatalog.ts` rompen layouts guardados | Media | Alto | 🟠 Alta | Mantener IDs estables; migración explícita si cambian dimensiones | Backend |
| R-014 | Tests existentes se rompen al introducir `EvidencedValue<T>` | Media | Medio | 🟡 Media | Migración aditiva: campos opcionales; soportar tipo simple `T | EvidencedValue<T>` durante transición | Backend |
| R-015 | Inglés vs Español inconsistente en reglas/reporte | Media | Bajo | 🟡 Media | i18n desde Fase 1 para reglas; default `es` | Frontend |
| R-016 | Atribución incorrecta de fuente entre fabricantes y datasheets | Media | Medio | 🟡 Media | Convención: `DocumentRegistry.id` legible (`SUNGROW-ST2752UX-V15`) — autodescriptivo | Backend |
| R-017 | Carpeta `directrices-implementation-plan/` confundida con docs públicos | Baja | Bajo | 🟢 Baja | Mantener separación: `docs/` público vs este subdirectorio interno; mencionar en README | DevOps |
| R-018 | Lectura humana de PDFs introduce errores de transcripción | Media | Alto | 🟠 Alta | Code review de cada `EvidenceRef` agregado; verificar dos personas para reglas blocking | Compliance |
| R-019 | Cambios en MapLibre / react-map-gl rompen rendering de capas nuevas | Baja | Medio | 🟡 Media | Lock-in de versión; tests visuales | Frontend |
| R-020 | Sobre-modelado: entidades que nadie usa | Media | Bajo | 🟢 Baja | Cada entidad nueva pasa por uso real en preset BESS del Desierto antes de quedar en código | Backend |

---

## 2. Supuestos preliminares (editables, marcados visiblemente)

Estos supuestos deben aparecer como `ProjectAssumption[]` en cada proyecto con badge visible. Origen: análisis técnico ancla §1, §8, §9, §10.

| ID | Supuesto | Valor default | Editable | Risk | Fuente / Notas |
|---|---|---|---|---|---|
| SUP-001 | `containersPerStation` = 8 | 8 | Sí | medium | Derivado de BESS del Desierto. No es ley universal |
| SUP-002 | `stationsPerFeeder` = 4 | 4 | Sí | medium | Inferido del unifilar DOC-1129 p.13 |
| SUP-003 | `feederRatedMVA` = 4 × stationMVA | 20 MVA si station = 5 MVA | Derivado | low | Coherente con caso |
| SUP-004 | `usableFactor` BESS del Desierto | 0.9083 | Sí | medium | 800/880,80384 — solo válido para caso base |
| SUP-005 | Separación container-container | (pendiente datasheet) | Sí | high | **Sin valor por default**, debe pedirse al usuario |
| SUP-006 | Separación container-station | (pendiente datasheet) | Sí | high | Idem |
| SUP-007 | Ancho de camino interno | 6 m | Sí | medium | Buena práctica utility-scale |
| SUP-008 | Radio de giro mínimo camión/grúa | 10 m | Sí | medium | Buena práctica O&M |
| SUP-009 | Ancho corredor cable MT | 1,2 m | Sí | medium | Estimación; ampacidad ≠ ancho |
| SUP-010 | Fire setback al perímetro | (pendiente NFPA 855 + autoridad local) | Sí | high | NFPA 855 es referencia, no ley chilena |
| SUP-011 | Pérdidas MT como % de POI | 2% | Sí | medium | Caso BESS del Desierto fue 1,89%; depende de longitud y cable |
| SUP-012 | SSAA como % de POI | 0,8% | Sí | medium | Caso BESS del Desierto fue 0,78%; depende de modo y HVAC |
| SUP-013 | Orientación uniforme por bloque | true | Sí | low | Mejora rutas MT/DC y mantenimiento |
| SUP-014 | Tensión BT Sungrow SC5000UD-MV | 0,9 kV | Sí | medium | INC-002: conflicto 0,9 vs 0,69 kV en informes BESS del Desierto |
| SUP-015 | Tensión AT trafo principal | 220 kV | Sí | medium | INC-003: conflicto 220 vs 230 kV |
| SUP-016 | Modelo container del caso base | ST2752UX | Sí | medium | INC-001: conflicto con aparición puntual de ST2725UX |
| SUP-017 | HVAC consumo por container | (pendiente) | Sí | high | Falta dato de fabricante |
| SUP-018 | EOL energía (degradación) | (pendiente) | Sí | high | Curva fabricante pendiente |
| SUP-019 | Disponibilidad anual | 98% | Sí | low | Buena práctica BESS utility |

---

## 3. Pendientes de validación documental

### 3.1 Datasheets pendientes (críticos)

| ID | Pendiente | Por qué importa | Campo | Prioridad | Dónde buscar |
|---|---|---|---|---|---|
| PEND-D001 | Sungrow ST2752UX dimensiones físicas exactas | Sin esto el layout es geométricamente falso | `BatteryContainer.dimensions_m` | crítica | Sungrow ST2752UX-V15 datasheet completo + manual de instalación |
| PEND-D002 | ST2752UX peso bruto | Cálculo de carga civil / grúa | `BatteryContainer.weight_kg` | alta | Idem |
| PEND-D003 | ST2752UX clearances de instalación (mantenimiento, ventilación, incendio) | Define densidad de layout | `EquipmentSpec.clearances` | crítica | Manual instalación / layout guide Sungrow |
| PEND-D004 | ST2752UX HVAC consumo | SSAA y separaciones por ventilación | `EquipmentSpec.hvacLoadKw` | alta | Sungrow |
| PEND-D005 | SC5000UD-MV clearances de instalación | Idem para station | `EquipmentSpec.clearances` | alta | Sungrow |
| PEND-D006 | SC5000UD-MV configuración DC real | Verificar entradas DC | `ConversionStation.pcsModules` | media | Sungrow / EPC |
| PEND-D007 | Switchgear MT centro seccionamiento dimensiones | Para `mv_yard` zone | `MVBus.switchgear.dimensions_m` | alta | EPC / proveedor celdas (Schneider, Siemens) |
| PEND-D008 | Transformador principal real datos | Resolver inconsistencia 220/230, 250 MVA | `MainTransformer` | media | Subestación / EPC |
| PEND-D009 | Sistema HVAC real consumo | Balance SSAA | `AuxiliaryServices.hvacKw` | alta | EPC / fabricante |
| PEND-D010 | Sistema contra incendio detallado | Separaciones HSE | `FireSafetyZone` | alta | EPC + HSE + autoridad local |
| PEND-D011 | Confirmación modelo ST2752UX vs ST2725UX | INC-001 | `BatteryContainer.model` | crítica | Sungrow / Atlas Renewable |
| PEND-D012 | Confirmación tensión BT 0,9 vs 0,69 kV | INC-002 | `ConversionStation.lvVoltageKv` | media | Datasheet SC5000UD-MV |
| PEND-D013 | Confirmación tensión AT 220 vs 230 kV | INC-003 | `MainTransformer.hvVoltageKv` | media | Subestación |
| PEND-D014 | Plano layout general georreferenciado | Validar densidad real | `SiteArea.polygon` real | crítica | EPC / Atlas Renewable |
| PEND-D015 | DWG/DXF nativo BESS del Desierto | Importador CAD futuro | — | baja | EPC (no existe en carpeta) |

### 3.2 Documentos normativos a leer humanamente (prioridad alta)

| ID | Documento | Por qué importa | Prioridad |
|---|---|---|---|
| PEND-N001 | SEC RGR 06/2024 BESS | Reglamento específico BESS Chile | crítica |
| PEND-N002 | SEC RPTD 08 Protección Incendios | Distancias y sistema HSE | crítica |
| PEND-N003 | SEA Criterio Almacenamiento DS17/2026 | SEIA específico BESS | crítica |
| PEND-N004 | MINVU DDU 522 BESS | Territorial específico BESS | crítica |
| PEND-N005 | CNE NTSyCS RES 45/2026 | Calidad servicio SEN | alta |
| PEND-N006 | CEN Anexo 2 NI/MR/MNR 2024 | Interconexión utility | alta |
| PEND-N007 | DS 38 Ruido | Niveles HVAC | media |
| PEND-N008 | CNE REX 45/2026 IBR | Requisitos PPC | media |

### 3.3 Documentos manualmente faltantes

Del archivo `99_PENDIENTES_DUPLICADOS_DESCARGA_MANUAL/DESCARGAS_MANUALES_NORMATIVA/descargas_manuales_pendientes.md` (no leído en detalle) — posibles:

| ID | Posible pendiente | Acción |
|---|---|---|
| PEND-M001 | Anexos técnicos RES SEC más recientes | Verificar lista en `descargas_manuales_pendientes.md` |
| PEND-M002 | Versiones actualizadas de pliegos RIC | Idem |
| PEND-M003 | Documentos CEN técnicos no descargados | Idem |

---

## 4. Pendientes de implementación (no documentales)

| ID | Pendiente | Bloqueante para |
|---|---|---|
| PEND-I001 | Definir formato exacto del campo `EvidenceRef.section` | Reglas con citas |
| PEND-I002 | Elegir librería PDF: `react-pdf` vs `pdfmake` vs print-to-PDF | Reporte exportable |
| PEND-I003 | Definir convención de unidades en `EvidencedValue<T>` (¿unit obligatorio para todos los `number`?) | Catálogos |
| PEND-I004 | Layout guide para `BESSBlock` (template H, V, U, customizable) | Generador bloques |
| PEND-I005 | Manejo de proyectos con > 1 fase / ampliación | v2 |
| PEND-I006 | Manejo de proyectos híbridos PV + BESS | v2 |
| PEND-I007 | Importador GeoJSON para terreno real | v2 (Fase 21 GAP-021) |
| PEND-I008 | Importador KMZ/KML | v2 |
| PEND-I009 | Importador DWG/DXF | v3 (GAP-020) |
| PEND-I010 | CAPEX/OPEX preliminar | v2 |
| PEND-I011 | Multiproyecto / portfolio | v2 |
| PEND-I012 | Roles y permisos (lectura vs edición) | v2 |
| PEND-I013 | Persistencia backend (hoy solo local) | v2 |

---

## 5. Decisiones que requieren validación humana antes de programar

| ID | Decisión | Opciones | Recomendación |
|---|---|---|---|
| DEC-001 | Ubicación de archivos de evidencia | (a) tipos coexisten con campos legacy (b) reemplazo total | (a) coexistencia — migración aditiva |
| DEC-002 | Severidad por defecto cuando no se decide | (a) warning (b) info (c) checklist | (b) info — conservador |
| DEC-003 | Tratamiento de `pending_validation` vs `confidence: "missing"` | (a) sinónimos (b) coexisten | (b) coexisten — diferente granularidad |
| DEC-004 | Tratamiento de NFPA 855 y UL 9540 en perfil "chile" | (a) como ley (b) como referencia internacional | (b) referencia, no ley |
| DEC-005 | Idioma del reporte | (a) según locale (b) bilingüe en mismo PDF (c) español obligatorio | (a) según locale |
| DEC-006 | Localización del disclaimer | (a) solo portada (b) portada + pie de cada sección (c) marca de agua | (b) portada + pie |
| DEC-007 | Acceso a DIRECTRICES desde la app | (a) ninguno (b) lectura URL relativa (c) embedded viewer | (a) ninguno — DIRECTRICES es fuente off-app |
| DEC-008 | Backup / export del DocumentRegistry | (a) embebido en código (b) JSON externo cargable | (a) embebido — más seguro |
| DEC-009 | Test fixtures BESS del Desierto en repo público | (a) sí (b) datos sintéticos (c) no | (a) sí — son datos públicos de informes Atlas |
| DEC-010 | Migración de proyectos v1.1 a v1.2 al cargar | (a) automática silenciosa (b) automática con aviso (c) manual | (b) con aviso |

---

## 6. Snapshot de estado actual de riesgos

| Severidad | Cantidad | Próxima revisión |
|---|---|---|
| 🔴 Crítica | 5 | Antes de iniciar Fase 1 |
| 🟠 Alta | 8 | Antes de iniciar Fase 2 |
| 🟡 Media | 4 | Antes de cada fase |
| 🟢 Baja | 3 | Revisión trimestral |
| **Total** | **20** | |

---

## 7. Salidas obligatorias en cada export

Cualquier export (JSON, PDF, HTML) debe incluir:

1. **Disclaimer** (literal `00_RESUMEN_EJECUTIVO.md` §10).
2. Listado `ProjectAssumption[]` con risk + fuente.
3. Listado `ProjectExclusion[]` (mínimo 12 items: cortocircuito, malla tierra, fundaciones, etc.).
4. Listado `PendingDataItem[]`.
5. Listado `DocumentInconsistency[]`.
6. Versión de `DocumentRegistry` usada (hash o id).
7. Versión de `bessRegulatoryProfiles` activo.
8. Versión del app (`package.json`).
9. Fecha y locale de generación.

Sin estos campos el export **no es válido** y la UI debe advertir al usuario.
