import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type {
  DocumentInconsistency,
  ExportedEquipmentQuantities,
  ExportedProject,
  ExportedQuantity,
  ProjectAssumption,
  ProjectDesignTargets,
  ProjectElectricalArchitecture,
  ProjectPhysicalLayout,
  ProjectSummary,
  RegulatoryEvaluationExport,
} from "@/types/project";
import type { RegulatoryEvaluationResult } from "@/rules/regulatoryProfileEvaluator";
import type { LayoutWarning } from "@/lib/layout/spacingRules";
import { equipmentCatalog, type EquipmentSpec } from "@/data/equipmentCatalog";
import { DEFAULT_UNIT_SYSTEM } from "@/data/unitSystem";
import { evaluateCaseStudyCompatibility } from "@/lib/electrical/compatibility";
import { calculateCaseStudySizing } from "@/lib/sizing/preliminarySizing";
import { kgToTonnes } from "@/lib/units/conversions";
import type { ProjectCaseStudy } from "@/types/technical";

function quantity(
  value: number,
  unit: string,
  spec?: EquipmentSpec,
  fallbackClassification: ExportedQuantity["data_classification"] = "preliminary_assumption",
  sourceNote?: string
): ExportedQuantity {
  return {
    value,
    unit,
    data_classification: spec?.source.reliability ?? fallbackClassification,
    source_note: sourceNote ?? spec?.source.notes,
  };
}

function equipmentQuantities(item: PlacedEquipment): ExportedEquipmentQuantities | null {
  const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
  if (!spec) return null;

  return {
    id: item.id,
    equipment_spec_id: item.equipmentSpecId,
    data_classification: spec.source.reliability,
    source_note: spec.source.notes,
    footprint: {
      length_m: quantity(spec.footprint.length_m, "m", spec),
      width_m: quantity(spec.footprint.width_m, "m", spec),
      ...(spec.footprint.height_m
        ? { height_m: quantity(spec.footprint.height_m, "m", spec) }
        : {}),
    },
    ...(spec.mass
      ? {
          mass: {
            weight_kg: quantity(spec.mass.weight_kg, "kg", spec),
            weight_t: quantity(kgToTonnes(spec.mass.weight_kg), "t", spec),
          },
        }
      : {}),
    ...(spec.electrical
      ? {
          electrical: {
            ...(spec.electrical.energy_mwh_dc_bol
              ? {
                  energy_mwh_dc_bol: quantity(
                    spec.electrical.energy_mwh_dc_bol,
                    "MWh",
                    spec
                  ),
                }
              : {}),
            ...(spec.electrical.apparent_power_mva
              ? {
                  apparent_power_mva: quantity(
                    spec.electrical.apparent_power_mva,
                    "MVA",
                    spec
                  ),
                }
              : {}),
            ...(spec.electrical.dc_voltage_min_v
              ? {
                  dc_voltage_min_v: quantity(
                    spec.electrical.dc_voltage_min_v,
                    "V",
                    spec
                  ),
                }
              : {}),
            ...(spec.electrical.dc_voltage_max_v
              ? {
                  dc_voltage_max_v: quantity(
                    spec.electrical.dc_voltage_max_v,
                    "V",
                    spec
                  ),
                }
              : {}),
            ...(spec.electrical.lv_voltage_kv
              ? {
                  lv_voltage_kv: quantity(
                    spec.electrical.lv_voltage_kv,
                    "kV",
                    spec
                  ),
                }
              : {}),
            ...(spec.electrical.mv_voltage_kv
              ? {
                  mv_voltage_kv: quantity(
                    spec.electrical.mv_voltage_kv,
                    "kV",
                    spec
                  ),
                }
              : {}),
            ...(spec.electrical.frequency_hz
              ? {
                  frequency_hz: quantity(
                    spec.electrical.frequency_hz,
                    "Hz",
                    spec
                  ),
                }
              : {}),
            ...(spec.electrical.efficiency_converter_pct
              ? {
                  efficiency_converter_pct: quantity(
                    spec.electrical.efficiency_converter_pct,
                    "%",
                    spec
                  ),
                }
              : {}),
            ...(spec.electrical.efficiency_total_pct
              ? {
                  efficiency_total_pct: quantity(
                    spec.electrical.efficiency_total_pct,
                    "%",
                    spec
                  ),
                }
              : {}),
          },
        }
      : {}),
    ...(spec.environmental
      ? {
          environmental: {
            ...(spec.environmental.operating_temp_min_c !== undefined
              ? {
                  operating_temp_min_c: quantity(
                    spec.environmental.operating_temp_min_c,
                    "°C",
                    spec
                  ),
                }
              : {}),
            ...(spec.environmental.operating_temp_max_c !== undefined
              ? {
                  operating_temp_max_c: quantity(
                    spec.environmental.operating_temp_max_c,
                    "°C",
                    spec
                  ),
                }
              : {}),
            ...(spec.environmental.derating_above_c !== undefined
              ? {
                  derating_above_c: quantity(
                    spec.environmental.derating_above_c,
                    "°C",
                    spec
                  ),
                }
              : {}),
            ...(spec.environmental.humidity_min_pct !== undefined
              ? {
                  humidity_min_pct: quantity(
                    spec.environmental.humidity_min_pct,
                    "%",
                    spec
                  ),
                }
              : {}),
            ...(spec.environmental.humidity_max_pct !== undefined
              ? {
                  humidity_max_pct: quantity(
                    spec.environmental.humidity_max_pct,
                    "%",
                    spec
                  ),
                }
              : {}),
            ...(spec.environmental.max_altitude_m !== undefined
              ? {
                  max_altitude_m: quantity(
                    spec.environmental.max_altitude_m,
                    "m",
                    spec
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * Args opcionales v1.2 — capas eléctricas, físicas y trazabilidad.
 * Cuando ninguno se pasa, el export sigue siendo equivalente a v1.1 con
 * el campo `schema_version` actualizado a `"1.2"`.
 */
export type BuildExportV12Extras = {
  designTargets?: ProjectDesignTargets;
  electricalArchitecture?: ProjectElectricalArchitecture;
  physicalLayout?: ProjectPhysicalLayout;
  assumptionsV2?: ProjectAssumption[];
  inconsistencies?: DocumentInconsistency[];
  documentRegistryRefs?: string[];
  /** Fase 10: resultado del evaluador del perfil regulatorio activo. */
  regulatoryEvaluation?: RegulatoryEvaluationResult;
};

/** Proyecta el resultado interno del evaluator a la forma de export plana. */
export function projectRegulatoryEvaluation(
  result: RegulatoryEvaluationResult
): RegulatoryEvaluationExport {
  return {
    profile_id: result.profileId,
    profile_name: result.profileName,
    evaluated_at: result.evaluatedAt,
    totals: {
      pass: result.totals.pass,
      violation: result.totals.violation,
      manual_check: result.totals.manualCheck,
      pending: result.totals.pending,
      not_evaluable: result.totals.notEvaluable,
      out_of_scope: result.totals.outOfScope,
      blocking_violations: result.totals.blockingViolations,
      warning_violations: result.totals.warningViolations,
    },
    rules: result.rules.map((rule) => ({
      rule_id: rule.ruleId,
      category: rule.category,
      severity: rule.severity,
      title: rule.title,
      outcome: rule.outcome,
      violations: rule.violations.map((v) => ({
        message: v.message,
        affected_ids: v.affectedIds,
        measured_m: v.measured_m,
        required_m: v.required_m,
      })),
      evidence: rule.evidence.map((e) => ({
        document_id: e.documentId,
        page: e.page,
        section: e.section,
        confidence: e.confidence,
        note: e.note,
      })),
    })),
    document_registry_refs: result.documentRegistryRefs,
  };
}

export function buildExportedProject(args: {
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  placed: PlacedEquipment[];
  summary: ProjectSummary;
  warnings: LayoutWarning[];
  caseStudy?: ProjectCaseStudy | null;
  /** Capas v1.2 opcionales — todas se omiten si no vienen. */
  v12?: BuildExportV12Extras;
}): ExportedProject {
  const sizingResult = args.caseStudy
    ? calculateCaseStudySizing(args.caseStudy)
    : undefined;
  const electricalCompatibilityIssues =
    args.caseStudy && sizingResult
      ? evaluateCaseStudyCompatibility(args.caseStudy, sizingResult)
      : undefined;

  const v12 = args.v12;

  return {
    schema_version: "1.2",
    exported_at: new Date().toISOString(),
    unit_system: DEFAULT_UNIT_SYSTEM,
    anchor: args.anchor,
    polygon: args.polygon,
    placed_equipment: args.placed,
    summary: args.summary,
    summary_quantities: {
      site_area_m2: args.summary.site_area
        ? quantity(args.summary.site_area.area_m2, "m²")
        : null,
      site_area_ha: args.summary.site_area
        ? quantity(args.summary.site_area.area_ha, "ha")
        : null,
      occupied_area_m2: quantity(args.summary.occupied_area_m2, "m²"),
      total_apparent_power_mva: quantity(
        args.summary.total_apparent_power_mva,
        "MVA"
      ),
      total_energy_mwh_dc_bol: quantity(
        args.summary.total_energy_mwh_dc_bol,
        "MWh"
      ),
      duration_hours_gross:
        args.summary.duration_hours_gross === null
          ? null
          : quantity(args.summary.duration_hours_gross, "h"),
      occupation_ratio_pct:
        args.summary.occupation_ratio === null
          ? null
          : quantity(args.summary.occupation_ratio * 100, "%"),
    },
    placed_equipment_quantities: args.placed
      .map(equipmentQuantities)
      .filter((item): item is ExportedEquipmentQuantities => item !== null),
    warnings: args.warnings.map((w) => ({
      id: w.id,
      severity: w.severity,
      message: w.message,
      reliability: w.reliability,
    })),
    ...(args.caseStudy
      ? {
          designIntent: args.caseStudy.designIntent,
          caseStudy: args.caseStudy,
          selectedEquipment: args.placed,
          powerEnergyBlocks: args.caseStudy.blockArchitecture,
          sizingResult,
          electricalCompatibilityIssues,
          layoutAssumptions: args.caseStudy.layoutAssumptions,
          pendingData: args.caseStudy.pendingData,
          exclusions: args.caseStudy.exclusions,
          requiredNextStudies: args.caseStudy.pendingData,
          conceptualScopeNote:
            "This export is a conceptual predesign report. It does not replace basic engineering, detailed engineering, substation design, protection studies, civil design, HMA or IFC drawings.",
        }
      : {}),
    // v1.2 — capas opcionales. Sólo se incluyen si vienen con datos.
    ...(v12?.designTargets ? { design_targets: v12.designTargets } : {}),
    ...(v12?.electricalArchitecture
      ? { electrical_architecture: v12.electricalArchitecture }
      : {}),
    ...(v12?.physicalLayout ? { physical_layout: v12.physicalLayout } : {}),
    ...(v12?.assumptionsV2 && v12.assumptionsV2.length > 0
      ? { assumptions_v2: v12.assumptionsV2 }
      : {}),
    ...(v12?.inconsistencies && v12.inconsistencies.length > 0
      ? { inconsistencies: v12.inconsistencies }
      : {}),
    ...(v12?.documentRegistryRefs && v12.documentRegistryRefs.length > 0
      ? { document_registry_refs: v12.documentRegistryRefs }
      : {}),
    ...(v12?.regulatoryEvaluation
      ? {
          regulatory_evaluation: projectRegulatoryEvaluation(
            v12.regulatoryEvaluation
          ),
          // Auto-merge document refs del evaluation con los del proyecto.
          document_registry_refs: mergeDocRefs(
            v12.documentRegistryRefs,
            v12.regulatoryEvaluation.documentRegistryRefs
          ),
        }
      : {}),
  };
}

function mergeDocRefs(
  a: string[] | undefined,
  b: string[] | undefined
): string[] {
  const all = new Set<string>();
  for (const x of a ?? []) all.add(x);
  for (const x of b ?? []) all.add(x);
  return [...all].sort();
}

// ──────────────────────────────────────────────────────────────────
// Importador retrocompatible v1.1 → v1.2
// ──────────────────────────────────────────────────────────────────

/**
 * Carga un proyecto exportado de cualquier versión soportada y devuelve
 * una representación normalizada con shape v1.2 (campos faltantes quedan
 * como `undefined`, listas como `[]`).
 *
 * Lanza si:
 * - `schema_version` no es `"1.1"` ni `"1.2"`.
 * - El objeto no tiene `polygon` o `placed_equipment` (mínimos del shape).
 */
export function importExportedProject(raw: unknown): ExportedProject {
  if (!raw || typeof raw !== "object") {
    throw new Error("importExportedProject: input must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const version = obj.schema_version;
  if (version !== "1.1" && version !== "1.2") {
    throw new Error(
      `importExportedProject: unsupported schema_version ${String(version)}`
    );
  }
  if (!Array.isArray(obj.polygon) || !Array.isArray(obj.placed_equipment)) {
    throw new Error(
      "importExportedProject: missing required fields polygon / placed_equipment"
    );
  }

  // Para v1.1, los campos nuevos quedan como undefined.
  // Para v1.2, se conservan tal cual venían.
  return obj as unknown as ExportedProject;
}

export function downloadExportedProject(project: ExportedProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bess-layout-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
