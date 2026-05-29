import type { SmartSiteFitCandidate, SmartSiteFitScore, SmartSiteFitStrategy } from "./smartSiteFitTypes";
import { equipmentCatalog } from "@/data/equipmentCatalog";

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

export function explainScore(score: SmartSiteFitScore, locale: "es" | "en"): string {
  const shapeCompactnessVal = score.shapeCompactness ?? 10.0;
  const terrainFitVal = score.terrainFit ?? 10.0;
  const pcsIntegrationVal = score.pcsIntegration ?? 10.0;
  const capacityIntentVal = score.capacityIntent ?? 10.0;
  const layoutAestheticsVal = score.layoutAesthetics ?? 10.0;
  if (locale === "es") {
    return [
      `Evaluación de distribución (Total: ${score.total}/100):`,
      `- Ubicación dentro de límites: ${score.insidePolygon}/25`,
      `- Ausencia de colisiones: ${score.noCollisions}/25`,
      `- Margen de seguridad perimetral (3m): ${score.boundaryMargin}/10`,
      `- Factor de ocupación del terreno: ${score.siteUtilization}/10`,
      `- Regularidad y alineación de filas: ${score.rowRegularity}/10`,
      `- Eficiencia en distanciamiento de pasillos: ${score.corridorEfficiency}/10`,
      `- Proporción BESS / PCS según diseño: ${score.ratioCompliance}/10`,
      `- Compacidad de la forma del bloque: ${shapeCompactnessVal}/10`,
      `- Coincidencia forma vs. terreno: ${terrainFitVal}/10`,
      `- Integración de PCS con su clúster BESS: ${pcsIntegrationVal}/10`,
      `- Ocupación acorde a la estrategia: ${capacityIntentVal}/10`,
      `- Orden geométrico y centrado: ${layoutAestheticsVal}/10`,
    ].join("\n");
  } else {
    return [
      `Layout evaluation (Total: ${score.total}/100):`,
      `- Placement inside boundaries: ${score.insidePolygon}/25`,
      `- Collision check: ${score.noCollisions}/25`,
      `- Boundary setback compliance (3m): ${score.boundaryMargin}/10`,
      `- Terrain footprint utilization: ${score.siteUtilization}/10`,
      `- Regularity and alignment of rows: ${score.rowRegularity}/10`,
      `- Corridor spacing efficiency: ${score.corridorEfficiency}/10`,
      `- BESS / PCS spec ratio compliance: ${score.ratioCompliance}/10`,
      `- Block shape compactness: ${shapeCompactnessVal}/10`,
      `- Shape vs. terrain match: ${terrainFitVal}/10`,
      `- PCS integration with its BESS cluster: ${pcsIntegrationVal}/10`,
      `- Occupancy aligned with strategy: ${capacityIntentVal}/10`,
      `- Geometric order and centering: ${layoutAestheticsVal}/10`,
    ].join("\n");
  }
}

export function explainAlternative(candidate: SmartSiteFitCandidate, locale: "es" | "en"): string {
  let bessCount = 0;
  let pcsCount = 0;
  for (const item of candidate.placedEquipment) {
    const spec = equipmentCatalog.find((s) => s.id === item.equipmentSpecId);
    if (spec?.type === "battery_container") {
      bessCount++;
    } else if (spec?.type === "pcs_mv_station") {
      pcsCount++;
    }
  }

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
    return [
      `Configuración sugerida bajo la estrategia "${stratLabel}".${shapeDesc}`,
      `Contiene un total de ${bessCount} contenedores de batería BESS y ${pcsCount} estaciones de conversión de potencia PCS, con cada PCS/MV asociado a su grupo de BESS.`,
      `${intent}${terrainSentence}${elongationWarning}`,
      `La puntuación técnica obtenida es de ${candidate.score.total} puntos según criterios de separación perimetral, distanciamientos de pasillos, integración PCS/MV y aprovechamiento de la superficie disponible.`,
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
    return [
      `Suggested configuration under the "${stratLabel}" strategy.${shapeDesc}`,
      `Includes a total of ${bessCount} BESS battery containers and ${pcsCount} PCS power conversion stations, with each PCS/MV tied to its BESS group.`,
      `${intent}${terrainSentence}${elongationWarning}`,
      `The layout achieves a technical score of ${candidate.score.total} points based on setback margins, corridor spacing, PCS/MV integration, and surface utilization.`,
      `Preliminary pre-dimensioning result, subject to validation with the manufacturer or EPC.`,
    ].join(" ");
  }
}

