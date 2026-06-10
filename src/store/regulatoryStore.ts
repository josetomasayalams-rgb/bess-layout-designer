import { create } from "zustand";
import type {
  RegulatoryDesignContext,
  RegulatoryProfileId,
} from "@/types/bessLayoutTypes";
import { DEFAULT_REGULATORY_CONTEXT } from "@/rules/regulatoryProfileMetadata";
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
  // Sub-profile filters (Phase P4)
  showFmGlobal: boolean;
  showSecOnly: boolean;
  showTerritorial: boolean;
  setActiveProfileId: (profileId: RegulatoryProfileId) => void;
  setActiveRuleProfileId: (profileId: RegulatoryRuleProfileId) => void;
  setShowFmGlobal: (show: boolean) => void;
  setShowSecOnly: (show: boolean) => void;
  setShowTerritorial: (show: boolean) => void;
  updateContext: (patch: Partial<RegulatoryDesignContext>) => void;
};

export const useRegulatoryStore = create<RegulatoryState>((set) => ({
  activeProfileId: "ifc-2024-nfpa-855-conservative",
  activeRuleProfileId: "chile-utility-predesign",
  context: DEFAULT_REGULATORY_CONTEXT,
  showFmGlobal: true,
  showSecOnly: false,
  showTerritorial: true,
  setActiveProfileId: (profileId) =>
    set((state) => ({
      activeProfileId: profileId,
      context: {
        ...state.context,
        jurisdiction:
          profileId === "chile-sec-rgr-06-2024"
            ? "chile"
            : profileId === "custom"
              ? "custom"
              : "international",
      },
    })),
  setActiveRuleProfileId: (profileId) => set({ activeRuleProfileId: profileId }),
  setShowFmGlobal: (show) => set({ showFmGlobal: show }),
  setShowSecOnly: (show) => set({ showSecOnly: show }),
  setShowTerritorial: (show) => set({ showTerritorial: show }),
  updateContext: (patch) =>
    set((state) => ({ context: { ...state.context, ...patch } })),
}));
