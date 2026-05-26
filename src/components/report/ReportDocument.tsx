/**
 * ReportDocument — PDF react-pdf con estilo paper técnico (Fase 11).
 *
 * Componentes: <Document>, <Page>, <View>, <Text>, <Image>, <Svg>.
 * No usa Tailwind: estilos en `reportStyles.ts`.
 */

import {
  Document,
  Image,
  Line,
  Page,
  Path,
  Polygon,
  Rect,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { REPORT_COLORS, REPORT_FONTS, reportStyles as s } from "./reportStyles";
import { documentTitle, type TechnicalReportData } from "@/lib/report/buildReportData";
import { svgPolygonPath } from "@/lib/report/buildSiteSvg";

type Props = { data: TechnicalReportData };

const fmtNum = (v: number | undefined, digits = 2): string =>
  v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(digits);

const fmtInt = (v: number | undefined): string =>
  v === undefined ? "—" : String(Math.round(v));

const formatIsoDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const kpiSourceLabel = (source: TechnicalReportData["reportKpis"]["source"]): string => {
  switch (source) {
    case "documented_targets":
      return "targets documentados";
    case "layout_inventory":
      return "inventario del layout";
    case "mixed":
      return "fuente mixta";
    default:
      return source;
  }
};

// ──────────────────────────────────────────────────────────────────
// Page chrome
// ──────────────────────────────────────────────────────────────────

function PageHeader({ data }: Props) {
  return (
    <View style={s.pageHeader} fixed>
      <Text>
        {data.metadata.projectName}{" "}
        {data.location.describedPlace ? `· ${data.location.describedPlace}` : ""}
      </Text>
      <Text>{data.metadata.reportId}</Text>
    </View>
  );
}

function PageFooter({ data }: Props) {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.pageFooterDisclaimer}>
        Reporte preliminar. {data.metadata.appVersion} · schema v
        {data.metadata.schemaVersion} · generado {formatIsoDate(data.metadata.generatedAt)}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
// Cover page
// ──────────────────────────────────────────────────────────────────

function CoverPage({ data }: Props) {
  const k = data.reportKpis;
  const criticalAlerts = data.consistencyAlerts.filter(
    (alert) => alert.severity === "critical"
  ).length;

  const kpis = [
    {
      label: "Potencia POI",
      value: k.poiPowerMW === null ? "—" : fmtNum(k.poiPowerMW, 0),
      unit: "MW",
    },
    {
      label: "Energía comercial",
      value: k.commercialEnergyMWh === null ? "—" : fmtNum(k.commercialEnergyMWh, 0),
      unit: "MWh",
    },
    {
      label: "Energía bruta",
      value: fmtNum(k.grossEnergyMWh, 1),
      unit: "MWh",
    },
    {
      label: "Duración",
      value: k.durationHours === null ? "—" : fmtNum(k.durationHours, 2),
      unit: "h",
    },
    {
      label: "Contenedores",
      value: fmtInt(k.containers),
      unit: "u.",
    },
    {
      label: "Estaciones",
      value: fmtInt(k.stations),
      unit: "u.",
    },
    {
      label: "Feeders MT",
      value: fmtInt(k.feeders),
      unit: "u.",
    },
    {
      label: "Potencia inst.",
      value: fmtNum(k.installedPowerMVA, 0),
      unit: "MVA",
    },
  ];

  return (
    <Page size="A4" style={s.page}>
      <View style={s.coverWrap}>
        <View>
          <Text style={s.coverTopLine}>
            BESS PRELIMINARY PREDESIGN · REPORT
          </Text>
          <View style={s.coverDivider} />
          <Text style={s.coverTitle}>{data.metadata.title}</Text>
          <Text style={s.coverSubtitle}>{data.metadata.projectName}</Text>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Text
              style={[
                s.pill,
                criticalAlerts > 0 ? s.pillViolation : s.pillPass,
              ]}
            >
              {criticalAlerts > 0
                ? `${criticalAlerts} alerta(s) critica(s)`
                : "Sin alertas criticas"}
            </Text>
            <Text style={[s.pill, s.pillManual]}>
              KPIs: {kpiSourceLabel(k.source)}
            </Text>
          </View>

          <View style={s.coverMeta}>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>ID del reporte</Text>
              <Text style={s.coverMetaValue}>{data.metadata.reportId}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Generado</Text>
              <Text style={s.coverMetaValue}>
                {formatIsoDate(data.metadata.generatedAt)}
              </Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Versión software</Text>
              <Text style={s.coverMetaValue}>{data.metadata.appVersion}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Esquema</Text>
              <Text style={s.coverMetaValue}>v{data.metadata.schemaVersion}</Text>
            </View>
          </View>

          {data.location.describedPlace ? (
            <View style={{ marginTop: 22 }}>
              <Text style={s.coverMetaLabel}>Ubicación</Text>
              <Text
                style={{
                  fontFamily: REPORT_FONTS.body,
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                {data.location.describedPlace}
              </Text>
              {data.location.formats ? (
                <Text
                  style={{
                    fontFamily: REPORT_FONTS.mono,
                    fontSize: 9,
                    color: REPORT_COLORS.muted,
                    marginTop: 2,
                  }}
                >
                  {data.location.formats.dms.lat} · {data.location.formats.dms.lng} ·{" "}
                  {data.location.formats.utm.formatted}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={s.coverKpiGrid}>
            {kpis.map((k) => (
              <View key={k.label} style={s.coverKpiCell}>
                <Text style={s.coverKpiLabel}>{k.label}</Text>
                <Text>
                  <Text style={s.coverKpiValue}>{k.value}</Text>
                  <Text style={s.coverKpiUnit}>{" "}{k.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.coverFooter}>{data.metadata.disclaimer}</Text>
      </View>
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────────
// Generic section page wrapper
// ──────────────────────────────────────────────────────────────────

function SectionPage({
  data,
  number,
  title,
  children,
}: {
  data: TechnicalReportData;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Page size="A4" style={s.page}>
      <PageHeader data={data} />
      <View>
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNumber}>{number}.</Text>
          {"  "}
          {title}
        </Text>
        {children}
      </View>
      <PageFooter data={data} />
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────────
// Tabular helpers
// ──────────────────────────────────────────────────────────────────

type Col = {
  header: string;
  width: string;
  align?: "left" | "right";
  mono?: boolean;
};

function Table({
  cols,
  rows,
}: {
  cols: Col[];
  rows: (string | number)[][];
}) {
  return (
    <View style={s.table} wrap>
      <View style={[s.tableRow, s.tableHeaderRow]}>
        {cols.map((c) => (
          <Text
            key={c.header}
            style={[
              s.tableHeaderCell,
              { width: c.width },
              c.align === "right" ? { textAlign: "right" as const } : {},
            ]}
          >
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View
          key={`row-${i}`}
          style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
        >
          {cols.map((c, j) => (
            <Text
              key={c.header + j}
              style={[
                s.tableCell,
                { width: c.width },
                c.align === "right" ? s.tableCellRight : {},
                c.mono ? s.tableCellMono : {},
              ]}
            >
              {String(r[j] ?? "—")}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function DefGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <View style={s.defGrid}>
      {items.map((it) => (
        <View key={it.label} style={s.defCell}>
          <Text style={s.defLabel}>{it.label}</Text>
          <Text style={s.defValue}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

function AlertCard({
  severity,
  title,
  message,
  recommendation,
}: {
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  recommendation: string;
}) {
  const color =
    severity === "critical"
      ? REPORT_COLORS.danger
      : severity === "warning"
        ? REPORT_COLORS.warn
        : REPORT_COLORS.accent;
  return (
    <View
      style={{
        borderWidth: 0.8,
        borderColor: color,
        backgroundColor: severity === "critical" ? "#fff1f2" : "#fffbeb",
        padding: 8,
        marginBottom: 7,
      }}
    >
      <Text style={{ fontFamily: REPORT_FONTS.dataBold, fontSize: 9, color }}>
        {severity.toUpperCase()} · {title}
      </Text>
      <Text style={{ marginTop: 3, fontSize: 8.5 }}>{message}</Text>
      <Text style={{ marginTop: 3, fontSize: 8, color: REPORT_COLORS.muted }}>
        Acción recomendada: {recommendation}
      </Text>
    </View>
  );
}

function ExecutiveSection({ data }: Props) {
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

// ──────────────────────────────────────────────────────────────────
// Section: Location & site
// ──────────────────────────────────────────────────────────────────

function LocationSection({ data }: Props) {
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

// ──────────────────────────────────────────────────────────────────
// Section: Design targets & sizing
// ──────────────────────────────────────────────────────────────────

function DesignSection({ data }: Props) {
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

// ──────────────────────────────────────────────────────────────────
// Section: Physical layout
// ──────────────────────────────────────────────────────────────────

function LayoutSection({ data }: Props) {
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

// ──────────────────────────────────────────────────────────────────
// Section: Electrical architecture
// ──────────────────────────────────────────────────────────────────

function ElectricalSection({ data }: Props) {
  const e = data.electrical;
  const k = data.reportKpis;
  return (
    <SectionPage data={data} number="5" title="Arquitectura eléctrica preliminar">
      <Text style={s.paragraph}>
        Cadena Container → PCS → Transformador bloque → Feeder MT → Barra →
        POI. La fuente de los datos eléctricos se cita explícitamente cuando
        está disponible; los campos vacíos representan información pendiente
        de validación de fabricante o EPC.
      </Text>

      <DefGrid
        items={[
          { label: "Bloques BESS", value: fmtInt(e.blocks) },
          { label: "Estaciones de conversión", value: fmtInt(k.stations) },
          { label: "Feeders MT", value: fmtInt(k.feeders) },
          { label: "Barras MT", value: fmtInt(Math.max(k.buses, e.buses.length)) },
          {
            label: "Relación BESS / estación",
            value: k.containersPerStation !== null ? fmtNum(k.containersPerStation, 2) : "—",
          },
          {
            label: "POI",
            value: e.poi
              ? `${e.poi.busName} · ${e.poi.voltageKv} kV`
              : "—",
          },
          {
            label: "Transformador principal",
            value: e.mainTransformer
              ? `${e.mainTransformer.windings.hvKv}/${e.mainTransformer.windings.mv1Kv ?? "—"} kV · ${fmtNum(e.mainTransformer.ratedPowerMVA.value, 0)} MVA (${e.mainTransformer.scope})`
              : "—",
          },
        ]}
      />

      {e.stations.length === 0 && k.stations > 0 ? (
        <AlertCard
          severity="critical"
          title="Arquitectura eléctrica no persistida"
          message="El layout contiene estaciones PCS/MV, pero no existe ConversionStation[] sincronizado. La tabla siguiente se deriva del inventario físico."
          recommendation="Cargar preset v1.2 o ejecutar sincronización de arquitectura antes de usar el reporte como base técnica formal."
        />
      ) : null}

      {e.stationRows.length > 0 ? (
        <>
          <Text style={s.subTitle}>Estaciones de conversión</Text>
          <Table
            cols={[
              { header: "ID", width: "18%", mono: true },
              { header: "Fabricante / Modelo", width: "32%" },
              { header: "MVA", width: "12%", align: "right" },
              { header: "Feeder", width: "18%", mono: true },
              { header: "Containers", width: "20%", align: "right" },
            ]}
            rows={e.stationRows.slice(0, 60).map((r) => [
              r.id,
              `${r.manufacturer} ${r.model}`,
              r.ratedMVA.toFixed(2),
              r.feederId ?? "—",
              r.containerCount,
            ])}
          />
          {e.stationRows.length > 60 ? (
            <Text style={s.note}>
              Tabla truncada a 60 filas. Total: {e.stationRows.length} estaciones.
            </Text>
          ) : null}
        </>
      ) : null}

      {e.ppc ? (
        <>
          <Text style={s.subTitle}>Power Plant Controller</Text>
          <DefGrid
            items={[
              { label: "Fabricante", value: e.ppc.manufacturer ?? "—" },
              { label: "Producto", value: e.ppc.productName ?? "—" },
              {
                label: "Modos activos",
                value: Object.entries(e.ppc.controlModes)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", "),
              },
              {
                label: "Rampa",
                value: e.ppc.rampRateLimit_mw_per_min
                  ? `${e.ppc.rampRateLimit_mw_per_min.value.toFixed(1)} MW/min`
                  : "—",
              },
            ]}
          />
        </>
      ) : null}

      {e.auxiliaryServices ? (
        <>
          <Text style={s.subTitle}>Servicios auxiliares</Text>
          <DefGrid
            items={[
              {
                label: "SSAA descarga (PMAX)",
                value: e.auxiliaryServices.modeSpecific?.discharge
                  ? `${e.auxiliaryServices.modeSpecific.discharge.value.toFixed(3)} MW`
                  : "—",
              },
              {
                label: "SSAA carga (PMAX)",
                value: e.auxiliaryServices.modeSpecific?.charge
                  ? `${e.auxiliaryServices.modeSpecific.charge.value.toFixed(3)} MW`
                  : "—",
              },
              {
                label: "Consumo por estación",
                value: e.auxiliaryServices.perConversionStationKw
                  ? `${e.auxiliaryServices.perConversionStationKw.value.toFixed(1)} kW`
                  : "—",
              },
              {
                label: "Consumo fijo planta",
                value: e.auxiliaryServices.plantFixedKw
                  ? `${e.auxiliaryServices.plantFixedKw.value.toFixed(1)} kW`
                  : "—",
              },
            ]}
          />
        </>
      ) : null}

      {e.lossEstimates.length > 0 ? (
        <>
          <Text style={s.subTitle}>Pérdidas eléctricas preliminares</Text>
          <Table
            cols={[
              { header: "Modo", width: "30%" },
              { header: "Pérdidas MT", width: "35%", align: "right" },
              { header: "Pérdidas total", width: "35%", align: "right" },
            ]}
            rows={e.lossEstimates.map((l) => [
              l.mode,
              l.mvLossesMW ? `${l.mvLossesMW.value.toFixed(4)} MW` : "—",
              l.totalLossesMW ? `${l.totalLossesMW.value.toFixed(4)} MW` : "—",
            ])}
          />
        </>
      ) : null}

      {e.operationalLimits ? (
        <>
          <Text style={s.subTitle}>Límites operacionales</Text>
          <DefGrid
            items={[
              {
                label: "Mínimo técnico descarga",
                value: e.operationalLimits.minTechnicalDischargeMW
                  ? `${e.operationalLimits.minTechnicalDischargeMW.value.toFixed(4)} MW`
                  : "—",
              },
              {
                label: "Mínimo técnico carga",
                value: e.operationalLimits.minTechnicalChargeMW
                  ? `${e.operationalLimits.minTechnicalChargeMW.value.toFixed(4)} MW`
                  : "—",
              },
              {
                label: "Rampa planta (subida)",
                value: e.operationalLimits.plantRampUpMWperMin
                  ? `${e.operationalLimits.plantRampUpMWperMin.value.toFixed(2)} MW/min`
                  : "—",
              },
              {
                label: "Rampa inversor",
                value: e.operationalLimits.inverterRampMWperSec
                  ? `${e.operationalLimits.inverterRampMWperSec.value.toFixed(2)} MW/s`
                  : "—",
              },
            ]}
          />
        </>
      ) : null}
    </SectionPage>
  );
}

// ──────────────────────────────────────────────────────────────────
// Section: Regulatory
// ──────────────────────────────────────────────────────────────────

const OUTCOME_LABEL: Record<string, { label: string; style: keyof typeof s }> = {
  pass: { label: "PASS", style: "pillPass" },
  violation: { label: "VIOLATION", style: "pillViolation" },
  manual_check: { label: "MANUAL", style: "pillManual" },
  pending_validation: { label: "PENDING", style: "pillPending" },
  not_evaluable: { label: "N/A", style: "pillOut" },
  out_of_scope: { label: "OUT", style: "pillOut" },
};

function outcomePillStyle(style: keyof typeof s) {
  switch (style) {
    case "pillPass":
      return s.pillPass;
    case "pillViolation":
      return s.pillViolation;
    case "pillManual":
      return s.pillManual;
    case "pillPending":
      return s.pillPending;
    case "pillOut":
    default:
      return s.pillOut;
  }
}

function RegulatorySection({ data }: Props) {
  const ev = data.regulatoryEvaluation;
  return (
    <SectionPage data={data} number="6" title="Validación normativa resumida">
      {!ev ? (
        <Text style={s.note}>
          No se ha activado un perfil regulatorio. Active uno desde el panel de
          cumplimiento para incluir la evaluación en este reporte.
        </Text>
      ) : (
        <>
          <Text style={s.paragraph}>
            Perfil activo: <Text style={{ fontFamily: REPORT_FONTS.bodyBold }}>{ev.profileName}</Text>{" "}
            ({ev.rules.length} reglas evaluadas el {formatIsoDate(ev.evaluatedAt)}).
          </Text>

          <DefGrid
            items={[
              { label: "Pass", value: fmtInt(ev.totals.pass) },
              { label: "Violation", value: fmtInt(ev.totals.violation) },
              { label: "Manual check", value: fmtInt(ev.totals.manualCheck) },
              { label: "Pending", value: fmtInt(ev.totals.pending) },
              { label: "Not evaluable", value: fmtInt(ev.totals.notEvaluable) },
              { label: "Out of scope", value: fmtInt(ev.totals.outOfScope) },
              {
                label: "Bloqueantes",
                value: fmtInt(ev.totals.blockingViolations),
              },
              {
                label: "Avisos",
                value: fmtInt(ev.totals.warningViolations),
              },
            ]}
          />

          <Text style={s.subTitle}>Reglas críticas o accionables</Text>
          <View style={s.table} wrap>
            <View style={[s.tableRow, s.tableHeaderRow]}>
              <Text style={[s.tableHeaderCell, { width: "13%" }]}>Outcome</Text>
              <Text style={[s.tableHeaderCell, { width: "16%" }]}>ID</Text>
              <Text style={[s.tableHeaderCell, { width: "45%" }]}>Regla</Text>
              <Text style={[s.tableHeaderCell, { width: "26%" }]}>Fuente</Text>
            </View>
            {ev.rules
              .filter((entry) =>
                entry.outcome === "violation" ||
                (entry.severity === "blocking" &&
                  ["pending_validation", "manual_check", "not_evaluable"].includes(entry.outcome))
              )
              .slice(0, 14)
              .map((entry, i) => {
              const o = OUTCOME_LABEL[entry.outcome] ?? OUTCOME_LABEL.out_of_scope;
              const cite = entry.evidence.find(
                (e) => e.documentId && e.documentId !== "__none__"
              );
              const citeText = cite
                ? `${documentTitle(cite.documentId)}${cite.page ? ` · p.${cite.page}` : ""}${cite.section ? ` · ${cite.section}` : ""}`
                : "—";
              return (
                <View
                  key={entry.ruleId + i}
                  style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                >
                  <View
                    style={[
                      s.tableCell,
                      { width: "13%", borderRightWidth: 0.5, borderRightColor: REPORT_COLORS.rule },
                    ]}
                  >
                    <Text style={[s.pill, outcomePillStyle(o.style)]}>{o.label}</Text>
                  </View>
                  <Text
                    style={[s.tableCell, s.tableCellMono, { width: "16%" }]}
                  >
                    {entry.ruleId}
                  </Text>
                  <Text style={[s.tableCell, { width: "45%" }]}>
                    {entry.title}
                  </Text>
                  <Text style={[s.tableCell, { width: "26%", fontSize: 7.5 }]}>
                    {citeText}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={s.note}>
            La tabla completa de reglas se movió a anexos. Esta sección sólo
            muestra violaciones, bloqueantes y chequeos manuales relevantes.
          </Text>
        </>
      )}
    </SectionPage>
  );
}

// ──────────────────────────────────────────────────────────────────
// Section: Assumptions / inconsistencies / pending data
// ──────────────────────────────────────────────────────────────────

function TraceabilitySection({ data }: Props) {
  return (
    <SectionPage data={data} number="7" title="Alertas críticas y pendientes técnicos">
      <Text style={s.subTitle}>Alertas de consistencia del reporte</Text>
      {data.consistencyAlerts.length === 0 ? (
        <Text style={s.note}>
          No se detectaron contradicciones internas entre KPIs, inventario físico
          y arquitectura eléctrica.
        </Text>
      ) : (
        data.consistencyAlerts.map((alert) => (
          <AlertCard key={alert.id} {...alert} />
        ))
      )}

      <Text style={s.subTitle}>Supuestos del proyecto</Text>
      {data.assumptions.length === 0 ? (
        <Text style={s.note}>Sin supuestos editables marcados.</Text>
      ) : (
        <Table
          cols={[
            { header: "ID", width: "14%", mono: true },
            { header: "Descripción", width: "56%" },
            { header: "Riesgo", width: "14%" },
            { header: "IFC", width: "16%", align: "right" },
          ]}
          rows={data.assumptions.slice(0, 24).map((a) => [
            a.id,
            a.description,
            a.risk,
            a.mustVerifyBeforeIFC ? "verificar antes" : "—",
          ])}
        />
      )}

      <Text style={s.subTitle}>Inconsistencias documentales</Text>
      {data.inconsistencies.length === 0 ? (
        <Text style={s.note}>
          {data.consistencyAlerts.length === 0
            ? "Sin inconsistencias detectadas."
            : "No hay DocumentInconsistency[] persistidas; las alertas anteriores provienen de validación interna del reporte."}
        </Text>
      ) : (
        data.inconsistencies.map((inc) => (
          <View
            key={inc.id}
            style={{
              borderWidth: 0.5,
              borderColor: REPORT_COLORS.rule,
              padding: 6,
              marginBottom: 6,
              backgroundColor: REPORT_COLORS.paperAlt,
            }}
          >
            <Text
              style={{
                fontFamily: REPORT_FONTS.dataBold,
                fontSize: 9,
                color: REPORT_COLORS.danger,
              }}
            >
              {inc.id} · {inc.topic}
            </Text>
            {inc.conflictingValues.map((cv, i) => (
              <Text
                key={i}
                style={{ fontSize: 8.5, marginTop: 2 }}
              >
                · <Text style={{ fontFamily: REPORT_FONTS.mono }}>{cv.value}</Text>{" "}
                <Text style={{ color: REPORT_COLORS.muted }}>
                  ({documentTitle(cv.evidence.documentId)}
                  {cv.evidence.page ? ` · p.${cv.evidence.page}` : ""})
                </Text>
              </Text>
            ))}
            <Text style={{ marginTop: 4, fontSize: 8.5, color: REPORT_COLORS.body }}>
              {inc.recommendation}
            </Text>
            {inc.resolvedValue ? (
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 8,
                  fontFamily: REPORT_FONTS.dataBold,
                  color: REPORT_COLORS.ok,
                }}
              >
                Valor resuelto: {inc.resolvedValue}
              </Text>
            ) : null}
          </View>
        ))
      )}

      <Text style={s.subTitle}>Datos pendientes de validación</Text>
      {data.pendingData.length === 0 ? (
        <Text style={s.note}>Sin pendientes documentales declarados.</Text>
      ) : (
        <Table
          cols={[
            { header: "ID", width: "12%", mono: true },
            { header: "Tópico", width: "32%" },
            { header: "Razón", width: "42%" },
            { header: "Prioridad", width: "14%" },
          ]}
          rows={data.pendingData
            .slice(0, 24)
            .map((p) => [p.id, p.topic, p.reason, p.priority])}
        />
      )}
    </SectionPage>
  );
}

// ──────────────────────────────────────────────────────────────────
// Section: Exclusions / checklist / references
// ──────────────────────────────────────────────────────────────────

function ScopeSection({ data }: Props) {
  return (
    <SectionPage data={data} number="8" title="Alcance, exclusiones y próximos estudios">
      <Text style={s.subTitle}>Exclusiones (fuera del alcance preliminar)</Text>
      {data.exclusions.map((ex) => (
        <View key={ex.id} style={s.bulletRow}>
          <Text style={s.bulletDot}>·</Text>
          <Text style={s.bulletText}>
            <Text style={{ fontFamily: REPORT_FONTS.dataBold }}>{ex.scope}</Text> —{" "}
            {ex.reason} ({ex.futureStage}).
          </Text>
        </View>
      ))}

      {data.infrastructure ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={s.subTitle}>
            {data.metadata.locale === "es"
              ? "Caminos y corredores MT preliminares (conceptual)"
              : "Preliminary Access Roads & MV Corridors (conceptual)"}
          </Text>
          <Text style={s.paragraph}>
            {data.metadata.locale === "es"
              ? "El trazado físico de accesos y canalizaciones es conceptual. A continuación se presentan las métricas del trazado:"
              : "The layout of accesses and cable corridors is conceptual. The estimated layout metrics are:"}
          </Text>
          <Table
            cols={[
              { header: "Métrica", width: "70%" },
              { header: "Valor", width: "30%", align: "right" },
            ]}
            rows={[
              [
                data.metadata.locale === "es" ? "Bloques BESS-PCS detectados" : "BESS-PCS blocks detected",
                String(data.infrastructure.blocksCount)
              ],
              [
                data.metadata.locale === "es" ? "Corredores MT preliminares" : "Preliminary MV corridors",
                String(data.infrastructure.cableRoutesCount)
              ],
              [
                data.metadata.locale === "es" ? "Caminos y accesos preliminares" : "Preliminary roads & accesses",
                String(data.infrastructure.accessRoadsCount)
              ],
              [
                data.metadata.locale === "es" ? "Longitud total estimada de cables MT" : "Estimated total MV cable length",
                `${data.infrastructure.totalCableLengthM} m`
              ],
            ]}
          />
          {data.infrastructure.warnings.map((w, idx) => (
            <View key={idx} style={s.bulletRow}>
              <Text style={s.bulletDot}>·</Text>
              <Text style={s.bulletText}>
                <Text style={{ fontFamily: REPORT_FONTS.dataBold }}>
                  {data.metadata.locale === "es" ? "Advertencia: " : "Warning: "}
                </Text>
                {w}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={s.subTitle}>
        {data.metadata.locale === "es"
          ? "Advertencias y limitaciones del prediseño"
          : "Warnings and Predesign Limitations"}
      </Text>
      {data.disclaimers.map((disc) => (
        <View key={disc.id} style={s.bulletRow}>
          <Text style={s.bulletDot}>·</Text>
          <Text style={s.bulletText}>
            <Text style={{ fontFamily: REPORT_FONTS.dataBold }}>{disc.title}:</Text>{" "}
            {disc.text}
          </Text>
        </View>
      ))}

      <Text style={s.subTitle}>Checklist de ingeniería de detalle</Text>
      <Table
        cols={[
          { header: "Tópico", width: "38%" },
          { header: "Descripción", width: "50%" },
          { header: "Requerido", width: "12%", align: "right" },
        ]}
        rows={data.engineeringChecklist.map((c) => [
          c.topic,
          c.description,
          c.required ? "sí" : "opcional",
        ])}
      />

      <Text style={s.subTitle}>Referencias documentales citadas</Text>
      {data.documentReferences.length === 0 ? (
        <Text style={s.note}>No se citaron documentos primarios en este reporte.</Text>
      ) : (
        <Table
          cols={[
            { header: "ID", width: "26%", mono: true },
            { header: "Título", width: "50%" },
            { header: "Fuente", width: "16%" },
            { header: "Versión", width: "8%", align: "right" },
          ]}
          rows={data.documentReferences.map((doc) => [
            doc.id,
            doc.title,
            doc.source,
            doc.version ?? "—",
          ])}
        />
      )}

      <Text style={s.note}>{data.metadata.disclaimer}</Text>
    </SectionPage>
  );
}

// ──────────────────────────────────────────────────────────────────
// Annex: full regulatory table
// ──────────────────────────────────────────────────────────────────

function RegulatoryAnnexSection({ data }: Props) {
  const ev = data.regulatoryEvaluation;
  return (
    <SectionPage data={data} number="A1" title="Anexo: tabla completa de reglas">
      {!ev ? (
        <Text style={s.note}>
          No existe evaluación regulatoria asociada al reporte.
        </Text>
      ) : (
        <>
          <Text style={s.paragraph}>
            Detalle completo del perfil {ev.profileName}. Esta tabla es un
            registro técnico de apoyo; la lectura ejecutiva se presenta en la
            sección de validación normativa resumida.
          </Text>
          <View style={s.table} wrap>
            <View style={[s.tableRow, s.tableHeaderRow]}>
              <Text style={[s.tableHeaderCell, { width: "13%" }]}>Outcome</Text>
              <Text style={[s.tableHeaderCell, { width: "16%" }]}>ID</Text>
              <Text style={[s.tableHeaderCell, { width: "45%" }]}>Regla</Text>
              <Text style={[s.tableHeaderCell, { width: "26%" }]}>Fuente</Text>
            </View>
            {ev.rules.map((entry, i) => {
              const o = OUTCOME_LABEL[entry.outcome] ?? OUTCOME_LABEL.out_of_scope;
              const cite = entry.evidence.find(
                (e) => e.documentId && e.documentId !== "__none__"
              );
              const citeText = cite
                ? `${documentTitle(cite.documentId)}${cite.page ? ` · p.${cite.page}` : ""}${cite.section ? ` · ${cite.section}` : ""}`
                : "—";
              return (
                <View
                  key={entry.ruleId + i}
                  style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                >
                  <View
                    style={[
                      s.tableCell,
                      { width: "13%", borderRightWidth: 0.5, borderRightColor: REPORT_COLORS.rule },
                    ]}
                  >
                    <Text style={[s.pill, outcomePillStyle(o.style)]}>{o.label}</Text>
                  </View>
                  <Text style={[s.tableCell, s.tableCellMono, { width: "16%" }]}>
                    {entry.ruleId}
                  </Text>
                  <Text style={[s.tableCell, { width: "45%" }]}>
                    {entry.title}
                  </Text>
                  <Text style={[s.tableCell, { width: "26%", fontSize: 7.5 }]}>
                    {citeText}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </SectionPage>
  );
}

// ──────────────────────────────────────────────────────────────────
// Main document
// ──────────────────────────────────────────────────────────────────

export function ReportDocument({ data }: Props) {
  return (
    <Document
      title={data.metadata.title}
      author="BESS Layout Designer"
      subject={data.metadata.projectName}
      creationDate={new Date()}
    >
      <CoverPage data={data} />
      <ExecutiveSection data={data} />
      <LocationSection data={data} />
      <DesignSection data={data} />
      <LayoutSection data={data} />
      <ElectricalSection data={data} />
      <RegulatorySection data={data} />
      <TraceabilitySection data={data} />
      <ScopeSection data={data} />
      <RegulatoryAnnexSection data={data} />
    </Document>
  );
}

// Re-export the unused-but-imported Rect so we don't accidentally drop it from
// the bundle and to keep the imports list explicit for future sections.
export const __unused_rect_ref = Rect;
