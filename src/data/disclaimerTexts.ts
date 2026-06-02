/**
 * Technical warning and disclaimer texts for the BESS Layout Designer MVP.
 * Derived from the official technical guidelines and 04_ADVERTENCIAS_EXCLUSIONES_REPORTE.md.
 */

export type DisclaimerKey =
  | "generalMvp"
  | "conceptualSizing"
  | "documentTraceability"
  | "uncertifiedRules"
  | "fireSafetyPending"
  | "electricalCompatibility"
  | "conceptualLayout"
  | "conceptualInfrastructure"
  | "internationalReferenceOnly"
  | "shortInterface";

export const disclaimerTexts: Record<DisclaimerKey, string> = {
  generalMvp:
    "Este reporte corresponde a un predimensionamiento preliminar BESS. No certifica cumplimiento SEC ni reemplaza la ingeniería de detalle, el diseño de detalle de la malla de tierra, la revisión del fabricante, la revisión de la aseguradora, ni los permisos ambientales, municipales o sectoriales. Los resultados son útiles para la evaluación temprana de capacidad, ocupación física, configuración conceptual y comparación de alternativas. No constituyen ingeniería de detalle ni autorización de construcción, interconexión, operación o cumplimiento normativo final.",

  conceptualSizing:
    "Los cálculos eléctricos son preliminares. No reemplazan estudios de flujo de carga, cortocircuito, coordinación de protecciones, estabilidad RMS/EMT, armónicos, calidad de suministro, puesta a tierra, arco eléctrico ni estudios de interconexión exigidos por el Coordinador Eléctrico Nacional u otra autoridad.",

  documentTraceability:
    "Los datos de equipos provienen de documentos públicos de fabricante, reportes públicos de proyecto y referencias técnicas. Cuando no existe fuente oficial del equipo exacto, el dato se presenta como supuesto editable, benchmark o pendiente. Ningún valor referencial debe usarse como requisito contractual sin validación documental.",

  uncertifiedRules:
    "Los valores de espaciamiento y criterios no certificados en el catálogo corresponden a supuestos de prediseño y benchmarks preliminares. Deben ser validados mediante documentación contractual del fabricante y no constituyen reglas de diseño definitivas.",

  fireSafetyPending:
    "Las referencias a UL 9540, UL 9540A y NFPA 855 se usan como contexto técnico y checklist preliminar. La app no certifica distancias de separación contra incendio. Toda separación final debe validarse con el reporte UL 9540A del equipo exacto, criterios del fabricante, requerimientos AHJ, aseguradora y normativa local aplicable.",

  electricalCompatibility:
    "La compatibilidad entre contenedores BESS, PCS, transformadores, MV station, EMS/PPC y sistemas auxiliares solo puede considerarse definitiva cuando exista matriz, carta técnica, manual o BOM del fabricante/EPC/titular. La app puede sugerir configuraciones preliminares, pero no certifica compatibilidad contractual.",

  conceptualLayout:
    "El layout generado es conceptual. Requiere validación mediante layout guide del fabricante, plano civil, criterios de mantenimiento, caminos de emergencia, radios de giro, restricciones ambientales, topografía, drenaje, geotecnia y criterios AHJ/aseguradora.",

  conceptualInfrastructure:
    "Las canalizaciones, zanjas y corredores de cables se muestran como capas conceptuales. Su dimensionamiento final requiere cable schedule, memoria de canalizaciones, criterios de instalación, agrupamiento térmico, método de tendido, cálculos de ampacidad, caída de tensión y detalles civiles.",

  internationalReferenceOnly:
    "Las normas internacionales (tales como NFPA 855, UL 9540, UL 9540A, IEC 62933 o IEEE 2800) se consideran únicamente como referencias técnicas y buenas prácticas complementarias de prediseño cuando corresponda. No sustituyen los reglamentos y pliegos técnicos obligatorios dictados por la SEC u otras autoridades locales en Chile.",

  shortInterface:
    "Predimensionamiento preliminar. No certifica cumplimiento SEC ni reemplaza la ingeniería de detalle, la revisión de fabricante o de aseguradora, ni permisos ambientales, municipales o sectoriales.",
};
