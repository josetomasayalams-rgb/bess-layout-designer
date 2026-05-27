/**
 * Registry of missing datasheets / manufacturer documents that gate
 * specific app capabilities.
 *
 * This is the structured form of plan §614 ("Buscar datasheet antes de
 * implementar"), cross-referenced against §585 ("Agregar después").
 * Source: DIRECTRICES_APP_BESS/06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/
 *   BESS_DESIERTO_Analisis_Tecnico_App_Predimensionamiento.md
 * and DIRECTRICES_APP_BESS/99_PENDIENTES_DUPLICADOS_DESCARGA_MANUAL/
 *   DESCARGA_MANUAL_DATASHEETS/BESS_DESIERTO_DESCARGA_MANUAL_REQUERIDA.md
 *
 * Each item documents what is missing, which app feature it blocks,
 * which catalog values cannot be populated until obtained, and the
 * recommended action. UI components can surface these so the user
 * understands why a feature is disabled or shows reference values
 * instead of project-specific ones.
 */

export type PendingDatasheetSourceParty =
  | "manufacturer_sungrow"
  | "manufacturer_isotrol_bluence"
  | "epc_or_owner_atlas"
  | "external_supplier"
  | "authority_or_insurer";

export type PendingDatasheetPriority = "critical" | "important" | "desirable";

export type PendingDatasheetItem = {
  /** Stable identifier; used by warnings and the report. */
  id: string;
  /** Equipment or system tag this item refers to. */
  equipment: string;
  /** Short title of the missing document or data point. */
  title: string;
  /** Who should provide it. */
  requestFrom: PendingDatasheetSourceParty;
  /** Why the gap matters for the app. */
  reason: string;
  /**
   * Catalog or domain values that cannot be populated as `certified_data`
   * until this item is obtained. Use dotted paths into the technical types,
   * e.g. "pcsCatalog.SC5000UD-MV.clearances".
   */
  blocksValues: string[];
  /**
   * App features that cannot be built credibly without this item.
   * Reference plan §585 ("Agregar después") items.
   */
  blocksFeatures: string[];
  priority: PendingDatasheetPriority;
  suggestedAction: string;
};

/**
 * Authoritative list. Order does not matter; UI sorts by priority.
 */
export const pendingDatasheetItems: PendingDatasheetItem[] = [
  // --- ST2752UX (BESS container) ---
  {
    id: "PEND-ST2752-MODEL-CONFIRM",
    equipment: "ST2752UX / ST2725UX",
    title: "Confirmación contractual modelo (ST2752UX vs ST2725UX)",
    requestFrom: "manufacturer_sungrow",
    reason:
      "Project reports mention both ST2752UX and ST2725UX. App resolves the inconsistency in favor of ST2752UX by majority, but the contractual model is the authoritative source for energy, clearances and certifications.",
    blocksValues: ["bessContainerCatalog.[].model", "bessContainerCatalog.[].nominalEnergyMWhDcBol"],
    blocksFeatures: ["Inconsistency detector resolution to authoritative model"],
    priority: "critical",
    suggestedAction:
      "Request equipment sheet, purchase order or BOM from Sungrow / EPC / Atlas. The two models have different nominal energies (~2.752 vs 2.725 MWh DC BOL), which propagates into MWh totals, container counts and reporting.",
  },
  {
    id: "PEND-ST2752-LAYOUT-GUIDE",
    equipment: "ST2752UX",
    title: "Project-specific layout guide / installation plan for ST2752UX",
    requestFrom: "manufacturer_sungrow",
    reason:
      "System Manual gives general installation rules (figures 4-1 and 4-2), but a project-specific layout guide is needed to validate corridor widths, access routes and maintenance zones against the real implantation.",
    blocksValues: ["bessContainerCatalog.[].clearances (project-specific overrides)"],
    blocksFeatures: [
      "Optimized auto-layout with corridors and maintenance zones (plan §585.2)",
    ],
    priority: "critical",
    suggestedAction: "Request layout guide, applicable installation manual and approved plan from Sungrow / EPC.",
  },
  {
    id: "PEND-ST2752-UL9540A-REPORT",
    equipment: "ST2752UX",
    title: "UL 9540A test report (full document, not only datasheet compliance claim)",
    requestFrom: "manufacturer_sungrow",
    reason:
      "Datasheet declares UL 9540A / NFPA 855 compliance, but the actual test report drives certified fire separation values, not just the compliance label.",
    blocksValues: ["bessContainerCatalog.[].clearances.fireSeparationM"],
    blocksFeatures: ["Certified fire separation rules (replace preliminary_assumption)"],
    priority: "critical",
    suggestedAction: "Request UL 9540A summary or report from Sungrow under permitted disclosure.",
  },
  {
    id: "PEND-ST2752-HVAC-MATRIX",
    equipment: "ST2752UX",
    title: "HVAC / LCS consumption matrix per container",
    requestFrom: "manufacturer_sungrow",
    reason:
      "Liquid cooling system consumption per mode and ambient temperature is not documented in the System Manual.",
    blocksValues: ["bessContainerCatalog.[].auxiliaryPowerKw (not yet typed)"],
    blocksFeatures: [
      "Refined SSAA calculation by mode (plan §585.4 partial)",
      "HVAC sizing per ambient curve",
    ],
    priority: "important",
    suggestedAction: "Request auxiliary load matrix and consumption vs temperature curves from Sungrow.",
  },

  // --- SC5000UD-MV (PCS + MV station) ---
  {
    id: "PEND-SC5000-MANUAL",
    equipment: "SC5000UD-MV",
    title: "Official installation / system / user manual for SC5000UD-MV",
    requestFrom: "manufacturer_sungrow",
    reason:
      "Only datasheets V14/V15 are available officially. Public manuals are on third-party mirrors and cannot be cited as certified data.",
    blocksValues: [
      "pcsCatalog.SC5000UD-MV.clearances",
      "pcsCatalog.SC5000UD-MV.cableInletOutlet (not yet typed)",
      "pcsCatalog.SC5000UD-MV.deratingCurves (not yet typed)",
    ],
    blocksFeatures: [
      "Optimized auto-layout corridors around PCS (plan §585.2)",
      "Derating-aware sizing",
    ],
    priority: "critical",
    suggestedAction: "Request the exact manual from Sungrow.",
  },
  {
    id: "PEND-SC5000-TRAFO-DATA",
    equipment: "SC5000UD-MV integrated block transformer (0.9/33 kV)",
    title: "Separate datasheet for the integrated block transformer",
    requestFrom: "manufacturer_sungrow",
    reason:
      "The SC5000UD-MV datasheet does not give no-load losses, full nameplate or copper losses for the integrated transformer. Without these the app cannot refine transformer losses.",
    blocksValues: [
      "transformerCatalog.[].loadLossesKw (block transformer)",
      "transformerCatalog.[].positiveSequenceReactancePct",
    ],
    blocksFeatures: [
      "Refined electrical losses per transformer (plan §585.4)",
    ],
    priority: "important",
    suggestedAction: "Request nameplate, FAT report or datasheet of the integrated 0.9/33 kV transformer.",
  },

  // --- PPC / SCADA ---
  {
    id: "PEND-PPC-BLUENCE-DATASHEET",
    equipment: "Isotrol Bluence PPC",
    title: "Bluence PPC technical datasheet",
    requestFrom: "manufacturer_isotrol_bluence",
    reason:
      "Only public web information is available. App reports PPC as a metadata block without referenced characteristics.",
    blocksValues: ["ppcSpec (not yet typed)"],
    blocksFeatures: ["PPC modes and ramp/droop reporting with citation"],
    priority: "desirable",
    suggestedAction: "Request technical datasheet from Isotrol / Bluence.",
  },
  {
    id: "PEND-PPC-PROJECT-ARCHITECTURE",
    equipment: "Project PPC / SCADA",
    title: "Project-specific PPC / SCADA architecture (signals, measurement points, protocols)",
    requestFrom: "epc_or_owner_atlas",
    reason:
      "Project reports describe PPC modes (P/Q/PF/V/droop/ramp/frequency) but not the signal list, measurement points or protocols actually deployed.",
    blocksValues: ["projectCaseStudy.ppcArchitecture (not yet typed)"],
    blocksFeatures: ["Citation-grade PPC section in technical report"],
    priority: "desirable",
    suggestedAction: "Request control diagram, signal list and approved control memory from EPC / Atlas.",
  },

  // --- Project layout / civil ---
  {
    id: "PEND-PROJECT-CAD-LAYOUT",
    equipment: "BESS field layout",
    title: "Project CAD / general georeferenced layout (DWG/DXF/PDF IFC)",
    requestFrom: "epc_or_owner_atlas",
    reason:
      "No native CAD or general plant layout exists in the document set. App cannot validate its auto-layout against the real implantation.",
    blocksValues: ["caseStudy.realLayout (not yet typed)"],
    blocksFeatures: [
      "CAD importer (plan §585.1)",
      "Auto-layout validation against real implantation",
    ],
    priority: "critical",
    suggestedAction: "Request DWG / DXF / IFC PDF or basic engineering layout from EPC / Atlas.",
  },
  {
    id: "PEND-FIRE-PROJECT-CRITERIA",
    equipment: "Fire / safety at site level",
    title: "Project fire safety criteria (HSE study, NFPA / AHJ / insurer matrix)",
    requestFrom: "epc_or_owner_atlas",
    reason:
      "App applies generic NFPA 855 / UL 9540A references. Real project separations depend on AHJ rulings, insurer requirements and the HSE study.",
    blocksValues: [
      "regulatoryProfiles.bessdeldesierto.fireSeparationOverrides (not yet typed)",
    ],
    blocksFeatures: [
      "Certified site fire separation rules (replace preliminary_assumption)",
    ],
    priority: "critical",
    suggestedAction: "Request HSE study and AHJ / insurer matrix.",
  },
  {
    id: "PEND-SSAA-BREAKDOWN",
    equipment: "Auxiliary services (SSAA)",
    title: "Disaggregated auxiliary loads matrix (HVAC, control, fire, lighting, telecom)",
    requestFrom: "epc_or_owner_atlas",
    reason:
      "Project reports give aggregated SSAA consumption (e.g. 1.563 MW at PMAX). The app cannot model per-mode or per-system breakdown without disaggregation.",
    blocksValues: ["auxiliaryServices.breakdown (not yet typed)"],
    blocksFeatures: ["Refined SSAA per mode (plan §585.4 partial)"],
    priority: "important",
    suggestedAction: "Request auxiliary loads matrix broken down by subsystem.",
  },

  // --- MV switchgear and cable (project-specific) ---
  {
    id: "PEND-SWITCHGEAR-REAL",
    equipment: "33 kV switchgear / centro de seccionamiento",
    title: "Project-specific 33 kV switchgear datasheet (brand, model, cubicles, dimensions)",
    requestFrom: "epc_or_owner_atlas",
    reason:
      "Catalog references (Schneider PIX36, Siemens 8DA/8DB) are generic. The project's actual switchgear is not documented.",
    blocksValues: ["switchgearCatalog (project-specific entry)"],
    blocksFeatures: ["Centro de seccionamiento with real footprint and cubicle count"],
    priority: "important",
    suggestedAction: "Request detailed single-line, cubicle arrangement and datasheet from EPC / supplier.",
  },
  {
    id: "PEND-CABLE-SCHEDULE",
    equipment: "MV cable network",
    title: "MV cable schedule per segment (brand, section, length, installation method)",
    requestFrom: "epc_or_owner_atlas",
    reason:
      "Single-line drawings show AL/XLPE/CWS/HDPE 18/33(36) kV and sections 3x4x630, 3x2x500, 3x1x300 mm², but supplier and per-segment routing are not specified.",
    blocksValues: ["caseStudy.cableSchedule (not yet typed)"],
    blocksFeatures: [
      "Refined electrical losses per cable (plan §585.4)",
      "Realistic cable corridor sizing",
    ],
    priority: "important",
    suggestedAction: "Request cable schedule and preliminary calculation memory from EPC.",
  },
  {
    id: "PEND-TRENCH-CRITERIA",
    equipment: "Cable trenches / canalizations",
    title: "Trench / canalization criteria memory",
    requestFrom: "epc_or_owner_atlas",
    reason:
      "Conceptual cable corridors are auto-generated but not validated against project criteria for trench width, separation, depth or thermal grouping.",
    blocksValues: ["spacingRules.cableTrenchWidth (project-specific override)"],
    blocksFeatures: ["Validated corridor widths (replace preliminary_assumption)"],
    priority: "important",
    suggestedAction: "Request canalization criteria document or section from civil basic engineering.",
  },

  // --- External / extended scope ---
  {
    id: "PEND-MAIN-TRANSFORMER-DATASHEET",
    equipment: "Main transformer 250/125/125 MVA",
    title: "Main step-up transformer datasheet",
    requestFrom: "epc_or_owner_atlas",
    reason:
      "Required only if the app extends scope up to the AT POI; current scope ends at the 33 kV bus.",
    blocksValues: ["transformerCatalog.main_step_up"],
    blocksFeatures: ["Optional AT POI / main transformer module (plan §585.5)"],
    priority: "desirable",
    suggestedAction: "Request from owner / substation operator if AT scope is enabled.",
  },
];

/**
 * Returns the pending items that block a specific deferred feature.
 *
 * @param featurePattern Substring or regex matched against `blocksFeatures` entries.
 */
export function pendingItemsBlocking(featurePattern: string | RegExp): PendingDatasheetItem[] {
  const re =
    typeof featurePattern === "string"
      ? new RegExp(featurePattern, "i")
      : featurePattern;
  return pendingDatasheetItems.filter((item) =>
    item.blocksFeatures.some((feature) => re.test(feature))
  );
}

/**
 * Returns the pending items that block a specific catalog value.
 *
 * @param valuePattern Substring or regex matched against `blocksValues` entries.
 */
export function pendingItemsForValue(valuePattern: string | RegExp): PendingDatasheetItem[] {
  const re =
    typeof valuePattern === "string"
      ? new RegExp(valuePattern, "i")
      : valuePattern;
  return pendingDatasheetItems.filter((item) =>
    item.blocksValues.some((value) => re.test(value))
  );
}
