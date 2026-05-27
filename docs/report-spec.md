# Technical Report Specification - BESS Layout Designer

Este documento detalla las especificaciones de diseño, contenido y alcance del Reporte Técnico preliminar y el Resumen BESS emitidos por la aplicación. Su propósito es regular el formato de salida técnica para que mantenga coherencia estricta con la postura de defensibilidad del software.

---

## 1. Propósito (Purpose)

El reporte técnico preliminar consolida y documenta el estado del predimensionamiento espacial y eléctrico del sistema de almacenamiento. Su función es actuar como una ficha de síntesis técnica conceptual que recopila los supuestos geométricos de diseño, las especificaciones básicas de los componentes seleccionados y las advertencias regulatorias/eléctricas preliminares.

---

## 2. Audiencia del Reporte (Report Audience)

La salida técnica generada por esta herramienta está dirigida a:
* **Equipos de Desarrollo Interno**: Como bitácora de iteración de alternativas durante etapas tempranas de planificación de proyectos.
* **Ingeniería Conceptual**: Como base de datos estructurada para alimentar términos de referencia y solicitudes de información (RFI) dirigidas a fabricantes o consultores.
* **Evaluación Comercial y Financiera**: Para la estimación rápida de cabida de potencia y energía en polígonos bajo condiciones de arriendo de terrenos.
* **Mentores y Revisores Técnicos**: Para validar el entendimiento espacial y las holguras del diseño conceptual.
* **Queda estrictamente prohibido su uso como**: Documentación ejecutiva de ingeniería básica o de detalle, entrega formal certificante ante autoridades (SEC, ministerios) u ofertas de contratación EPC vinculantes.

---

## 3. Estructura Física y Secciones del Reporte (Modular PDF Layout)

Post-modularización (Fase 12A), el reporte PDF se estructura a través de componentes específicos de React-PDF localizados bajo [src/components/report/document/](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/src/components/report/document/):

```
[src/components/report/document/]
├── ReportDocument.tsx        <-- Ensamblador Raíz y Estilos Globales
├── ReportCoverPage.tsx       <-- Portada y Disclaimer de Predimensionamiento
├── ReportLayoutPage.tsx      <-- Sitio, Vértices, Coordenadas y Captura de Mapa
├── ReportElectricalArchitecturePage.tsx <-- Arquitectura Eléctrica y Topología MT
├── ReportTraceabilityPage.tsx <-- Tabla de Trazabilidad Documental de Evidencias
└── ReportExclusionsPage.tsx  <-- Exclusiones de Ingeniería y Disclaimers
```

### Secciones Renderizadas en el Documento:
1.  **Portada (`ReportCoverPage.tsx`):** Nombre del proyecto, fecha de generación, versión de la herramienta, metadatos clave y la advertencia general destacada (`generalMvp`).
2.  **Sitio y Terreno (`ReportLayoutPage.tsx`):** Datos geométricos del polígono de implantación, área total ocupada, número de vértices, referencia del ancla de coordenadas local (`ProjectAnchor`) y mapa geográfico capturado conceptual.
3.  **Configuración BESS/PCS (`ReportElectricalArchitecturePage.tsx`):** Desglose de modelos de baterías e inversores seleccionados del catálogo, cantidad de contenedores, ratios de integración, esquema unilineal simplificado (SLD), potencia agregada de transformadores y tensión nominal de barra MT.
4.  **Trazabilidad Documental (`ReportTraceabilityPage.tsx`):** Matriz que asocia cada variable física/eléctrica modificada con su correspondiente ID de documento en `documentRegistry.ts` y su nivel de confianza documental.
5.  **Exclusiones Explícitas (`ReportExclusionsPage.tsx`):** Declaración inalterable de estudios y disciplinas no ejecutadas por la herramienta (e.g. cortocircuito, flujo de carga) mapeadas a `exclusionRegistry.ts`, más los disclaimers específicos de protección contra incendio y compatibilidad contractual.

---

## 4. Fuentes de Datos (Data Sources)

La recopilación de datos para ensamblar el reporte proviene de los siguientes módulos del sistema:
* **Project Store (`useProjectStore`)**: Polígono del sitio, coordenadas de equipos colocados (`PlacedEquipment`), especificaciones de inversor/PCS y BESS.
* **Equipment Catalog (`src/data/equipmentCatalog.ts`)**: Dimensiones físicas reales, pesos, tensiones y certificaciones del fabricante.
* **Document Registry (`src/data/documentRegistry.ts`)**: Identificadores de documentos y niveles de confianza vinculados a las evidencias.
* **Default Constraints (`src/data/defaultConstraints.ts`)**: Parámetros de holgura por defecto.
* **Regulatory Evaluator (`src/rules/bessValidationEngine.ts` y `regulatoryProfileEvaluator.ts`)**: Salida de compatibilidad y severidad de las reglas de holguras físicas.
* **Electrical Topology Checks (`src/lib/electrical/topologyValidation.ts`)**: Inconsistencias de flujos y capacidades MT preliminares.
* **Exclusion Registry (`src/data/exclusionRegistry.ts`)**: Listado estático de exclusiones de ingeniería aplicables.

---

## 5. Visualización de Severidades en el Reporte

Las advertencias e incidencias deben reportarse bajo una jerarquía visual estricta que refleje la severidad efectiva y el techo aplicado:
* **PASS**: El chequeo geométrico o eléctrico se cumple sin observaciones.
* **INFO**: Información de contexto técnico y estimaciones energéticas referenciales. No representa un fallo ni un bloqueo.
* **CHECKLIST**: Tareas declarativas de revisión física u operacional que el usuario debe verificar de forma manual con especialistas.
* **WARNING**: Incumplimiento de supuestos preliminares o parámetros recomendados de espaciamiento. Indica un riesgo geométrico que no impide la exportación.
* **CAPPED WARNING**: Incidencias normativas severas cuya severidad efectiva ha sido rebajada (techo aplicado) debido al bajo nivel de confianza de la evidencia de entrada. Debe mostrarse el identificador de la regla y la causa del techo.
* **BLOCKING**: Reservado exclusivamente para colisiones geométricas físicas comprobadas entre equipos colocados sobre datos certificados o superposición de equipos fuera del polígono límite de terreno.
* **EXCLUDED**: Elementos explícitamente declarados fuera de los límites de cálculo de la herramienta.

---

## 6. Requisitos de Marcas de Agua y Disclaimers

Para asegurar la defensibilidad de la salida técnica frente a su uso indebido, el PDF generado por la herramienta incorpora de forma obligatoria las siguientes marcas y advertencias visuales:
* **Marca de Agua en el Fondo**: En cada página del reporte figura una marca de agua diagonal con la leyenda `"PRELIMINARY / BORRADOR CONCEPTUAL"`.
* **Texto de Exención de Responsabilidad (Disclaimer)**: En la portada y en la sección de cierre figura el disclaimer legal obligatorio:
  * *"Este reporte es una evaluación preliminar de ingeniería. No reemplaza ingeniería de detalle, manuales de fabricante, coordinación de protecciones, estudios de cortocircuito, diseño de malla a tierra, ingeniería contra incendios, permisos ambientales, ingeniería civil, ni revisión final por SEC, CNE, CEN, SEA o cualquier autoridad competente."*

---

## 7. Frontera de Validaciones Eléctricas

El reporte técnico indica en la cabecera del bloque eléctrico que los resultados mostrados:
* **No son Simulaciones**: Se trata de chequeos aritméticos agregados basados en ratings nominales aportados por fichas técnicas del catálogo y no de flujos de potencia dinámicos de red.
* **Estimación Estática**: Valores de pérdidas y consumos auxiliares son estimaciones basadas en factores de carga típicos ideales y no reemplazan mediciones de curvas de carga reales de operación.

---

## 8. Preservación de Exclusiones en el Reporte

El bloque de exclusiones técnicas es inalterable en el flujo de reporte:
* **No Ocultamiento**: Las exclusiones no son configurables para ocultarse a petición del usuario. Su visualización en el reporte técnico definitivo en formato PDF es obligatoria en todos los perfiles de salida.
* **Trazabilidad de Riesgo**: Cada exclusión va acompañada de su justificación y la referencia al estudio específico que el usuario debe contratar posteriormente.
