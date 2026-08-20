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

El reporte PDF se compone con `@react-pdf/renderer` a partir de módulos planos bajo `src/components/report/` (no existe un subdirectorio `document/`; esa referencia previa quedó obsoleta). El ensamblador raíz es `ReportDocument.tsx`.

```
[src/components/report/]
├── ReportDocument.tsx                  <-- Ensamblador raíz; define la IA y agrupa secciones
├── reportTheme.ts                      <-- Tokens neutrales (color, tipografía, escala, clasificación, estado)
├── reportStyles.ts                     <-- StyleSheet react-pdf derivado de reportTheme
├── registerReportFonts.ts              <-- Registra la fuente de marca Inter (WOFF self-hosted)
├── reportProvenance.ts                 <-- Clasificación de procedencia + centinela "No disponible"
├── Brandmark.tsx                       <-- Isotipo (disco + triángulo) como <Svg> recoloreable
├── pdfChrome.tsx                       <-- Portada y encabezado/pie fijos
├── pdfPrimitives.tsx                   <-- SectionPage (con modo embedded), Table, DefGrid, AlertCard
├── pdfProjectSections.tsx              <-- Resumen ejecutivo, sitio, parámetros, layout
├── pdfElectricalRegulatorySections.tsx <-- Arquitectura eléctrica + SLD, validaciones eléctricas, normativa
└── pdfTraceabilityScopeSections.tsx    <-- Alertas/pendientes, alcance/exclusiones, anexos
```

### Arquitectura de Información: portada + 5 secciones de cuerpo + 2 anexos
Secciones afines se agrupan en páginas combinadas vía `SectionPage embedded` (su contenido es idéntico; se renderizan como sub-bloques):

1.  **Resumen ejecutivo:** frase de resultado, nivel de madurez, KPIs (Potencia POI, energía comercial, duración, área), top-3 alertas y próximos pasos.
2.  **Sitio y layout** *(Sitio + Layout)*: coordenadas (decimal/DMS/UTM), área y ocupación, captura/diagrama del sitio e inventario de equipos.
3.  **Configuración BESS y arquitectura eléctrica** *(Parámetros + Eléctrica)*: targets y arquitectura derivada, SLD conceptual, POI/transformador (sólo cuando hay dato; nunca inventado).
4.  **Hallazgos y validación normativa** *(Normativa + Alertas)*: veredicto regulatorio, alertas de consistencia, supuestos, inconsistencias y pendientes de validación.
5.  **Alcance, exclusiones y próximos estudios:** marco IN/NO-IN, exclusiones de ingeniería (inalterables) y el disclaimer legal.
- **A1 — Anexo: tabla completa de reglas.**
- **A2 — Anexo técnico:** validaciones eléctricas preliminares (ex-§5b) + checklist de ingeniería + referencias documentales.

### Identidad visual y vista previa
- **Tipografía Inter** registrada vía `Font.register` (WOFF self-hosted en `public/fonts/`); acento `sky-600 #0284c7`; colores de clasificación heredados de los tokens de la app (`certified`/`preliminary`/`pending`), ajustados para papel. El reporte es **claro (papel)** por defensibilidad de impresión.
- **Carácter preliminar declarado en texto legible**, no como marca de agua de fondo: la portada lleva el rótulo superior "PREDIMENSIONAMIENTO PRELIMINAR BESS · REPORTE TÉCNICO" y bandas de alcance ("Predimensionamiento preliminar", "No apto para construcción", "No reemplaza ingeniería de detalle"); el pie de cada página repite "Reporte preliminar" junto a versión, esquema y fecha. Se retiró la marca de agua diagonal de fondo porque se solapaba con el contenido y degradaba la legibilidad.
- **Vista previa WYSIWYG:** `ReportPreview.tsx` renderiza el MISMO `ReportDocument` dentro de `<PDFViewer>` de react-pdf; no hay una segunda implementación HTML que pueda divergir del PDF exportado.
- Procedencia/“No disponible”: `reportProvenance.ts` traduce `EvidenceConfidence`/`reportKpis.source` a una clasificación visible y un centinela único de dato no disponible.

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

## 6. Requisitos de Disclaimers y Rotulación de Carácter Preliminar

Para asegurar la defensibilidad de la salida técnica frente a su uso indebido, el PDF generado por la herramienta incorpora de forma obligatoria las siguientes advertencias visuales:
* **Rotulación del carácter preliminar (texto legible)**: el carácter preliminar se declara mediante texto legible en lugar de una marca de agua de fondo. La portada lleva el rótulo superior `"PREDIMENSIONAMIENTO PRELIMINAR BESS · REPORTE TÉCNICO"` y bandas de alcance (`"Predimensionamiento preliminar"`, `"No apto para construcción"`, `"No reemplaza ingeniería de detalle"`); el pie fijo de cada página repite `"Reporte preliminar"` junto a versión, esquema y fecha de generación. Se eliminó la marca de agua diagonal de fondo porque se superponía al contenido y degradaba la legibilidad del documento.
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
