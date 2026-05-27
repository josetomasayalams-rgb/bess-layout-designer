/**
 * pdfChrome — page-level chrome for the technical PDF report:
 * `PageHeader`, `PageFooter`, and the standalone `CoverPage`.
 *
 * Extracted from `ReportDocument.tsx` in Phase 12A. All three components are
 * byte-equivalent to their originals in merge commit `c8bf0e2`:
 *   - PageHeader  → ReportDocument.tsx lines 64–74
 *   - PageFooter  → ReportDocument.tsx lines 76–90
 *   - CoverPage   → ReportDocument.tsx lines 96–238
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
import {
  fmtInt,
  fmtNum,
  formatIsoDate,
  kpiSourceLabel,
} from "./pdfFormatters";
import type { TechnicalReportData } from "@/lib/report/buildReportData";

type Props = { data: TechnicalReportData };

export function PageHeader({ data }: Props) {
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
