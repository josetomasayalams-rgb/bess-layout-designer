import { bessDelDesiertoCaseStudy } from "@/data/projectCaseStudies/bessDelDesierto";
import {
  bessDelDesiertoPresetV12,
  type BessDelDesiertoPresetV12,
} from "@/data/projectCaseStudies/bessDelDesiertoPresetV12";

export { bessDelDesiertoCaseStudy } from "@/data/projectCaseStudies/bessDelDesierto";
export {
  bessDelDesiertoPresetV12,
  bessDelDesiertoDesignTargets,
  bessDelDesiertoConversionStations,
  bessDelDesiertoMVFeeders,
  bessDelDesiertoMVBuses,
  bessDelDesiertoPOI,
  bessDelDesiertoMainTransformer,
  bessDelDesiertoAuxiliaryServices,
  bessDelDesiertoPPC,
  bessDelDesiertoOperationalLimits,
  bessDelDesiertoLossEstimates,
  bessDelDesiertoBlocks,
  bessDelDesiertoInconsistencies,
  bessDelDesiertoPendingDataV12,
  BESS_DESIERTO_CONSTANTS,
  type BessDelDesiertoPresetV12,
} from "@/data/projectCaseStudies/bessDelDesiertoPresetV12";

export const projectCaseStudies = [bessDelDesiertoCaseStudy];

export function getProjectCaseStudy(id: string) {
  return projectCaseStudies.find((caseStudy) => caseStudy.id === id);
}

/**
 * Devuelve el bundle v1.2 evidenciado (capas eléctricas + trazabilidad)
 * para el caso especificado. Coexiste con `getProjectCaseStudy` legacy.
 */
export function getProjectPresetV12(
  id: string
): BessDelDesiertoPresetV12 | undefined {
  if (id === "bess-del-desierto") return bessDelDesiertoPresetV12;
  return undefined;
}
