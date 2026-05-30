export type Equipment3DVisualProfileId =
  | "sungrow_container_v1"
  | "sungrow_pcs_v1"
  | "tesla_megapack_v1";

export type Equipment3DVisualProfile = {
  id: Equipment3DVisualProfileId;
  displayName: string;
  baseColor: string;
  roofColor: string;
  detailColor: string;
  doorColor: string;
  ventColor: string;
  accentColor: string;
  logoColor: string;
  logoText?: string;
  showPanels: boolean;
  showVents: boolean;
  showDoors: boolean;
};

type VisualProfileSpecLike = {
  type?: string;
  manufacturer?: string;
  visualProfile?: string | null;
};

export const equipment3DVisualProfiles: Record<
  Equipment3DVisualProfileId,
  Equipment3DVisualProfile
> = {
  sungrow_container_v1: {
    id: "sungrow_container_v1",
    displayName: "Sungrow BESS Container",
    baseColor: "#d8dde4",
    roofColor: "#eef2f7",
    detailColor: "#64748b",
    doorColor: "#cbd5e1",
    ventColor: "#334155",
    accentColor: "#38bdf8",
    logoColor: "#0f5f99",
    showPanels: true,
    showVents: true,
    showDoors: true,
  },
  sungrow_pcs_v1: {
    id: "sungrow_pcs_v1",
    displayName: "Sungrow PCS MV Station",
    baseColor: "#a8b0ba",
    roofColor: "#cbd5e1",
    detailColor: "#475569",
    doorColor: "#94a3b8",
    ventColor: "#1f2937",
    accentColor: "#f59e0b",
    logoColor: "#0f5f99",
    showPanels: false,
    showVents: false,
    showDoors: false,
  },
  tesla_megapack_v1: {
    // Tesla Megapack 2 XL — integrated AC block: a tall, monolithic silver
    // enclosure with subtle vertical panel divisions, dark thermal vents and
    // the Tesla wordmark. No separate-door look (smooth front).
    id: "tesla_megapack_v1",
    displayName: "Tesla Megapack 2 XL",
    baseColor: "#c8ccd2",
    roofColor: "#e2e6ea",
    detailColor: "#9aa1ab",
    doorColor: "#b4bac2",
    ventColor: "#3f4654",
    accentColor: "#e11d2e",
    logoColor: "#1c2128",
    logoText: "TESLA",
    showPanels: true,
    showVents: true,
    showDoors: false,
  },
};

export function getEquipment3DVisualProfile(id?: string | null) {
  if (!id) return null;
  return equipment3DVisualProfiles[id as Equipment3DVisualProfileId] ?? null;
}

export function resolveEquipment3DVisualProfileId(
  spec?: VisualProfileSpecLike | null
): Equipment3DVisualProfileId | null {
  if (!spec) return null;
  if (getEquipment3DVisualProfile(spec.visualProfile)) {
    return spec.visualProfile as Equipment3DVisualProfileId;
  }
  const manufacturer = spec.manufacturer ?? "";
  if (/tesla/i.test(manufacturer)) {
    // Tesla Megapack is a fully integrated AC block modeled as a single
    // battery_container; there is no separate PCS profile.
    if (spec.type === "battery_container") return "tesla_megapack_v1";
    return null;
  }
  if (!/sungrow/i.test(manufacturer)) return null;
  if (spec.type === "battery_container") return "sungrow_container_v1";
  if (spec.type === "pcs_mv_station") return "sungrow_pcs_v1";
  return null;
}

export function resolveEquipment3DVisualProfile(spec?: VisualProfileSpecLike | null) {
  return getEquipment3DVisualProfile(resolveEquipment3DVisualProfileId(spec));
}
