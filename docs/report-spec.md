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

## 3. Secciones del Reporte (Report Sections)

El reporte técnico emitido debe estructurarse obligatoriamente en las siguientes secciones secuenciales:
1. **Portada**: Nombre del proyecto, fecha de generación, versión de la herramienta y advertencia legal (disclaimer) destacada.
2. **Resumen Ejecutivo**: Potencia nominal instalada (MW AC/DC), capacidad de energía (MWh), tecnología de almacenamiento y eficiencia global estimada.
3. **Sitio y Terreno**: Datos geométricos del polígono de implantación, área total ocupada, número de vértices y referencia del ancla de coordenadas local.
4. **Configuración BESS/PCS**: Desglose de modelos de baterías e inversores seleccionados del catálogo, cantidad de contenedores y ratios de integración (SSAA estimado).
5. **Layout Físico Conceptual**: Coordenadas espaciales estimadas del centro del parque BESS y dimensiones aproximadas del área de implantación.
6. **Arquitectura Eléctrica Preliminar**: Esquema unilineal simplificado, potencia agregada de transformadores de poder y tensión nominal de barra MT.
7. **Validaciones Regulatorias y Matrices**: Resumen de consistencia geométrica, reglas normativas aplicadas basadas en perfiles y referencias a códigos chilenos/internacionales.
8. **Validaciones Eléctricas Preliminares**: Resultados de chequeos de capacidad de barra MT, estimaciones de pérdidas estáticas y rampas declaradas.
9. **Advertencias Activas**: Listado jerárquico de fallos geométricos o inconsistencias de capacidad con su nivel de severidad efectiva.
10. **Exclusiones Explícitas**: Declaración de estudios no ejecutados por la herramienta.
11. **Trazabilidad Documental**: Tabla con los niveles de evidencia (certified, preliminary, reference) que respaldan las variables utilizadas.
12. **Supuestos Editables**: Inventario de constantes físicas modificadas por el usuario respecto a los valores predeterminados.
13. **Recomendaciones de Estudios Posteriores**: Checklist automático que sugiere los estudios definitivos a contratar (e.g. cortocircuito, flujo de carga).

---

## 4. Fuentes de Datos (Data Sources)

La recopilación de datos para ensamblar el reporte proviene estrictamente de los siguientes módulos del sistema:
* **Project Store (`useProjectStore`)**: Polígono del sitio, coordenadas de equipos colocados (`PlacedEquipment`), especificaciones del inversor/PCS y BESS.
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

Para asegurar la defensibilidad de la salida técnica frente a su uso indebido, el PDF generado por la herramienta debe incorporar de forma obligatoria las siguientes marcas y advertencias visuales:
* **Marca de Agua en el Fondo**: En cada página del reporte debe figurar una marca de agua diagonal con la leyenda `"PRELIMINARY / BORRADOR CONCEPTUAL"`.
* **Texto de Exención de Responsabilidad (Disclaimer)**: En el pie de página de la portada y en la sección de cierre debe mostrarse el siguiente texto literal:
  * *"Este reporte es una evaluación preliminar de ingeniería. No reemplaza ingeniería de detalle, manuales de fabricante, coordinación de protecciones, estudios de cortocircuito, diseño de malla a tierra, ingeniería contra incendios, permisos ambientales, ingeniería civil, ni revisión final por SEC, CNE, CEN, SEA o cualquier autoridad competente."*

---

## 7. Frontera de Validaciones Eléctricas

El reporte técnico debe indicar de forma expresa en la cabecera del bloque eléctrico que los resultados mostrados:
* **No son Simulaciones**: Se trata de chequeos aritméticos agregados basados en ratings nominales aportados por fichas técnicas del catálogo y no de flujos de potencia dinámicos de red.
* **Estimación Estática**: Valores de pérdidas y consumos auxiliares son estimaciones basadas en factores de carga típicos ideales y no reemplazan mediciones de curvas de carga reales de operación.

---

## 8. Preservación de Exclusiones en el Reporte

El bloque de exclusiones técnicas (Fase 8/9) es inalterable en el flujo de reporte:
* **No Ocultamiento**: Las exclusiones no deben ser configurables para ocultarse a petición del usuario. Su visualización en el reporte técnico definitivo en formato PDF es obligatoria en todos los perfiles de salida.
* **Trazabilidad de Riesgo**: Cada exclusión debe ir acompañada de su justificación y la referencia al estudio específico que el usuario debe contratar posteriormente.

---

## 9. Trazabilidad de Evidencias en el Reporte

El reporte debe incluir una sección detallada de trazabilidad documental que asocie cada variable crítica con su fuente documental de procedencia, estructurándose bajo los siguientes campos:
1. **Variable**: Nombre del parámetro físico o eléctrico (e.g. `busbarCurrentA`, `bessToBess_m`).
2. **Valor Evaluado**: El valor numérico o lógico utilizado en el cálculo.
3. **Fuente Documental**: Identificador del documento de origen en el registro (e.g. `DOC-0009`).
4. **Nivel de Confianza**: Nivel documental (Certified, Preliminary, Reference).
5. **Observaciones**: Notas del fabricante o limitaciones de la lectura del documento.

---

## 10. Mejoras Futuras del Reporte (Future Report Improvements)

Para iteraciones posteriores del sistema de reportes se proponen las siguientes mejoras técnicas de trazabilidad y robustez documental:
* **Tabla de Evidencias Completa**: Integración de referencias cruzadas entre normativas chilenas e internacionales para contrastar severidades.
* **Anexos de Documentación**: Inclusión automática en el PDF de enlaces locales a las fichas técnicas auditadas del catálogo de equipos.
* **Exportación en JSON de Auditoría**: Generación paralela de un archivo estructurado en JSON conteniendo la firma del layout y el log de evaluación para auditorías automatizadas del proyecto.
* **Captura de Canvas de BessMap**: Inserción dinámica de la imagen vectorizada del layout físico BESS directo en la sección espacial del PDF.
* **Trazabilidad de Versión de Reportes**: Registro automático en base de datos de los reportes emitidos para el control de versiones A/B y auditoría de cambios en el tiempo.
