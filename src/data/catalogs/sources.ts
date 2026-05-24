import type { TechnicalSource } from "@/types/technical";

export const EXTRACTION_DATE = "2026-05-21";

export const sungrowSt2752DatasheetSource: TechnicalSource = {
  classification: "certified_data",
  title: "Sungrow ST2752UX-US Datasheet V15",
  document: "INFO BESS DEL DESIERTO/1) DATASHEETS/DS_20220225_ST2752UX-US_Datasheet_V15_EN.pdf",
  notes:
    "Manufacturer datasheet. Values used here are for conceptual predesign and require final vendor confirmation before engineering.",
  extractedAt: EXTRACTION_DATE,
};

export const sungrowSc5000DatasheetSource: TechnicalSource = {
  classification: "certified_data",
  title: "Sungrow SC5000UD-MV-US-P3 Datasheet",
  document: "INFO BESS DEL DESIERTO/1) DATASHEETS/af542fca-56dd-4423-aad6-f68476274623.pdf",
  notes:
    "Manufacturer datasheet for the MV power converter version found in the project document set.",
  extractedAt: EXTRACTION_DATE,
};

export const bessDelDesiertoPpydSource: TechnicalSource = {
  classification: "reported_project_data",
  title: "EE-EN-2025-1092-RB PPyD BESS del Desierto",
  document: "INFO BESS DEL DESIERTO/EE-EN-2025-1092-RB_PPyD_BESS_del_Desierto-3.pdf",
  notes:
    "Project technical report with declared project power, energy, equipment counts and battery hierarchy.",
  extractedAt: EXTRACTION_DATE,
};

export const bessDelDesiertoMtSource: TechnicalSource = {
  classification: "reported_project_data",
  title: "EE-EN-2025-1129-RB Informe Final MT BESS del Desierto",
  document: "INFO BESS DEL DESIERTO/EE-EN-2025-1129-RB_Informe_Final_MT_BESS_del_Desierto.pdf",
  notes:
    "Project technical report with minimum technical data and block transformer values.",
  extractedAt: EXTRACTION_DATE,
};

export const bessDelDesiertoPmaxSource: TechnicalSource = {
  classification: "reported_project_data",
  title: "EE-EN-2025-2611-RB Potencia Maxima BESS del Desierto",
  document: "INFO BESS DEL DESIERTO/EE-EN-2025-2611-RB_Potencia_Maxima_BESS_del_Desierto_-5.pdf",
  notes:
    "Project technical report with PMAX test and declared 200 MW / 800 MWh context.",
  extractedAt: EXTRACTION_DATE,
};

export const pendingValidationSource: TechnicalSource = {
  classification: "pending_validation",
  title: "Pending project validation",
  notes:
    "Data was not found as a machine-readable, project-specific value in the current document set.",
  extractedAt: EXTRACTION_DATE,
};

export const calculatedSource: TechnicalSource = {
  classification: "calculated",
  title: "Calculated by AppVes preliminary sizing",
  notes:
    "Calculated from documented equipment quantities and capacities. This is not a manufacturer certified AC usable value.",
  extractedAt: EXTRACTION_DATE,
};
