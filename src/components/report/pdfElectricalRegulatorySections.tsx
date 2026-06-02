import { Circle, G, Line, Path, Rect, Svg, Text, View } from "@react-pdf/renderer";
import { REPORT_COLORS, REPORT_FONTS, reportStyles as s } from "./reportStyles";
import { documentTitle, type TechnicalReportData } from "@/lib/report/buildReportData";
import { selectSldStages } from "@/lib/report/sldStages";
import { fmtInt, fmtNum, formatIsoDate } from "./pdfFormatters";
import { AlertCard, DefGrid, SectionPage, Table } from "./pdfPrimitives";
import {
  OUTCOME_LABEL,
  SEVERITY_LABEL_ES,
  SEVERITY_PILL,
  outcomePillStyle,
} from "./pdfSeverityMaps";

type ReportSectionProps = { data: TechnicalReportData; embedded?: boolean };

/**
 * Diagrama unilineal conceptual (single-line diagram) dinámico dibujado en SVG.
 * Se dibuja con primitivas vectoriales (Rect / Line / Path / Circle) y se adapta
 * dinámicamente a la configuración del BESS (modelo, cantidad, potencia, feeders,
 * transformador y POI).
 */
function SingleLineDiagram({ data }: { data: TechnicalReportData }) {
  const k = data.reportKpis;
  const e = data.electrical;
  const isIntegrated = k.isIntegrated;
  const { caption } = selectSldStages(isIntegrated);

  // Extraer información del modelo de batería
  const batterySpec = data.equipmentInventory.find((item) => item.type === "battery_container");
  const batteryModel = batterySpec ? batterySpec.model : "BESS Standard";

  // Extraer información del PCS
  const pcsSpec = e.stationRows[0];
  const pcsModel = pcsSpec ? pcsSpec.model : "PCS Station";

  // Voltajes y parámetros del sistema
  const mvVoltage = e.buses[0]?.nominalVoltageKv 
    || e.feeders[0]?.nominalVoltageKv 
    || 33;

  const mainTransformer = e.mainTransformer;
  const poi = e.poi;

  const color = REPORT_COLORS.ink;
  const accent = REPORT_COLORS.accent;
  const muted = REPORT_COLORS.muted;

  // Renderizar interruptor de potencia (breaker)
  const renderBreaker = (x: number, y: number) => (
    <G key={`brk-${x}-${y}`}>
      <Rect
        x={x - 4}
        y={y - 4}
        width={8}
        height={8}
        fill="#ffffff"
        stroke={color}
        strokeWidth={1}
      />
      <Line
        x1={x - 4}
        y1={y + 4}
        x2={x + 4}
        y2={y - 4}
        stroke={color}
        strokeWidth={1}
      />
    </G>
  );

  return (
    <View style={s.sldWrap}>
      <Svg viewBox="0 0 520 150" style={{ width: "100%", height: 150 }}>
        {/* Fondo de papel milimetrado sutil */}
        {Array.from({ length: 16 }).map((_, i) => (
          <Line
            key={`g-lh-${i}`}
            x1={0}
            y1={i * 10}
            x2={520}
            y2={i * 10}
            stroke="#f1f5f9"
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: 53 }).map((_, i) => (
          <Line
            key={`g-lv-${i}`}
            x1={i * 10}
            y1={0}
            x2={i * 10}
            y2={150}
            stroke="#f1f5f9"
            strokeWidth={0.5}
          />
        ))}

        {/* ---------------------------------------------------- */}
        {/* ETAPA 1: BESS CONTAINER (LADO CC) (x = 55, y = 65) */}
        {/* ---------------------------------------------------- */}
        {/* Contorno físico del contenedor */}
        <Rect
          x={25}
          y={35}
          width={60}
          height={60}
          rx={4}
          fill="#eff6ff"
          stroke={accent}
          strokeWidth={1}
          strokeDasharray={isIntegrated ? "3 3" : undefined}
        />
        {/* Símbolo de placas de baterías */}
        <Line x1={42} y1={50} x2={68} y2={50} stroke={color} strokeWidth={2} />
        <Line x1={48} y1={54} x2={62} y2={54} stroke={color} strokeWidth={1} />
        <Line x1={42} y1={58} x2={68} y2={58} stroke={color} strokeWidth={2} />
        <Line x1={48} y1={62} x2={62} y2={62} stroke={color} strokeWidth={1} />
        <Line x1={42} y1={66} x2={68} y2={66} stroke={color} strokeWidth={2} />
        <Line x1={48} y1={70} x2={62} y2={70} stroke={color} strokeWidth={1} />
        {/* Terminales positivo y negativo */}
        <Line x1={55} y1={44} x2={55} y2={50} stroke={color} strokeWidth={1} />
        <Line x1={55} y1={70} x2={55} y2={76} stroke={color} strokeWidth={1} />
        <Text x={65} y={48} style={{ fontSize: 7, fontFamily: REPORT_FONTS.dataBold, fill: REPORT_COLORS.ok }}>+</Text>
        <Text x={65} y={74} style={{ fontSize: 7, fontFamily: REPORT_FONTS.dataBold, fill: REPORT_COLORS.danger }}>-</Text>

        <Text
          x={55}
          y={110}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.dataBold, fontSize: 8, fill: color }}
        >
          BESS (Lado CC)
        </Text>
        <Text
          x={55}
          y={122}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.monoBold, fontSize: 6.5, fill: accent }}
        >
          {`${k.containers} x ${batteryModel}`}
        </Text>
        <Text
          x={55}
          y={132}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.mono, fontSize: 6.5, fill: muted }}
        >
          {`${fmtNum(k.grossEnergyMWh, 1)} MWh (CC)`}
        </Text>

        {/* Conexión Etapa 1 -> 2 */}
        <Line x1={85} y1={65} x2={125} y2={65} stroke={color} strokeWidth={1.2} />

        {/* ---------------------------------------------------- */}
        {/* ETAPA 2: CONVERSIÓN (PCS) (x = 155, y = 65) */}
        {/* ---------------------------------------------------- */}
        {/* Contorno físico del PCS si es separado */}
        {!isIntegrated && (
          <Rect
            x={125}
            y={35}
            width={60}
            height={60}
            rx={4}
            fill="#eff6ff"
            stroke={accent}
            strokeWidth={1}
          />
        )}
        {/* Caja de inversor DC/AC diagonal */}
        <Rect
          x={139}
          y={43}
          width={32}
          height={24}
          rx={2}
          fill="#ffffff"
          stroke={color}
          strokeWidth={1.2}
        />
        <Line x1={139} y1={67} x2={171} y2={43} stroke={color} strokeWidth={1.2} />
        {/* Símbolo CC (=) abajo-izquierda */}
        <Line x1={144} y1={58} x2={152} y2={58} stroke={color} strokeWidth={1} />
        <Line x1={144} y1={61} x2={152} y2={61} stroke={color} strokeWidth={1} strokeDasharray="1.5 1" />
        {/* Símbolo CA (~) arriba-derecha */}
        <Path d="M 158 52 C 160 49, 162 49, 164 52 C 166 55, 168 55, 170 52" fill="none" stroke={color} strokeWidth={1} />

        {/* Círculos de devanado para Transformador de Bloque (Sólo PCS separado) */}
        {!isIntegrated && (
          <G>
            <Circle cx={155} cy={77} r={6} fill="none" stroke={color} strokeWidth={1} />
            <Circle cx={155} cy={85} r={6} fill="none" stroke={color} strokeWidth={1} />
          </G>
        )}

        <Text
          x={155}
          y={110}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.dataBold, fontSize: 8, fill: color }}
        >
          {isIntegrated ? "PCS Integrado" : "PCS + Trafo BT/MT"}
        </Text>
        <Text
          x={155}
          y={122}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.monoBold, fontSize: 6.5, fill: accent }}
        >
          {isIntegrated ? "Inversor en Unidad" : `${k.stations} x ${pcsModel}`}
        </Text>
        <Text
          x={155}
          y={132}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.mono, fontSize: 6.5, fill: muted }}
        >
          {isIntegrated ? "Salida CA Directa" : `${fmtNum(k.installedPowerMVA, 1)} MVA · ${e.stations[0]?.blockTransformer ? `${e.stations[0].blockTransformer.lvVoltageKv.value}/${e.stations[0].blockTransformer.hvVoltageKv.value} kV` : `0.9/${mvVoltage} kV`}`}
        </Text>

        {/* Bounding box de acoplamiento CA para sistemas integrados (ej. Tesla Megapack) */}
        {isIntegrated && (
          <G>
            <Rect
              x={18}
              y={28}
              width={174}
              height={74}
              rx={6}
              fill="none"
              stroke={accent}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <Text
              x={105}
              y={24}
              textAnchor="middle"
              style={{ fontFamily: REPORT_FONTS.dataBold, fontSize: 6, fill: accent }}
            >
              UNIDAD INTEGRADA (CA ACOPLADO)
            </Text>
          </G>
        )}

        {/* ---------------------------------------------------- */}
        {/* ETAPA 3: BARRA COLECTORA MT / FEEDERS (x = 260, y = 65) */}
        {/* ---------------------------------------------------- */}
        {/* Conexión de alimentación entrante */}
        <Line x1={185} y1={65} x2={205} y2={65} stroke={color} strokeWidth={1.2} />
        {/* Alimentador 1 (Arriba) */}
        <Path d="M 205 65 L 210 50 L 260 50" fill="none" stroke={color} strokeWidth={1.2} />
        {/* Alimentador 2 (Abajo) */}
        <Path d="M 205 65 L 210 80 L 260 80" fill="none" stroke={color} strokeWidth={1.2} />

        {/* Interruptores de potencia en los alimentadores */}
        {renderBreaker(230, 50)}
        {renderBreaker(230, 80)}

        {/* Barra vertical de MT colectora gruesa */}
        <Line x1={260} y1={40} x2={260} y2={90} stroke={color} strokeWidth={2.5} />

        {/* Salida desde barra hacia transformador principal */}
        <Path d="M 260 65 L 335 65" fill="none" stroke={color} strokeWidth={1.2} />
        {renderBreaker(295, 65)}

        <Text
          x={260}
          y={110}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.dataBold, fontSize: 8, fill: color }}
        >
          Barra / Colector MT
        </Text>
        <Text
          x={260}
          y={122}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.monoBold, fontSize: 6.5, fill: accent }}
        >
          {`${k.feeders} x Feeder(s) MT`}
        </Text>
        <Text
          x={260}
          y={132}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.mono, fontSize: 6.5, fill: muted }}
        >
          {`Colector MT · ${mvVoltage} kV`}
        </Text>

        {/* ---------------------------------------------------- */}
        {/* ETAPA 4: TRANSFORMADOR PRINCIPAL (x = 365, y = 65) */}
        {/* ---------------------------------------------------- */}
        {/* Círculos entrelazados de devanados */}
        <Circle cx={357} cy={65} r={12} fill="none" stroke={color} strokeWidth={1.2} />
        <Circle cx={373} cy={65} r={12} fill="none" stroke={color} strokeWidth={1.2} />
        
        {/* Símbolo de estrella (Y) inside first winding */}
        <Line x1={357} y1={65} x2={357} y2={59} stroke={color} strokeWidth={0.8} />
        <Line x1={357} y1={65} x2={352} y2={69} stroke={color} strokeWidth={0.8} />
        <Line x1={357} y1={65} x2={362} y2={69} stroke={color} strokeWidth={0.8} />
        
        {/* Símbolo de triángulo (Delta) inside second winding */}
        <Path d="M 373 58 L 368 68 L 378 68 Z" fill="none" stroke={color} strokeWidth={0.8} />

        {/* Salida a subestación / POI */}
        <Line x1={385} y1={65} x2={445} y2={65} stroke={color} strokeWidth={1.2} />
        {renderBreaker(415, 65)}

        <Text
          x={365}
          y={110}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.dataBold, fontSize: 8, fill: color }}
        >
          Trafo Principal
        </Text>
        <Text
          x={365}
          y={122}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.monoBold, fontSize: 6.5, fill: accent }}
        >
          {mainTransformer
            ? `${fmtNum(mainTransformer.ratedPowerMVA.value, 0)} MVA`
            : "Referencia Externa"}
        </Text>
        <Text
          x={365}
          y={132}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.mono, fontSize: 6.5, fill: muted }}
        >
          {mainTransformer
            ? `${mainTransformer.windings.hvKv} / ${mainTransformer.windings.mv1Kv || mvVoltage} kV · ${mainTransformer.vectorGroup || "YNd11"}`
            : `110 / ${mvVoltage} kV · YNd11`}
        </Text>

        {/* ---------------------------------------------------- */}
        {/* ETAPA 5: PUNTO DE CONEXIÓN (POI) (x = 465, y = 65) */}
        {/* ---------------------------------------------------- */}
        {/* Símbolo de torre de transmisión de AT */}
        <G stroke={color} strokeWidth={1} fill="none">
          {/* Estructura central */}
          <Line x1={458} y1={90} x2={482} y2={90} />
          <Line x1={458} y1={90} x2={466} y2={35} />
          <Line x1={482} y1={90} x2={474} y2={35} />
          <Line x1={466} y1={35} x2={474} y2={35} />
          {/* Crucetas internas */}
          <Line x1={458} y1={90} x2={474} y2={70} />
          <Line x1={482} y1={90} x2={466} y2={70} />
          <Line x1={466} y1={70} x2={474} y2={70} />
          <Line x1={466} y1={70} x2={474} y2={50} />
          <Line x1={474} y1={70} x2={466} y2={50} />
          <Line x1={466} y1={50} x2={474} y2={50} />
          <Line x1={466} y1={50} x2={470} y2={35} />
          <Line x1={474} y1={50} x2={470} y2={35} />
          {/* Brazos laterales (crucetas) */}
          <Line x1={452} y1={50} x2={488} y2={50} />
          <Line x1={448} y1={70} x2={492} y2={70} />
          {/* Cadenas de aisladores sutiles */}
          <Line x1={452} y1={50} x2={452} y2={58} strokeWidth={1.5} />
          <Line x1={488} y1={50} x2={488} y2={58} strokeWidth={1.5} />
          <Line x1={448} y1={70} x2={448} y2={78} strokeWidth={1.5} />
          <Line x1={492} y1={70} x2={492} y2={78} strokeWidth={1.5} />
        </G>

        <Text
          x={470}
          y={110}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.dataBold, fontSize: 8, fill: color }}
        >
          POI / Red Eléctrica
        </Text>
        <Text
          x={470}
          y={122}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.monoBold, fontSize: 6.5, fill: accent }}
        >
          {poi ? poi.busName : "Conexión Red"}
        </Text>
        <Text
          x={470}
          y={132}
          textAnchor="middle"
          style={{ fontFamily: REPORT_FONTS.mono, fontSize: 6.5, fill: muted }}
        >
          {poi ? `${poi.voltageKv} kV` + (poi.declaredCapacityMVA ? ` · ${fmtNum(poi.declaredCapacityMVA.value, 0)} MVA` : "") : "110 kV"}
        </Text>
      </Svg>
      <Text style={s.imageCaption}>{caption}</Text>
    </View>
  );
}

export function ElectricalSection({ data, embedded }: ReportSectionProps) {
  const e = data.electrical;
  const k = data.reportKpis;
  return (
    <SectionPage data={data} number="5" title="Arquitectura eléctrica conceptual" embedded={embedded}>
      <Text style={s.paragraph}>
        {k.isIntegrated
          ? "En esta configuración los equipos integran el inversor/PCS dentro de la unidad y entregan corriente alterna directamente; no existe una estación PCS/MV separada que colocar. La arquitectura conceptual encadena la unidad integrada, el colector MT conceptual, el transformador elevador externo (no modelado en esta herramienta), la barra y seccionamiento MT, y el punto de conexión (POI). La fuente de los datos eléctricos se cita cuando está disponible; los campos vacíos representan información pendiente de validación de fabricante o EPC."
          : "La arquitectura conceptual encadena el contenedor BESS (lado DC), el PCS con transformador BT/MT integrado, el feeder de media tensión, la barra y seccionamiento MT, y el punto de conexión (POI). La fuente de los datos eléctricos se cita cuando está disponible; los campos vacíos representan información pendiente de validación de fabricante o EPC."}
      </Text>

      <SingleLineDiagram data={data} />

      {k.isIntegrated ? (
        <AlertCard
          severity="warning"
          title="Arquitectura integrada: transformador elevador externo no modelado"
          message={`Layout integrado con ${fmtInt(k.integratedUnitCount)} unidad(es): el inversor/PCS está integrado en la unidad y entrega corriente alterna directamente, por lo que no existe una estación PCS/MV separada que modelar. La elevación de baja a media tensión requiere un transformador elevador BT/MT externo que esta herramienta no modela.`}
          recommendation="Confirmar el esquema de elevación BT/MT y el punto de conexión con el fabricante y el EPC antes de usar este reporte como base técnica formal."
        />
      ) : null}

      <DefGrid
        items={[
          { label: "Bloques BESS", value: fmtInt(e.blocks) },
          {
            label: "Estaciones de conversión",
            value: k.isIntegrated ? "Integrado (en unidad)" : fmtInt(k.stations),
          },
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

export function PreliminaryElectricalChecksSection({ data, embedded }: ReportSectionProps) {
  const block = data.preliminaryElectricalChecks;
  const checks = block.checks;
  return (
    <SectionPage
      data={data}
      number="5b"
      title="Validaciones eléctricas preliminares"
      embedded={embedded}
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

export function RegulatorySection({ data, embedded }: ReportSectionProps) {
  const ev = data.regulatoryEvaluation;
  return (
    <SectionPage data={data} number="6" title="Validación normativa resumida" embedded={embedded}>
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
