export type UnitSystemId = "metric_si";

export const DEFAULT_UNIT_SYSTEM: UnitSystemId = "metric_si";

export const UNIT_SYSTEMS: Record<
  UnitSystemId,
  {
    label: string;
    description: string;
  }
> = {
  metric_si: {
    label: "Metric / SI",
    description:
      "Default unit system for Chilean BESS predesign: m, m², ha, MW, MWh, kV, Hz, kg, t, °C and %.",
  },
};
