/**
 * Conceptual single-line-diagram (SLD) stage selection for the technical report.
 *
 * Pure and framework-agnostic so it can be unit-tested without the
 * `@react-pdf/renderer` runtime. The PDF report (`pdfElectricalRegulatorySections`)
 * consumes the returned stages to draw an architecture-aware SVG diagram.
 *
 * Two electrical architectures are represented — both strictly conceptual, with
 * no invented electrical parameters:
 *
 * - **Separate-PCS (e.g. Sungrow):** BESS container (DC) → PCS with integrated
 *   block transformer (BT/MT) → MV feeder → MV busbar / sectioning → POI.
 * - **Integrated (e.g. Tesla Megapack):** the inverter/PCS lives inside the unit
 *   and delivers AC directly; an external LV/MV step-up transformer is required
 *   between the integrated units and the MV collection but is **not modeled**
 *   here. The remaining MV interface → POI stages are conceptual.
 *
 * Both variants return exactly five stages so the diagram's layout geometry
 * (box width, step, viewBox) stays identical across architectures.
 */
export type SldStage = {
  /** Primary label drawn inside the box. */
  title: string;
  /** Secondary label drawn under the title. */
  sub: string;
};

export type SldDiagram = {
  stages: SldStage[];
  /** Caption rendered under the diagram (Spanish — report language). */
  caption: string;
};

const SEPARATE_PCS_DIAGRAM: SldDiagram = {
  stages: [
    { title: "Contenedor BESS", sub: "DC" },
    { title: "PCS + trafo", sub: "BT/MT integrado" },
    { title: "Feeder MT", sub: "media tensión" },
    { title: "Barra / secc.", sub: "MT" },
    { title: "POI", sub: "conexión red" },
  ],
  caption:
    "Diagrama unilineal conceptual. El PCS integra el transformador BT/MT en una misma estación; no se modelan transformadores separados por bloque.",
};

const INTEGRATED_DIAGRAM: SldDiagram = {
  stages: [
    { title: "Unidad integrada", sub: "PCS/inversor adentro" },
    { title: "Colector MT", sub: "conceptual" },
    { title: "Trafo elevador", sub: "externo · no mod." },
    { title: "Barra / secc.", sub: "MT" },
    { title: "POI", sub: "conexión red" },
  ],
  caption:
    "Diagrama unilineal conceptual. La unidad integra el inversor/PCS y entrega CA directa. El transformador elevador BT/MT es externo y no se modela aquí; confirmar con fabricante / EPC.",
};

/**
 * Returns the conceptual SLD stages + caption for the given architecture.
 *
 * @param isIntegrated `true` for an integrated-conversion layout (no separate
 *   PCS/MV station; battery units carry their own AC power, e.g. Tesla
 *   Megapack). `false` for the separate-PCS topology (e.g. Sungrow).
 */
export function selectSldStages(isIntegrated: boolean): SldDiagram {
  return isIntegrated ? INTEGRATED_DIAGRAM : SEPARATE_PCS_DIAGRAM;
}
