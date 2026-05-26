/**
 * Engineering exclusions registry for the BESS Layout Designer MVP.
 * Derived from the official technical guidelines and 04_ADVERTENCIAS_EXCLUSIONES_REPORTE.md.
 */

export interface MvpExclusion {
  id: string;
  label: string;
  category: "electrical" | "civil" | "safety" | "environmental" | "interconnection";
  reason: string;
  reportText: string;
  classification: "engineering_detail_exclusion";
}

export const exclusionRegistry: readonly MvpExclusion[] = [
  {
    id: "ex-load-flow",
    label: "Flujo de carga",
    category: "electrical",
    reason: "No calculado por la app",
    reportText: "Estudio electrico con modelo red",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-short-circuit",
    label: "Cortocircuito",
    category: "electrical",
    reason: "No calculado por la app",
    reportText: "Estudio de cortocircuito",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-protections-coordination",
    label: "Coordinación de protecciones",
    category: "electrical",
    reason: "No hay coordinacion ni ajustes",
    reportText: "Filosofia y memoria de protecciones",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-rms-emt-stability",
    label: "Estabilidad RMS/EMT",
    category: "electrical",
    reason: "No hay RMS/EMT",
    reportText: "Modelos certificados y estudios",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-harmonics",
    label: "Armónicos",
    category: "electrical",
    reason: "No hay evaluacion",
    reportText: "Estudio de calidad de suministro",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-grounding-grid",
    label: "Malla de tierra",
    category: "electrical",
    reason: "No hay malla ni tensiones paso/contacto",
    reportText: "Estudio de resistividad y malla",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-geotechnical-civil",
    label: "Geotecnia y obras civiles de detalle",
    category: "civil",
    reason: "No hay geotecnia/fundaciones",
    reportText: "Estudios civiles/geotecnicos",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-hydrology-drainage",
    label: "Hidrología y drenaje",
    category: "civil",
    reason: "No hay drenaje",
    reportText: "Estudio hidrologico/topografico",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-detailed-fire-safety",
    label: "Ingeniería de incendio de detalle",
    category: "safety",
    reason: "No hay modelacion ni aprobacion AHJ",
    reportText: "Estudio HSE/fire safety",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-environmental-permitting",
    label: "Evaluación ambiental y permisos (DIA/EIA)",
    category: "environmental",
    reason: "No hay DIA/EIA",
    reportText: "Evaluacion ambiental del proyecto",
    classification: "engineering_detail_exclusion",
  },
  {
    id: "ex-detailed-interconnection-hv",
    label: "Interconexión y subestación de AT/POI",
    category: "interconnection",
    reason: "No hay ingenieria subestacion",
    reportText: "Ingenieria AT y estudios CEN",
    classification: "engineering_detail_exclusion",
  },
];
