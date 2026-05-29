import { Line, Rect, Svg, Text, View } from "@react-pdf/renderer";
import { REPORT_COLORS, REPORT_FONTS, reportStyles as s } from "./reportStyles";
import { documentTitle, type TechnicalReportData } from "@/lib/report/buildReportData";
import { fmtInt, fmtNum, formatIsoDate } from "./pdfFormatters";
import { AlertCard, DefGrid, SectionPage, Table } from "./pdfPrimitives";
import {
  OUTCOME_LABEL,
  SEVERITY_LABEL_ES,
  SEVERITY_PILL,
  outcomePillStyle,
} from "./pdfSeverityMaps";

type ReportSectionProps = { data: TechnicalReportData };

/**
 * Diagrama unilineal conceptual (single-line diagram) dibujado en SVG.
 *
 * Se dibuja con primitivas vectoriales (Rect / Line / Polygon) en lugar de
 * glifos de flecha tipográficos, que el set de fuentes estándar de
 * @react-pdf/renderer (WinAnsi) no puede codificar y renderiza como cajas
 * `notdef`. Las puntas de flecha son triángulos vectoriales.
 */
function SingleLineDiagram() {
  const stages = [
    { title: "Contenedor BESS", sub: "DC" },
    { title: "PCS + trafo", sub: "BT/MT integrado" },
    { title: "Feeder MT", sub: "media tensión" },
    { title: "Barra / secc.", sub: "MT" },
    { title: "POI", sub: "conexión red" },
  ];
  const BOX_W = 88;
  const BOX_H = 44;
  const STEP = 106; // BOX_W + gap
  const TOP = 18;
  const MID = TOP + BOX_H / 2;
  const VB_W = 520;
  const VB_H = 80;

  return (
    <View style={s.sldWrap}>
      <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", height: 88 }}>
        {stages.map((_, i) => {
          const x = i * STEP;
          return (
            <Rect
              key={`box-${i}`}
              x={x}
              y={TOP}
              width={BOX_W}
              height={BOX_H}
              rx={4}
              fill="#eff6ff"
              stroke={REPORT_COLORS.accent}
              strokeWidth={0.8}
            />
          );
        })}
        {/* Conectores con punta de flecha vectorial */}
        {stages.slice(0, -1).map((_, i) => {
          const fromX = i * STEP + BOX_W;
          const toX = (i + 1) * STEP;
          return (
            <Line
              key={`ln-${i}`}
              x1={fromX + 1}
              y1={MID}
              x2={toX - 5}
              y2={MID}
              stroke={REPORT_COLORS.accent}
              strokeWidth={1.2}
            />
          );
        })}
        {stages.slice(0, -1).map((_, i) => {
          const tipX = (i + 1) * STEP;
          return (
            <Svg key={`ah-${i}`}>
              <Line x1={tipX - 6} y1={MID - 3} x2={tipX} y2={MID} stroke={REPORT_COLORS.accent} strokeWidth={1.2} />
              <Line x1={tipX - 6} y1={MID + 3} x2={tipX} y2={MID} stroke={REPORT_COLORS.accent} strokeWidth={1.2} />
            </Svg>
          );
        })}
        {stages.map((st, i) => {
          const cx = i * STEP + BOX_W / 2;
          return (
            <Svg key={`tx-${i}`}>
              <Text
                x={cx}
                y={MID - 1}
                textAnchor="middle"
                style={{ fontFamily: REPORT_FONTS.dataBold, fontSize: 7.5, fill: REPORT_COLORS.ink }}
              >
                {st.title}
              </Text>
              <Text
                x={cx}
                y={MID + 9}
                textAnchor="middle"
                style={{ fontFamily: REPORT_FONTS.data, fontSize: 6, fill: REPORT_COLORS.muted }}
              >
                {st.sub}
              </Text>
            </Svg>
          );
        })}
      </Svg>
      <Text style={s.imageCaption}>
        Diagrama unilineal conceptual. El PCS integra el transformador BT/MT en
        una misma estación; no se modelan transformadores separados por bloque.
      </Text>
    </View>
  );
}

export function ElectricalSection({ data }: ReportSectionProps) {
  const e = data.electrical;
  const k = data.reportKpis;
  return (
    <SectionPage data={data} number="5" title="Arquitectura eléctrica conceptual">
      <Text style={s.paragraph}>
        La arquitectura conceptual encadena el contenedor BESS (lado DC), el PCS
        con transformador BT/MT integrado, el feeder de media tensión, la barra
        y seccionamiento MT, y el punto de conexión (POI). La fuente de los datos
        eléctricos se cita cuando está disponible; los campos vacíos representan
        información pendiente de validación de fabricante o EPC.
      </Text>

      <SingleLineDiagram />

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
          severity="warning"
          title="Calidad de dato: arquitectura eléctrica no sincronizada"
          message="El layout contiene estaciones PCS/MV, pero no existe una arquitectura eléctrica (ConversionStation[]) sincronizada. La información siguiente se deriva del inventario físico. No representa una falla de diseño, sino un dato pendiente de cargar."
          recommendation="Cargar el preset v1.2 o ejecutar la sincronización de arquitectura antes de usar el reporte como base técnica formal."
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

export function PreliminaryElectricalChecksSection({ data }: ReportSectionProps) {
  const block = data.preliminaryElectricalChecks;
  const checks = block.checks;
  return (
    <SectionPage
      data={data}
      number="5b"
      title="Validaciones eléctricas preliminares"
    >
      <Text style={s.paragraph}>
        Estimaciones preliminares de referencia, ejecutadas por el motor de
        validaciones del MVP. No reemplazan estudios eléctricos de detalle:
        flujo de potencia, cortocircuito, coordinación de protecciones,
        armónicos, estabilidad RMS/EMT, arc-flash, calidad de potencia en el
        PCC ni coordinación de aislamiento — todos quedan listados como
        exclusiones en §8.
      </Text>

      {checks.length === 0 ? (
        <Text style={s.note}>
          No hay reglas eléctricas preliminares evaluadas. Cargue la
          arquitectura v1.2 (o el preset BESS del Desierto) y un perfil
          regulatorio activo para poblar esta sección.
        </Text>
      ) : (
        <>
          <DefGrid
            items={[
              { label: "Reglas", value: fmtInt(checks.length) },
              { label: "Cumple", value: fmtInt(block.totals.pass) },
              { label: "Incumple", value: fmtInt(block.totals.violation) },
              { label: "No evaluable", value: fmtInt(block.totals.notEvaluable) },
              { label: "Pendiente", value: fmtInt(block.totals.pendingValidation) },
              {
                label: "Severidad acotada",
                value: block.hasSeverityCaps ? "sí" : "no",
              },
            ]}
          />

          <View style={s.table} wrap>
            <View style={[s.tableRow, s.tableHeaderRow]}>
              <Text style={[s.tableHeaderCell, { width: "14%" }]}>ID</Text>
              <Text style={[s.tableHeaderCell, { width: "32%" }]}>Check</Text>
              <Text style={[s.tableHeaderCell, { width: "10%" }]}>Sev.</Text>
              <Text style={[s.tableHeaderCell, { width: "10%" }]}>Nivel</Text>
              <Text style={[s.tableHeaderCell, { width: "10%" }]}>Outcome</Text>
              <Text style={[s.tableHeaderCell, { width: "24%" }]}>Fuente</Text>
            </View>
            {checks.map((entry, i) => {
              const outcomeMeta =
                OUTCOME_LABEL[entry.outcome] ?? OUTCOME_LABEL.out_of_scope;
              const sevPill =
                SEVERITY_PILL[entry.effectiveSeverity] ?? "pillOut";
              return (
                <View
                  key={entry.ruleId}
                  style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                >
                  <Text
                    style={[s.tableCell, s.tableCellMono, { width: "14%" }]}
                  >
                    {entry.ruleId}
                  </Text>
                  <Text style={[s.tableCell, { width: "32%" }]}>
                    {entry.title}
                  </Text>
                  <View style={[s.tableCell, { width: "10%" }]}>
                    <Text style={[s.pill, outcomePillStyle(sevPill)]}>
                      {SEVERITY_LABEL_ES[entry.effectiveSeverity] ??
                        entry.effectiveSeverity}
                    </Text>
                  </View>
                  <Text
                    style={[s.tableCell, s.tableCellMono, { width: "10%", fontSize: 7.5 }]}
                  >
                    {entry.documentLevel
                      ? entry.documentLevel.split("_")[0]
                      : "—"}
                  </Text>
                  <View style={[s.tableCell, { width: "10%" }]}>
                    <Text style={[s.pill, outcomePillStyle(outcomeMeta.style)]}>
                      {outcomeMeta.label}
                    </Text>
                  </View>
                  <Text style={[s.tableCell, { width: "24%", fontSize: 7.5 }]}>
                    {entry.citation ?? "—"}
                  </Text>
                </View>
              );
            })}
          </View>

          {block.hasSeverityCaps ? (
            <>
              <Text style={s.subTitle}>Severidades limitadas por la matriz</Text>
              {checks
                .filter((c) => c.severityCappedBy !== null)
                .map((c) => (
                  <Text key={`cap-${c.ruleId}`} style={s.note}>
                    {c.ruleId}: declarada{" "}
                    <Text style={{ fontFamily: REPORT_FONTS.bodyBold }}>
                      {SEVERITY_LABEL_ES[c.severityCappedBy?.from ?? ""] ??
                        c.severityCappedBy?.from}
                    </Text>{" "}
                    · acotada a{" "}
                    <Text style={{ fontFamily: REPORT_FONTS.bodyBold }}>
                      {SEVERITY_LABEL_ES[c.effectiveSeverity] ?? c.effectiveSeverity}
                    </Text>{" "}
                    ({c.severityCappedBy?.by === "document_level"
                      ? "nivel documental"
                      : "confianza de evidencia"}
                    ). {c.severityCappedBy?.detail}
                  </Text>
                ))}
            </>
          ) : null}

          <Text style={s.note}>
            Severidad efectiva = severidad declarada acotada por nivel
            documental L1–L7 y confianza de evidencia (`severityCeiling.ts`).
            Una regla nunca puede ser más estricta que su mejor evidencia.
          </Text>
        </>
      )}
    </SectionPage>
  );
}

export function RegulatorySection({ data }: ReportSectionProps) {
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

          {/* Resumen visual de estado normativo */}
          <View style={s.statusChipRow}>
            {[
              { label: "Cumple", count: ev.totals.pass, bg: "#dcfce7", fg: REPORT_COLORS.ok, border: "#bbf7d0" },
              { label: "Incumple", count: ev.totals.violation, bg: "#fee2e2", fg: REPORT_COLORS.danger, border: "#fecaca" },
              { label: "Revisión manual", count: ev.totals.manualCheck, bg: "#e0f2fe", fg: "#075985", border: "#bae6fd" },
              { label: "Pendiente", count: ev.totals.pending, bg: "#fef3c7", fg: REPORT_COLORS.warn, border: "#fde68a" },
              { label: "No evaluable", count: ev.totals.notEvaluable, bg: "#e2e8f0", fg: REPORT_COLORS.muted, border: "#cbd5e1" },
              { label: "Fuera de alcance", count: ev.totals.outOfScope, bg: "#e2e8f0", fg: REPORT_COLORS.muted, border: "#cbd5e1" },
            ].map((chip) => (
              <View
                key={chip.label}
                style={[s.statusChip, { backgroundColor: chip.bg, borderColor: chip.border }]}
              >
                <Text style={[s.statusChipCount, { color: chip.fg }]}>
                  {fmtInt(chip.count)}
                </Text>
                <Text style={[s.statusChipLabel, { color: chip.fg }]}>
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.note}>
            De las violaciones, {fmtInt(ev.totals.blockingViolations)} son
            bloqueantes y {fmtInt(ev.totals.warningViolations)} son avisos.
          </Text>

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
                    style={[
                      s.tableCell,
                      s.tableCellMono,
                      { width: "16%", fontSize: 7, color: REPORT_COLORS.muted },
                    ]}
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
