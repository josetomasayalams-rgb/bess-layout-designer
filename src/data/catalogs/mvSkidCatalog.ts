import type { MvSkidSpec } from "@/types/technical";
import {
  bessDelDesiertoMtSource,
  pendingValidationSource,
  sungrowSc5000DatasheetSource,
} from "@/data/catalogs/sources";

export const mvSkidCatalog: MvSkidSpec[] = [
  {
    id: "mvskid-sungrow-sc5000ud-mv-desierto",
    manufacturer: "Sungrow",
    model: "SC5000UD-MV conversion center",
    aliases: ["SC5000UD-MV", "SC5000UD-MV-US-P3"],
    role: "pcs_transformer_station",
    apparentPowerMva: {
      value: 5,
      unit: "MVA",
      source: bessDelDesiertoMtSource,
    },
    pcsSpecId: "pcs-sungrow-sc5000ud-mv-us-p3",
    transformerSpecId: "tx-sungrow-sc5000ud-block-0_9-33kv",
    lvVoltageKv: {
      value: 0.9,
      unit: "kV",
      source: bessDelDesiertoMtSource,
    },
    mvVoltageKv: {
      value: 33,
      unit: "kV",
      source: bessDelDesiertoMtSource,
    },
    collectorVoltageKv: {
      value: 33,
      unit: "kV",
      source: bessDelDesiertoMtSource,
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
      source: {
        ...pendingValidationSource,
        notes:
          "Datasheet gives a PCS/MV converter weight limit. Confirm whether it matches the project 33/0.9 kV conversion center configuration.",
      },
    },
    sources: [bessDelDesiertoMtSource, sungrowSc5000DatasheetSource],
  },
];

export function getMvSkidSpec(id: string): MvSkidSpec | undefined {
  return mvSkidCatalog.find((spec) => spec.id === id);
}
