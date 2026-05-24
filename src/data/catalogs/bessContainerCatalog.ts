import type { BessContainerSpec } from "@/types/technical";
import {
  pendingValidationSource,
  sungrowSt2752DatasheetSource,
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
      status: "pending_validation",
      notes:
        "Manufacturer manual includes installation spacing figures, but exact project-applicable values have not been structured yet.",
    },
    sources: [sungrowSt2752DatasheetSource, pendingValidationSource],
  },
];

export function getBessContainerSpec(id: string): BessContainerSpec | undefined {
  return bessContainerCatalog.find((spec) => spec.id === id);
}
