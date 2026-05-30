import type { StoreApi } from "zustand";
import { runSmartSiteFit } from "@/lib/layout/smartSiteFit/smartSiteFitEngine";
import { summarizePlacedEquipment } from "@/lib/layout/smartSiteFit/smartSiteFitSizing";
import type {
  SmartSiteFitInput,
  SmartSiteFitOverrides,
} from "@/lib/layout/smartSiteFit/smartSiteFitTypes";
import {
  type ProjectState,
  type SmartSiteFitApplyResult,
  emptySmartSiteFitPreviewState,
} from "../projectStore.types";
import { recordHistory } from "../projectStore.history";

export type SmartSiteFitSlice = {
  smartSiteFit: ProjectState["smartSiteFit"];
  smartSiteFitApplied: ProjectState["smartSiteFitApplied"];

  runSmartSiteFitAnalysis: (input: SmartSiteFitInput) => void;
  selectSmartSiteFitAlternative: (alternativeId: string) => void;
  updateSmartSiteFitOverrides: (
    overrides: Partial<SmartSiteFitOverrides>
  ) => void;
  recalculateSmartSiteFitPreview: () => void;
  applySmartSiteFitAlternative: () => SmartSiteFitApplyResult;
  discardSmartSiteFit: () => void;
};

export function createSmartSiteFitSlice(
  set: StoreApi<ProjectState>["setState"],
  get: StoreApi<ProjectState>["getState"]
): SmartSiteFitSlice {
  return {
    smartSiteFit: emptySmartSiteFitPreviewState,
    smartSiteFitApplied: null,

    runSmartSiteFitAnalysis: (input) => {
      const { polygon, anchor } = get();
      const resolvedInput = {
        ...input,
        polygon: input.polygon ?? polygon,
        anchor: input.anchor ?? (anchor || undefined),
      };

      const result = runSmartSiteFit(resolvedInput);
      const selectedAlternativeId = result.candidates[0]?.id || null;

      set((state) => ({
        smartSiteFit: {
          result,
          selectedAlternativeId,
          overrides: input.overrides ?? state.smartSiteFit.overrides,
          dirty: false,
          lastRunInput: resolvedInput,
          lastRunAt: new Date().toISOString(),
        },
      }));
    },

    selectSmartSiteFitAlternative: (alternativeId) => {
      set((state) => {
        const candidates = state.smartSiteFit.result?.candidates ?? [];
        const exists = candidates.some((c) => c.id === alternativeId);
        if (!exists && alternativeId !== null) {
          return {};
        }
        return {
          smartSiteFit: {
            ...state.smartSiteFit,
            selectedAlternativeId: alternativeId,
          },
        };
      });
    },

    updateSmartSiteFitOverrides: (overrides) => {
      set((state) => ({
        smartSiteFit: {
          ...state.smartSiteFit,
          overrides: {
            ...state.smartSiteFit.overrides,
            ...overrides,
          },
          dirty: true,
        },
      }));
    },

    recalculateSmartSiteFitPreview: () => {
      const { lastRunInput, overrides, selectedAlternativeId } = get().smartSiteFit;
      if (!lastRunInput) return;

      const updatedInput = {
        ...lastRunInput,
        overrides: {
          ...lastRunInput.overrides,
          ...overrides,
        },
      };

      const result = runSmartSiteFit(updatedInput);

      const exists = result.candidates.some((c) => c.id === selectedAlternativeId);
      const newSelectionId = exists ? selectedAlternativeId : (result.candidates[0]?.id || null);

      set((state) => ({
        smartSiteFit: {
          ...state.smartSiteFit,
          result,
          selectedAlternativeId: newSelectionId,
          dirty: false,
          lastRunInput: updatedInput,
          lastRunAt: new Date().toISOString(),
        },
      }));
    },

    applySmartSiteFitAlternative: () => {
      const { result, selectedAlternativeId, lastRunInput } = get().smartSiteFit;
      if (!result || !selectedAlternativeId || !lastRunInput) {
        return {
          success: false,
          message: "No active SmartSiteFit preview to apply.",
          placedCount: 0,
        };
      }

      const candidate = result.candidates.find((c) => c.id === selectedAlternativeId);
      if (!candidate) {
        return {
          success: false,
          message: `Selected alternative ${selectedAlternativeId} not found.`,
          placedCount: 0,
        };
      }

      // Architecture-agnostic counts: correct for Sungrow (BESS + separate PCS)
      // and for integrated presets (units carry their own inverter, pcsCount 0).
      const { bessCount, pcsCount } = summarizePlacedEquipment(
        candidate.placedEquipment
      );

      const appliedMetadata = {
        mode: lastRunInput.mode,
        strategy: candidate.strategy,
        score: candidate.score.total,
        bessCount,
        pcsCount,
        ratio: pcsCount > 0 ? bessCount / pcsCount : 0,
        assumptions: candidate.assumptions,
        appliedAt: new Date().toISOString(),
      };

      set((state) => ({
        ...recordHistory(state),
        placedEquipment: candidate.placedEquipment,
        anchor: lastRunInput.anchor ?? state.anchor,
        cableRoutes: [],
        accessRoads: [],
        smartSiteFitApplied: appliedMetadata,
        smartSiteFit: emptySmartSiteFitPreviewState,
      }));

      return {
        success: true,
        message: "SmartSiteFit alternative applied successfully.",
        placedCount: candidate.placedEquipment.length,
      };
    },

    discardSmartSiteFit: () => {
      set({
        smartSiteFit: emptySmartSiteFitPreviewState,
      });
    },
  };
}
