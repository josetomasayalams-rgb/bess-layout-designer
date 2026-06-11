export type DiagnosticMetadata = {
  simpleTitle: { es: string; en: string };
  diagnostic: { es: string; en: string };
  diagnosticImpact: { es: string; en: string };
  diagnosticAction: { es: string; en: string };
  riskLevel: "critical" | "important" | "om_insurance" | "engineering_pending" | "info";
};

export const diagnosticCatalog: Record<string, DiagnosticMetadata> = {
  "RULE-PHYS-001": {
    simpleTitle: {
      es: "Contención física del sitio",
      en: "Site containment",
    },
    diagnostic: {
      es: "Evalúa si todo el equipamiento del layout se encuentra físicamente posicionado dentro de los límites del terreno.",
      en: "Evaluates whether all placed equipment is physically positioned within the boundaries of the site.",
    },
    diagnosticImpact: {
      es: "El posicionamiento de equipos fuera del límite del polígono imposibilita los permisos y representa una invasión a la propiedad de terceros.",
      en: "Placing equipment outside the site boundary prevents local permits and constitutes a property line invasion.",
    },
    diagnosticAction: {
      es: "Mover o rotar el contenedor o estación de conversión afectada para reingresarlo al polígono.",
      en: "Move or rotate the affected container or conversion station to position it fully inside the polygon.",
    },
    riskLevel: "critical",
  },
  "RULE-PHYS-002": {
    simpleTitle: {
      es: "Superposición de equipos (Colisiones)",
      en: "Equipment overlap (Collisions)",
    },
    diagnostic: {
      es: "Detecta si existen colisiones físicas o solapamientos entre las footprints de los equipos.",
      en: "Detects whether physical collisions or overlaps exist between equipment footprints.",
    },
    diagnosticImpact: {
      es: "El solapamiento físico es un error de diseño grave que impide la instalación mecánica y la construcción en el sitio.",
      en: "Physical overlapping is a severe design error that blocks mechanical installation and construction.",
    },
    diagnosticAction: {
      es: "Corregir las coordenadas de posicionamiento o la rotación de los equipos involucrados.",
      en: "Adjust the coordinates or rotation of the involved equipment to clear the collision.",
    },
    riskLevel: "critical",
  },
  "RULE-PHYS-003": {
    simpleTitle: {
      es: "Distancia entre contenedores (Fabricante)",
      en: "Container-to-container clearance (Manufacturer)",
    },
    diagnostic: {
      es: "Revisa si la separación entre contenedores BESS adyacentes cumple las distancias mínimas del fabricante.",
      en: "Verifies if the clearance between adjacent BESS containers satisfies the manufacturer minimum spacing.",
    },
    diagnosticImpact: {
      es: "Espaciamientos inferiores al criterio del fabricante pueden violar la garantía comercial, restringir el flujo de aire y comprometer la seguridad contra propagación de incendios.",
      en: "Clearance below the manufacturer specification can void warranties, restrict air flow, and compromise fire propagation safety.",
    },
    diagnosticAction: {
      es: "Aumentar la separación física entre las unidades BESS indicadas o validar la justificación técnica del fabricante.",
      en: "Increase the physical clearance between BESS units or validate the manufacturer technical justification.",
    },
    riskLevel: "om_insurance",
  },
  "RULE-PHYS-004": {
    simpleTitle: {
      es: "Distancia a estaciones inversoras",
      en: "Clearance to PCS stations",
    },
    diagnostic: {
      es: "Verifica que el distanciamiento de trabajo de los bloques BESS frente a las estaciones de conversión (PCS) mantenga espacio suficiente.",
      en: "Verifies that the working clearances between BESS blocks and PCS conversion stations are sufficient.",
    },
    diagnosticImpact: {
      es: "Espacios de trabajo reducidos bloquean las labores de operación y mantenimiento seguro, además de violar normas de seguridad eléctrica.",
      en: "Insufficient working space blocks safe O&M tasks and violates basic electrical safety standards.",
    },
    diagnosticAction: {
      es: "Asegurar un despeje frontal mínimo de 1,2 metros o presentar el respaldo específico del manual del fabricante.",
      en: "Ensure a minimum front working clearance of 1.2 m or obtain specific vendor manual guidelines.",
    },
    riskLevel: "om_insurance",
  },
  "RULE-PHYS-005": {
    simpleTitle: {
      es: "Distancia de seguridad perimetral de incendio",
      en: "Fire setback to site boundary",
    },
    diagnostic: {
      es: "Evalúa que los bloques BESS mantengan un deslinde perimetral de seguridad para prevención y control de incendios.",
      en: "Evaluates whether BESS blocks maintain a perimeter fire safety setback to the property lines.",
    },
    diagnosticImpact: {
      es: "Estar muy cerca del deslinde perimetral arriesga el rechazo en la evaluación de seguros y dificulta la obtención de permisos de bomberos y municipales.",
      en: "Proximity to the boundary risks rejection during insurance evaluation and complicates local fire and municipal permits.",
    },
    diagnosticAction: {
      es: "Aumentar la distancia de retiro respecto a los bordes del polígono a un mínimo preliminar de 3 metros, o proyectar un muro cortafuego.",
      en: "Increase property line setback to a preliminary minimum of 3 meters, or plan for a passive fire barrier.",
    },
    riskLevel: "important",
  },
  "RULE-PHYS-006": {
    simpleTitle: {
      es: "Acceso vehicular a equipos",
      en: "Vehicle access to equipment",
    },
    diagnostic: {
      es: "Comprueba que cada equipo pesado del layout tenga un camino de acceso vehicular conceptual cercano.",
      en: "Checks that every heavy equipment item in the layout is within reach of a conceptual vehicle road.",
    },
    diagnosticImpact: {
      es: "La falta de caminos cercanos impide la entrada de grúas durante el montaje y camiones de emergencia en caso de incidentes.",
      en: "Missing vehicle paths prevents crane access during assembly and emergency vehicles in case of an incident.",
    },
    diagnosticAction: {
      es: "Modificar el trazado de los caminos de acceso conceptuales o acercar el equipamiento al camino existente.",
      en: "Modify the conceptual road layout or shift the equipment closer to an existing road.",
    },
    riskLevel: "om_insurance",
  },
  "RULE-PHYS-009": {
    simpleTitle: {
      es: "Cruce de corredores de cables y caminos",
      en: "Cable corridor and road crossings",
    },
    diagnostic: {
      es: "Monitorea la interferencia y superposición entre las zanjas/corredores de cables y las vías de tránsito vehicular.",
      en: "Monitors interference and overlaps between cable trenches/corridors and vehicle roads.",
    },
    diagnosticImpact: {
      es: "El paralelismo o cruce no coordinado puede provocar daños mecánicos en el cableado por tránsito de cargas pesadas si no se define un encamisado técnico.",
      en: "Uncoordinated crossings or overlaps risk mechanical cable damage under heavy vehicle loads without technical casing.",
    },
    diagnosticAction: {
      es: "Coordinar los cruces a 90 grados y proyectar protecciones mecánicas (tuberías/encamisados) en la ingeniería de detalle.",
      en: "Plan for 90-degree crossings and specify mechanical protection (conduits/casing) in detailed engineering.",
    },
    riskLevel: "important",
  },
  "RULE-PHYS-011": {
    simpleTitle: {
      es: "Exclusiones de terreno",
      en: "Site exclusion zones",
    },
    diagnostic: {
      es: "Asegura que no se haya colocado equipamiento dentro de áreas restringidas, arqueológicas, de riesgo natural o servidumbres del sitio.",
      en: "Ensures no equipment is placed inside restricted, archaeological, natural hazard, or easement zones.",
    },
    diagnosticImpact: {
      es: "El emplazamiento en zonas de exclusión ambiental o legal resulta en la denegación directa de permisos sectoriales y multas.",
      en: "Placement within environmental or legal exclusion zones yields immediate permit denial and penalties.",
    },
    diagnosticAction: {
      es: "Mover de inmediato los equipos fuera de las zonas rojas delimitadas de exclusión.",
      en: "Immediately relocate the equipment out of the designated red exclusion areas.",
    },
    riskLevel: "critical",
  },
  "RULE-ELEC-003": {
    simpleTitle: {
      es: "Compatibilidad de tensión DC (Batería-PCS)",
      en: "DC voltage compatibility (Battery-PCS)",
    },
    diagnostic: {
      es: "Evalúa si el rango de voltaje operativo del inversor (PCS) es compatible con la tensión del rack de baterías BESS.",
      en: "Evaluates whether the inverter (PCS) operating DC voltage range is compatible with the BESS battery rack voltage.",
    },
    diagnosticImpact: {
      es: "Incompatibilidades de rango de tensión DC impiden la carga/descarga segura y pueden dañar los semiconductores de potencia del PCS.",
      en: "Incompatibilities in the DC voltage range block safe charging/discharging and can damage the PCS power electronics.",
    },
    diagnosticAction: {
      es: "Revisar y alinear la configuración en serie de los módulos de batería o seleccionar un modelo de PCS con ventana de voltaje coincidente.",
      en: "Review and align battery module series configuration or select a PCS model with matching voltage window.",
    },
    riskLevel: "critical",
  },
  "RULE-ELEC-004": {
    simpleTitle: {
      es: "Sincronía de Baja Tensión (Inversor-Transformador)",
      en: "LV synchronization (Inverter-Transformer)",
    },
    diagnostic: {
      es: "Verifica que la salida de AC de baja tensión del inversor coincida exactamente con el devanado de baja tensión del transformador del bloque.",
      en: "Verifies that the inverter low-voltage AC output matches exactly the block transformer low-voltage winding.",
    },
    diagnosticImpact: {
      es: "Una discordancia en las tensiones nominales de baja tensión de AC impide la conexión física e interconexión del bloque eléctrico.",
      en: "A mismatch in nominal AC low voltages prevents physical connection and electrical block coupling.",
    },
    diagnosticAction: {
      es: "Alinear la selección de especificaciones del transformador de media tensión para que coincida con la salida nominal del PCS.",
      en: "Align MV transformer specifications to match the rated output of the selected PCS.",
    },
    riskLevel: "critical",
  },
  "RULE-ELEC-005": {
    simpleTitle: {
      es: "Consistencia de voltaje en Media Tensión",
      en: "Consistent MV collector voltage",
    },
    diagnostic: {
      es: "Chequea que los transformadores, cables alimentadores y barras de MT operen a un nivel de voltaje unificado.",
      en: "Checks that transformers, feeder cables, and MV buses operate at a single unified voltage level.",
    },
    diagnosticImpact: {
      es: "Voltajes inconsistentes en el sistema colector (ej. alimentar un busbar de 33 kV con transformadores de 23 kV) causan fallas graves de aislamiento o subutilización.",
      en: "Inconsistent voltages in the collector grid (e.g., feeding a 33 kV bus with 23 kV transformers) lead to insulation faults.",
    },
    diagnosticAction: {
      es: "Homologar la especificación de voltaje de media tensión en todos los bloques y alimentadores del proyecto.",
      en: "Standardize the medium-voltage rating across all blocks and feeders of the project.",
    },
    riskLevel: "important",
  },
  "RULE-ELEC-006": {
    simpleTitle: {
      es: "Capacidad de corriente del alimentador MT",
      en: "MV feeder capacity check",
    },
    diagnostic: {
      es: "Compara la potencia máxima agregada de las estaciones inversoras en un circuito frente a la capacidad de corriente preliminar de ese alimentador.",
      en: "Compares the maximum power aggregated on a circuit against the preliminary capacity of that MV feeder.",
    },
    diagnosticImpact: {
      es: "Sobrecargar un alimentador provoca calentamiento excesivo de cables, pérdidas elevadas y desconexiones automáticas por sobrecorriente.",
      en: "Overloading a feeder triggers cable overheating, high thermal losses, and overcurrent trips.",
    },
    diagnosticAction: {
      es: "Redistribuir las estaciones inversoras en más alimentadores o aumentar la sección nominal del cable colector.",
      en: "Redistribute conversion stations across more feeders or increase the cable cross-section.",
    },
    riskLevel: "important",
  },
  "RULE-ELEC-007": {
    simpleTitle: {
      es: "Capacidad de la barra de Media Tensión (Switchgear)",
      en: "MV bus capacity screening (Switchgear)",
    },
    diagnostic: {
      es: "Analiza si la suma total de potencia que ingresa a la subestación supera la capacidad nominal de la barra del switchgear.",
      en: "Analyzes if the total power entering the substation exceeds the rated capacity of the switchgear busbar.",
    },
    diagnosticImpact: {
      es: "Superar la capacidad de corriente de la barra del switchgear genera riesgos de arco eléctrico, falla catastrófica y rechazo de la instalación.",
      en: "Exceeding switchgear busbar capacity risks arc flash, catastrophic thermal failure, and system rejection.",
    },
    diagnosticAction: {
      es: "Subdividir la barra del switchgear en secciones con acoplamiento, aumentar su capacidad en amperes, o limitar la inyección del parque.",
      en: "Section the switchgear busbar, increase its current rating in amperes, or restrict peak plant output.",
    },
    riskLevel: "important",
  },
  "RULE-ELEC-008": {
    simpleTitle: {
      es: "Capacidad de conducción térmica de cables (Ampacidad)",
      en: "Cable ampacity screening",
    },
    diagnostic: {
      es: "Evalúa si la sección y material del cable colector toleran la corriente calculada bajo supuestos térmicos estándar.",
      en: "Evaluates if collector cable sizing and material tolerate calculated current under standard thermal conditions.",
    },
    diagnosticImpact: {
      es: "El cálculo preliminar no considera factores de agrupamiento de zanja ni resistividad térmica del suelo, lo que podría sobreestimar la capacidad real del conductor.",
      en: "Preliminary screening excludes grouping factors or soil thermal resistivity, which can overestimate true conductor limits.",
    },
    diagnosticAction: {
      es: "Mantener este chequeo como referencia y realizar el estudio térmico de ampacidad (bajo norma IEC 60287) en la ingeniería de detalle.",
      en: "Keep this check as a reference and conduct a detailed thermal ampacity study (IEC 60287) in detailed engineering.",
    },
    riskLevel: "engineering_pending",
  },
  "RULE-ELEC-009": {
    simpleTitle: {
      es: "Presupuesto de pérdidas del sistema colector",
      en: "Collector grid loss budget",
    },
    diagnostic: {
      es: "Suma las pérdidas aproximadas en transformadores, inversores y cables del circuito MT, contrastándolas con un margen de diseño.",
      en: "Sums approximate losses in transformers, inverters, and cables, comparing them against a design budget.",
    },
    diagnosticImpact: {
      es: "Pérdidas superiores a las proyectadas reducen la rentabilidad del proyecto y degradan la eficiencia global (RTE) del sistema BESS.",
      en: "Losses exceeding the target margin reduce project NPV and degrade overall round-trip efficiency (RTE).",
    },
    diagnosticAction: {
      es: "Optimizar el calibre de cables de MT, elegir transformadores de pérdidas reducidas o validar la tolerancia comercial con el cliente.",
      en: "Optimize MV cable gauges, specify low-loss transformers, or validate commercial tolerance.",
    },
    riskLevel: "info",
  },
  "RULE-ELEC-013": {
    simpleTitle: {
      es: "Límite de inyección en el Punto de Interconexión (POI)",
      en: "Injection limit at the POI",
    },
    diagnostic: {
      es: "Valida que la capacidad total instalada en inversores no supere la potencia máxima aprobada para inyección en el Punto de Interconexión.",
      en: "Validates that the total installed inverter capacity does not exceed the maximum allowed POI injection capacity.",
    },
    diagnosticImpact: {
      es: "Superar la capacidad autorizada por la CNE/CEN invalida el acuerdo de conexión del proyecto y puede gatillar rechazos del Coordinador Eléctrico.",
      en: "Exceeding grid-connection capacity voids connection agreements and triggers system rejection by the operator.",
    },
    diagnosticAction: {
      es: "Limitar la inyección mediante configuración del Power Plant Controller (PPC) o reducir la potencia instalada de inversores.",
      en: "Limit output via Power Plant Controller (PPC) configuration or reduce total inverter nameplate capacity.",
    },
    riskLevel: "important",
  },
  "RULE-ELEC-014": {
    simpleTitle: {
      es: "Presupuesto de consumos auxiliares (SSAA)",
      en: "Auxiliary services budget (SSAA)",
    },
    diagnostic: {
      es: "Estima el consumo de energía interno del parque (climatización BESS, bombas, servicios comunes) respecto de la inyección neta.",
      en: "Estimates internal station service load (BESS HVAC, pumps, common services) against net injection.",
    },
    diagnosticImpact: {
      es: "Un consumo auxiliar elevado penaliza los ingresos del proyecto y reduce la energía neta disponible para arbitraje en el mercado.",
      en: "High auxiliary consumption penalizes project revenue and decreases net energy available for grid arbitration.",
    },
    diagnosticAction: {
      es: "Revisar los consumos auxiliares nominales de los contenedores seleccionados y optimizar los modos de espera y gestión de HVAC.",
      en: "Check nominal auxiliary draws of selected containers and optimize HVAC standby/management profiles.",
    },
    riskLevel: "info",
  },
  "RULE-ELEC-015": {
    simpleTitle: {
      es: "Declaración de rampa de carga para la NTSyCS",
      en: "Load ramp rate declared for NTSyCS",
    },
    diagnostic: {
      es: "Asegura la declaración formal del gradiente de potencia activo para cumplir las exigencias de velocidad de rampa en Chile.",
      en: "Ensures formal declaration of the active power gradient to comply with ramp rate speed requirements in Chile.",
    },
    diagnosticImpact: {
      es: "La falta de declaración de rampas impide pasar la fase documental y de simulación dinámica ante el Coordinador Eléctrico Nacional.",
      en: "Failure to declare ramp behavior blocks document and dynamic simulation approval stages with the grid coordinator.",
    },
    diagnosticAction: {
      es: "Declarar la velocidad máxima de rampa (MW/min) según los requerimientos del anexo técnico del Coordinador.",
      en: "Declare the maximum ramp rate (MW/min) in alignment with the Coordinator's technical annex.",
    },
    riskLevel: "important",
  },
  "RULE-ELEC-016": {
    simpleTitle: {
      es: "Cobertura de modos de control del PPC",
      en: "PPC control modes coverage",
    },
    diagnostic: {
      es: "Inspecciona que el controlador del parque (PPC) declare capacidad para controlar tensión, frecuencia y potencia reactiva.",
      en: "Checks that the plant controller (PPC) declares capability for voltage, frequency, and reactive power control.",
    },
    diagnosticImpact: {
      es: "No declarar el control coordinado del POI según las exigencias chilenas de la NTSyCS paraliza el proceso de puesta en servicio del parque.",
      en: "Failure to declare coordinated POI control per Chilean NTSyCS blocks final commissioning approval.",
    },
    diagnosticAction: {
      es: "Confirmar que las especificaciones del PPC del proyecto cubran los modos exigidos por la norma técnica RES 45/2026.",
      en: "Confirm that the project's PPC specifications cover the control modes required under technical standard RES 45/2026.",
    },
    riskLevel: "important",
  },
  "RULE-ELEC-017": {
    simpleTitle: {
      es: "Pérdidas anuales en vacío de transformadores",
      en: "Transformer annual no-load losses estimate",
    },
    diagnostic: {
      es: "Estima la energía perdida constantemente por los núcleos magnéticos de los transformadores mientras el parque está en espera.",
      en: "Estimates constant core loss energy from transformers while the plant is in standby mode.",
    },
    diagnosticImpact: {
      es: "Las pérdidas sin carga ocurren las 24 horas del día. Un valor alto degrada el rendimiento comercial a largo plazo si no se proyecta adecuadamente.",
      en: "No-load losses occur 24x7. A high cumulative draw degrades long-term financial performance if not planned.",
    },
    diagnosticAction: {
      es: "Utilizar transformadores con núcleos de acero amorfo o de pérdidas reducidas en vacío para mitigar este impacto.",
      en: "Specify amorphous metal cores or high-efficiency transformers to mitigate long-term standby drain.",
    },
    riskLevel: "info",
  },
  "RULE-REP-001": {
    simpleTitle: {
      es: "Cláusulas de responsabilidad en el reporte (Disclaimer)",
      en: "Report liability disclaimers",
    },
    diagnostic: {
      es: "Valida la inclusión de avisos legales defensivos en la documentación final exportada.",
      en: "Validates the inclusion of defensive legal disclaimers in the final exported documentation.",
    },
    diagnosticImpact: {
      es: "No adjuntar un disclaimer adecuado expone al proyecto a riesgos de malinterpretación de datos preliminares como si fuesen definitivos.",
      en: "Omitting a proper disclaimer exposes the project to misinterpretation of preliminary data as certified engineering.",
    },
    diagnosticAction: {
      es: "Asegurar que el bloque de disclaimer preliminar esté activo en el reporte y sea firmado o aceptado por el usuario.",
      en: "Ensure the preliminary disclaimer block remains active in the report output and is acknowledged by the user.",
    },
    riskLevel: "info",
  },
};
