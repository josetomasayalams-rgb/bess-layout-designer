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
    "Este reporte corresponde a un predimensionamiento preliminar BESS. Los resultados son utiles para evaluacion temprana de capacidad, ocupacion fisica, configuracion conceptual y comparacion de alternativas. No constituyen ingenieria de detalle ni autorizacion de construccion, interconexion, operacion o cumplimiento normativo final.",

  conceptualSizing:
    "Los calculos electricos son preliminares. No reemplazan estudios de flujo de carga, cortocircuito, coordinacion de protecciones, estabilidad RMS/EMT, armonicos, calidad de suministro, puesta a tierra, arco electrico ni estudios de interconexion exigidos por el Coordinador Electrico Nacional u otra autoridad.",

  documentTraceability:
    "Los datos de equipos provienen de documentos publicos de fabricante, reportes publicos de proyecto y referencias tecnicas. Cuando no existe fuente oficial del equipo exacto, el dato se presenta como supuesto editable, benchmark o pendiente. Ningun valor referencial debe usarse como requisito contractual sin validacion documental.",

  uncertifiedRules:
    "Los valores de espaciamiento y criterios no certificados en el catalogo corresponden a supuestos de prediseno y benchmarks preliminares. Deben ser validados mediante documentacion contractual del fabricante y no constituyen reglas de diseno definitivas.",

  fireSafetyPending:
    "Las referencias a UL 9540, UL 9540A y NFPA 855 se usan como contexto tecnico y checklist preliminar. La app no certifica distancias de separacion contra incendio. Toda separacion final debe validarse con el reporte UL 9540A del equipo exacto, criterios del fabricante, requerimientos AHJ, aseguradora y normativa local aplicable.",

  electricalCompatibility:
    "La compatibilidad entre contenedores BESS, PCS, transformadores, MV station, EMS/PPC y sistemas auxiliares solo puede considerarse definitiva cuando exista matriz, carta tecnica, manual o BOM del fabricante/EPC/titular. La app puede sugerir configuraciones preliminares, pero no certifica compatibilidad contractual.",

  conceptualLayout:
    "El layout generado es conceptual. Requiere validacion mediante layout guide del fabricante, plano civil, criterios de mantenimiento, caminos de emergencia, radios de giro, restricciones ambientales, topografia, drenaje, geotecnia y criterios AHJ/aseguradora.",

  conceptualInfrastructure:
    "Las canalizaciones, zanjas y corredores de cables se muestran como capas conceptuales. Su dimensionamiento final requiere cable schedule, memoria de canalizaciones, criterios de instalacion, agrupamiento termico, metodo de tendido, calculos de ampacidad, caida de tension y detalles civiles.",

  internationalReferenceOnly:
    "Las normas internacionales (tales como NFPA 855, UL 9540, UL 9540A, IEC 62933 o IEEE 2800) se consideran unicamente como referencias tecnicas y buenas practicas complementarias de prediseno cuando corresponda. No sustituyen los reglamentos y pliegos tecnicos obligatorios dictados por la SEC u otras autoridades locales en Chile.",

  shortInterface:
    "Predimensionamiento preliminar. Requiere validacion de fabricante/EPC/AHJ y estudios de ingenieria de detalle antes de usarse para diseno, permisos, construccion u operacion.",
};
