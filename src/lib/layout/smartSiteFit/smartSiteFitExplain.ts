import type { SmartSiteFitCandidate, SmartSiteFitScore, SmartSiteFitStrategy } from "./smartSiteFitTypes";
import { equipmentCatalog } from "@/data/equipmentCatalog";

export function strategyLabel(strategy: SmartSiteFitStrategy, locale: "es" | "en"): string {
  if (locale === "es") {
    switch (strategy) {
      case "max_capacity":
        return "Capacidad Máxima";
      case "balanced":
        return "Balanceado";
      case "conservative":
        return "Conservador";
      default:
        return strategy;
    }
  } else {
    switch (strategy) {
      case "max_capacity":
        return "Maximum Capacity";
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

  if (locale === "es") {
    const shapeDesc = shapeInfo
      ? ` Forma del bloque: ${shapeInfo.label} (${shapeInfo.description.toLowerCase()})`
      : "";
    return [
      `Configuración sugerida bajo la estrategia "${stratLabel}".${shapeDesc}`,
      `Contiene un total de ${bessCount} contenedores de batería BESS y ${pcsCount} estaciones de conversión de potencia PCS.`,
      `La puntuación técnica obtenida es de ${candidate.score.total} puntos basándose en criterios de separación perimetral, distanciamientos normativos de pasillos y utilización eficiente de la superficie disponible.`,
    ].join(" ");
  } else {
    const shapeDesc = shapeInfo
      ? ` Block shape: ${shapeInfo.label} (${shapeInfo.description.toLowerCase()})`
      : "";
    return [
      `Suggested configuration under the "${stratLabel}" strategy.${shapeDesc}`,
      `Includes a total of ${bessCount} BESS battery containers and ${pcsCount} PCS power conversion stations.`,
      `The layout achieves a technical score of ${candidate.score.total} points based on setback margins, regulatory corridor spacing, and efficient surface utilization.`,
    ].join(" ");
  }
}

