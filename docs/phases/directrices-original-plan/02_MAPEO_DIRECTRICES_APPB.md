# 02 — Mapeo de la carpeta DIRECTRICES_APP_BESS

Inventario y clasificación de la carpeta documental. Total aproximado: **~330 archivos**.

---

## 1. Mapa de carpetas

```
DIRECTRICES_APP_BESS/
├── 00_INDICE_MAESTRO_Y_TRAZABILIDAD/
│   ├── INDICE_MAESTRO_DIRECTRICES_APP_BESS.md  ← índice de 494 líneas con DOC-0001..DOC-0500+
│   ├── MAPA_CARPETAS.md
│   ├── LOG_REORGANIZACION.md
│   ├── PENDIENTES_CLASIFICACION.md
│   ├── DUPLICADOS_DETECTADOS.md
│   ├── CORRECCION_EXTENSIONS_EXTRACCIONES.md
│   ├── README_PROXIMA_ETAPA_ANALISIS.md
│   ├── inventario_reorganizacion.json
│   ├── LEGADO_DATASHEETS_BESS_DESIERTO/    (trazabilidad histórica)
│   └── LEGADO_NORMATIVA_BESS/              (trazabilidad histórica)
│
├── 01_NORMATIVA_SEC_RGR_RIC/
│   ├── MARCO_GENERAL_ELECTRICO/    Ley 21.505 BESS, DFL 4 LGSE, DS 125, DS 37, DS 62, DS 88, DS 109, DS 8
│   ├── SEC_RGR_BESS/               SEC RGR 06/2024 BESS (regla específica BESS)
│   ├── SEC_RIC_PLIEGOS/            RIC 01–19 (empalmes, tableros, alimentadores, conductores, etc.)
│   └── SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/   RPTD 01–17 + REX modificatorias
│
├── 02_NORMATIVA_CNE_CEN_SEN/
│   ├── CEN_CONEXION_OPERACION/     Anexos 1–3 interconexión, materiales ayuda, guía clasificación, PMGD
│   └── CNE_NORMAS_TECNICAS_SEN/    NTSyCS, NTSSCC, EMDIT, IBR, SITR, requisitos sísmicos, REX 41/45
│
├── 03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/
│   ├── AMBIENTAL_SEA_RUIDO_RESIDUOS/   Ley 19.300, DS 40 SEIA, DS 38 ruido, DS 148 res. peligrosos, DS 43 almacén sustancias, Ley 20.920 REP, SEA criterio almacenamiento DS17/2026
│   └── TERRITORIAL_URBANISMO_PERMISOS/  DFL 458 LGUC, DS 47 OGUC, MINVU DDU 522 BESS
│
├── 04_SEGURIDAD_INCENDIO_NFPA_UL/
│   ├── REFERENCIA_NFPA_855.md
│   ├── REFERENCIA_UL_9540.md
│   └── REFERENCIA_UL_9540A_SWRI.md
│
├── 05_DATASHEETS_EQUIPOS_BESS/
│   ├── 01_CONTENEDORES_BATERIAS/   Sungrow ST2752UX-US V15, Material, PowerTitan DE
│   ├── 02_PCS_INVERSORES/          Sungrow SC5000UD-MV-US, V14, V15, Material
│   ├── 03_TRANSFORMADORES_BT_MT/   (referencias)
│   ├── 05_SWITCHGEAR_CELDAS_MT/    Siemens 8DA/8DB 40,5 kV GIS, Schneider PIX36 link
│   ├── 06_CABLES_MT_BT_DC_CANALIZACIONES/   HES, Nexans (2 modelos), Prysmian — todos 18/33 kV
│   ├── 07_HVAC_AUXILIARES/         ST2752UX liquid cooling reference
│   ├── 08_INCENDIO_SEGURIDAD_BESS/ Sungrow PowerTitan2 whitepaper 2024 oficial
│   ├── 09_PPC_SCADA_CONTROL/       Isotrol Bluence link
│   ├── 10_TRANSFORMADOR_PRINCIPAL_POI_REFERENCIAL/  Horizon Power transformer spec
│   ├── 11_DOCUMENTOS_FABRICANTE_MANUALES/   Sungrow Liquid Cooling LOTO, ST2752UX System Manual Ver12
│   ├── 12_DATASHEETS_REFERENCIA_NO_OFICIALES/ SC5000UD-MV manual public references
│   └── REFERENCIAS_FABRICANTES_GENERALES/   Fluence Gridstack Pro, Huawei ESS, Sungrow PowerTitan 2.0, Tesla Megapack
│
├── 06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/
│   ├── BESS_DESIERTO_Analisis_Tecnico_App_Predimensionamiento.md   ← 639 líneas: el documento ancla
│   ├── INFORMES_TECNICOS_CASO/   3 PDFs:
│   │     - EE-EN-2025-1092 (Partida y Detención, 60 pg)
│   │     - EE-EN-2025-1129 (Mínimo Técnico, 57 pg)
│   │     - EE-EN-2025-2611 (Potencia Máxima, 40 pg)
│   └── EXTRACCIONES_TEXTO/   ~180 archivos page_NNN.txt + 4 textos completos copy.txt + pdf_summary.json
│
├── 07_PLANOS_UNIFILARES_LAYOUTS/
│   ├── EXTRACCIONES_VISUALES_BESS_DESIERTO/
│   │   ├── *.jpg contact-sheets de los 3 informes
│   │   ├── key_pages/   ~50 PNGs de páginas con unifilares y diagramas
│   │   └── recortes específicos (p012 220kV POI, p013 33kV barras, p049 circuitos)
│   └── README.md
│
├── 08_COMPONENTES_Y_ARQUITECTURA_BESS/
│   ├── CENTROS_TRANSFORMACION/
│   │   └── SUNGROW_SC5000UD-MV_CrossReference_Centro_Transformacion.md
│   └── README.md
│
├── 09_DIRECTRICES_PRELIMINARES_APP/    ← plantillas (vacías o stub) para la app
│   ├── PLANTILLA_MATRIZ_NORMATIVA_APP.md   (stub: solo header de tabla)
│   ├── PLANTILLA_MATRIZ_TECNICA_APP.md     (stub: solo header de tabla)
│   ├── PLANTILLA_MODELO_DATOS_APP.md       (vacío)
│   └── PLANTILLA_CHECKLIST_REPORTE_TECNICO.md  (vacío)
│
├── 10_RESUMENES_INTERNOS_Y_DOCUMENTOS_DE_APOYO/
│   └── NORMATIVA_RESUMENES_INTERNOS/
│       ├── Normativa_BESS_Utility-Scale_Chile.pdf
│       └── reglamentos_clave_app_bess_chile.pdf
│
└── 99_PENDIENTES_DUPLICADOS_DESCARGA_MANUAL/
    ├── DESCARGAS_MANUALES_NORMATIVA/   descargas_manuales_pendientes.md
    ├── DESCARGA_MANUAL_DATASHEETS/     BESS_DESIERTO_DESCARGA_MANUAL_REQUERIDA.md
    └── duplicados_detectados/          ~60 archivos DUPLICADO_*.{txt,pdf}
```

---

## 2. Clasificación por utilidad

Convención de clasificación aplicada (según directriz del prompt):

| Etiqueta | Significado para la app |
|---|---|
| 🟢 **DATO** | Dato técnico implementable directamente (numérico / dimensión / parámetro de equipo certificado) |
| 🟡 **REGLA** | Regla normativa **candidata** — requiere validación de vigencia + numeral antes de implementarse |
| 🔵 **CHECK** | Checklist manual: aparece en reporte como ítem que el usuario / ingeniero debe completar fuera de la app |
| ⚪ **REF** | Referencia documental (no extraíble como regla; vive en el índice de fuentes) |
| 🟠 **SUP** | Supuesto preliminar (editable, marcado visible) |
| 🟣 **PEND** | Pendiente de validación o de fuente primaria |
| ⚫ **DUP** | Duplicado documental (no procesar) |
| 🚫 **OUT** | Fuera de alcance del predimensionamiento preliminar |

---

## 3. Clasificación por bloque documental

### 3.1 `00_INDICE_MAESTRO_Y_TRAZABILIDAD/`

| Tipo | Uso esperado |
|---|---|
| ⚪ REF | Índice maestro `INDICE_MAESTRO_DIRECTRICES_APP_BESS.md` se usa como tabla de mapeo `DOC-XXXX → archivo` |
| ⚪ REF | `inventario_reorganizacion.json` puede importarse al modulo `DocumentRegistry` (Fase 1) |
| ⚪ REF | `PENDIENTES_CLASIFICACION.md` y `DUPLICADOS_DETECTADOS.md` alimentan estado documental |

### 3.2 `01_NORMATIVA_SEC_RGR_RIC/` — Normativa eléctrica chilena

| Documento | Clasificación | Comentario |
|---|---|---|
| Ley 21.505 (Almacenamiento) | 🟡 REGLA + ⚪ REF | Marco legal BESS Chile — citar en reporte; reglas específicas pendientes de extraer |
| DFL 4 LGSE | ⚪ REF | Marco general del servicio eléctrico |
| DS 125/2017 Coord. Op. SEN | 🟡 REGLA | Coordinación con CEN/CNE |
| DS 37/2019 Transmisión | 🟡 REGLA | Aplicable si se conecta a transmisión |
| DS 62/2006 Transferencias potencia | ⚪ REF | Para reporte económico (fuera de alcance v1) |
| DS 88/2019 PMGD | 🟡 REGLA | Solo si proyecto se clasifica como PMGD |
| DS 109 Seguridad Inst. Eléctricas | 🟡 REGLA + 🔵 CHECK | Distancias seguridad, puesta a servicio |
| Decreto 8 RIC Consumo | ⚪ REF | Tangencial a BESS utility |
| **SEC RGR 06/2024 BESS** | 🟡 REGLA crítica | Reglamentación específica BESS — **máxima prioridad de extracción** |
| RIC 01–19 (19 pliegos) | 🟡 REGLA selectiva | Solo aplican parcialmente: RIC 04 (canalizaciones), 05 (tensiones peligrosas), 06 (puesta tierra), 07 (instalación equipos), 11 (especiales), 13 (subestaciones), 17 (O&M), 18 (presentación proyectos), 19 (puesta servicio) |
| RPTD 01–17 + REX | 🟡 REGLA | Aplican: 01 tensiones, 02 clasificación, 06 puesta tierra, 07 franjas, 08 incendio, 09 señalización, 10 centrales/subestaciones, 11 líneas AT, 13 MT/BT |

### 3.3 `02_NORMATIVA_CNE_CEN_SEN/`

| Documento | Clasificación | Comentario |
|---|---|---|
| **CEN Anexo 1 PMGD** | 🟡 REGLA | Requerimientos interconexión PMGD |
| **CEN Anexo 2 NI/MR/MNR** | 🟡 REGLA | Nueva instalación, modificación relevante / no relevante |
| **CEN Anexo 3 Desconexión** | ⚪ REF | Para cese de operaciones |
| CEN Guía clasificación proyectos | 🔵 CHECK | Procedimiento de clasificación — checklist |
| CEN Material proceso interconexión | 🔵 CHECK | Pasos para interconexión — checklist |
| **CNE NTSyCS** | 🟡 REGLA crítica | Norma técnica de Seguridad y Calidad de Servicio del SEN — **máxima prioridad** |
| **CNE NTSSCC** | 🟡 REGLA | Norma técnica Servicios Complementarios |
| CNE REX 41/2025 Sísmico | 🟡 REGLA + 🔵 CHECK | Requisitos sísmicos para equipamiento (relevante para fundaciones, fuera de alcance v1 pero checklist obligatorio) |
| CNE REX 45/2026 IBR | 🟡 REGLA | Inverter-based resources — relevante para PPC y modos de control |
| CNE AT EMDIT 2025 | ⚪ REF | Estudio EMDIT — fuera de alcance app |
| CNE AT SITR 2025 | ⚪ REF | Sistema de Información Tiempo Real — fuera de alcance app |

### 3.4 `03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/`

| Documento | Clasificación | Comentario |
|---|---|---|
| Ley 19.300 + DS 40 SEIA | 🔵 CHECK | Sometimiento a SEIA según tipología — checklist obligatorio |
| **SEA Criterio Almacenamiento Energía DS17/2026** | 🟡 REGLA crítica | Criterio SEA actualizado para BESS — **máxima prioridad** |
| SEA Criterio 2023 No Vigente | ⚫ DUP / histórico | Referencia histórica |
| DS 38/2011 MMA Ruido | 🟡 REGLA + 🔵 CHECK | Niveles de ruido permitidos según zona |
| DS 148/2003 MINSAL Res. peligrosos | 🔵 CHECK | Aplicable a baterías al final de vida |
| DS 43/2015 MINSAL Almacén sustancias peligrosas | 🟡 REGLA | Si aplica a almacenes de baterías / electrolito |
| Ley 20.920 REP | 🔵 CHECK | Responsabilidad extendida del productor (fin de vida de baterías) |
| DFL 458 LGUC | ⚪ REF | Marco urbanismo |
| DS 47 OGUC | 🟡 REGLA + 🔵 CHECK | Permisos municipales (DOM) |
| **MINVU DDU 522 BESS** | 🟡 REGLA crítica | Pronunciamiento MINVU sobre BESS — **máxima prioridad** |

### 3.5 `04_SEGURIDAD_INCENDIO_NFPA_UL/`

| Documento | Clasificación | Comentario |
|---|---|---|
| **NFPA 855** | 🟡 REGLA candidata + 🔵 CHECK | Internacional, no chilena. Se cita en datasheets Sungrow (UL 9540, UL 9540A). Tratar como referencia recomendada, no como ley chilena |
| **UL 9540** | 🟡 REGLA candidata + 🔵 CHECK | Idem |
| **UL 9540A SwRI** | 🟡 REGLA candidata + 🔵 CHECK | Reporte de test de propagación térmica |

### 3.6 `05_DATASHEETS_EQUIPOS_BESS/`

| Documento | Clasificación | Comentario |
|---|---|---|
| Sungrow ST2752UX-US V15 | 🟢 DATO crítico | Ya parcialmente en `equipmentCatalog`. Confirmar dimensiones físicas, peso, clearances |
| Sungrow ST2752UX PowerTitan DE | 🟢 DATO | Variante DE (Europa) — comparar con US |
| Sungrow ST2752UX Material | 🟢 DATO | Material adicional oficial |
| Sungrow SC5000UD-MV-US | 🟢 DATO crítico | Ya en catálogo |
| Sungrow SC5000UD-MV V14 / V15 | 🟢 DATO | Versiones EN |
| Sungrow PowerTitan2 Whitepaper 2024 | 🟢 DATO + 🔵 CHECK | Sistema de incendio, seguridad |
| Sungrow LOTO Instruction 2022 | 🔵 CHECK | Lock-out tag-out — para O&M |
| Sungrow ST2752UX System Manual Ver12 | 🟢 DATO crítico pendiente | Manual de sistema — **fuente primaria para clearances** |
| Siemens 8DA/8DB GIS 40,5 kV | ⚪ REF | Referencia switchgear MT |
| Schneider PIX36 (link) | ⚪ REF | Referencia switchgear MT |
| Cables HES / Nexans / Prysmian 18/33 kV | ⚪ REF | Referencia cables MT — para `CableRoute` parametrizado |
| Horizon Power transformer spec | ⚪ REF | Referencia transformador principal |
| Tesla Megapack / Fluence Gridstack / Huawei ESS | ⚪ REF | Referencias para catálogo extensible futuro |

### 3.7 `06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/`

| Documento | Clasificación | Comentario |
|---|---|---|
| `BESS_DESIERTO_Analisis_Tecnico_App_Predimensionamiento.md` (639 líneas) | 🟢🟡🟠 ANCLA | **Documento síntesis maestro**. Ya contiene secciones de modelo de datos, reglas de dimensionamiento, layout, eléctricas, vacíos, plan de implementación. Usar como semilla para casi todos los demás archivos de este plan |
| Informe EE-EN-2025-1092 (PPyD) | 🟢 DATO + 🟡 REGLA | Procesos partida/detención, rampas, mínimos técnicos |
| Informe EE-EN-2025-1129 (Mínimo Técnico) | 🟢 DATO crítico | Arquitectura BESS, unifilares, transformadores |
| Informe EE-EN-2025-2611 (Potencia Máxima) | 🟢 DATO crítico | PMAX carga/descarga, pérdidas MT, SSAA |
| ~180 `page_NNN.txt` extracciones OCR | 🟠 SUP / ⚪ REF | **No usar como fuente primaria**. Para citar reglas: usar el PDF original + número de página |

### 3.8 `07_PLANOS_UNIFILARES_LAYOUTS/`

| Documento | Clasificación | Comentario |
|---|---|---|
| `key_pages/*.png` (~50 unifilares y diagramas) | 🟢 DATO visual | Para entender arquitectura. **No hay archivos CAD nativos** — esto es el límite estructural |
| Contact sheets `.jpg` | ⚪ REF | Resumen visual rápido |

### 3.9 `08_COMPONENTES_Y_ARQUITECTURA_BESS/`

| Documento | Clasificación | Comentario |
|---|---|---|
| Cross-reference SC5000UD-MV | 🟢 DATO | Análisis interno del centro de transformación |

### 3.10 `09_DIRECTRICES_PRELIMINARES_APP/`

| Documento | Estado real | Acción |
|---|---|---|
| PLANTILLA_MODELO_DATOS_APP.md | Vacío | **Llenar** con el contenido de `04_MODELO_DATOS_PROPUESTO.md` de este plan |
| PLANTILLA_MATRIZ_NORMATIVA_APP.md | Solo header | **Llenar** con `09_MATRIZ_REGLAS_CANDIDATAS.md` |
| PLANTILLA_MATRIZ_TECNICA_APP.md | Solo header | **Llenar** con `08_MATRIZ_DIRECTRICES_A_FUNCIONALIDADES.md` |
| PLANTILLA_CHECKLIST_REPORTE_TECNICO.md | Vacío | **Llenar** durante Fase 11 (reporte) |

### 3.11 `10_RESUMENES_INTERNOS_Y_DOCUMENTOS_DE_APOYO/`

| Documento | Clasificación | Comentario |
|---|---|---|
| Normativa_BESS_Utility-Scale_Chile.pdf | 🟡 REGLA + ⚪ REF | Resumen interno — útil como índice, no como fuente primaria |
| reglamentos_clave_app_bess_chile.pdf | 🟡 REGLA + ⚪ REF | Idem |

### 3.12 `99_PENDIENTES_DUPLICADOS_DESCARGA_MANUAL/`

| Documento | Clasificación | Acción |
|---|---|---|
| `descargas_manuales_pendientes.md` | 🟣 PEND | Lista de PDFs a conseguir manualmente |
| `BESS_DESIERTO_DESCARGA_MANUAL_REQUERIDA.md` | 🟣 PEND | Datasheets faltantes del caso |
| `duplicados_detectados/*` (~60 archivos) | ⚫ DUP | Ignorar |

---

## 4. Resumen cuantitativo

| Categoría | Cantidad aprox. |
|---|---|
| PDFs normativos (SEC, CNE, CEN, MINVU, MMA, MINSAL) | ~75 |
| Datasheets oficiales | 10 |
| Datasheets de referencia / link / no oficial | 15 |
| Informes técnicos BESS del Desierto | 3 (más 1 duplicado) |
| Extractos OCR `page_NNN.txt` | ~180 |
| Imágenes de unifilares / planos / diagramas | ~50 |
| Índices y READMEs markdown | ~30 |
| Archivos duplicados confirmados | ~60 |
| Plantillas para esta app | 4 |
| **Total estimado** | **~330 archivos** |

---

## 5. Fuentes primarias vs secundarias

Política de uso en la app:

- **Fuente primaria** = PDF oficial original + número de página + numeral / artículo / sección. Ejemplo válido: `SEC_RGR_06_2024_BESS.pdf, p. 14, art. 3.2`.
- **Fuente secundaria** = extracción OCR, resumen interno, índice. **Nunca** se cita como `evidence.confidence = "documented"`.
- Las extracciones `EXTRACCIONES_TEXTO/page_NNN.txt` son **soporte para búsqueda**, no para citar.
- Los PDFs en `10_RESUMENES_INTERNOS_Y_DOCUMENTOS_DE_APOYO/` son **soporte de navegación**, no para citar.

---

## 6. Pendientes documentales conocidos

Del archivo `99_PENDIENTES_DUPLICADOS_DESCARGA_MANUAL/DESCARGA_MANUAL_DATASHEETS/BESS_DESIERTO_DESCARGA_MANUAL_REQUERIDA.md` y del análisis técnico:

- ⏳ Manual completo de instalación ST2752UX (clearances, footprint exacto).
- ⏳ Layout guide del contenedor (separaciones fabricante).
- ⏳ Switchgear / centro de seccionamiento 33 kV con dimensiones.
- ⏳ Plano georreferenciado del proyecto BESS del Desierto (no existe en CAD nativo).
- ⏳ Manual O&M (radio de giro, accesos para grúa, zonas de izaje).
- ⏳ Curvas de degradación / EOL / garantía.
- ⏳ Matriz completa de cargas auxiliares.

Detalle completo en `10_RIESGOS_SUPUESTOS_PENDIENTES.md`.
