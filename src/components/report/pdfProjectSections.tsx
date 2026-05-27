import { Image, Line, Path, Polygon, Svg, Text, View } from "@react-pdf/renderer";
import { REPORT_COLORS, REPORT_FONTS, reportStyles as s } from "./reportStyles";
import type { TechnicalReportData } from "@/lib/report/buildReportData";
import { svgPolygonPath } from "@/lib/report/buildSiteSvg";
import { fmtInt, fmtNum, kpiSourceLabel } from "./pdfFormatters";
import { AlertCard, DefGrid, SectionPage, Table } from "./pdfPrimitives";

type ReportSectionProps = { data: TechnicalReportData };

export function ExecutiveSection({ data }: ReportSectionProps) {
  const k = data.reportKpis;
  const ev = data.regulatoryEvaluation;
  const critical = data.consistencyAlerts.filter((a) => a.severity === "critical");
  return (
    <SectionPage data={data} number="1" title="Resumen técnico ejecutivo">
      <Text style={s.paragraph}>
        Informe preliminar de predimensionamiento BESS basado en el layout físico,
        catálogo de equipos y reglas de validación disponibles en la app. Los KPIs
        se muestran desde objetivos documentados cuando existen; si el modelo no
        está sincronizado, se derivan del inventario físico y se marca una alerta.
      </Text>

      <DefGrid
        items={[
          { label: "Estado general", value: critical.length > 0 ? "Con alertas críticas" : "Preliminar consistente" },
          { label: "Fuente KPIs", value: kpiSourceLabel(k.source) },
          { label: "Contenedores / estaciones", value: `${fmtInt(k.containers)} / ${fmtInt(k.stations)}` },
          { label: "Energía bruta / usable", value: `${fmtNum(k.grossEnergyMWh, 1)} / ${fmtNum(k.usableEnergyMWh, 1)} MWh` },
          { label: "Potencia instalada", value: `${fmtNum(k.installedPowerMVA, 0)} MVA` },
          { label: "Reglas con violación", value: ev ? fmtInt(ev.totals.violation) : "sin perfil" },
        ]}
      />

      <Text style={s.subTitle}>Alertas principales</Text>
      {data.consistencyAlerts.length === 0 ? (
        <Text style={s.note}>No se detectaron contradicciones internas entre layout y reporte.</Text>
      ) : (
        data.consistencyAlerts.slice(0, 4).map((alert) => (
          <AlertCard key={alert.id} {...alert} />
        ))
      )}
    </SectionPage>
  );
}

export function LocationSection({ data }: ReportSectionProps) {
  const f = data.location.formats;
  const items: { label: string; value: string }[] = [];
  if (f) {
    items.push({ label: "Lat / Lng decimal", value: `${f.decimal.lat}, ${f.decimal.lng}` });
    items.push({ label: "Lat / Lng DMS", value: `${f.dms.lat}, ${f.dms.lng}` });
    items.push({ label: "UTM (WGS84)", value: f.utm.formatted });
    items.push({
      label: "Zona / Banda",
      value: `${f.utm.zone}${f.utm.band}`,
    });
  }
  if (data.location.describedPlace) {
    items.push({ label: "Lugar (OSM)", value: data.location.describedPlace });
  }
  items.push({
    label: "Área del sitio",
    value: `${data.siteMetrics.areaM2.toFixed(0)} m² · ${data.siteMetrics.areaHa.toFixed(3)} ha`,
  });
  if (data.siteMetrics.bbox) {
    items.push({
      label: "Bounding box",
      value: `${data.siteMetrics.bbox.widthM.toFixed(1)} m × ${data.siteMetrics.bbox.heightM.toFixed(1)} m`,
    });
  }

  return (
    <SectionPage data={data} number="2" title="Sitio y ubicación">
      <Text style={s.paragraph}>
        El proyecto se ubica sobre el polígono dibujado por el usuario en la
        herramienta. Las coordenadas se calculan respecto del centroide del
        polígono. UTM en datum WGS84. El reverse geocoding es opcional y
        proviene de OpenStreetMap a través de Nominatim cuando hay conexión.
      </Text>
      <DefGrid items={items} />

      {data.location.geocode ? (
        <Text style={s.note}>{data.location.geocode.attribution}</Text>
      ) : (
        <Text style={s.note}>
          Reverse geocoding no disponible (sin conexión o servicio offline).
          El reporte se mantiene válido sólo con coordenadas.
        </Text>
      )}

      {data.mapCapture ? (
        <View style={s.imageWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop. */}
          <Image
            src={data.mapCapture.dataUrl}
            style={{ width: "100%", height: 260, objectFit: "contain" }}
          />
          <Text style={s.imageCaption}>
            Captura del visor cartográfico (Zoom {data.mapCapture.view.zoom.toFixed(1)} ·
            Bearing {data.mapCapture.view.bearing.toFixed(0)}° · Pitch{" "}
            {data.mapCapture.view.pitch.toFixed(0)}°)
          </Text>
        </View>
      ) : (
        <Text style={s.note}>
          Vista del mapa no disponible en esta captura (mapa no montado o WebGL no legible).
        </Text>
      )}
    </SectionPage>
  );
}

export function DesignSection({ data }: ReportSectionProps) {
  const t = data.designTargets;
  const sizing = data.sizingFromTargets;
  const k = data.reportKpis;

  return (
    <SectionPage data={data} number="3" title="Parámetros principales del BESS">
      <DefGrid
        items={[
          {
            label: "Potencia POI",
            value: k.poiPowerMW !== null ? `${fmtNum(k.poiPowerMW, 0)} MW` : "—",
          },
          {
            label: "Energía comercial (usable declarada)",
            value:
              k.commercialEnergyMWh !== null
                ? `${fmtNum(k.commercialEnergyMWh, 0)} MWh`
                : "—",
          },
          {
            label: "Energía bruta DC BOL",
            value: `${fmtNum(k.grossEnergyMWh, 3)} MWh`,
          },
          {
            label: "Energía usable (real con factor)",
            value: `${fmtNum(k.usableEnergyMWh, 3)} MWh`,
          },
          {
            label: "Factor usable / bruto",
            value: t.usableFactor
              ? `${(t.usableFactor.value * 100).toFixed(2)}%`
              : `${(sizing.resolved.usableFactor * 100).toFixed(2)}% (default)`,
          },
          {
            label: "Duración comercial",
            value: k.durationHours !== null ? `${k.durationHours.toFixed(2)} h` : "—",
          },
        ]}
      />

      <Text style={s.subTitle}>Arquitectura derivada</Text>
      <DefGrid
        items={[
          { label: "Contenedores BESS", value: fmtInt(sizing.containers) },
          { label: "Contenedores en layout", value: fmtInt(k.containers) },
          { label: "Estaciones PCS/trafo", value: fmtInt(k.stations) },
          { label: "Feeders MT", value: fmtInt(k.feeders) },
          { label: "Contenedores / estación", value: k.containersPerStation !== null ? fmtNum(k.containersPerStation, 2) : "—" },
          { label: "Potencia instalada", value: `${fmtNum(k.installedPowerMVA, 0)} MVA` },
        ]}
      />

      {k.source !== "documented_targets" ? (
        <Text style={s.note}>
          Nota: algunos KPIs fueron derivados desde el inventario físico del layout
          porque la arquitectura/targets no estaban completamente sincronizados.
        </Text>
      ) : null}

      {sizing.warnings.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text style={s.subTitle}>Notas del cálculo</Text>
          {sizing.warnings.slice(0, 6).map((w, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletDot}>·</Text>
              <Text style={s.bulletText}>{w}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </SectionPage>
  );
}

export function LayoutSection({ data }: ReportSectionProps) {
  const svg = data.siteSvg;
  const k = data.reportKpis;
  return (
    <SectionPage data={data} number="4" title="Layout físico y ocupación del terreno">
      <DefGrid
        items={[
          { label: "Área disponible", value: `${data.siteMetrics.areaM2.toFixed(0)} m² · ${data.siteMetrics.areaHa.toFixed(3)} ha` },
          { label: "Inventario BESS", value: `${fmtInt(k.containers)} contenedores` },
          { label: "Estaciones PCS/MV", value: fmtInt(k.stations) },
          { label: "Estado datos", value: k.source === "layout_inventory" ? "Derivado del layout" : "Sincronizado" },
        ]}
      />
      {svg ? (
        <View style={s.imageWrap}>
          <Svg
            viewBox={`${svg.viewBox.x} ${svg.viewBox.y} ${svg.viewBox.width} ${svg.viewBox.height}`}
            style={{
              width: "100%",
              height: 320,
            }}
          >
            {/* Site polygon */}
            <Path
              d={svgPolygonPath(svg.sitePoints)}
              stroke={REPORT_COLORS.accent}
              strokeWidth={3}
              fill="#dbeafe"
              fillOpacity={0.25}
            />
            {/* Equipment */}
            {svg.equipment.map((e, idx) => (
              <Polygon
                key={`eq-${idx}`}
                points={e.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}
                fill={e.fill}
                stroke={e.stroke}
                strokeWidth={0.6}
                fillOpacity={0.85}
              />
            ))}
            {/* Scale bar */}
            <Line
              x1={20}
              y1={svg.viewBox.height - 28}
              x2={20 + svg.scale.barLengthUnits}
              y2={svg.viewBox.height - 28}
              stroke={REPORT_COLORS.ink}
              strokeWidth={2}
            />
            <Text
              x={20}
              y={svg.viewBox.height - 12}
              style={{
                fontFamily: REPORT_FONTS.mono,
                fontSize: 10,
                fill: REPORT_COLORS.ink,
              }}
            >
              {`${svg.scale.barLengthM} m`}
            </Text>
            {/* North arrow (simple) */}
            <Polygon
              points={`${svg.northArrow.x},${svg.northArrow.y - svg.northArrow.size} ${svg.northArrow.x - svg.northArrow.size * 0.5},${svg.northArrow.y + svg.northArrow.size * 0.5} ${svg.northArrow.x + svg.northArrow.size * 0.5},${svg.northArrow.y + svg.northArrow.size * 0.5}`}
              fill={REPORT_COLORS.accent}
            />
            <Text
              x={svg.northArrow.x}
              y={svg.northArrow.y + svg.northArrow.size * 1.4}
              style={{
                fontFamily: REPORT_FONTS.dataBold,
                fontSize: 10,
                fill: REPORT_COLORS.ink,
              }}
            >
              N
            </Text>
          </Svg>
          <Text style={s.imageCaption}>
            Diagrama esquemático del sitio (norte arriba, escala indicada).
            Vista referencial, no reemplaza planos IFC.
          </Text>
        </View>
      ) : (
        <Text style={s.note}>
          Aún no hay polígono dibujado. Use la herramienta para definir el sitio.
        </Text>
      )}

      <Text style={s.subTitle}>Inventario de equipos</Text>
      {data.equipmentInventory.length === 0 ? (
        <Text style={s.note}>Sin equipos colocados en el layout.</Text>
      ) : (
        <Table
          cols={[
            { header: "Tipo", width: "22%" },
            { header: "Fabricante / Modelo", width: "38%" },
            { header: "Cant.", width: "8%", align: "right" },
            { header: "L × A × H (m)", width: "20%", align: "right" },
            { header: "Peso (kg)", width: "12%", align: "right" },
          ]}
          rows={data.equipmentInventory.map((row) => [
            row.type,
            `${row.manufacturer} ${row.model}`,
            row.count,
            `${row.lengthM.toFixed(2)} × ${row.widthM.toFixed(2)}${
              row.heightM ? ` × ${row.heightM.toFixed(2)}` : ""
            }`,
            row.weightKg ? row.weightKg.toLocaleString("es-CL") : "—",
          ])}
        />
      )}
    </SectionPage>
  );
}
