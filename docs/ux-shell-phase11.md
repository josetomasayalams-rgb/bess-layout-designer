# UX shell Phase 11A

## Proposito

Fase 11A reorganizo la experiencia principal de la app sin cambiar dominio tecnico. El objetivo fue pasar de una interfaz de paneles acumulados a un shell navegable por 5 secciones, manteniendo mapa, warnings, exclusiones, validaciones preliminares y reporte existentes.

Fase 11A no fue un refactor de motores ni de reglas. Fue una reorganizacion visual controlada.

## Commits relacionados

| Commit | Resumen | Estado |
|---|---|---|
| `7a5c901` | `feat(ux): add phase 11 navigation shell` | Scope guard PASS |
| `1345b54` | `feat(ux): map shell panels to section rail` | Scope guard PASS |
| `eb639a6` | `feat(ux): clarify section shell copy and empty states` | Scope guard PASS |

## Componentes principales

### SectionRail

Componente de navegacion vertical con 5 IDs estables:

- `site`
- `equipment`
- `layout`
- `compliance`
- `report`

Responsabilidad:

- Mostrar la seccion activa.
- Permitir cambio de seccion.
- No ejecutar logica tecnica.
- No validar cumplimiento.

### SectionPanelHost

Contenedor que decide que grupo de paneles existentes se muestra para la seccion activa.

Responsabilidad:

- Mapear `activeSection` a paneles actuales.
- Mantener panel primario y secundario.
- Agregar copy y estados vacios no bloqueantes.
- Mantener warnings y exclusiones visibles.

No debe convertirse en:

- motor de reglas,
- repositorio de constantes tecnicas,
- reemplazo de paneles de dominio,
- contenedor con logica de negocio creciente.

### KPIBar

Barra superior permanente con lectura profesional del estado del proyecto.

Responsabilidad:

- Mostrar KPIs con datos existentes.
- Usar placeholders seguros si faltan datos.
- Mantener visibles warnings, exclusiones y estado del reporte.

No debe:

- inventar datos,
- duplicar motores,
- esconder warnings,
- convertir exclusiones en estado resuelto.

### FlowStepper

Indicador visible del flujo. En Fase 11A quedo fuera de una sidebar escondida.

Responsabilidad:

- Orientar al usuario.
- No cambiar la logica de pasos.

## Mapeo seccion a paneles

| Seccion | Region primaria | Region secundaria |
|---|---|---|
| Sitio | `SiteTerrainPanel`, `ParametricTerrainPanel` | `CaseStudyPanel` |
| Equipos | `BessModelLibraryPanel`, `BessQuickSizingPanel` | `EquipmentCatalogPanel` |
| Layout | `PreliminaryDesignToolsPanel`, `MVArchitecturePanel` | `LayoutComparisonPanel` |
| Cumplimiento | `RegulatoryConfigPanel`, `WarningsPanel` | `RegulatoryCompliancePanel`, `SpacingRulesPanel`, `AdvancedChecksPanel` |
| Reporte | `TechnicalReportPanel` | `BessParkSummaryPanel` |

## Decisiones de alcance

### No partir monolitos todavia

Fase 11A no partio:

- `RegulatoryCompliancePanel`
- `PreliminaryDesignToolsPanel`
- `BessMap`
- `projectStore`

La prioridad fue estabilizar el shell antes de hacer refactors profundos.

### No tocar dominio tecnico

Fase 11A no debia tocar:

- reglas regulatorias,
- validaciones electricas,
- `severityCeiling`,
- `defaultConstraints`,
- `regulatoryRulesCatalog`,
- `validateElectricalTopology`,
- `buildReportData`,
- `ReportDocument`,
- stores,
- motores de layout o reporte.

### Mantener warnings y exclusiones visibles

Warnings y exclusiones son parte del producto. No son ruido visual.

El shell debe preservar:

- `WarningsPanel` en Cumplimiento,
- exclusiones en el flujo de cumplimiento/reporte,
- mensajes de alcance preliminar,
- visibilidad de limitaciones.

### Aclarar paneles sensibles

`SpacingRulesPanel`:

- es una vista informativa,
- muestra supuestos preliminares existentes desde `defaultConstraints`,
- no crea reglas nuevas,
- no evalua cumplimiento por si solo.

`AdvancedChecksPanel`:

- es checklist orientativo,
- no ejecuta estudios electricos, civiles ni de seguridad,
- no cambia severidades, reglas ni exclusiones.

## Riesgos pendientes

- `SectionPanelHost` puede crecer demasiado si se sigue agregando contenido ahi.
- `RegulatoryCompliancePanel` sigue monolitico.
- `PreliminaryDesignToolsPanel` sigue monolitico.
- Los nombres internos `SpacingRulesPanel` y `AdvancedChecksPanel` pueden confundirse si el copy se degrada.
- Fase 11B tendra mayor riesgo porque si implica refactor real.

## Criterios para Fase 11B

Antes de partir paneles:

- Mantener el mapeo de 5 secciones.
- Mantener `SectionRail` y `KPIBar` visibles.
- No cambiar reglas ni validaciones durante el split.
- No modificar `defaultConstraints`.
- No ocultar warnings ni exclusiones.
- Refactorizar un panel a la vez.
- Agregar tests de no regresion por cada panel partido.
- Preferir extraccion de subcomponentes sin cambiar comportamiento.

Orden recomendado:

1. Fase 11B architect: definir cortes y riesgos.
2. Fase 11B coder por panel, uno a la vez.
3. Scope guard despues de cada panel.

## Criterios de no regresion

- `npm run typecheck` pasa.
- `npm run test` pasa.
- `npm run build` pasa.
- `npm run lint` no tiene errores.
- Rail mantiene IDs `site`, `equipment`, `layout`, `compliance`, `report`.
- Cambiar seccion no rompe mapa ni toolbar.
- Todos los paneles existentes siguen accesibles.
- Warnings siguen visibles en Cumplimiento.
- `RegulatoryCompliancePanel` sigue completo hasta que Fase 11B lo parta explicitamente.
- `PreliminaryDesignToolsPanel` sigue completo hasta que Fase 11B lo parta explicitamente.
- Reporte sigue accesible.
- La app sigue presentandose como predimensionamiento preliminar, no ingenieria de detalle.
