import type { SmartSiteFitCandidate, SmartSiteFitScore, SmartSiteFitStrategy } from "./smartSiteFitTypes";
import { summarizePlacedEquipment } from "./smartSiteFitSizing";

export function strategyLabel(strategy: SmartSiteFitStrategy, locale: "es" | "en"): string {
  if (locale === "es") {
    switch (strategy) {
      case "max_capacity":
        return "Compacta";
      case "balanced":
        return "Balanceada";
      case "conservative":
        return "Conservadora";
      default:
        return strategy;
    }
  } else {
    switch (strategy) {
      case "max_capacity":
        return "Compact";
      case "balanced":
        return "Balanced";
      case "conservative":
        return "Conservative";
      default:
        return strategy;
    }
  }
}

export function explainScore(
  score: SmartSiteFitScore,
  locale: "es" | "en",
  opts?: { isIntegrated?: boolean }
): string {
  const shapeCompactnessVal = score.shapeCompactness ?? 10.0;
  const terrainFitVal = score.terrainFit ?? 10.0;
  const pcsIntegrationVal = score.pcsIntegration ?? 10.0;
  const capacityIntentVal = score.capacityIntent ?? 10.0;
  const layoutAestheticsVal = score.layoutAesthetics ?? 10.0;
  // For integrated presets (Tesla Megapack) there is no separate PCS and no
  // BESS/PCS ratio, so the ratio-compliance and PCS-integration lines are
  // meaningless and are omitted. Default (false) keeps the legacy Sungrow text.
  const isIntegrated = opts?.isIntegrated ?? false;
  if (locale === "es") {
    const lines = [
      `Evaluación de distribución (Total: ${score.total}/100):`,
      `- Ubicación dentro de límites: ${score.insidePolygon}/25`,
      `- Ausencia de colisiones: ${score.noCollisions}/25`,
      `- Margen de seguridad perimetral (3m): ${score.boundaryMargin}/10`,
      `- Factor de ocupación del terreno: ${score.siteUtilization}/10`,
      `- Regularidad y alineación de filas: ${score.rowRegularity}/10`,
      `- Eficiencia en distanciamiento de pasillos: ${score.corridorEfficiency}/10`,
    ];
    if (!isIntegrated) {
      lines.push(`- Proporción BESS / PCS según diseño: ${score.ratioCompliance}/10`);
    }
    lines.push(`- Compacidad de la forma del bloque: ${shapeCompactnessVal}/10`);
    lines.push(`- Coincidencia forma vs. terreno: ${terrainFitVal}/10`);
    if (!isIntegrated) {
      lines.push(`- Integración de PCS con su clúster BESS: ${pcsIntegrationVal}/10`);
    }
    lines.push(`- Ocupación acorde a la estrategia: ${capacityIntentVal}/10`);
    lines.push(`- Orden geométrico y centrado: ${layoutAestheticsVal}/10`);
    return lines.join("\n");
  } else {
    const lines = [
      `Layout evaluation (Total: ${score.total}/100):`,
      `- Placement inside boundaries: ${score.insidePolygon}/25`,
      `- Collision check: ${score.noCollisions}/25`,
      `- Boundary setback compliance (3m): ${score.boundaryMargin}/10`,
      `- Terrain footprint utilization: ${score.siteUtilization}/10`,
      `- Regularity and alignment of rows: ${score.rowRegularity}/10`,
      `- Corridor spacing efficiency: ${score.corridorEfficiency}/10`,
    ];
    if (!isIntegrated) {
      lines.push(`- BESS / PCS spec ratio compliance: ${score.ratioCompliance}/10`);
    }
    lines.push(`- Block shape compactness: ${shapeCompactnessVal}/10`);
    lines.push(`- Shape vs. terrain match: ${terrainFitVal}/10`);
    if (!isIntegrated) {
      lines.push(`- PCS integration with its BESS cluster: ${pcsIntegrationVal}/10`);
    }
    lines.push(`- Occupancy aligned with strategy: ${capacityIntentVal}/10`);
    lines.push(`- Geometric order and centering: ${layoutAestheticsVal}/10`);
    return lines.join("\n");
  }
}

export function explainAlternative(candidate: SmartSiteFitCandidate, locale: "es" | "en"): string {
  // Architecture-agnostic counts from the catalog-backed summarizer (single
  // source of truth shared with the cards, slice and banner). Integrated
  // presets (e.g. Tesla Megapack) carry their own inverter, so pcsCount === 0.
  const { bessCount, pcsCount } = summarizePlacedEquipment(candidate.placedEquipment);
  const isIntegrated = pcsCount === 0 && bessCount > 0;

  const stratLabel = strategyLabel(candidate.strategy, locale);
  const shapeInfo = candidate.shape;
  const terrainFit = candidate.score.terrainFit;
  const compactness = candidate.score.shapeCompactness ?? 10;
  const aesthetics = candidate.score.layoutAesthetics ?? 10;
  const isElongated = compactness < 6 || aesthetics < 6;

  if (locale === "es") {
    const shapeDesc = shapeInfo
      ? ` Forma del bloque: ${shapeInfo.label} (${shapeInfo.description.toLowerCase()})`
      : "";
    const intent =
      candidate.strategy === "max_capacity"
        ? "Alternativa compacta: prioriza mayor cabida dentro del terreno usando una matriz más densa y márgenes mínimos preliminares."
        : candidate.strategy === "conservative"
        ? "Alternativa conservadora: reduce ocupación y aumenta holguras para dejar más espacio interno y mayor margen perimetral."
        : "Alternativa balanceada: busca equilibrio entre cabida, orden geométrico y holgura operativa.";
    const terrainSentence =
      terrainFit == null
        ? ""
        : terrainFit >= 8
        ? " La forma se ajusta bien a la relación ancho/largo del terreno."
        : terrainFit >= 5
        ? " La forma se ajusta de manera aceptable a la geometría del terreno."
        : " La forma podría no aprovechar del todo la geometría del terreno.";
    const elongationWarning = isElongated
      ? " Advertencia: la distribución resulta algo alargada; conviene revisar si el terreno admite una forma más compacta."
      : "";
    // Architecture-aware equipment and scoring sentences: integrated units bundle
    // their own power conversion, so there are no separate PCS/MV stations.
    const equipmentSentence = isIntegrated
      ? `Agrupa ${bessCount} unidades integradas; cada unidad incluye batería y conversión de potencia integrada según el preset seleccionado. No se modelan estaciones PCS/MV ni transformadores separados en el layout preliminar; la conexión hacia el collector, la red de media tensión y el punto de interconexión se mantiene como representación conceptual.`
      : `Contiene un total de ${bessCount} contenedores de batería BESS y ${pcsCount} estaciones de conversión de potencia PCS, con cada PCS/MV asociado a su grupo de BESS.`;
    const scoreSentence = isIntegrated
      ? `La puntuación técnica obtenida es de ${candidate.score.total} puntos según criterios de separación perimetral, distanciamientos entre unidades, disposición del conjunto y aprovechamiento de la superficie disponible.`
      : `La puntuación técnica obtenida es de ${candidate.score.total} puntos según criterios de separación perimetral, distanciamientos de pasillos, integración PCS/MV y aprovechamiento de la superficie disponible.`;
    return [
      `Configuración sugerida bajo la estrategia "${stratLabel}".${shapeDesc}`,
      equipmentSentence,
      `${intent}${terrainSentence}${elongationWarning}`,
      scoreSentence,
      `Resultado de predimensionamiento preliminar, sujeto a validación con el fabricante o EPC.`,
    ].join(" ");
  } else {
    const shapeDesc = shapeInfo
      ? ` Block shape: ${shapeInfo.label} (${shapeInfo.description.toLowerCase()})`
      : "";
    const intent =
      candidate.strategy === "max_capacity"
        ? "Compact alternative: prioritizes higher fit within the terrain using a denser matrix and minimal preliminary margins."
        : candidate.strategy === "conservative"
        ? "Conservative alternative: reduces occupancy and increases clearances to leave more internal space and a larger perimeter margin."
        : "Balanced alternative: seeks a balance between fit, geometric order and operational clearance.";
    const terrainSentence =
      terrainFit == null
        ? ""
        : terrainFit >= 8
        ? " The shape aligns well with the terrain width/length ratio."
        : terrainFit >= 5
        ? " The shape fits the terrain geometry reasonably."
        : " The shape may not fully take advantage of the terrain geometry.";
    const elongationWarning = isElongated
      ? " Warning: the layout is somewhat elongated; consider whether the terrain allows a more compact shape."
      : "";
    const equipmentSentence = isIntegrated
      ? `Groups ${bessCount} integrated units; each unit bundles battery and integrated power conversion per the selected preset. No separate PCS/MV stations or transformers are modeled in the preliminary layout; the connection toward the collector, the medium-voltage network and the interconnection point remains a conceptual representation.`
      : `Includes a total of ${bessCount} BESS battery containers and ${pcsCount} PCS power conversion stations, with each PCS/MV tied to its BESS group.`;
    const scoreSentence = isIntegrated
      ? `The layout achieves a technical score of ${candidate.score.total} points based on setback margins, unit-to-unit spacing, overall arrangement, and surface utilization.`
      : `The layout achieves a technical score of ${candidate.score.total} points based on setback margins, corridor spacing, PCS/MV integration, and surface utilization.`;
    return [
      `Suggested configuration under the "${stratLabel}" strategy.${shapeDesc}`,
      equipmentSentence,
      `${intent}${terrainSentence}${elongationWarning}`,
      scoreSentence,
      `Preliminary pre-dimensioning result, subject to validation with the manufacturer or EPC.`,
    ].join(" ");
  }
}

