import { Text, View } from "@react-pdf/renderer";
import { REPORT_COLORS, REPORT_FONTS, reportStyles as s } from "./reportStyles";
import { documentTitle, type TechnicalReportData } from "@/lib/report/buildReportData";
import { AlertCard, SectionPage, Table } from "./pdfPrimitives";
import { OUTCOME_LABEL, outcomePillStyle } from "./pdfSeverityMaps";
import { buildNextSteps, groupExclusions } from "./pdfFormatters";

type ReportSectionProps = { data: TechnicalReportData; embedded?: boolean };

export function TraceabilitySection({ data, embedded }: ReportSectionProps) {
  return (
    <SectionPage data={data} number="7" title="Alertas críticas y pendientes técnicos" embedded={embedded}>
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

export function ScopeSection({ data }: ReportSectionProps) {
  const exclusionGroups = groupExclusions(data.exclusions);
  const nextSteps = buildNextSteps(data);
  return (
    <SectionPage data={data} number="5" title="Alcance, exclusiones y próximos estudios">
      <Text style={s.paragraph}>
        Este predimensionamiento no incluye los estudios de detalle listados a
        continuación, agrupados por disciplina. El listado completo, ítem por
        ítem, se conserva en el anexo de checklist y referencias.
      </Text>

      {exclusionGroups.map((group) => (
        <View key={group.category}>
          <Text style={s.groupHeader}>{group.category}</Text>
          {group.items.slice(0, 3).map((ex) => (
            <View key={ex.id} style={s.bulletRow}>
              <Text style={s.bulletDot}>·</Text>
              <Text style={s.bulletText}>
                <Text style={{ fontFamily: REPORT_FONTS.dataBold }}>{ex.scope}</Text>
              </Text>
            </View>
          ))}
          {group.items.length > 3 ? (
            <Text style={s.note}>
              + {group.items.length - 3} ítem(s) adicional(es) en el anexo.
            </Text>
          ) : null}
        </View>
      ))}

      <Text style={s.subTitle}>Próximos pasos recomendados</Text>
      {nextSteps.map((step, i) => (
        <View key={i} style={s.stepRow}>
          <Text style={s.stepNumber}>{i + 1}</Text>
          <Text style={s.stepText}>{step}</Text>
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

      <Text style={s.note}>
        El checklist completo de ingeniería de detalle y las referencias
        documentales citadas se encuentran en el anexo correspondiente.
      </Text>

      <Text style={s.note}>{data.metadata.disclaimer}</Text>
    </SectionPage>
  );
}

export function EngineeringAnnexSection({ data, embedded }: ReportSectionProps) {
  return (
    <SectionPage data={data} number="A2" title="Anexo: checklist de ingeniería y referencias" embedded={embedded}>
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

export function RegulatoryAnnexSection({ data }: ReportSectionProps) {
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
