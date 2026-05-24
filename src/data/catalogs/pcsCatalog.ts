import type { PcsSpec } from "@/types/technical";
import {
  bessDelDesiertoMtSource,
  sungrowSc5000DatasheetSource,
} from "@/data/catalogs/sources";

export const pcsCatalog: PcsSpec[] = [
  {
    id: "pcs-sungrow-sc5000ud-mv-us-p3",
    manufacturer: "Sungrow",
    model: "SC5000UD-MV-US-P3",
    aliases: ["SC5000UD-MV", "SC5000UD-MV-US"],
    type: "mv_power_converter",
    apparentPowerMva: {
      value: 5,
      unit: "MVA",
      source: sungrowSc5000DatasheetSource,
    },
    dcVoltageRange: {
      min: 1000,
      max: 1500,
      unit: "Vdc",
      source: sungrowSc5000DatasheetSource,
    },
    acLvVoltageKv: {
      value: 0.69,
      unit: "kV",
      source: sungrowSc5000DatasheetSource,
    },
    acMvVoltageKv: {
      value: 34.5,
      unit: "kV",
      source: sungrowSc5000DatasheetSource,
    },
    frequencyHz: {
      value: 60,
      unit: "Hz",
      source: sungrowSc5000DatasheetSource,
    },
    powerFactor: {
      value: ">0.99; adjustable 1 leading to 1 lagging",
      source: sungrowSc5000DatasheetSource,
    },
    efficiencyConverterPct: {
      value: 99,
      unit: "%",
      source: sungrowSc5000DatasheetSource,
    },
    efficiencyIncludingTransformerPct: {
      value: 98.3,
      unit: "%",
      source: sungrowSc5000DatasheetSource,
    },
    footprint: {
      lengthM: {
        value: 6.058,
        unit: "m",
        source: sungrowSc5000DatasheetSource,
      },
      widthM: {
        value: 2.438,
        unit: "m",
        source: sungrowSc5000DatasheetSource,
      },
      heightM: {
        value: 2.896,
        unit: "m",
        source: sungrowSc5000DatasheetSource,
      },
    },
    weightKg: {
      value: 17000,
      unit: "kg",
      source: sungrowSc5000DatasheetSource,
    },
    cooling: {
      value: "Forced air cooling + KNAN",
      source: sungrowSc5000DatasheetSource,
    },
    certifications: {
      value: [
        "UL 1741",
        "UL 1741 SA/SB",
        "IEEE 1547:2018",
        "CSA C22.2 No.107.1-16",
      ],
      source: sungrowSc5000DatasheetSource,
    },
    knownVoltageContradictions: {
      datasheetLvKv: 0.69,
      datasheetMvKv: 34.5,
      projectReportedLvKv: 0.9,
      projectReportedMvKv: 33,
      notes:
        "Datasheet version found in the folder reports 0.69/34.5 kV, while BESS del Desierto project reports use 0.9/33 kV for the block transformer.",
    },
    sources: [sungrowSc5000DatasheetSource, bessDelDesiertoMtSource],
  },
];

export function getPcsSpec(id: string): PcsSpec | undefined {
  return pcsCatalog.find((spec) => spec.id === id);
}
