import type { BessContainerSpec } from "@/types/technical";
import {
  pendingValidationSource,
  sungrowSt2752DatasheetSource,
  sungrowSt2752SystemManualSource,
} from "@/data/catalogs/sources";

export const bessContainerCatalog: BessContainerSpec[] = [
  {
    id: "bess-sungrow-st2752ux-us",
    manufacturer: "Sungrow",
    model: "ST2752UX-US",
    aliases: ["ST2752UX", "PowerTitan ST2752UX"],
    chemistry: {
      value: "LFP",
      source: sungrowSt2752DatasheetSource,
    },
    nominalEnergyMWhDcBol: {
      value: 2.752,
      unit: "MWh DC BOL",
      source: sungrowSt2752DatasheetSource,
    },
    dcVoltageRange: {
      min: 1160,
      max: 1500,
      unit: "Vdc",
      source: sungrowSt2752DatasheetSource,
    },
    footprint: {
      lengthM: {
        value: 9.34,
        unit: "m",
        source: sungrowSt2752DatasheetSource,
      },
      widthM: {
        value: 1.73,
        unit: "m",
        source: sungrowSt2752DatasheetSource,
      },
      heightM: {
        value: 2.6,
        unit: "m",
        source: sungrowSt2752DatasheetSource,
      },
    },
    weightKg: {
      value: 26400,
      unit: "kg",
      source: sungrowSt2752DatasheetSource,
    },
    cooling: {
      value: "Liquid cooling",
      source: sungrowSt2752DatasheetSource,
    },
    protection: {
      value: "IP54 / Type 3R",
      source: sungrowSt2752DatasheetSource,
    },
    certifications: {
      value: ["UL 9540", "UL 9540A", "NFPA 855"],
      source: sungrowSt2752DatasheetSource,
    },
    clearances: {
      // Service / ventilation side per System Manual Ver12, figures 4-1 and 4-2.
      // This is the access side required for maintenance and air intake/outlet.
      maintenanceM: {
        value: 2.5,
        unit: "m",
        source: sungrowSt2752SystemManualSource,
      },
      status: "certified_data",
      notes:
        "Manufacturer installation clearances per System Manual Ver12 (figs 4-1, 4-2): "
        + "service/ventilation side 2500 mm (maintenanceM above), unit ends 600 mm, "
        + "facing adjacent units 150 mm. These are the manufacturer's rule for ST2752UX-US "
        + "and are not a substitute for UL 9540A / NFPA 855 fire separation, which remains "
        + "pending (UL 9540A report not yet received).",
    },
    sources: [
      sungrowSt2752DatasheetSource,
      sungrowSt2752SystemManualSource,
      pendingValidationSource,
    ],
  },
];

export function getBessContainerSpec(id: string): BessContainerSpec | undefined {
  return bessContainerCatalog.find((spec) => spec.id === id);
}
