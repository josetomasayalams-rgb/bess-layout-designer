/**
 * DocumentRegistry — catálogo de fuentes documentales primarias.
 *
 * Cada `EvidenceRef` cita una entrada de este registro por `documentId`.
 *
 * Política:
 * - Sólo se citan documentos con `isPrimary: true` desde reglas con
 *   `EvidenceConfidence: "documented"`.
 * - Resúmenes internos (`internal_summary`) y extracciones OCR existen
 *   únicamente como apoyo de búsqueda, no como fuente primaria.
 * - Cuando una norma se reemplaza, el entry viejo gana `replacedBy` y
 *   permanece como histórico de auditoría.
 *
 * Rutas:
 * - `path` es la ruta histórica relativa a `DIRECTRICES_APP_BESS/` y se
 *   conserva para auditoría/back-compat.
 * - `pathActive` es la ruta vigente bajo `00_BIBLIOTECA_TECNICA_ACTIVA/`
 *   (raíz: `DOCUMENTACION_APP_BESS/00_BIBLIOTECA_TECNICA_ACTIVA/`).
 *   Es la única que debe usarse para lookup real; los paths no se
 *   sirven desde la app en producción — son referencias para trazabilidad.
 *
 * Niveles de fuente (matriz §README_CAPA_TECNICA_INTERMEDIA):
 *   L1 — OEM del equipo exacto (datasheet/manual)
 *   L2 — OEM misma familia/generación
 *   L3 — Norma, guía institucional o documento técnico reconocido
 *   L4 — Documento público de proyecto, SEA/CEN/CNE/SEC o titular
 *   L5 — Whitepaper, brochure o presentación comercial
 *   L6 — Inferencia técnica razonada (no documento)
 *   L7 — No verificable públicamente / resumen interno / pendiente
 *
 * Reglas de uso por nivel:
 *   L1            → puede ser regla dura de catálogo
 *   L2            → regla blanda / benchmark con advertencia
 *   L3            → checklist o referencia; regla dura solo si aplica localmente y se cita cláusula
 *   L4            → preset/caso de referencia (no regla universal)
 *   L5            → benchmark o contexto
 *   L6            → supuesto editable (nunca regla dura)
 *   L7            → pendiente crítico o exclusión
 */

export type DocumentSource =
  | "sec_rgr"
  | "sec_ric"
  | "sec_rptd"
  | "cne"
  | "cen"
  | "minvu"
  | "sea"
  | "mma"
  | "minsal"
  | "law"
  | "decree"
  | "manufacturer_datasheet"
  | "manufacturer_manual"
  | "manufacturer_whitepaper"
  | "third_party_reference"
  | "project_report"
  | "internal_summary"
  | "international_standard";

export type DocumentLevel =
  | "L1_oem_exact_equipment"
  | "L2_oem_same_family"
  | "L3_standard_or_official"
  | "L4_public_project_or_authority"
  | "L5_whitepaper_brochure"
  | "L6_inferred_assumption"
  | "L7_unverifiable_pending";

/** Raíz de la biblioteca activa (relativa al repositorio del usuario). */
export const BIBLIOTECA_ACTIVA_ROOT =
  "DOCUMENTACION_APP_BESS/00_BIBLIOTECA_TECNICA_ACTIVA";

export type DocumentRegistryEntry = {
  /** Identificador legible y estable. Convención: bloques en mayúsculas separados por guiones. */
  id: string;
  title: string;
  source: DocumentSource;
  /** Nivel de fuente en la matriz §README_CAPA_TECNICA_INTERMEDIA. */
  level: DocumentLevel;
  /** Ruta histórica (legacy) relativa a DIRECTRICES_APP_BESS/. */
  path: string;
  /**
   * Ruta vigente relativa a `00_BIBLIOTECA_TECNICA_ACTIVA/`. Opcional para
   * entradas cuyo documento no exista físicamente todavía (p. ej. normas
   * licenciadas completas no obtenidas: UL 9540 base).
   */
  pathActive?: string;
  /** Versión publicada (p. ej. "V15", "RES45/2026"). */
  version?: string;
  /** Año/fecha de publicación. ISO date o solo año. */
  publishedAt?: string;
  /** Fecha de entrada en vigencia. */
  validFrom?: string;
  /** ID de la entrada que reemplaza a esta. */
  replacedBy?: string;
  /** True para PDFs oficiales originales; false para resúmenes, OCR, links. */
  isPrimary: boolean;
};

export const documentRegistry: readonly DocumentRegistryEntry[] = [
  // ──────────────────────────────────────────────────────────────────
  // 01 — NORMATIVA SEC: RGR / RIC / RPTD
  // ──────────────────────────────────────────────────────────────────
  {
    id: "SEC-RGR-06-2024",
    title: "SEC RGR 06/2024 — Reglamento sobre Sistemas BESS",
    source: "sec_rgr",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RGR_BESS/SEC_RGR_06_2024_BESS.pdf",
    pathActive: "01_NORMATIVA_CHILE/02_SEC_RGR_BESS/SEC_RGR_06_2024_BESS.pdf",
    publishedAt: "2024",
    isPrimary: true,
  },
  {
    id: "SEC-RIC-04-2020",
    title: "SEC RIC 04 — Conductores y canalizaciones",
    source: "sec_ric",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RIC_PLIEGOS/SEC_RIC_04_Conductores_Canalizaciones.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/03_SEC_RIC_INSTALACIONES_CONSUMO/SEC_RIC_04_Conductores_Canalizaciones.pdf",
    publishedAt: "2020",
    isPrimary: true,
  },
  {
    id: "SEC-RIC-05",
    title: "SEC RIC 05 — Protección contra tensiones peligrosas",
    source: "sec_ric",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RIC_PLIEGOS/SEC_RIC_05_Proteccion_Tensiones_Peligrosas.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/03_SEC_RIC_INSTALACIONES_CONSUMO/SEC_RIC_05_Proteccion_Tensiones_Peligrosas.pdf",
    isPrimary: true,
  },
  {
    id: "SEC-RIC-06",
    title: "SEC RIC 06 — Puesta a tierra",
    source: "sec_ric",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RIC_PLIEGOS/SEC_RIC_06_Puesta_Tierra.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/03_SEC_RIC_INSTALACIONES_CONSUMO/SEC_RIC_06_Puesta_Tierra.pdf",
    isPrimary: true,
  },
  {
    id: "SEC-RIC-07-V1.1",
    title: "SEC RIC 07 — Instalación de equipos (V1.1)",
    source: "sec_ric",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RIC_PLIEGOS/SEC_RIC_07_Instalaciones_Equipos_V1_1.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/03_SEC_RIC_INSTALACIONES_CONSUMO/SEC_RIC_07_Instalaciones_Equipos_V1_1.pdf",
    version: "V1.1",
    isPrimary: true,
  },
  {
    id: "SEC-RIC-11",
    title: "SEC RIC 11 — Instalaciones especiales",
    source: "sec_ric",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RIC_PLIEGOS/SEC_RIC_11_Instalaciones_Especiales.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/03_SEC_RIC_INSTALACIONES_CONSUMO/SEC_RIC_11_Instalaciones_Especiales.pdf",
    isPrimary: true,
  },
  {
    id: "SEC-RIC-13",
    title: "SEC RIC 13 — Subestaciones y salas eléctricas",
    source: "sec_ric",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RIC_PLIEGOS/SEC_RIC_13_Subestaciones_Salas_Electricas.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/03_SEC_RIC_INSTALACIONES_CONSUMO/SEC_RIC_13_Subestaciones_Salas_Electricas.pdf",
    isPrimary: true,
  },
  {
    id: "SEC-RIC-17",
    title: "SEC RIC 17 — Operación y mantenimiento",
    source: "sec_ric",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RIC_PLIEGOS/SEC_RIC_17_Operacion_Mantenimiento.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/03_SEC_RIC_INSTALACIONES_CONSUMO/SEC_RIC_17_Operacion_Mantenimiento.pdf",
    isPrimary: true,
  },
  {
    id: "SEC-RIC-18",
    title: "SEC RIC 18 — Presentación de proyectos",
    source: "sec_ric",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RIC_PLIEGOS/SEC_RIC_18_Presentacion_Proyectos.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/03_SEC_RIC_INSTALACIONES_CONSUMO/SEC_RIC_18_Presentacion_Proyectos.pdf",
    isPrimary: true,
  },
  {
    id: "SEC-RIC-19-V1.1",
    title: "SEC RIC 19 — Puesta en servicio (V1.1, 2021/06)",
    source: "sec_ric",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RIC_PLIEGOS/SEC_RIC_19_Puesta_en_Servicio_2021_06.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/03_SEC_RIC_INSTALACIONES_CONSUMO/SEC_RIC_19_Puesta_en_Servicio_2021_06.pdf",
    version: "V1.1",
    publishedAt: "2021-06",
    isPrimary: true,
  },
  {
    id: "SEC-RPTD-01-2021",
    title: "SEC RPTD 01 — Tensiones y frecuencias nominales (2021)",
    source: "sec_rptd",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_01_Tensiones_Frecuencias_Nominales_2021.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/04_SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_01_Tensiones_Frecuencias_Nominales_2021.pdf",
    publishedAt: "2021",
    isPrimary: true,
  },
  {
    id: "SEC-RPTD-02-2020",
    title: "SEC RPTD 02 — Clasificación de instalaciones (2020)",
    source: "sec_rptd",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_02_Clasificacion_Instalaciones_2020.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/04_SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_02_Clasificacion_Instalaciones_2020.pdf",
    publishedAt: "2020",
    isPrimary: true,
  },
  {
    id: "SEC-RPTD-06-2021",
    title: "SEC RPTD 06 — Puesta a tierra (2021)",
    source: "sec_rptd",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_06_Puesta_Tierra_2021.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/04_SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_06_Puesta_Tierra_2021.pdf",
    publishedAt: "2021",
    isPrimary: true,
  },
  {
    id: "SEC-RPTD-07-2022",
    title: "SEC RPTD 07 — Franja y distancias de seguridad (2022)",
    source: "sec_rptd",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_07_Franja_Distancias_Seguridad_2022.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/04_SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_07_Franja_Distancias_Seguridad_2022.pdf",
    publishedAt: "2022",
    isPrimary: true,
  },
  {
    id: "SEC-RPTD-08-2020",
    title: "SEC RPTD 08 — Protección contra incendios (2020)",
    source: "sec_rptd",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_08_Proteccion_Incendios_2020.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/04_SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_08_Proteccion_Incendios_2020.pdf",
    publishedAt: "2020",
    isPrimary: true,
  },
  {
    id: "SEC-RPTD-09-2020",
    title: "SEC RPTD 09 — Señalización de seguridad (2020)",
    source: "sec_rptd",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_09_Senalizacion_Seguridad_2020.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/04_SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_09_Senalizacion_Seguridad_2020.pdf",
    publishedAt: "2020",
    isPrimary: true,
  },
  {
    id: "SEC-RPTD-10-2020",
    title: "SEC RPTD 10 — Centrales de producción y subestaciones (2020)",
    source: "sec_rptd",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_10_Centrales_Produccion_Subestaciones_2020.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/04_SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_10_Centrales_Produccion_Subestaciones_2020.pdf",
    publishedAt: "2020",
    isPrimary: true,
  },
  {
    id: "SEC-RPTD-13-2020",
    title: "SEC RPTD 13 — Líneas de media y baja tensión (2020)",
    source: "sec_rptd",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_13_Lineas_Media_Baja_Tension_2020.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/04_SEC_RPTD_PRODUCCION_TRANSPORTE_ALMACENAMIENTO/SEC_RPTD_13_Lineas_Media_Baja_Tension_2020.pdf",
    publishedAt: "2020",
    isPrimary: true,
  },
  {
    id: "LEY-21505-2022",
    title: "Ley 21.505 — Almacenamiento de energía y electromovilidad",
    source: "law",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/MARCO_GENERAL_ELECTRICO/Ley_21505_Almacenamiento_Energia_Electromovilidad_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/01_MARCO_ELECTRICO_GENERAL_Y_ALMACENAMIENTO/Ley_21505_Almacenamiento_Energia_Electromovilidad_LeyChile.pdf",
    publishedAt: "2022",
    isPrimary: true,
  },
  {
    id: "DFL-4-LGSE",
    title: "DFL 4 — Ley General de Servicios Eléctricos",
    source: "law",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/MARCO_GENERAL_ELECTRICO/DFL_4_LGSE_Ley_General_Servicios_Electricos_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/01_MARCO_ELECTRICO_GENERAL_Y_ALMACENAMIENTO/DFL_4_LGSE_Ley_General_Servicios_Electricos_LeyChile.pdf",
    isPrimary: true,
  },
  {
    id: "DS-125-2017",
    title: "DS 125/2017 — Reglamento de Coordinación de la Operación del SEN",
    source: "decree",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/MARCO_GENERAL_ELECTRICO/DS_125_2017_Reglamento_Coordinacion_Operacion_SEN_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/01_MARCO_ELECTRICO_GENERAL_Y_ALMACENAMIENTO/DS_125_2017_Reglamento_Coordinacion_Operacion_SEN_LeyChile.pdf",
    publishedAt: "2017",
    isPrimary: true,
  },
  {
    id: "DS-109-RSIE",
    title: "DS 109 — Reglamento de Seguridad de Instalaciones Eléctricas",
    source: "decree",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/MARCO_GENERAL_ELECTRICO/Decreto_109_Reglamento_Seguridad_Instalaciones_Electricas_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/01_MARCO_ELECTRICO_GENERAL_Y_ALMACENAMIENTO/Decreto_109_Reglamento_Seguridad_Instalaciones_Electricas_LeyChile.pdf",
    isPrimary: true,
  },
  {
    id: "DS-88-2019-PMGD",
    title: "DS 88/2019 — Reglamento de Medios de Generación de Pequeña Escala",
    source: "decree",
    level: "L3_standard_or_official",
    path: "01_NORMATIVA_SEC_RGR_RIC/MARCO_GENERAL_ELECTRICO/DS_88_2019_Reglamento_Medios_Generacion_Pequena_Escala_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/01_MARCO_ELECTRICO_GENERAL_Y_ALMACENAMIENTO/DS_88_2019_Reglamento_Medios_Generacion_Pequena_Escala_LeyChile.pdf",
    publishedAt: "2019",
    isPrimary: true,
  },

  // ──────────────────────────────────────────────────────────────────
  // 02 — NORMATIVA CNE / CEN / SEN
  // ──────────────────────────────────────────────────────────────────
  {
    id: "CNE-NTSyCS-RES45-2026",
    title: "CNE NTSyCS — Norma técnica de Seguridad y Calidad de Servicio (RES 45/2026)",
    source: "cne",
    level: "L3_standard_or_official",
    path: "02_NORMATIVA_CNE_CEN_SEN/CNE_NORMAS_TECNICAS_SEN/CNE_NTSyCS_RES45_2026.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/06_CNE_NORMAS_TECNICAS_SEN/CNE_NTSyCS_RES45_2026.pdf",
    version: "RES45/2026",
    publishedAt: "2026",
    isPrimary: true,
  },
  {
    id: "CNE-NTSyCS-ENE-2025",
    title: "CNE NTSyCS — Versión enero 2025 (histórica)",
    source: "cne",
    level: "L3_standard_or_official",
    path: "02_NORMATIVA_CNE_CEN_SEN/CNE_NORMAS_TECNICAS_SEN/CNE_NTSyCS_Ene_2025.pdf",
    pathActive: "01_NORMATIVA_CHILE/06_CNE_NORMAS_TECNICAS_SEN/CNE_NTSyCS_Ene_2025.pdf",
    publishedAt: "2025-01",
    replacedBy: "CNE-NTSyCS-RES45-2026",
    isPrimary: true,
  },
  {
    id: "CNE-NTSSCC-RES45-2026",
    title: "CNE NTSSCC — Norma técnica de Servicios Complementarios (RES 45/2026)",
    source: "cne",
    level: "L3_standard_or_official",
    path: "02_NORMATIVA_CNE_CEN_SEN/CNE_NORMAS_TECNICAS_SEN/CNE_NTSSCC_RES45_2026.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/06_CNE_NORMAS_TECNICAS_SEN/CNE_NTSSCC_RES45_2026.pdf",
    version: "RES45/2026",
    publishedAt: "2026",
    isPrimary: true,
  },
  {
    id: "CNE-IBR-RES45-2026",
    title: "CNE AT IBR — Inverter-based resources (RES 45/2026)",
    source: "cne",
    level: "L3_standard_or_official",
    path: "02_NORMATIVA_CNE_CEN_SEN/CNE_NORMAS_TECNICAS_SEN/CNE_AT_IBR_RES45_2026.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/06_CNE_NORMAS_TECNICAS_SEN/CNE_AT_IBR_RES45_2026.pdf",
    version: "RES45/2026",
    publishedAt: "2026",
    isPrimary: true,
  },
  {
    id: "CNE-Sismico-REX41-2025",
    title: "CNE REX 41/2025 — Requisitos sísmicos",
    source: "cne",
    level: "L3_standard_or_official",
    path: "02_NORMATIVA_CNE_CEN_SEN/CNE_NORMAS_TECNICAS_SEN/CNE_AT_Requisitos_Sismicos_2025.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/06_CNE_NORMAS_TECNICAS_SEN/CNE_REX_41_2025_Requisitos_Sismicos_LeyChile.pdf",
    publishedAt: "2025",
    isPrimary: true,
  },
  {
    id: "CEN-Anexo1-PMGD-2024",
    title: "CEN Anexo 1 — Requerimientos de interconexión PMGD (2024)",
    source: "cen",
    level: "L3_standard_or_official",
    path: "02_NORMATIVA_CNE_CEN_SEN/CEN_CONEXION_OPERACION/CEN_Anexo_1_Requerimientos_Interconexion_PMGD_2024.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/05_CEN_INTERCONEXION_OPERACION_SEN/CEN_Anexo_1_Requerimientos_Interconexion_PMGD_2024.pdf",
    publishedAt: "2024",
    isPrimary: true,
  },
  {
    id: "CEN-Anexo2-NIMR-2024",
    title: "CEN Anexo 2 — Requerimientos de interconexión NI/MR/MNR (2024)",
    source: "cen",
    level: "L3_standard_or_official",
    path: "02_NORMATIVA_CNE_CEN_SEN/CEN_CONEXION_OPERACION/CEN_Anexo_2_Requerimientos_Interconexion_NI_MR_MNR_2024.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/05_CEN_INTERCONEXION_OPERACION_SEN/CEN_Anexo_2_Requerimientos_Interconexion_NI_MR_MNR_2024.pdf",
    publishedAt: "2024",
    isPrimary: true,
  },
  {
    id: "CEN-Anexo3-Desconexion-2024",
    title: "CEN Anexo 3 — Retiro, desconexión y cese de operaciones SEN (2024)",
    source: "cen",
    level: "L3_standard_or_official",
    path: "02_NORMATIVA_CNE_CEN_SEN/CEN_CONEXION_OPERACION/CEN_Anexo_3_Retiro_Desconexion_Cese_Operaciones_SEN_2024.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/05_CEN_INTERCONEXION_OPERACION_SEN/CEN_Anexo_3_Retiro_Desconexion_Cese_Operaciones_SEN_2024.pdf",
    publishedAt: "2024",
    isPrimary: true,
  },

  // ──────────────────────────────────────────────────────────────────
  // 03 — NORMATIVA TERRITORIAL / AMBIENTAL
  // ──────────────────────────────────────────────────────────────────
  {
    id: "SEA-CrAlmEn-DS17-2026",
    title: "SEA — Criterio de Almacenamiento de Energía (DS17/2026)",
    source: "sea",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/AMBIENTAL_SEA_RUIDO_RESIDUOS/SEA_Criterio_Almacenamiento_Energia_DS17_2026.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/SEA_Criterio_Almacenamiento_Energia_DS17_2026.pdf",
    version: "DS17/2026",
    publishedAt: "2026",
    isPrimary: true,
  },
  {
    id: "SEA-CrAlmEn-2023-novigente",
    title: "SEA — Criterio Almacenamiento de Energía (2023, no vigente)",
    source: "sea",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/AMBIENTAL_SEA_RUIDO_RESIDUOS/SEA_Criterio_Almacenamiento_Energia_No_Vigente_2023.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/SEA_Criterio_Almacenamiento_Energia_No_Vigente_2023.pdf",
    publishedAt: "2023",
    replacedBy: "SEA-CrAlmEn-DS17-2026",
    isPrimary: true,
  },
  {
    id: "DS-40-2012-SEIA",
    title: "DS 40/2012 — Reglamento del SEIA",
    source: "decree",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/AMBIENTAL_SEA_RUIDO_RESIDUOS/DS_40_2012_Reglamento_SEIA_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/DS_40_2012_Reglamento_SEIA_LeyChile.pdf",
    publishedAt: "2012",
    isPrimary: true,
  },
  {
    id: "DS-38-2011-Ruido",
    title: "DS 38/2011 MMA — Norma de emisión de ruidos",
    source: "mma",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/AMBIENTAL_SEA_RUIDO_RESIDUOS/DS_38_2011_MMA_Ruido_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/DS_38_2011_MMA_Ruido_LeyChile.pdf",
    publishedAt: "2011",
    isPrimary: true,
  },
  {
    id: "LEY-19300",
    title: "Ley 19.300 — Bases Generales del Medio Ambiente",
    source: "law",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/AMBIENTAL_SEA_RUIDO_RESIDUOS/Ley_19300_Bases_Generales_Medio_Ambiente_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/Ley_19300_Bases_Generales_Medio_Ambiente_LeyChile.pdf",
    isPrimary: true,
  },
  {
    id: "LEY-20920-REP",
    title: "Ley 20.920 — Responsabilidad Extendida del Productor (REP)",
    source: "law",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/AMBIENTAL_SEA_RUIDO_RESIDUOS/Ley_20920_REP_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/Ley_20920_REP_LeyChile.pdf",
    isPrimary: true,
  },
  {
    id: "DS-148-2003-ResPeligrosos",
    title: "DS 148/2003 MINSAL — Residuos peligrosos",
    source: "minsal",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/AMBIENTAL_SEA_RUIDO_RESIDUOS/DS_148_2003_MINSAL_Residuos_Peligrosos_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/DS_148_2003_MINSAL_Residuos_Peligrosos_LeyChile.pdf",
    publishedAt: "2003",
    isPrimary: true,
  },
  {
    id: "DS-43-2015-AlmacenSustancias",
    title: "DS 43/2015 MINSAL — Almacenamiento de Sustancias Peligrosas",
    source: "minsal",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/AMBIENTAL_SEA_RUIDO_RESIDUOS/DS_43_2015_MINSAL_Almacenamiento_Sustancias_Peligrosas_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/DS_43_2015_MINSAL_Almacenamiento_Sustancias_Peligrosas_LeyChile.pdf",
    publishedAt: "2015",
    isPrimary: true,
  },
  {
    id: "MINVU-DDU-522-BESS",
    title: "MINVU DDU 522 — BESS (pronunciamiento territorial)",
    source: "minvu",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/TERRITORIAL_URBANISMO_PERMISOS/MINVU_DDU_522_BESS.pdf",
    pathActive: "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/MINVU_DDU_522_BESS.pdf",
    isPrimary: true,
  },
  {
    id: "DS-47-OGUC",
    title: "DS 47 — Ordenanza General de Urbanismo y Construcciones (OGUC)",
    source: "decree",
    level: "L3_standard_or_official",
    path: "03_NORMATIVA_TERRITORIAL_AMBIENTAL_PERMISOS/TERRITORIAL_URBANISMO_PERMISOS/DS_47_1992_OGUC_Ordenanza_General_Urbanismo_Construcciones_LeyChile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/07_AMBIENTAL_TERRITORIAL_PERMISOS/DS_47_1992_OGUC_Ordenanza_General_Urbanismo_Construcciones_LeyChile.pdf",
    publishedAt: "1992",
    isPrimary: true,
  },

  // ──────────────────────────────────────────────────────────────────
  // 04 — SEGURIDAD / INCENDIO (referencias internacionales)
  //   NFPA 855 y UL 9540 completos siguen sin estar disponibles en la
  //   biblioteca (matriz §B). Solo overview/errata pública.
  // ──────────────────────────────────────────────────────────────────
  {
    id: "NFPA-855",
    title:
      "NFPA 855 — Standard for the Installation of Stationary ESS (solo errata pública 2026 disponible; norma completa pendiente)",
    source: "international_standard",
    level: "L3_standard_or_official",
    path: "04_SEGURIDAD_INCENDIO_NFPA_UL/REFERENCIA_NFPA_855.md",
    pathActive:
      "02_REFERENCIAS_INTERNACIONALES_Y_BUENAS_PRACTICAS/04_NORMAS_LICENCIADAS_Y_REFERENCIAS_PUBLICAS/NFPA_855_2026_Errata_1_Publica_NO_NORMA_COMPLETA.pdf",
    isPrimary: false,
  },
  {
    id: "UL-9540",
    title: "UL 9540 — Standard for ESS and Equipment (norma completa NO disponible en biblioteca)",
    source: "international_standard",
    level: "L3_standard_or_official",
    path: "04_SEGURIDAD_INCENDIO_NFPA_UL/REFERENCIA_UL_9540.md",
    // No hay PDF UL 9540 base en la biblioteca activa; la referencia más cercana
    // es el overview UL 9540A, que conceptualmente menciona el marco UL 9540.
    pathActive:
      "02_REFERENCIAS_INTERNACIONALES_Y_BUENAS_PRACTICAS/04_NORMAS_LICENCIADAS_Y_REFERENCIAS_PUBLICAS/UL_9540A_Test_Method_Public_Overview_2018_NO_NORMA_COMPLETA.pdf",
    isPrimary: false,
  },
  {
    id: "UL-9540A-SWRI",
    title:
      "UL 9540A — Public overview del método de ensayo (NO es reporte SwRI; el test por equipo está pendiente)",
    source: "international_standard",
    level: "L3_standard_or_official",
    path: "04_SEGURIDAD_INCENDIO_NFPA_UL/REFERENCIA_UL_9540A_SWRI.md",
    pathActive:
      "02_REFERENCIAS_INTERNACIONALES_Y_BUENAS_PRACTICAS/04_NORMAS_LICENCIADAS_Y_REFERENCIAS_PUBLICAS/UL_9540A_Test_Method_Public_Overview_2018_NO_NORMA_COMPLETA.pdf",
    isPrimary: false,
  },

  // ──────────────────────────────────────────────────────────────────
  // 05 — DATASHEETS OFICIALES
  // ──────────────────────────────────────────────────────────────────
  {
    id: "SUNGROW-ST2752UX-V15",
    title: "Sungrow ST2752UX-US Datasheet V15 (EN, oficial)",
    source: "manufacturer_datasheet",
    level: "L1_oem_exact_equipment",
    path: "05_DATASHEETS_EQUIPOS_BESS/01_CONTENEDORES_BATERIAS/SUNGROW_ST2752UX-US_Datasheet_V15_EN_OFICIAL.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/01_SUNGROW/01_PowerTitan_ST2752UX_Bateria/SUNGROW_ST2752UX-US_Datasheet_V15_EN_OFICIAL.pdf",
    version: "V15",
    isPrimary: true,
  },
  {
    id: "SUNGROW-ST2752UX-MATERIAL",
    title: "Sungrow ST2752UX Datasheet Material (oficial)",
    source: "manufacturer_datasheet",
    level: "L1_oem_exact_equipment",
    path: "05_DATASHEETS_EQUIPOS_BESS/01_CONTENEDORES_BATERIAS/SUNGROW_ST2752UX_Datasheet_Material_OFICIAL.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/01_SUNGROW/01_PowerTitan_ST2752UX_Bateria/SUNGROW_ST2752UX_Datasheet_Material_OFICIAL.pdf",
    isPrimary: true,
  },
  {
    id: "SUNGROW-ST2752UX-MANUAL-V12",
    title: "Sungrow ST2752UX System Manual Ver12 (2022/04, oficial)",
    source: "manufacturer_manual",
    level: "L1_oem_exact_equipment",
    path: "05_DATASHEETS_EQUIPOS_BESS/11_DOCUMENTOS_FABRICANTE_MANUALES/SUNGROW_ST2752UX_System_Manual_Ver12_202204_OFICIAL.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/01_SUNGROW/01_PowerTitan_ST2752UX_Bateria/SUNGROW_ST2752UX_System_Manual_Ver12_202204_OFICIAL.pdf",
    version: "V12",
    publishedAt: "2022-04",
    isPrimary: true,
  },
  {
    id: "SUNGROW-SC5000UD-MV-US",
    title: "Sungrow SC5000UD-MV-US Datasheet (oficial)",
    source: "manufacturer_datasheet",
    level: "L1_oem_exact_equipment",
    path: "05_DATASHEETS_EQUIPOS_BESS/02_PCS_INVERSORES/SUNGROW_SC5000UD-MV-US_Datasheet_OFICIAL.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/01_SUNGROW/02_SC5000UD_MV_PCS_MV_Station/SUNGROW_SC5000UD-MV-US_Datasheet_OFICIAL.pdf",
    isPrimary: true,
  },
  {
    id: "SUNGROW-SC5000UD-MV-V15",
    title: "Sungrow SC5000UD-MV Datasheet V15 (EN, oficial)",
    source: "manufacturer_datasheet",
    level: "L1_oem_exact_equipment",
    path: "05_DATASHEETS_EQUIPOS_BESS/02_PCS_INVERSORES/SUNGROW_SC5000UD-MV_Datasheet_V15_EN_OFICIAL.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/01_SUNGROW/02_SC5000UD_MV_PCS_MV_Station/SUNGROW_SC5000UD-MV_Datasheet_V15_EN_OFICIAL.pdf",
    version: "V15",
    isPrimary: true,
  },
  {
    id: "SUNGROW-SC5000UD-MV-V14",
    title: "Sungrow SC5000UD-MV Datasheet V14 (EN, oficial)",
    source: "manufacturer_datasheet",
    level: "L1_oem_exact_equipment",
    path: "05_DATASHEETS_EQUIPOS_BESS/02_PCS_INVERSORES/SUNGROW_SC5000UD-MV_Datasheet_V14_EN_OFICIAL.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/01_SUNGROW/02_SC5000UD_MV_PCS_MV_Station/SUNGROW_SC5000UD-MV_Datasheet_V14_EN_OFICIAL.pdf",
    version: "V14",
    replacedBy: "SUNGROW-SC5000UD-MV-V15",
    isPrimary: true,
  },
  {
    id: "SUNGROW-PT2-WP-2024",
    title: "Sungrow PowerTitan 2 Whitepaper (2024/08, oficial)",
    source: "manufacturer_whitepaper",
    // Whitepaper de OEM pero arquitectura comercial (PowerTitan 2 ≠ ST2752UX).
    // En la matriz §README cae en L5.
    level: "L5_whitepaper_brochure",
    path: "05_DATASHEETS_EQUIPOS_BESS/08_INCENDIO_SEGURIDAD_BESS/SUNGROW_PowerTitan2_Whitepaper_20240821_OFICIAL.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/01_SUNGROW/03_PowerTitan_2_0_Sistema/SUNGROW_PowerTitan2_Whitepaper_20240821_OFICIAL.pdf",
    publishedAt: "2024-08-21",
    isPrimary: true,
  },
  {
    id: "SUNGROW-LOTO-202210",
    title: "Sungrow Liquid Cooling ESS — LOTO Instruction (2022/10, oficial)",
    source: "manufacturer_manual",
    // Aplica a la familia Sungrow liquid cooling (incluye ST2752UX).
    level: "L2_oem_same_family",
    path: "05_DATASHEETS_EQUIPOS_BESS/11_DOCUMENTOS_FABRICANTE_MANUALES/SUNGROW_Liquid_Cooling_ESS_LOTO_Instruction_202210_OFICIAL.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/01_SUNGROW/04_Manuales_Instalacion_LOTO/SUNGROW_Liquid_Cooling_ESS_LOTO_Instruction_202210_OFICIAL.pdf",
    publishedAt: "2022-10",
    isPrimary: true,
  },
  {
    id: "SIEMENS-8DA-8DB-40p5",
    title: "Siemens 8DA / 8DB GIS 40,5 kV — Catalog (referencial)",
    source: "third_party_reference",
    // Referencia de fabricante de la misma clase de equipo pero no del proyecto.
    level: "L2_oem_same_family",
    path: "05_DATASHEETS_EQUIPOS_BESS/05_SWITCHGEAR_CELDAS_MT/SIEMENS_8DA_8DB_40p5kV_GIS_Catalog_REFERENCE.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/90_COMPONENTES_ELECTRICOS/02_SWITCHGEAR_CELDAS_MT/SIEMENS_8DA_8DB_40p5kV_GIS_Catalog_REFERENCE.pdf",
    isPrimary: false,
  },
  {
    id: "NEXANS-NA2XS2Y-19-33",
    title: "Nexans NA2XS2Y 19/33 kV 630 mm² HDPE (referencial)",
    source: "third_party_reference",
    level: "L2_oem_same_family",
    path: "05_DATASHEETS_EQUIPOS_BESS/06_CABLES_MT_BT_DC_CANALIZACIONES/NEXANS_NA2XS2Y_19_33kV_630mm2_HDPE_REFERENCE.pdf",
    pathActive:
      "03_FABRICANTES_EQUIPOS_Y_COMPATIBILIDAD/90_COMPONENTES_ELECTRICOS/03_CABLES_CANALIZACIONES/NEXANS_NA2XS2Y_19_33kV_630mm2_HDPE_REFERENCE.pdf",
    isPrimary: false,
  },

  // ──────────────────────────────────────────────────────────────────
  // 06 — INFORMES TÉCNICOS BESS DEL DESIERTO (caso real, L4)
  // ──────────────────────────────────────────────────────────────────
  {
    id: "PROJ-BESS-DESIERTO-1129",
    title: "EE-EN-2025-1129 — Informe Final Mínimo Técnico BESS del Desierto",
    source: "project_report",
    level: "L4_public_project_or_authority",
    path: "06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/INFORMES_TECNICOS_CASO/BESS_DESIERTO_Informe_Minimo_Tecnico_EE_EN_2025_1129.pdf",
    pathActive:
      "04_CASOS_REFERENCIA_Y_PROYECTOS_REALES/01_BESS_DEL_DESIERTO/01_PDF_ORIGINALES/BESS_DESIERTO_Informe_Minimo_Tecnico_EE_EN_2025_1129.pdf",
    publishedAt: "2025",
    isPrimary: true,
  },
  {
    id: "PROJ-BESS-DESIERTO-1092",
    title: "EE-EN-2025-1092 — Procesos de Partida y Detención BESS del Desierto",
    source: "project_report",
    level: "L4_public_project_or_authority",
    path: "06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/INFORMES_TECNICOS_CASO/BESS_DESIERTO_Informe_Partida_Detencion_EE_EN_2025_1092.pdf",
    pathActive:
      "04_CASOS_REFERENCIA_Y_PROYECTOS_REALES/01_BESS_DEL_DESIERTO/01_PDF_ORIGINALES/BESS_DESIERTO_Informe_Partida_Detencion_EE_EN_2025_1092.pdf",
    publishedAt: "2025",
    isPrimary: true,
  },
  {
    id: "PROJ-BESS-DESIERTO-2611",
    title: "EE-EN-2025-2611 — Potencia Máxima BESS del Desierto",
    source: "project_report",
    level: "L4_public_project_or_authority",
    path: "06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/INFORMES_TECNICOS_CASO/BESS_DESIERTO_Informe_Potencia_Maxima_EE_EN_2025_2611.pdf",
    pathActive:
      "04_CASOS_REFERENCIA_Y_PROYECTOS_REALES/01_BESS_DEL_DESIERTO/01_PDF_ORIGINALES/BESS_DESIERTO_Informe_Potencia_Maxima_EE_EN_2025_2611.pdf",
    publishedAt: "2025",
    isPrimary: true,
  },
  {
    id: "PROJ-BESS-DESIERTO-ANALISIS",
    title: "Análisis técnico para app de predimensionamiento (síntesis interna)",
    source: "internal_summary",
    level: "L7_unverifiable_pending",
    path: "06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/BESS_DESIERTO_Analisis_Tecnico_App_Predimensionamiento.md",
    isPrimary: false,
  },

  // ──────────────────────────────────────────────────────────────────
  // 10 — RESÚMENES INTERNOS (no primarios, L7)
  // ──────────────────────────────────────────────────────────────────
  {
    id: "INT-Normativa-BESS-Utility-Chile",
    title: "Resumen interno — Normativa BESS Utility-Scale Chile",
    source: "internal_summary",
    level: "L7_unverifiable_pending",
    path: "10_RESUMENES_INTERNOS_Y_DOCUMENTOS_DE_APOYO/NORMATIVA_RESUMENES_INTERNOS/Normativa_BESS_Utility-Scale_Chile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/01_MARCO_ELECTRICO_GENERAL_Y_ALMACENAMIENTO/Normativa_BESS_Utility-Scale_Chile.pdf",
    isPrimary: false,
  },
  {
    id: "INT-Reglamentos-Clave-App",
    title: "Resumen interno — Reglamentos clave app BESS Chile",
    source: "internal_summary",
    level: "L7_unverifiable_pending",
    path: "10_RESUMENES_INTERNOS_Y_DOCUMENTOS_DE_APOYO/NORMATIVA_RESUMENES_INTERNOS/reglamentos_clave_app_bess_chile.pdf",
    pathActive:
      "01_NORMATIVA_CHILE/01_MARCO_ELECTRICO_GENERAL_Y_ALMACENAMIENTO/reglamentos_clave_app_bess_chile.pdf",
    isPrimary: false,
  },
];

/** Lookup helper. Throws if the id is not registered. */
export function documentRef(id: string): DocumentRegistryEntry {
  const entry = documentRegistry.find((d) => d.id === id);
  if (!entry) {
    throw new Error(`DocumentRegistry: id not found: ${id}`);
  }
  return entry;
}

/** Soft lookup helper. Returns undefined if not found. */
export function findDocument(id: string): DocumentRegistryEntry | undefined {
  return documentRegistry.find((d) => d.id === id);
}

/** All currently-valid (non-replaced) documents. */
export function activeDocuments(): readonly DocumentRegistryEntry[] {
  return documentRegistry.filter((d) => !d.replacedBy);
}

/**
 * Resolves the absolute-ish trazability path used in reports and UI.
 *
 * Prefers `pathActive` (root: `00_BIBLIOTECA_TECNICA_ACTIVA/`) and falls back
 * to the historical `path` (root: `DIRECTRICES_APP_BESS/`) for entries whose
 * file has not been migrated. Returned strings are *not* served by the app —
 * they are user-facing references for traceability and audit only.
 */
export function resolveDocumentPath(entry: DocumentRegistryEntry): string {
  if (entry.pathActive) {
    return `${BIBLIOTECA_ACTIVA_ROOT}/${entry.pathActive}`;
  }
  return `DIRECTRICES_APP_BESS/${entry.path}`;
}

/**
 * Whether a document may be cited as `documented` evidence.
 *
 * Per the matrix: only L1, L2 and L4 (proyecto público) are allowed as
 * direct documented evidence. L3 (norma) typically goes as `inferred` until
 * the licensed text is read; L5/L7 are reference/pending and never
 * "documented"; L6 has no documentary backing.
 */
export function isDocumentedLevel(level: DocumentLevel): boolean {
  return (
    level === "L1_oem_exact_equipment" ||
    level === "L2_oem_same_family" ||
    level === "L4_public_project_or_authority"
  );
}
