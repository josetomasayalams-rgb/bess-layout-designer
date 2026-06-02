/**
 * pdfChrome — page-level chrome for the technical PDF report:
 * `PageHeader`, `PageFooter`, and the standalone `CoverPage`.
 *
 * Extracted from `ReportDocument.tsx` in Phase 12A. All three components are
 * byte-equivalent to their originals in merge commit `c8bf0e2`:
 *   - PageHeader  - ReportDocument.tsx lines 64–74
 *   - PageFooter  - ReportDocument.tsx lines 76–90
 *   - CoverPage   - ReportDocument.tsx lines 96–238
 *
 * The chrome lives here (rather than alongside the section pages) because
 * `SectionPage` depends on `PageHeader` / `PageFooter`; co-locating them
 * outside `ReportDocument.tsx` removes a circular-import constraint on the
 * upcoming `pdfPrimitives.tsx` extraction.
 */

import { Page, Text, View } from "@react-pdf/renderer";
import {
  REPORT_COLORS,
  REPORT_FONTS,
  reportStyles as s,
} from "./reportStyles";
import { reportTheme } from "./reportTheme";
import { Brandmark } from "./Brandmark";
import {
  fmtInt,
  fmtNum,
  formatIsoDate,
  kpiSourceLabel,
} from "./pdfFormatters";
import type { TechnicalReportData } from "@/lib/report/buildReportData";

type Props = { data: TechnicalReportData };

/**
 * Fixed diagonal "preliminary" watermark, repeated on every physical page
 * (required by docs/report-spec.md §6). Rendered first inside each <Page> so it
 * sits behind content; faint enough not to impair legibility or printing.
 */
export function Watermark() {
  return (
    <Text
      fixed
      style={{
        position: "absolute",
        top: "44%",
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: REPORT_FONTS.dataBold,
        fontSize: 44,
        letterSpacing: 3,
        color: reportTheme.watermark.color,
        opacity: reportTheme.watermark.opacity,
        transform: "rotate(-30deg)",
      }}
    >
      {reportTheme.watermark.text}
    </Text>
  );
}

export function PageHeader({ data }: Props) {
  return (
    <View style={s.pageHeader} fixed>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Brandmark size={9} discColor={REPORT_COLORS.accent} />
        <Text>
          {data.metadata.projectName}{" "}
          {data.location.describedPlace ? `· ${data.location.describedPlace}` : ""}
        </Text>
      </View>
      <Text>{data.metadata.reportId}</Text>
    </View>
  );
}

export function PageFooter({ data }: Props) {
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

export function CoverPage({ data }: Props) {
  const k = data.reportKpis;
  const criticalAlerts = data.consistencyAlerts.filter(
    (alert) => alert.severity === "critical"
  ).length;

  // KPIs principales — los cuatro indicadores de cabecera del prediseño.
  const mainKpis = [
    {
      label: "Potencia POI",
      value: k.poiPowerMW === null ? "—" : fmtNum(k.poiPowerMW, 0),
      unit: "MW",
    },
    {
      label: "Energía comercial útil",
      value: k.commercialEnergyMWh === null ? "—" : fmtNum(k.commercialEnergyMWh, 0),
      unit: "MWh",
    },
    {
      label: "Duración nominal",
      value: k.durationHours === null ? "—" : fmtNum(k.durationHours, 1),
      unit: "h",
    },
    {
      label: "Área del sitio",
      value: fmtNum(data.siteMetrics.areaHa, 1),
      unit: "ha",
    },
  ];

  // KPIs secundarios — inventario físico y potencia instalada.
  const secondaryKpis = [
    { label: "Contenedores (layout)", value: fmtInt(k.containers), unit: "u." },
    { label: "Estaciones PCS/MV", value: fmtInt(k.stations), unit: "u." },
    { label: "Feeders MT", value: fmtInt(k.feeders), unit: "u." },
    {
      label: "Potencia instalada",
      value: fmtNum(k.installedPowerMVA, 0),
      unit: "MVA",
    },
  ];

  const scopeBands = [
    "Predimensionamiento preliminar",
    "No apto para construcción",
    "No reemplaza ingeniería de detalle",
  ];

  return (
    <Page size="A4" style={s.coverPage}>
      <Watermark />
      <View style={s.coverWrap}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 4 }}>
            <Brandmark size={30} discColor={REPORT_COLORS.ink} />
            <Text style={s.coverTopLine}>
              PREDIMENSIONAMIENTO PRELIMINAR BESS · REPORTE TÉCNICO
            </Text>
          </View>
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
                ? `${criticalAlerts} alerta(s) crítica(s)`
                : "Sin alertas críticas"}
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
            <View style={{ marginTop: 20 }}>
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

          {/* KPIs principales como tarjetas premium acentuadas */}
          <View style={s.kpiRow}>
            {mainKpis.map((kpi) => (
              <View key={kpi.label} style={[s.kpiCard, s.kpiCardAccent]}>
                <Text style={s.kpiCardLabel}>{kpi.label}</Text>
                <Text>
                  <Text style={s.kpiCardValue}>{kpi.value}</Text>
                  <Text style={s.kpiCardUnit}>{" "}{kpi.unit}</Text>
                </Text>
              </View>
            ))}
          </View>

          {/* KPIs secundarios — inventario físico */}
          <View style={s.kpiRow}>
            {secondaryKpis.map((kpi) => (
              <View key={kpi.label} style={s.kpiCard}>
                <Text style={s.kpiCardLabel}>{kpi.label}</Text>
                <Text>
                  <Text style={s.kpiCardValue}>{kpi.value}</Text>
                  <Text style={s.kpiCardUnit}>{" "}{kpi.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          {/* Banda de alcance — carácter preliminar del entregable */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {scopeBands.map((band) => (
              <Text
                key={band}
                style={{
                  fontFamily: REPORT_FONTS.dataBold,
                  fontSize: 7.5,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  color: REPORT_COLORS.ink,
                  backgroundColor: "#e2e8f0",
                  borderRadius: 3,
                  paddingVertical: 3,
                  paddingHorizontal: 8,
                }}
              >
                {band}
              </Text>
            ))}
          </View>
          <Text style={s.coverFooter}>{data.metadata.disclaimer}</Text>
        </View>
      </View>
    </Page>
  );
}
