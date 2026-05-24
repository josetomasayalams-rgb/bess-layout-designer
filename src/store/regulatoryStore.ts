import { create } from "zustand";
import type {
  RegulatoryDesignContext,
  RegulatoryProfileId,
} from "@/types/bessLayoutTypes";
import { DEFAULT_REGULATORY_CONTEXT } from "@/rules/bessRegulatoryProfiles";
import type { RegulatoryRuleProfileId } from "@/rules/types";

type RegulatoryState = {
  activeProfileId: RegulatoryProfileId;
  context: RegulatoryDesignContext;
  /**
   * Fase 10 — perfil activo del catálogo de reglas normativas candidatas.
   * Coexiste con `activeProfileId` (sistema legacy de clearances). Una vez
   * que la UI lo selecciona, el panel y el export lo usan para enumerar
   * reglas evaluadas con citas.
   */
  activeRuleProfileId: RegulatoryRuleProfileId;
  setActiveProfileId: (profileId: RegulatoryProfileId) => void;
  setActiveRuleProfileId: (profileId: RegulatoryRuleProfileId) => void;
  updateContext: (patch: Partial<RegulatoryDesignContext>) => void;
};

export const useRegulatoryStore = create<RegulatoryState>((set) => ({
  activeProfileId: "ifc-2024-nfpa-855-conservative",
  activeRuleProfileId: "chile-utility-predesign",
  context: DEFAULT_REGULATORY_CONTEXT,
  setActiveProfileId: (profileId) =>
    set((state) => ({
      activeProfileId: profileId,
      context: {
        ...state.context,
        jurisdiction:
          profileId === "chile-sec-rgr-06-2021"
            ? "chile"
            : profileId === "custom"
              ? "custom"
              : "international",
      },
    })),
  setActiveRuleProfileId: (profileId) => set({ activeRuleProfileId: profileId }),
  updateContext: (patch) =>
    set((state) => ({ context: { ...state.context, ...patch } })),
}));
