import { EVIDENCE_NONE, type EvidenceConfidence, type EvidenceRef } from "@/types/evidence";
import type {
  RegulatoryRuleDefinition,
  RuleAutomation,
  RuleCategory,
  RulePriority,
  RuleSeverity,
  RuleStatus,
} from "@/rules/types";

function ev(
  documentId: string,
  confidence: EvidenceConfidence,
  note: string,
  page?: number,
  section?: string
): EvidenceRef {
  return { documentId, confidence, note, page, section };
}

function rule(args: {
  id: string;
  category: RuleCategory;
  severity: RuleSeverity;
  title: string;
  description: string;
  evidence: EvidenceRef[];
  appParameter?: string;
  automation?: RuleAutomation;
  status?: RuleStatus;
  priority?: RulePriority;
  notes?: string;
  appliesToProfiles?: string[];
}): RegulatoryRuleDefinition {
  return {
    automation: "partial",
    status: "pending_validation",
    priority: "P3",
    appliesToProfiles: ["chile-utility-predesign"],
    ...args,
  };
}

const derived = (note: string) => ev(EVIDENCE_NONE, "derived", note);
const inferred = (note: string) => ev(EVIDENCE_NONE, "inferred", note);

export const regulatoryRulesCatalog = [
  rule({
    id: "RULE-PHYS-001",
    category: "physical_layout",
    severity: "blocking",
    title: "Equipment inside site polygon",
    description: "Every placed equipment footprint should remain inside the active site polygon.",
    appParameter: "validation.containmentCheck",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [derived("Geometric containment rule, not a normative certification.")],
  }),
  rule({
    id: "RULE-PHYS-002",
    category: "physical_layout",
    severity: "blocking",
    title: "No equipment footprint collisions",
    description: "Rotated equipment footprints should not overlap each other.",
    appParameter: "collision.detect",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [derived("Geometric collision rule, not a normative certification.")],
  }),
  rule({
    id: "RULE-PHYS-003",
    category: "manufacturerSpecificRules",
    severity: "warning",
    title: "Container-to-container clearance from manufacturer source",
    description:
      "Container spacing should use the manufacturer installation/system manual values. For ST2752UX-US the manual gives 150 mm between facing adjacent units and 2500 mm on the service/ventilation side; fire separation remains pending UL 9540A.",
    appParameter: "EquipmentSpec.clearances.sameType_m",
    priority: "P1",
    status: "implemented",
    evidence: [
      ev(
        "SUNGROW-ST2752UX-MANUAL-V12",
        "documented",
        "System Manual Ver12 figs 4-1/4-2: 150 mm between facing adjacent ST2752UX units and 2500 mm on the service/ventilation side. Manufacturer rule for ST2752UX-US, not a code-level requirement.",
        undefined,
        "Section 4 — Installation"
      ),
    ],
  }),
  rule({
    id: "RULE-PHYS-004",
    category: "physical_layout",
    severity: "warning",
    title: "Container-to-PCS station clearance from manufacturer source",
    description:
      "Spacing between BESS containers and PCS/MV stations is evaluated geometrically, but the underlying clearance value remains a preliminary assumption: the SC5000UD-MV installation manual is pending (PEND-SC5000-MANUAL). The 1.2 m front working space applied by the validator is a conservative electrical working clearance, not a vendor-cited value.",
    appParameter: "EquipmentSpec.clearances.otherType_m",
    priority: "P1",
    status: "implemented",
    evidence: [
      ev(
        "SUNGROW-SC5000UD-MV-US",
        "inferred",
        "PCS datasheet does not document a project-specific clearance. 1.2 m working space is a conservative electrical screening criterion until the official SC5000UD-MV installation manual is obtained."
      ),
    ],
  }),
  rule({
    id: "RULE-PHYS-005",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "Fire setback to site boundary",
    description: "ESS fire setback to boundary should be reviewed as a preliminary fire safety criterion.",
    appParameter: "FireSafetyZone.boundary_setback_m",
    priority: "P2",
    status: "implemented",
    evidence: [ev("NFPA-855", "inferred", "Setback of 3m from boundary matches NFPA 855 outdoor spacing recommendations.")],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-PHYS-006",
    category: "physical_layout",
    severity: "warning",
    title: "Vehicle access near equipment",
    description: "Each equipment item should have a conceptual vehicle access road within the editable preliminary distance.",
    appParameter: "AccessRoad.maxDistanceToEquipment_m",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [inferred("O&M screening criterion; default distance remains editable.")],
  }),
  rule({
    id: "RULE-PHYS-007",
    category: "physical_layout",
    severity: "warning",
    title: "Minimum internal access road width",
    description: "Internal roads should keep an editable preliminary width for maintenance and emergency access.",
    appParameter: "AccessRoad.minWidth_m",
    priority: "P3",
    evidence: [inferred("O&M screening criterion; requires project-specific vehicle envelope.")],
  }),
  rule({
    id: "RULE-PHYS-008",
    category: "physical_layout",
    severity: "warning",
    title: "Minimum turning radius",
    description: "Road geometry should be checked against truck, crane or emergency vehicle turning radius.",
    appParameter: "AccessRoad.minTurningRadius_m",
    automation: "no",
    status: "manual_check",
    evidence: [inferred("Requires vehicle basis and detailed road geometry.")],
  }),
  rule({
    id: "RULE-PHYS-009",
    category: "physical_layout",
    severity: "warning",
    title: "Cable corridor without road or equipment overlap",
    description: "Conceptual cable corridors should avoid equipment footprints and road overlap unless deliberately designed.",
    appParameter: "cableRoutes.noOverlap",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [derived("Geometric conflict screening rule.")],
  }),
  rule({
    id: "RULE-PHYS-010",
    category: "physical_layout",
    severity: "warning",
    title: "Lifting and maintenance zone reserved",
    description: "Major equipment should retain conceptual space for installation and maintenance activities.",
    appParameter: "LayoutZone(maintenance)",
    automation: "no",
    status: "manual_check",
    evidence: [inferred("Requires vendor O&M strategy and construction method.")],
  }),
  rule({
    id: "RULE-PHYS-011",
    category: "physical_layout",
    severity: "blocking",
    title: "No equipment inside exclusion zones",
    description: "Equipment should not be placed inside user-defined exclusion or restricted layout zones.",
    appParameter: "validation.exclusionZones",
    automation: "partial",
    priority: "P2",
    evidence: [derived("User-input geometric restriction.")],
  }),
  rule({
    id: "RULE-PHYS-012",
    category: "physical_layout",
    severity: "warning",
    title: "Uniform orientation by BESS block",
    description: "Containers in the same conceptual block should normally keep a consistent orientation.",
    appParameter: "BESSBlock.uniformOrientation",
    evidence: [inferred("Layout quality criterion for cable routing and maintainability.")],
  }),

  rule({
    id: "RULE-ELEC-001",
    category: "electrical",
    severity: "warning",
    title: "Containers per conversion station",
    description: "Default BESS del Desierto architecture uses up to 8 containers per conversion station.",
    appParameter: "ConversionStation.maxContainers",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [ev("PROJ-BESS-DESIERTO-1129", "documented", "Case-study architecture basis.", 6)],
    appliesToProfiles: ["bess-del-desierto-reference"],
  }),
  rule({
    id: "RULE-ELEC-002",
    category: "electrical",
    severity: "warning",
    title: "Stations per MV feeder",
    description: "Default BESS del Desierto architecture uses up to 4 stations per MV feeder.",
    appParameter: "MVFeeder.maxStations",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [ev("PROJ-BESS-DESIERTO-1129", "inferred", "Pattern inferred from single-line diagram.", 13)],
    appliesToProfiles: ["bess-del-desierto-reference"],
  }),
  rule({
    id: "RULE-ELEC-003",
    category: "electrical",
    severity: "blocking",
    title: "PCS DC voltage inside container range",
    description: "PCS DC operating range must be compatible with the selected BESS container range.",
    appParameter: "electrical.compatibility.dcRange",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [ev("SUNGROW-SC5000UD-MV-US", "documented", "PCS DC range source; exact clause requires final audit.")],
  }),
  rule({
    id: "RULE-ELEC-004",
    category: "electrical",
    severity: "blocking",
    title: "PCS LV voltage equals block transformer LV",
    description: "PCS nominal AC voltage must match the low-voltage side of the block transformer.",
    appParameter: "electrical.compatibility.lvMatch",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [
      ev("SUNGROW-SC5000UD-MV-US", "documented", "PCS LV source; conflicts remain pending validation."),
      ev("PROJ-BESS-DESIERTO-1129", "documented", "Project-reported 0.9 kV block transformer value.", 16),
    ],
  }),
  rule({
    id: "RULE-ELEC-005",
    category: "electrical",
    severity: "warning",
    title: "Uniform MV collector voltage",
    description: "MV feeders, buses and block transformers should use a consistent collector voltage.",
    appParameter: "mvFeeders.uniformVoltage",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [derived("Consistency rule across electrical architecture entities.")],
  }),
  rule({
    id: "RULE-ELEC-006",
    category: "electrical",
    severity: "warning",
    title: "Feeder preliminary rating not exceeded",
    description: "The sum of conversion station MVA on a feeder should not exceed the feeder preliminary rating.",
    appParameter: "mvFeeders.ratingCheck",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [derived("Calculated preliminary MVA aggregation.")],
  }),
  rule({
    id: "RULE-ELEC-007",
    category: "electrical",
    severity: "warning",
    title: "MV bus capacity screening",
    description:
      "Aggregated feeder loading should not exceed the preliminary MV bus rating. Final rating depends on the actual switchgear datasheet.",
    appParameter: "mvBuses.capacityCheck",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [
      ev(
        "SIEMENS-8DA-8DB-40p5",
        "inferred",
        "Referential switchgear family (Siemens 8DA/8DB 40.5 kV). Project-specific busbar rating must be confirmed."
      ),
    ],
    appliesToProfiles: [
      "chile-utility-predesign",
      "chile-pmgd-predesign",
      "bess-del-desierto-reference",
    ],
  }),
  rule({
    id: "RULE-ELEC-008",
    category: "electrical",
    severity: "info",
    title: "Cable ampacity screening",
    description:
      "Conceptual feeder current is screened against a reference cable ampacity. Final ampacity depends on installation conditions, grouping factor, soil thermal resistivity and ambient temperature.",
    appParameter: "cableRoutes.ampacityEstimate",
    automation: "yes",
    status: "implemented",
    priority: "P3",
    evidence: [
      ev(
        "NEXANS-NA2XS2Y-19-33",
        "inferred",
        "Reference cable datasheet (Nexans 33 kV Al XLPE), not project-specific design basis."
      ),
    ],
    appliesToProfiles: [
      "chile-utility-predesign",
      "chile-pmgd-predesign",
      "bess-del-desierto-reference",
    ],
  }),
  rule({
    id: "RULE-ELEC-009",
    category: "electrical",
    severity: "warning",
    title: "Conceptual loss budget",
    description:
      "MV, transformer and PCS losses are summed for a discharge-nominal scenario and compared against an editable conceptual budget. Not a substitute for a detailed loss study.",
    appParameter: "losses.budget",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [
      ev(
        "SUNGROW-SC5000UD-MV-US",
        "documented",
        "PCS converter efficiency from datasheet."
      ),
      derived("MV losses aggregated from feeder ratings."),
    ],
    appliesToProfiles: [
      "chile-utility-predesign",
      "chile-pmgd-predesign",
      "bess-del-desierto-reference",
    ],
  }),
  // Fase 8 — nuevas reglas eléctricas preliminares (docs/phase8-electrical-scope.md §1)
  rule({
    id: "RULE-ELEC-013",
    category: "electrical",
    severity: "warning",
    title: "Plant MVA fits POI declared capacity",
    description:
      "Aggregated plant power should not exceed the POI declared capacity. When the POI capacity is missing, the rule is downgraded to checklist by the severity ceiling.",
    appParameter: "poi.capacityFit",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [
      ev(
        EVIDENCE_NONE,
        "missing",
        "Project-specific POI capacity comes from the CEN/CNE interconnection study."
      ),
    ],
    appliesToProfiles: ["chile-utility-predesign", "chile-pmgd-predesign"],
  }),
  rule({
    id: "RULE-ELEC-014",
    category: "electrical",
    severity: "info",
    title: "Auxiliary services budget",
    description:
      "Aggregated auxiliary services (fixed + per-station + per-container) should remain within an editable budget as a percentage of POI power.",
    appParameter: "ssaa.budget",
    automation: "yes",
    status: "implemented",
    priority: "P3",
    evidence: [
      ev(
        "SUNGROW-ST2752UX-V15",
        "inferred",
        "Per-container auxiliary draw inferred from container datasheet HVAC and pumping data."
      ),
    ],
    appliesToProfiles: [
      "chile-utility-predesign",
      "chile-pmgd-predesign",
      "bess-del-desierto-reference",
    ],
  }),
  rule({
    id: "RULE-ELEC-015",
    category: "electrical",
    severity: "warning",
    title: "Plant ramp rate declared for NTSyCS",
    description:
      "The plant must declare a preliminary ramp rate so NTSyCS compliance can be verified later by dynamic study.",
    appParameter: "ppc.rampRate",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [
      ev(
        "CNE-NTSyCS-RES45-2026",
        "documented",
        "Norma Técnica de Seguridad y Calidad de Servicio (NTSyCS) RES 45/2026."
      ),
    ],
    appliesToProfiles: ["chile-utility-predesign"],
  }),
  rule({
    id: "RULE-ELEC-016",
    category: "electrical",
    severity: "checklist",
    title: "Declared PPC control modes coverage",
    description:
      "PPC must declare at minimum active power, reactive power, voltage and frequency control modes per NTSyCS. The app does not execute the controls; it only inspects the declared coverage.",
    appParameter: "ppc.controlCoverage",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [
      ev(
        "CNE-NTSyCS-RES45-2026",
        "documented",
        "NTSyCS requires at least P/Q/V/f control at the POI."
      ),
    ],
    appliesToProfiles: ["chile-utility-predesign", "chile-pmgd-predesign"],
  }),
  rule({
    id: "RULE-ELEC-017",
    category: "electrical",
    severity: "info",
    title: "Transformer no-load losses 24x7 estimate",
    description:
      "Annual no-load losses of the block transformer bank are estimated as a planning input for SSAA and availability. Refines with the final datasheet and operational mode.",
    appParameter: "transformer.noLoadAnnual",
    automation: "yes",
    status: "implemented",
    priority: "P3",
    evidence: [
      ev(
        EVIDENCE_NONE,
        "derived",
        "Calculated from noLoadLossKw × 8760 h × number of stations."
      ),
    ],
    appliesToProfiles: [
      "chile-utility-predesign",
      "chile-pmgd-predesign",
      "bess-del-desierto-reference",
    ],
  }),
  rule({
    id: "RULE-ELEC-018",
    category: "electrical",
    severity: "warning",
    title: "Equipment nominal frequency matches grid (50 Hz Chile)",
    description:
      "The selected PCS variant declares its nominal frequency on the datasheet; a 60 Hz unit is not compatible with the 50 Hz Chilean grid until the manufacturer confirms a 50 Hz variant. The catalog SC5000UD-MV-US-P3 declares 60 Hz.",
    appParameter: "electrical.compatibility.frequency",
    automation: "no",
    status: "manual_check",
    priority: "P2",
    evidence: [
      ev(
        "SEC-RPTD-01-2021",
        "documented",
        "RPTD 01 §4 «Frecuencias» (E4-S02): «frecuencia nominal será de 50 ciclos por» segundo (Chile = 50 Hz). La variante PCS SC5000UD-MV-US-P3 (pcsCatalog frequencyHz = 60 Hz, datasheet -US) NO es compatible con 50 Hz hasta confirmación OEM de una unidad 50 Hz.",
        undefined,
        "§4 Frecuencias"
      ),
    ],
  }),
  ...[
    ["RULE-ELEC-010", "Protection coordination study"],
    ["RULE-ELEC-011", "Short-circuit study"],
    ["RULE-ELEC-012", "Load-flow study"],
  ].map(([id, title]) =>
    rule({
      id,
      category: "engineering_detail",
      severity: "checklist",
      title,
      description: `${title} is required for later engineering stages and is not automated in the predesign app.`,
      automation: "no",
      status: "out_of_scope",
      evidence: [ev(EVIDENCE_NONE, "missing", "Detailed engineering scope item.")],
      appliesToProfiles: ["chile-utility-predesign", "chile-pmgd-predesign"],
    })
  ),

  rule({
    id: "RULE-SEC-001",
    category: "regulatory_sec",
    severity: "warning",
    title: "SEC BESS framework applicability",
    description: "SEC RGR 06/2024 should be reviewed as the local BESS regulatory framework.",
    appParameter: "compliance.secRgr",
    priority: "P1",
    evidence: [
      ev(
        "SEC-RGR-06-2024",
        "documented",
        "RGR 06/2024 ES el marco normativo BESS chileno (E3-S04, lectura de cláusulas): §1 «Acotar los requerimientos que se deben observar para el diseño» de instalaciones de almacenamiento; §2 «requisitos generales de instalación y seguridad para los» sistemas de almacenamiento de energía a través de baterías (BESS).",
        undefined,
        "§1 Objetivo / §2 Alcance"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-002",
    category: "regulatory_sec",
    severity: "checklist",
    title: "Grounding requirements",
    description: "Grounding requirements are a manual engineering checklist item until detailed grounding inputs exist.",
    appParameter: "compliance.grounding",
    automation: "no",
    status: "manual_check",
    priority: "P2",
    evidence: [
      ev(
        "SEC-RIC-06",
        "documented",
        "RIC 06 establece los requisitos de puesta a tierra (E3-S04): §1.1 requisitos de seguridad de los «sistemas de puesta a tierra, protección contra rayos» y enlaces equipotenciales; §5.4 toda instalación de consumo «tiene que disponer de un sistema de puesta a tierra».",
        undefined,
        "§1.1 Objetivos / §5.4"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-003",
    category: "regulatory_sec",
    severity: "checklist",
    title: "SEC project submission documents",
    description: "SEC project presentation requirements should be included in the report checklist.",
    appParameter: "compliance.secSubmission",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "SEC-RIC-18",
        "documented",
        "RIC 18 rige la presentación de proyectos (E3-S04): §1 «establecer las disposiciones técnicas que deben cumplirse en» la elaboración y presentación de proyectos; §6.1.1 todo proyecto «deberá incluir a lo menos» memoria explicativa, planos, «Informe de verificación inicial.» e informe de imágenes.",
        undefined,
        "§1 Objetivos / §6.1.1"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-004",
    category: "regulatory_sec",
    severity: "checklist",
    title: "Commissioning and service entry",
    description: "Commissioning and puesta en servicio requirements are checklist items for later stages.",
    appParameter: "compliance.commissioning",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "SEC-RIC-19-V1.1",
        "documented",
        "RIC 19 rige la puesta en servicio (E3-S04): §1 «procedimiento general para la puesta en servicio» de las instalaciones de consumo; §5.1 toda instalación nueva, ampliación o remodelación debe ser «probada y ensayada antes de su puesta en servicio» o energización.",
        undefined,
        "§1 Objetivos / §5.1"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-005",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "Fire protection system requirements",
    description: "Fire protection requirements should be mapped before promoting any automated fire rule.",
    appParameter: "fireSafety.systemType",
    priority: "P1",
    evidence: [
      ev(
        "SEC-RPTD-08-2020",
        "inferred",
        "RPTD 08 §1 «establecer medidas de seguridad para la» protección contra incendios; su Alcance (§2) cubre los sistemas de almacenamiento de energía. Ej.: §5.1 transformadores >10 MVA «no menos de 6 m de cualquier edificación y de 9 m de otro» transformador; §6.4 detección según «requerimientos del código NFPA 72». Respaldo PARCIAL: cubre la protección de incendios eléctrica/transformadores, NO el riesgo de incendio específico del BESS (propagación térmica), pendiente de NFPA 855 / UL 9540A (E3-S06).",
        undefined,
        "§1 Objetivo / §2 Alcance / §5.1 / §6.4"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-006",
    category: "regulatory_sec",
    severity: "warning",
    title: "Safety strip and electrical distances",
    description: "Electrical safety distance requirements should be mapped for site boundary and corridor checks.",
    appParameter: "LayoutZone(safety_strip).distance_m",
    priority: "P2",
    evidence: [
      ev(
        "SEC-RPTD-07-2022",
        "inferred",
        "RPTD 07 §1 «definir la franja y las distancias de seguridad» de líneas; §2 «aplica a las líneas de transporte y de distribución»; §4.5/Tabla N°3 distancia de seguridad por tensión («Sobre 1 y hasta 36 2,00» m). Respaldo PARCIAL: la franja de seguridad rige LÍNEAS eléctricas (aplicable a colectores MT aéreos), no el retiro BESS-a-límite de sitio; el fence_setback (5 m) es otra magnitud y NO queda contradicho.",
        undefined,
        "§1 Objetivo / §2 Alcance / §4.5 Tabla N°3"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-007",
    category: "regulatory_sec",
    severity: "checklist",
    title: "Safety signage",
    description: "Safety signage requirements should be a report checklist item.",
    appParameter: "compliance.signage",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "SEC-RPTD-09-2020",
        "documented",
        "RPTD 09 rige la señalización de seguridad (E3-S04): §1 define las exigencias de las señales de seguridad con la finalidad de «evitar riesgos eléctricos u otros peligros»; §5 fija las especificaciones de letreros y rótulos (incl. muros, cercos y rejas de recintos con equipos eléctricos).",
        undefined,
        "§1 Objetivo / §5 Especificaciones"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-008",
    category: "regulatory_sec",
    severity: "warning",
    title: "Substation and electrical room requirements",
    description: "MV yard and switchgear zones should be checked against applicable substation and room criteria.",
    appParameter: "mvBus.layoutRequirements",
    priority: "P2",
    evidence: [
      ev(
        "SEC-RIC-13",
        "documented",
        "RIC 13 rige subestaciones y salas eléctricas (E3-S04): §2 (Alcance) se aplica a subestaciones y salas eléctricas con transformadores hasta «23.000» V; §6.4.7 «deberán existir espacios libres» de trabajo; §6.4.8 «un ancho de 1.000 mm» (muro a un lado) y «de 1.200 mm» (equipos a ambos lados). NOTA: 1,0/1,2 m respaldan el clearance frontal ELECTRICAL_FRONT_WORKING_CLEARANCE_M, certificado a 1,2 m por E3-S02 (RIC 02 Tabla N°2.1 Condición 2, D-a).",
        undefined,
        "§2 Alcance / §6.4.7 / §6.4.8"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-009",
    category: "regulatory_sec",
    severity: "warning",
    title: "Conductors and cable routing",
    description: "Cable installation method and routing should be checked against Chilean conductor/canalization rules.",
    appParameter: "cableRoutes.installMethod",
    priority: "P2",
    evidence: [
      ev(
        "SEC-RIC-04-2020",
        "documented",
        "RIC 04 rige conductores y canalizaciones (E3-S04): §1 requisitos de los «sistemas de canalización a utilizar en las instalaciones de consumo»; §7.1.1 enumera los «sistemas de canalización eléctrica aceptados en el ámbito» de aplicación; §7.1.4 «selección del tipo de canalización en cada instalación particular» según influencias externas. (El 1 m de §7.9.3.1.a es PROFUNDIDAD y el 0,50 m de §7.9.9.1 es separación a otros servicios — hallazgo Cubo A; no contradicen el ancho de zanja 1 m.)",
        undefined,
        "§1 Objetivos / §7.1.1 / §7.1.4"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-010",
    category: "regulatory_sec",
    severity: "warning",
    title: "MV/LV line requirements",
    description: "Medium-voltage collector route assumptions should be checked against RPTD line requirements.",
    appParameter: "cableRoutes.MTrules",
    priority: "P2",
    evidence: [
      ev(
        "SEC-RPTD-13-2020",
        "documented",
        "RPTD 13 rige líneas MT/BT (E3-S04): §1 requisitos de seguridad de las «líneas eléctricas aéreas, subterráneas y subacuáticas» de baja y media tensión; §7.2 separación horizontal entre conductores aéreos «cuando menos de 2 m para líneas eléctricas» con tensiones de hasta 23 kV.",
        undefined,
        "§1 Objetivo / §7.2 Paralelismos"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-011",
    category: "regulatory_sec",
    severity: "checklist",
    title: "Nominal voltage and frequency reference",
    description: "Nominal voltage and frequency values should be explicitly stated in the technical report.",
    appParameter: "electrical.nominalVoltageFrequency",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "SEC-RPTD-01-2021",
        "documented",
        "RPTD 01 fija tensiones y frecuencias nominales (E3-S04): §1 «establecer la frecuencia nominal» y los niveles de tensión; §4 «frecuencia nominal será de 50 ciclos por» segundo (Chile = 50 Hz); §5.2 Tablas N°1–4 listan las tensiones nominales BT/MT/AT/EAT.",
        undefined,
        "§1 Objetivo / §4 Frecuencias / §5.2"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-012",
    category: "regulatory_sec",
    severity: "checklist",
    title: "Installation classification",
    description: "Project installation classification should be reviewed before formal permitting or submission.",
    appParameter: "compliance.installationClassification",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "SEC-RPTD-02-2020",
        "documented",
        "RPTD 02 establece la clasificación de instalaciones (E3-S04): §1 «cómo se clasifican los sistemas» y las instalaciones; §4 clasifica por nivel de tensión, p. ej. «Media tensión, sistemas sobre 1 kV y hasta 23 kV.» (§5–§12 por tipo de central, subestación, línea y red).",
        undefined,
        "§1 Objetivo / §4 Clasificación"
      ),
    ],
  }),
  rule({
    id: "RULE-SEC-013",
    category: "regulatory_sec",
    severity: "checklist",
    title: "Power transformer fire-separation distances",
    description:
      "Power transformers carry minimum fire-separation distances to buildings and to other transformers (RPTD 08 §5). The app does not model transformer fire separation — only the TRANSFORMER_TO_BESS spacing exists — so this is documented as a manual review item, not an enforced geometric check.",
    appParameter: "compliance.transformerFireSeparation",
    automation: "no",
    status: "manual_check",
    priority: "P2",
    evidence: [
      ev(
        "SEC-RPTD-08-2020",
        "documented",
        "RPTD 08 §5 «Medidas de seguridad en la instalación de transformadores de poder» (E4-S01): §5.1, nuevas subestaciones, transformadores de poder >10 MVA «no menos de 6 m de cualquier edificación y de 9 m de otro» «transformador del mismo tipo.»; de no cumplirse, §5.2/§5.3 exigen muro cortafuego F120. §5.4 (centrales de generación y subestaciones de transmisión, <7.600 L de aceite) fija la separación «medida desde cualquier edificación, de acuerdo a lo indicado en la Tabla N° 1.»: «75 kVA o menos 3,0» / «76 - 333 kVA 6,0» / «más de 333 kVA 9,0» m. NOTA: la graduación 3/6/9 m es POR kVA (Tabla N°1, distancia a edificación) y §5.1 rige el caso >10 MVA — NO es «3/6/9 por ≤2 / 2-10 / >10 MVA». Esta regla documenta trafo↔edificación y trafo↔trafo; NO es trafo↔BESS y NO modifica TRANSFORMER_TO_BESS_M (separación trafo↔BESS sigue como candidato de inventario para E4-S02).",
        undefined,
        "§5 / §5.1 / §5.4 Tabla N°1"
      ),
    ],
  }),

  rule({
    id: "RULE-CNE-001",
    category: "regulatory_cne_cen",
    severity: "warning",
    title: "NTSyCS applicability",
    description: "System security and quality service requirements should be reviewed for SEN-connected BESS.",
    appParameter: "compliance.ntsycs",
    priority: "P2",
    evidence: [
      ev(
        "CNE-NTSyCS-RES45-2026",
        "documented",
        "NTSyCS rige la seguridad y calidad de servicio del SEN (E4-S03): TÍTULO 1-1 «el objetivo general de la presente Norma Técnica es establecer las» «exigencias de Seguridad y Calidad de Servicio de los sistemas interconectados.»; su lista de agentes obligados incluye «Almacenamiento de Energía; instalaciones que provean servicios complementarios» — un BESS interconectado al SEN queda regido. Regla-puntero: aplicabilidad, no umbral numérico.",
        undefined,
        "TÍTULO 1-1 Objetivo y Alcance"
      ),
    ],
  }),
  rule({
    id: "RULE-CNE-002",
    category: "regulatory_cne_cen",
    severity: "warning",
    title: "Complementary services requirements",
    description: "BESS complementary service capabilities should be tracked as a preliminary compliance checklist.",
    appParameter: "ppc.sscc",
    priority: "P3",
    evidence: [
      ev(
        "CNE-NTSSCC-RES45-2026",
        "documented",
        "NTSSCC rige los Servicios Complementarios (E4-S03): §1-1 Objetivo «la prestación de Servicios Complementarios»; §1-2 Alcance «Los requerimientos establecidos en la presente Norma Técnica aplican a toda instalación» interconectada con recursos/infraestructura para prestar SSCC (un BESS puede prestarlos). Regla-puntero: aplicabilidad, no umbral.",
        undefined,
        "Artículo 1-1 Objetivo / 1-2 Alcance"
      ),
    ],
  }),
  rule({
    id: "RULE-CNE-003",
    category: "regulatory_cne_cen",
    severity: "warning",
    title: "IBR requirements",
    description: "Inverter-based resource requirements should be tracked for PCS/PPC scope.",
    appParameter: "ppc.ibr",
    priority: "P2",
    evidence: [
      ev(
        "CNE-IBR-RES45-2026",
        "documented",
        "El Anexo Técnico IBR rige las Instalaciones Basadas en Convertidores (E4-S03): Objetivo «exigencias técnicas mínimas complementarias a las» de la NTSyCS para IBR; Alcance «serán aplicables a las Instalaciones Basadas» en Convertidores interconectadas o a interconectar al Sistema de Transmisión — el PCS de un BESS es una IBR. Regla-puntero: aplicabilidad, no umbral.",
        undefined,
        "Artículo 1-1 Objetivo / 1-2 Alcance"
      ),
    ],
  }),
  rule({
    id: "RULE-CNE-004",
    category: "engineering_detail",
    severity: "checklist",
    title: "Seismic requirements",
    description: "Seismic equipment requirements are a later engineering checklist item.",
    appParameter: "compliance.seismic",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "CNE-Sismico-REX41-2025",
        "documented",
        "El Anexo de Requisitos Sísmicos rige el diseño sísmico de instalaciones del SEN (E4-S03): Art. 1 Objetivo General «exigencias mínimas de diseño sísmico que» deben cumplir las instalaciones de la NTSyCS; Art. 2 Alcance General lo aplica a «sistemas de almacenamiento de energía que presten servicios de transmisión». Cubre el BESS cuando presta servicios de transmisión; el diseño sísmico/fundaciones quedan fuera del MVP → regla-puntero checklist.",
        undefined,
        "Art. 1 Objetivo General / Art. 2 Alcance General"
      ),
    ],
  }),
  rule({
    id: "RULE-CEN-001",
    category: "regulatory_cne_cen",
    severity: "checklist",
    title: "CEN project classification",
    description: "CEN classification procedure should be included as a manual checklist item.",
    appParameter: "compliance.cenClassification",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "CEN-Anexo2-NIMR-2024",
        "inferred",
        "CEN Anexo 2 «Requerimientos de interconexión NI/MR/MNR» (E4-S03): §3 Alcance cubre «el proceso de interconexión de proyectos» «NI, MR o MNR, estableciendo así, las metodologías de trabajo». Las categorías NI (Nueva Infraestructura)/MR/MNR SON las clases de proyecto, pero el alcance documenta el PROCESO DE INTERCONEXIÓN, no el PROCEDIMIENTO de clasificación en sí (criterios upstream del Reglamento/Coordinador). Respaldo PARCIAL: documenta las clases, no el método de clasificar.",
        undefined,
        "§3 Alcance"
      ),
    ],
  }),
  rule({
    id: "RULE-CEN-002",
    category: "regulatory_cne_cen",
    severity: "checklist",
    title: "NI/MR/MNR interconnection process",
    description: "Utility-scale interconnection procedure remains a manual checklist item.",
    appParameter: "compliance.cenInterconnection",
    automation: "no",
    status: "manual_check",
    priority: "P2",
    evidence: [
      ev(
        "CEN-Anexo2-NIMR-2024",
        "documented",
        "CEN Anexo 2 rige el proceso de interconexión NI/MR/MNR (E4-S03): §3 Alcance «el proceso de interconexión de proyectos» «NI, MR o MNR, estableciendo así, las metodologías de trabajo», criterios y requerimientos normativos para la «ejecución de las funciones y obligaciones del Coordinador». Regla-puntero: el procedimiento de interconexión como checklist.",
        undefined,
        "§3 Alcance"
      ),
    ],
  }),
  rule({
    id: "RULE-CEN-003",
    category: "regulatory_cne_cen",
    severity: "checklist",
    title: "PMGD interconnection process",
    description: "PMGD interconnection rules apply only to PMGD-scale projects.",
    appParameter: "compliance.pmgdRules",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "CEN-Anexo1-PMGD-2024",
        "documented",
        "CEN Anexo 1 «Requisitos para Interconexión de PMGD» (E4-S03) rige la conexión de los «Pequeños Medios de Generación Distribuida: Instalaciones de generación que se interconectan en» redes de distribución, vía la «SOLICITUD DE INICIO DE PROCESO DE CONEXIÓN DE UN PROYECTO PMGD». Aplica SOLO a proyectos escala PMGD. Regla-puntero checklist.",
        undefined,
        "§1 / §5 Proceso de conexión PMGD"
      ),
    ],
    appliesToProfiles: ["chile-pmgd-predesign"],
  }),

  rule({
    id: "RULE-SEA-001",
    category: "regulatory_environmental",
    severity: "warning",
    title: "SEIA submission trigger",
    description: "SEIA applicability should be reviewed using DS 40 and project characteristics.",
    appParameter: "compliance.seiaTrigger",
    priority: "P2",
    evidence: [ev("DS-40-2012-SEIA", "missing", "Requires human reading and project-specific permitting review.")],
  }),
  rule({
    id: "RULE-SEA-002",
    category: "regulatory_environmental",
    severity: "warning",
    title: "SEA BESS storage criterion",
    description: "SEA DS17/2026 storage criterion should be mapped before environmental compliance automation.",
    appParameter: "compliance.seaCriterion",
    priority: "P1",
    evidence: [ev("SEA-CrAlmEn-DS17-2026", "missing", "Priority document; requires human reading.")],
  }),
  rule({
    id: "RULE-MMA-001",
    category: "regulatory_environmental",
    severity: "warning",
    title: "Perimeter noise screening",
    description: "Noise impact from HVAC, transformers and auxiliary systems should be a preliminary checklist item.",
    appParameter: "compliance.noiseLimit_db",
    priority: "P2",
    evidence: [ev("DS-38-2011-Ruido", "missing", "Requires zoning and receptor data before automation.")],
  }),
  rule({
    id: "RULE-MIN-001",
    category: "regulatory_environmental",
    severity: "checklist",
    title: "Hazardous waste management",
    description: "Battery waste and hazardous waste management should be included in report exclusions/checklist.",
    appParameter: "compliance.hazardousWaste",
    automation: "no",
    status: "manual_check",
    evidence: [ev("DS-148-2003-ResPeligrosos", "missing", "Requires human reading and project O&M scope.")],
  }),
  rule({
    id: "RULE-MIN-002",
    category: "regulatory_environmental",
    severity: "checklist",
    title: "Hazardous substances storage",
    description: "Hazardous substances storage should remain a manual checklist item until site inventory exists.",
    appParameter: "compliance.hazardousStorage",
    automation: "no",
    status: "manual_check",
    evidence: [ev("DS-43-2015-AlmacenSustancias", "missing", "Requires human reading and storage inventory.")],
  }),
  rule({
    id: "RULE-MMA-002",
    category: "regulatory_environmental",
    severity: "checklist",
    title: "Extended producer responsibility",
    description: "Battery end-of-life responsibility should be tracked as an O&M/report checklist item.",
    appParameter: "compliance.rep",
    automation: "no",
    status: "manual_check",
    evidence: [ev("LEY-20920-REP", "missing", "Requires human reading and lifecycle scope definition.")],
  }),

  rule({
    id: "RULE-MINVU-001",
    category: "regulatory_territorial",
    severity: "warning",
    title: "MINVU DDU 522 BESS territorial criterion",
    description: "Territorial interpretation for BESS should be reviewed before presenting land-use conclusions.",
    appParameter: "compliance.minvuDdu522",
    priority: "P1",
    evidence: [
      ev(
        "MINVU-DDU-522-BESS",
        "documented",
        "MINVU DDU 522 fija la interpretación territorial de los BESS (E4-S03): tiene por objeto impartir instrucciones sobre la «normativa aplicable a los sistemas» de almacenamiento de energía de tipo electroquímico, incluidos los «sistemas BESS Stand Alone o autónomos.». Regla-puntero: criterio territorial/uso de suelo como advertencia.",
        undefined,
        "Objeto / Proyectos de almacenamiento"
      ),
    ],
  }),
  rule({
    id: "RULE-MINVU-002",
    category: "regulatory_territorial",
    severity: "checklist",
    title: "Municipal permit / DOM review",
    description: "Municipal permitting should remain a manual checklist item for preliminary reports.",
    appParameter: "compliance.domPermit",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "DS-47-OGUC",
        "documented",
        "La OGUC (DS 47/1992) rige el permiso municipal de obras (E4-S03): Art. 1.1.1 «La presente Ordenanza reglamenta la» Ley General de Urbanismo y Construcciones y regula el procedimiento administrativo, de urbanización y de construcción; el «correspondiente permiso de edificación.» se tramita ante el «Director de Obras Municipales». Regla-puntero: permiso DOM como checklist.",
        undefined,
        "Art. 1.1.1 / permiso de edificación"
      ),
    ],
  }),

  rule({
    id: "RULE-FIRE-001",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "NFPA 855 separation reference",
    description: "NFPA 855 can inform preliminary separation discussion, but should not be presented as Chilean legal approval.",
    appParameter: "FireSafetyZone.nfpa855",
    priority: "P2",
    evidence: [ev("NFPA-855", "inferred", "Reference-only standard entry; obtain licensed source before quoting clauses.")],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-FIRE-002",
    category: "regulatory_fire_safety",
    severity: "checklist",
    title: "UL 9540 certification evidence",
    description: "Equipment certification should be reported as datasheet evidence, not as site approval.",
    appParameter: "compliance.ul9540",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev("SUNGROW-ST2752UX-V15", "documented", "Datasheet declares compliance/certification context; exact clause requires audit."),
    ],
  }),
  rule({
    id: "RULE-FIRE-003",
    category: "regulatory_fire_safety",
    severity: "checklist",
    title: "UL 9540A thermal propagation reference",
    description: "Thermal propagation test evidence should be tracked for manufacturer/fire engineer review.",
    appParameter: "compliance.ul9540a",
    automation: "no",
    status: "manual_check",
    evidence: [
      ev(
        "SUNGROW-PT2-WP-2024",
        "inferred",
        "Manufacturer whitepaper references thermal propagation testing context. Whitepapers are level-5 commercial references in the matrix; the UL 9540A test report by equipment is still pending (PEND-ST2752-UL9540A-REPORT)."
      ),
    ],
  }),
  rule({
    id: "RULE-FIRE-004",
    category: "regulatory_fire_safety",
    severity: "checklist",
    title: "Fire engineer and AHJ review",
    description: "Final fire strategy requires human review by qualified engineer and local authority/insurer where applicable.",
    appParameter: "compliance.fireEngineerReview",
    automation: "no",
    status: "manual_check",
    evidence: [inferred("Professional review requirement for final fire design.")],
  }),
  rule({
    id: "RULE-FIRE-005",
    category: "regulatory_fire_safety",
    severity: "checklist",
    title: "Manufacturer emergency response data",
    description: "Emergency response procedures should be included in the report checklist when available.",
    appParameter: "compliance.emergencyResponse",
    automation: "no",
    status: "manual_check",
    evidence: [ev("SUNGROW-LOTO-202210", "missing", "LOTO document exists; emergency response scope requires separate validation.")],
  }),
  // RULE-FIRE-006..013 — requisitos de separación NFPA 855 / IFC 1206
  // Evidencia: L5 secondary extraction (INT-NFPA855-UL9540A-Extraction-2026 §2).
  // Los valores en la app son CONSERVADORES respecto a los defaults NFPA 855
  // (3 m vs 10 ft ≈ 3.05 m para edificios/límites; 3 m vs 3 ft ≈ 0.91 m para BESS-BESS).
  // Reducciones requieren reporte UL 9540A del OEM + aprobación AHJ.
  rule({
    id: "RULE-FIRE-006",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "BESS-to-BESS default separation (different groups)",
    description:
      "NFPA 855 default separation between BESS units of different groups is 3 ft (914 mm). App uses 3 m conservative default. Reduction requires UL 9540A unit-level test showing no thermal propagation.",
    appParameter: "FireSafetyZone.bessToBesSeparation",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [
      ev(
        "INT-NFPA855-UL9540A-Extraction-2026",
        "inferred",
        "EXTRACCION §2: «BESS a BESS (Distinto Grupo): 3 ft (914 mm). Excepción: puede reducirse si UL 9540A Unit Level demuestra que no hay propagación térmica.» App usa 3 m (conservador)."
      ),
    ],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-FIRE-007",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "BESS-to-buildings default separation",
    description:
      "NFPA 855 default separation from BESS to any building (outdoors) is 10 ft (3.048 m). App uses 3 m conservative default. Reduces to 3 ft with 2-hr fire-rated wall (no openings) or favorable UL 9540A.",
    appParameter: "FireSafetyZone.bessToBuilding",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [
      ev(
        "INT-NFPA855-UL9540A-Extraction-2026",
        "inferred",
        "EXTRACCION §2: «BESS a Edificios (Outdoors): 10 ft (3.048 m). Reduce a 3 ft si muro exterior incombustible 2-hrs sin aberturas, o con ensayo UL 9540A favorable.»"
      ),
    ],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-FIRE-008",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "BESS-to-property line default separation",
    description:
      "NFPA 855 default separation from BESS to property line / public way is 10 ft (3.048 m). App uses 3 m conservative default. Reduces to 3 ft with 1-hr fire barrier extending 5 ft above/beyond BESS perimeter, or UL 9540A.",
    appParameter: "FireSafetyZone.bessToPropertyLine",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [
      ev(
        "INT-NFPA855-UL9540A-Extraction-2026",
        "inferred",
        "EXTRACCION §2: «BESS a Límites Prediales / Vía Pública: 10 ft (3.048 m). Reduce a 3 ft con muro cortafuego 1-hr (5 ft sobre y 5 ft horizontal) o ensayo UL 9540A.»"
      ),
    ],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-FIRE-009",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "BESS-to-egress route default separation",
    description:
      "NFPA 855 default separation from BESS to egress routes is 10 ft (3.048 m). App uses 3 m conservative default. Reduction requires UL 9540A proof that heat flux on egress path ≤ 1.3 kW/m².",
    appParameter: "FireSafetyZone.bessToEgress",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [
      ev(
        "INT-NFPA855-UL9540A-Extraction-2026",
        "inferred",
        "EXTRACCION §2: «BESS a Vías de Evacuación (Egress): 10 ft (3.048 m). Reduce si ensayo UL 9540A demuestra Heat Flux ≤ 1.3 kW/m² en la vía de escape.»"
      ),
    ],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-FIRE-010",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "BESS-to-combustible vegetation / materials",
    description:
      "NFPA 855 requires a combustible-free area of at least 10 ft (3 m) around BESS equipment.",
    appParameter: "FireSafetyZone.bessToVegetation",
    automation: "yes",
    status: "implemented",
    priority: "P2",
    evidence: [
      ev(
        "INT-NFPA855-UL9540A-Extraction-2026",
        "inferred",
        "EXTRACCION §2: «BESS a Vegetación/Combustibles: 10 ft (3 m). Se requiere un área libre de arbustos y combustibles de al menos 10 ft alrededor del equipo.»"
      ),
    ],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-FIRE-011",
    category: "regulatory_fire_safety",
    severity: "blocking",
    title: "Hazard Mitigation Analysis (HMA) mandatory above 600 kWh",
    description:
      "NFPA 855 / IFC 1206 require a Hazard Mitigation Analysis (HMA) for any ESS installation exceeding 600 kWh. HMA must model fires, detection/suppression failures, and ventilation. HMA is a deliverable to AHJ — not an in-app calculation.",
    appParameter: "FireSafetyZone.hmaRequired",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [
      ev(
        "INT-NFPA855-UL9540A-Extraction-2026",
        "inferred",
        "EXTRACCION §2: «Hazard Mitigation Analysis (HMA): Es un estudio obligatorio si el proyecto supera los 600 kWh de capacidad almacenada. Debe modelar incendios, fallos de detección/extinción y ventilación.» EXTRACCION §5 frase recomendada confirma carácter mandatorio."
      ),
      ev(
        "INT-UL-NFPA855-OnePage-2024",
        "inferred",
        "UL NFPA 855 one-pager: «Hazard mitigation analysis (HMA)» listado explícitamente como submittal obligatorio al AHJ bajo NFPA 855."
      ),
    ],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-FIRE-012",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "Maximum energy per ESS group (50 kWh without UL 9540A)",
    description:
      "NFPA 855 limits ESS groups to 50 kWh without UL 9540A unit-level test evidence. App uses 50 kWh as MAX_ENERGY_PER_GROUP_KWH. If UL 9540A confirms no thermal propagation at module level, grouping restrictions may be relaxed by AHJ.",
    appParameter: "FireSafetyZone.maxGroupKwh",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [
      ev(
        "INT-NFPA855-UL9540A-Extraction-2026",
        "inferred",
        "EXTRACCION §2: «Los BESS se agrupan en clústeres de máximo 50 kWh. Dentro del clúster no hay separación exigida por norma, pero el fabricante suele pedir holguras de mantenimiento.»"
      ),
    ],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-FIRE-013",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "Public perimeter fence minimum 5 ft from BESS",
    description:
      "NFPA 855 requires a locked perimeter fence at minimum 5 ft (1.524 m) from the outer edge of BESS equipment. App fence_setback default is 5 m (conservative).",
    appParameter: "FireSafetyZone.perimeterFence",
    automation: "no",
    status: "manual_check",
    priority: "P2",
    evidence: [
      ev(
        "INT-NFPA855-UL9540A-Extraction-2026",
        "inferred",
        "EXTRACCION §2: «Público General: 5 ft (1.524 m). Se exige un cerco perimetral cerrado con llave a mínimo 5 ft del borde exterior del BESS.»"
      ),
    ],
    appliesToProfiles: ["international-fire-reference", "chile-utility-predesign"],
  }),
  rule({
    id: "RULE-REP-001",
    category: "engineering_detail",
    severity: "info",
    title: "Predesign disclaimer",
    description: "Reports must state that the app is preliminary and not an engineering, legal, cadastral or permitting approval.",
    appParameter: "report.disclaimer",
    automation: "yes",
    status: "implemented",
    priority: "P1",
    evidence: [derived("Product policy from directrices implementation plan.")],
    appliesToProfiles: [
      "chile-utility-predesign",
      "chile-pmgd-predesign",
      "bess-del-desierto-reference",
      "international-fire-reference",
    ],
  }),
] satisfies readonly RegulatoryRuleDefinition[];

/**
 * Phase 8 preliminary electrical rule ids — the 8 checks added in
 * `docs/phase8-electrical-scope.md`. Exported so UI and the report can render
 * them as a single "preliminary electrical" group without re-listing IDs in
 * multiple call sites. This is an identifier list, not an engineering
 * constant, so it stays here next to the catalog rather than in
 * `defaultConstraints.ts`.
 */
export const PHASE_8_ELECTRICAL_RULE_IDS = [
  "RULE-ELEC-007",
  "RULE-ELEC-008",
  "RULE-ELEC-009",
  "RULE-ELEC-013",
  "RULE-ELEC-014",
  "RULE-ELEC-015",
  "RULE-ELEC-016",
  "RULE-ELEC-017",
] as const;

export type Phase8ElectricalRuleId = (typeof PHASE_8_ELECTRICAL_RULE_IDS)[number];

export function isPhase8ElectricalRuleId(id: string): id is Phase8ElectricalRuleId {
  return (PHASE_8_ELECTRICAL_RULE_IDS as readonly string[]).includes(id);
}

export function getRegulatoryRule(id: string): RegulatoryRuleDefinition | undefined {
  return regulatoryRulesCatalog.find((ruleItem) => ruleItem.id === id);
}

export function regulatoryRulesByCategory(
  category: RuleCategory
): RegulatoryRuleDefinition[] {
  return regulatoryRulesCatalog.filter((ruleItem) => ruleItem.category === category);
}

export function regulatoryRulesByProfile(profileId: string): RegulatoryRuleDefinition[] {
  return regulatoryRulesCatalog.filter((ruleItem) =>
    ruleItem.appliesToProfiles.includes(profileId)
  );
}

export function regulatoryRulesByStatus(status: RuleStatus): RegulatoryRuleDefinition[] {
  return regulatoryRulesCatalog.filter((ruleItem) => ruleItem.status === status);
}
