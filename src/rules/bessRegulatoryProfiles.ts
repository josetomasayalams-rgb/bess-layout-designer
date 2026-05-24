import type {
  RegulatoryDesignContext,
  RegulatoryProfile,
  RegulatoryProfileId,
} from "@/types/bessLayoutTypes";

export const DEFAULT_REGULATORY_CONTEXT: RegulatoryDesignContext = {
  jurisdiction: "international",
  batteryChemistry: "lfp",
  installationType: "outdoor",
  designLevel: "predesign",
  hasUl9540a: false,
  hasHma: false,
  hasLsft: false,
  hasAhjApproval: false,
  hasManufacturerManual: false,
  fireSuppression: "undefined",
  ventilation: "undefined",
  fireBarrier: "none",
};

const CONSERVATIVE_RULES = {
  bessToBess_m: 3,
  bessToBuilding_m: 3,
  bessToPropertyLine_m: 3,
  bessToPublicWay_m: 3,
  bessToCombustibleMaterial_m: 3,
  bessToEscapeRoute_m: 3,
  combustibleVegetationClearance_m: 3,
  maintenanceAisle_m: 1,
  electricalFrontWorkingClearance_m: 0.9,
  internalBatteryGroupSeparation_m: 0.9,
  maxEnergyPerGroup_kwh: 50,
  fireAreaReferenceLimit_kwh: 600,
  transformerToBessMinimum_m: 1,
  transformerToBessRecommended_m: 3,
};

export const REGULATORY_PROFILES: RegulatoryProfile[] = [
  {
    id: "ifc-2024-nfpa-855-conservative",
    name: "IFC 2024 / NFPA 855 - Conservative predesign",
    jurisdiction: "international",
    baseStandards: ["IFC 2024", "NFPA 855", "UL 9540A reference"],
    rules: CONSERVATIVE_RULES,
    basis: "conservative_criterion",
    source:
      "Conservative predesign profile based on IFC/NFPA-style BESS screening criteria. Reductions require UL 9540A, HMA, LSFT, AHJ or manufacturer validation.",
    notes:
      "This profile is a conservative engineering screening baseline, not a universal legal distance for every BESS.",
  },
  {
    id: "chile-sec-rgr-06-2021",
    name: "Chile - SEC RGR No. 06/2021",
    jurisdiction: "chile",
    baseStandards: ["SEC RGR No. 06/2021"],
    rules: {
      ...CONSERVATIVE_RULES,
      maintenanceAisle_m: 1,
    },
    basis: "normative",
    source:
      "Chile SEC RGR No. 06/2021 local reference. International separation criteria remain conservative references when outdoor utility-scale details are not explicitly defined.",
    notes:
      "For Chile, SEC RGR No. 06/2021 is treated as the local reference. Manufacturer manuals, fire design and authority review remain required.",
  },
  {
    id: "custom",
    name: "Custom profile",
    jurisdiction: "custom",
    baseStandards: ["User-defined"],
    rules: CONSERVATIVE_RULES,
    basis: "user_defined",
    source:
      "User-defined criteria. Values must be justified with manufacturer, engineering, UL 9540A/HMA/LSFT/AHJ or project-specific documentation.",
    notes:
      "Custom values keep visible validation warnings unless supporting basis is declared.",
  },
];

export function getRegulatoryProfile(id: RegulatoryProfileId): RegulatoryProfile {
  return (
    REGULATORY_PROFILES.find((profile) => profile.id === id) ??
    REGULATORY_PROFILES[0]
  );
}
