import type { TransformerSpec } from "@/types/technical";
import {
  bessDelDesiertoMtSource,
  pendingValidationSource,
} from "@/data/catalogs/sources";

export const transformerCatalog: TransformerSpec[] = [
  {
    id: "tx-sungrow-sc5000ud-block-0_9-33kv",
    manufacturer: "Sungrow",
    model: "Integrated SC5000UD-MV block transformer",
    role: "inverter_duty_bt_mt",
    apparentPowerMva: {
      value: 5,
      unit: "MVA",
      source: bessDelDesiertoMtSource,
    },
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
    windingConfiguration: {
      value: "Dy11",
      source: bessDelDesiertoMtSource,
    },
    cooling: {
      value: "ONAN",
      source: bessDelDesiertoMtSource,
    },
    positiveSequenceReactancePct: {
      value: 7.95,
      unit: "%",
      source: bessDelDesiertoMtSource,
    },
    positiveSequenceResistancePct: {
      value: 0.91,
      unit: "%",
      source: bessDelDesiertoMtSource,
    },
    loadLossesKw: {
      value: 45,
      unit: "kW",
      source: bessDelDesiertoMtSource,
    },
    tapRange: {
      value: "+/-2 x 2.5%",
      source: bessDelDesiertoMtSource,
    },
    footprint: {
      lengthM: {
        value: 6.058,
        unit: "m",
        source: {
          ...pendingValidationSource,
          notes:
            "Using PCS/MV station envelope as a visual placeholder. Exact transformer-only dimensions for the 33/0.9 kV project configuration are pending.",
        },
      },
      widthM: {
        value: 2.438,
        unit: "m",
        source: {
          ...pendingValidationSource,
          notes:
            "Using PCS/MV station envelope as a visual placeholder. Exact transformer-only dimensions for the 33/0.9 kV project configuration are pending.",
        },
      },
      heightM: {
        value: 2.896,
        unit: "m",
        source: {
          ...pendingValidationSource,
          notes:
            "Using PCS/MV station envelope as a visual placeholder. Exact transformer-only dimensions for the 33/0.9 kV project configuration are pending.",
        },
      },
    },
    sources: [bessDelDesiertoMtSource, pendingValidationSource],
  },
];

export function getTransformerSpec(id: string): TransformerSpec | undefined {
  return transformerCatalog.find((spec) => spec.id === id);
}
