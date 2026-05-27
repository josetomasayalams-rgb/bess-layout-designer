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
    category: "physical_layout",
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
      "Spacing between BESS containers and PCS/MV stations is evaluated geometrically, but the underlying clearance value remains a preliminary assumption: the SC5000UD-MV installation manual is pending (PEND-SC5000-MANUAL). The 0.9 m front working space applied by the validator is a conservative electrical working clearance, not a vendor-cited value.",
    appParameter: "EquipmentSpec.clearances.otherType_m",
    priority: "P1",
    status: "implemented",
    evidence: [
      ev(
        "SUNGROW-SC5000UD-MV-US",
        "inferred",
        "PCS datasheet does not document a project-specific clearance. 0.9 m working space is a conservative electrical screening criterion until the official SC5000UD-MV installation manual is obtained."
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
    evidence: [ev("SEC-RGR-06-2024", "missing", "Requires human reading before any implementable rule is promoted.")],
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
    evidence: [ev("SEC-RIC-06", "missing", "Requires human reading of grounding clauses.")],
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
    evidence: [ev("SEC-RIC-18", "missing", "Requires human reading of submission requirements.")],
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
    evidence: [ev("SEC-RIC-19-V1.1", "missing", "Requires human reading of commissioning requirements.")],
  }),
  rule({
    id: "RULE-SEC-005",
    category: "regulatory_fire_safety",
    severity: "warning",
    title: "Fire protection system requirements",
    description: "Fire protection requirements should be mapped before promoting any automated fire rule.",
    appParameter: "fireSafety.systemType",
    priority: "P1",
    evidence: [ev("SEC-RPTD-08-2020", "missing", "Requires human reading of fire protection requirements.")],
  }),
  rule({
    id: "RULE-SEC-006",
    category: "regulatory_sec",
    severity: "warning",
    title: "Safety strip and electrical distances",
    description: "Electrical safety distance requirements should be mapped for site boundary and corridor checks.",
    appParameter: "LayoutZone(safety_strip).distance_m",
    priority: "P2",
    evidence: [ev("SEC-RPTD-07-2022", "missing", "Requires human reading of safety distance clauses.")],
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
    evidence: [ev("SEC-RPTD-09-2020", "missing", "Requires human reading of signage requirements.")],
  }),
  rule({
    id: "RULE-SEC-008",
    category: "regulatory_sec",
    severity: "warning",
    title: "Substation and electrical room requirements",
    description: "MV yard and switchgear zones should be checked against applicable substation and room criteria.",
    appParameter: "mvBus.layoutRequirements",
    priority: "P2",
    evidence: [ev("SEC-RIC-13", "missing", "Requires human reading of substation requirements.")],
  }),
  rule({
    id: "RULE-SEC-009",
    category: "regulatory_sec",
    severity: "warning",
    title: "Conductors and cable routing",
    description: "Cable installation method and routing should be checked against Chilean conductor/canalization rules.",
    appParameter: "cableRoutes.installMethod",
    priority: "P2",
    evidence: [ev("SEC-RIC-04-2020", "missing", "Requires human reading of conductor and canalization rules.")],
  }),
  rule({
    id: "RULE-SEC-010",
    category: "regulatory_sec",
    severity: "warning",
    title: "MV/LV line requirements",
    description: "Medium-voltage collector route assumptions should be checked against RPTD line requirements.",
    appParameter: "cableRoutes.MTrules",
    priority: "P2",
    evidence: [ev("SEC-RPTD-13-2020", "missing", "Requires human reading of MV/LV line requirements.")],
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
    evidence: [ev("SEC-RPTD-01-2021", "missing", "Requires human reading of nominal voltage and frequency references.")],
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
    evidence: [ev("SEC-RPTD-02-2020", "missing", "Requires human reading of classification criteria.")],
  }),

  rule({
    id: "RULE-CNE-001",
    category: "regulatory_cne_cen",
    severity: "warning",
    title: "NTSyCS applicability",
    description: "System security and quality service requirements should be reviewed for SEN-connected BESS.",
    appParameter: "compliance.ntsycs",
    priority: "P2",
    evidence: [ev("CNE-NTSyCS-RES45-2026", "missing", "Requires human reading before rule extraction.")],
  }),
  rule({
    id: "RULE-CNE-002",
    category: "regulatory_cne_cen",
    severity: "warning",
    title: "Complementary services requirements",
    description: "BESS complementary service capabilities should be tracked as a preliminary compliance checklist.",
    appParameter: "ppc.sscc",
    priority: "P3",
    evidence: [ev("CNE-NTSSCC-RES45-2026", "missing", "Requires human reading before rule extraction.")],
  }),
  rule({
    id: "RULE-CNE-003",
    category: "regulatory_cne_cen",
    severity: "warning",
    title: "IBR requirements",
    description: "Inverter-based resource requirements should be tracked for PCS/PPC scope.",
    appParameter: "ppc.ibr",
    priority: "P2",
    evidence: [ev("CNE-IBR-RES45-2026", "missing", "Requires human reading before rule extraction.")],
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
    evidence: [ev("CNE-Sismico-REX41-2025", "missing", "Requires human reading; foundations remain outside this MVP.")],
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
    evidence: [ev("CEN-Anexo2-NIMR-2024", "missing", "Requires human reading of classification/interconnection process.")],
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
    evidence: [ev("CEN-Anexo2-NIMR-2024", "missing", "Requires human reading before extracting checklist steps.")],
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
    evidence: [ev("CEN-Anexo1-PMGD-2024", "missing", "Requires human reading of PMGD process.")],
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
    evidence: [ev("MINVU-DDU-522-BESS", "missing", "Priority document; requires human reading.")],
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
    evidence: [ev("DS-47-OGUC", "missing", "Requires human reading and municipal context.")],
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
