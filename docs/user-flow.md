# User flow - BESS Layout Designer

## Alcance

Esta guia describe el flujo actual de la app despues de Fase 11A. La app es una herramienta de predimensionamiento preliminar BESS utility-scale. No es una herramienta de ingenieria de detalle, no certifica cumplimiento y no reemplaza revision de fabricante, AHJ, estudios electricos, civiles, ambientales, de seguridad o conexion.

## Flujo recomendado

```text
Sitio -> Equipos -> Layout -> Cumplimiento -> Reporte
```

La navegacion no queda bloqueada por datos incompletos, warnings o exclusiones. La app mantiene esos estados visibles para conservar trazabilidad.

## Mapa de secciones

| Seccion | Que hace | Datos que espera | Salida visible |
|---|---|---|---|
| Sitio | Define terreno, poligono, area, coordenadas y presets. | Poligono, vertices, anchor local, preset/caso si aplica. | Estado de terreno, area, coordenadas locales, panel parametrico. |
| Equipos | Selecciona modelos BESS/PCS y sizing preliminar. | Modelo, supuestos de potencia/energia, catalogos disponibles. | Biblioteca de modelos, sizing preliminar, catalogo. |
| Layout | Genera o revisa disposicion fisica y arquitectura MT preliminar. | Sitio definido, equipos, parametros de layout. | Herramientas de layout, arquitectura MT, comparacion. |
| Cumplimiento | Revisa perfil, warnings, hallazgos, exclusiones y checks preliminares. | Layout evaluable, perfil regulatorio, datos tecnicos disponibles. | Configuracion regulatoria, warnings, cumplimiento, spacing informativo, checklist. |
| Reporte | Empaqueta resumen y reporte tecnico preliminar. | Datos de sitio, equipos, layout, cumplimiento y exclusiones. | Preview/descarga de reporte y resumen del parque. |

## Sitio

Objetivo:

- Crear o cargar la base geografica del proyecto.
- Entender si existe terreno suficiente para evaluar area y layout.

Estados vacios esperados:

- Sin poligono: la app informa que se debe dibujar o cargar un poligono.
- Sin anchor: algunas referencias locales pueden aparecer como no disponibles.

Notas:

- El mapa y el poligono son contexto preliminar.
- No reemplazan topografia, catastro, dominio predial ni revision ambiental.

## Equipos

Objetivo:

- Seleccionar modelos y supuestos preliminares de dimensionamiento.
- Revisar catalogos y librerias disponibles.

Estados vacios esperados:

- Sin equipos colocados: la app permite revisar modelos y sizing, pero no asume que ya existe layout.
- Datos faltantes: se deben mostrar placeholders o estados pendientes, no resultados inventados.

Notas:

- Los datos deben leerse segun su clasificacion: `certified_data`, `preliminary_assumption` o `pending_validation`.
- Un supuesto preliminar no debe presentarse como regla certificada.

## Layout

Objetivo:

- Generar o revisar la disposicion fisica conceptual.
- Revisar arquitectura MT preliminar y alternativas.

Estados vacios esperados:

- Sin equipos colocados: la app informa que el layout esta pendiente.
- Sin poligono: el layout no puede interpretarse como evaluacion completa.

Notas:

- La seccion no cierra accesos, caminos, protecciones, constructibilidad ni detalle civil.
- `PreliminaryDesignToolsPanel` sigue completo; no fue partido en Fase 11A.

## Cumplimiento

Objetivo:

- Mantener visibles reglas activas, hallazgos, warnings y exclusiones.
- Separar validaciones preliminares de estudios de detalle.

Que revisar:

- Perfil regulatorio activo.
- `WarningsPanel`.
- `RegulatoryCompliancePanel`.
- Supuestos de spacing como vista informativa.
- Checklist avanzado como guia, no motor.

Estados vacios esperados:

- Sin layout evaluable: la app informa revision preliminar, pero no bloquea navegacion.

Como actuar ante warnings:

- No ocultarlos.
- Revisar el panel de cumplimiento.
- Decidir si corresponde ajustar sitio, equipos o layout.
- Documentar que el resultado sigue siendo preliminar.

Como actuar ante exclusiones:

- Mantenerlas visibles.
- No tratarlas como errores resueltos.
- Usarlas para explicar que falta estudio externo o detalle de ingenieria.

Notas:

- Las validaciones electricas de Fase 8/9 son preliminares.
- La app no ejecuta estudios de load-flow, cortocircuito, protecciones, armonicos, RMS/EMT, puesta a tierra, arc flash ni coordinacion de aislamiento.
- Los valores mostrados desde `defaultConstraints` son supuestos preliminares o referencias informativas, no normativa nueva.

## Reporte

Objetivo:

- Emitir una salida tecnica preliminar que conserve contexto, warnings y exclusiones.

Estados vacios esperados:

- Sin datos suficientes: la app puede permitir abrir la seccion, pero debe indicar que la salida tecnica requiere sitio y layout.

Notas:

- El reporte no reemplaza estudio de detalle ni aprobacion formal.
- Las exclusiones y limitaciones son parte de la calidad del reporte, no ruido a esconder.

## Criterios de no regresion para el flujo

- El rail mantiene las 5 secciones.
- Cambiar de seccion cambia el contenido visible sin romper el mapa.
- KPI bar permanece visible.
- FlowStepper permanece visible.
- Warnings permanecen accesibles en Cumplimiento.
- Exclusiones permanecen visibles en Cumplimiento y Reporte donde aplique.
- TechnicalReportPanel permanece accesible en Reporte.
- BessParkSummaryPanel permanece accesible en Reporte.
- La app no bloquea navegacion por warnings.
- La app no inventa datos para llenar KPIs o estados.
