import { bessContainerCatalog } from "@/data/catalogs/bessContainerCatalog";
import { mvSkidCatalog } from "@/data/catalogs/mvSkidCatalog";
import { pcsCatalog } from "@/data/catalogs/pcsCatalog";
import { transformerCatalog } from "@/data/catalogs/transformerCatalog";
import {
  bessDelDesiertoMtSource,
  bessDelDesiertoPmaxSource,
  bessDelDesiertoPpydSource,
  calculatedSource,
  pendingValidationSource,
} from "@/data/catalogs/sources";
import type {
  LayoutAssumption,
  PendingDataItem,
  PowerEnergyBlock,
  ProjectCaseStudy,
  ProjectExclusion,
  ValidationStatus,
} from "@/types/technical";

const BESS_SPEC_ID = "bess-sungrow-st2752ux-us";
const PCS_SPEC_ID = "pcs-sungrow-sc5000ud-mv-us-p3";
const MV_SKID_SPEC_ID = "mvskid-sungrow-sc5000ud-mv-desierto";
const TRANSFORMER_SPEC_ID = "tx-sungrow-sc5000ud-block-0_9-33kv";

const blockArchitecture: PowerEnergyBlock[] = Array.from({ length: 40 }, (_, index) => {
  const blockNumber = index + 1;
  return {
    id: `desierto-block-${String(blockNumber).padStart(2, "0")}`,
    name: `BESS del Desierto block ${blockNumber}`,
    bessContainerSpecId: BESS_SPEC_ID,
    bessContainerQuantity: 8,
    pcsSpecId: PCS_SPEC_ID,
    pcsQuantity: 1,
    mvSkidSpecId: MV_SKID_SPEC_ID,
    transformerSpecId: TRANSFORMER_SPEC_ID,
    nominalPowerMva: {
      value: 5,
      unit: "MVA",
      source: bessDelDesiertoPpydSource,
    },
    nominalEnergyMWhDc: {
      value: 22.020096,
      unit: "MWh DC nominal",
      source: {
        ...calculatedSource,
        notes:
          "Calculated as 8 x 2.752512 MWh reported per ST2752UX container in project technical reports.",
      },
    },
    collectorVoltageKv: {
      value: 33,
      unit: "kV",
      source: bessDelDesiertoMtSource,
    },
    sourceRefs: [
      bessDelDesiertoPpydSource.title,
      bessDelDesiertoMtSource.title,
    ],
    confidence: "reported_project_data",
  };
});

const pendingData: PendingDataItem[] = [
  {
    id: "desierto-clearances-real",
    topic: "Manufacturer/project clearances",
    reason:
      "Exact maintenance, fire and installation clearances have not been structured from the manual figures or project layout.",
    requiredFor: "conceptual",
    suggestedSource:
      "Sungrow ST2752UX system manual, SC5000UD-MV installation manual and project layout drawings.",
    priority: "critical",
  },
  {
    id: "desierto-layout-general",
    topic: "General site layout",
    reason:
      "No structured coordinate layout for the 320 containers and 40 conversion centers has been loaded.",
    requiredFor: "conceptual",
    suggestedSource: "Project general arrangement drawing or GIS/CAD layout.",
    priority: "critical",
  },
  {
    id: "desierto-model-confirmation",
    topic: "Final PCS/MV station model confirmation",
    reason:
      "Documents reference SC5000UD-MV while the datasheet in the folder is SC5000UD-MV-US-P3.",
    requiredFor: "conceptual",
    suggestedSource: "Vendor datasheet package and approved equipment list.",
    priority: "critical",
  },
  {
    id: "desierto-voltage-discrepancy",
    topic: "LV/MV voltage discrepancy",
    reason:
      "PCS datasheet reports 0.69/34.5 kV, while project reports describe 0.9/33 kV for the block transformer.",
    requiredFor: "conceptual",
    suggestedSource: "Final single-line diagram, transformer datasheet and PCS configuration datasheet.",
    priority: "critical",
  },
  {
    id: "desierto-available-area",
    topic: "Available BESS area",
    reason:
      "Area available for the BESS block, roads and setbacks is not yet represented as a case-study input.",
    requiredFor: "conceptual",
    suggestedSource: "Site boundary, project GA or environmental layout drawing.",
    priority: "important",
  },
  {
    id: "desierto-internal-roads",
    topic: "Internal roads and service corridors",
    reason:
      "Road widths, turning requirements and maintenance aisles are still conceptual assumptions.",
    requiredFor: "basic_engineering",
    suggestedSource: "Civil layout and emergency access criteria.",
    priority: "important",
  },
  {
    id: "desierto-fence-setbacks",
    topic: "Fence and property setbacks",
    reason:
      "Distances to fences, roads and adjacent assets are not structured.",
    requiredFor: "basic_engineering",
    suggestedSource: "Site layout, permitting criteria and fire protection review.",
    priority: "important",
  },
  {
    id: "desierto-33kv-dimensions",
    topic: "Exact 33/0.9 kV conversion-center dimensions",
    reason:
      "PCS datasheet dimensions are available, but the exact project configuration requires confirmation.",
    requiredFor: "conceptual",
    suggestedSource: "Sungrow project-specific submittal for the conversion center.",
    priority: "important",
  },
];

const exclusions: ProjectExclusion[] = [
  {
    id: "exclude-sol-del-desierto-substation",
    scope: "Sol del Desierto substation",
    reason:
      "The current AppVes scope is BESS conceptual predesign up to the internal collector boundary, not substation engineering.",
    futureStage: "basic_engineering",
  },
  {
    id: "exclude-main-220kv-transformer",
    scope: "Main 220 kV transformer",
    reason:
      "Main transformer and 220 kV interface are connection-boundary context, not current map equipment.",
    futureStage: "basic_engineering",
  },
  {
    id: "exclude-bays-busbars-protection",
    scope: "Bays, busbars and protection systems",
    reason:
      "Protection and substation design require electrical engineering studies outside conceptual sizing.",
    futureStage: "detail_engineering",
  },
  {
    id: "exclude-minimum-technical-operation",
    scope: "Minimum technical and PMAX/AGC simulations",
    reason:
      "Operational tests are useful context, but the app does not simulate dynamic operation in this phase.",
    futureStage: "basic_engineering",
  },
  {
    id: "exclude-short-circuit",
    scope: "Short-circuit and protection coordination",
    reason: "These studies require specialized power-system tools and validated network models.",
    futureStage: "detail_engineering",
  },
  {
    id: "exclude-emt-rms",
    scope: "EMT/RMS studies",
    reason: "Dynamic model studies are outside preliminary layout and sizing.",
    futureStage: "detail_engineering",
  },
  {
    id: "exclude-ground-grid",
    scope: "Ground grid",
    reason: "Grounding design requires soil data, fault studies and detailed engineering.",
    futureStage: "detail_engineering",
  },
  {
    id: "exclude-civil-detail",
    scope: "Drainage, geotechnics and formal HMA",
    reason:
      "Civil and hazard studies are recorded as next-stage requirements, not implemented as design calculations.",
    futureStage: "basic_engineering",
  },
  {
    id: "exclude-ifc-drawings",
    scope: "IFC drawings",
    reason: "The app is not intended to replace CAD/Civil 3D deliverables.",
    futureStage: "detail_engineering",
  },
];

const layoutAssumptions: LayoutAssumption[] = [
  {
    id: "desierto-layout-conceptual",
    appliesTo: "bess",
    parameter: "layout_basis",
    value: "Conceptual block layout only",
    source: pendingValidationSource,
    notes:
      "The case can validate quantities and block architecture before exact equipment coordinates are available.",
  },
  {
    id: "desierto-clearances-pending",
    appliesTo: "bess",
    parameter: "manufacturer_clearances_m",
    value: null,
    unit: "m",
    source: pendingValidationSource,
    notes:
      "Use active regulatory/profile assumptions for temporary screening until manufacturer/project clearances are structured.",
  },
  {
    id: "desierto-substation-boundary",
    appliesTo: "substation_boundary",
    parameter: "scope_boundary",
    value: "33 kV collector / substation interface is excluded from layout modeling",
    source: bessDelDesiertoMtSource,
    notes:
      "Substation and main transformer are only represented as an exclusion and connection boundary.",
  },
];

const validationStatus: ValidationStatus[] = [
  {
    id: "desierto-quantity-architecture",
    check: "Reported block architecture",
    status: "pass",
    message:
      "40 blocks x 8 ST2752UX containers matches the reported 320 container count.",
    affectedEquipmentIds: [BESS_SPEC_ID, PCS_SPEC_ID, MV_SKID_SPEC_ID],
  },
  {
    id: "desierto-voltage-version",
    check: "PCS/MV voltage version",
    status: "warning",
    message:
      "Datasheet voltage 0.69/34.5 kV differs from project-reported 0.9/33 kV.",
    affectedEquipmentIds: [PCS_SPEC_ID, TRANSFORMER_SPEC_ID],
    requiredAction: "Confirm project-specific PCS and transformer configuration.",
  },
  {
    id: "desierto-layout-clearances",
    check: "Layout and clearances",
    status: "not_evaluable",
    message:
      "Exact clearances and project coordinates are pending; only conceptual block validation is possible.",
    affectedEquipmentIds: [BESS_SPEC_ID, MV_SKID_SPEC_ID],
    requiredAction: "Load manufacturer clearances and general arrangement layout.",
  },
];

export const bessDelDesiertoCaseStudy: ProjectCaseStudy = {
  id: "bess-del-desierto",
  projectName: "BESS del Desierto",
  projectType: "standalone",
  country: "Chile",
  designStage: "conceptual_validation_case",
  sourceFolder: "INFO BESS DEL DESIERTO",
  designIntent: {
    targetPowerMW: 200,
    targetEnergyMWh: 800,
    targetDurationHours: 4,
    designMode: "validate_existing_project",
    projectType: "standalone",
    gridConnectionScope: "conceptual_boundary",
    notes: [
      "Case uses documented BESS/PCS/MV conversion center quantities for conceptual validation.",
      "Co-located project/substation context is not modeled as a hybrid dispatch or substation design in this phase.",
      `PMAX context source: ${bessDelDesiertoPmaxSource.title}.`,
    ],
  },
  equipmentSet: {
    bessContainers: bessContainerCatalog.filter((spec) => spec.id === BESS_SPEC_ID),
    pcsUnits: pcsCatalog.filter((spec) => spec.id === PCS_SPEC_ID),
    mvSkids: mvSkidCatalog.filter((spec) => spec.id === MV_SKID_SPEC_ID),
    transformers: transformerCatalog.filter((spec) => spec.id === TRANSFORMER_SPEC_ID),
  },
  blockArchitecture,
  layoutAssumptions,
  validationStatus,
  exclusions,
  pendingData,
};
