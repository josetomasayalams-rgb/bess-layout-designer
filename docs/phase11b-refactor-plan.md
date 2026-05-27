# Plan de Refactorización - Fase 11B: Descomposición de Paneles Monolíticos

## 1. Propósito

El propósito de la **Fase 11B** es descomponer los dos paneles de interfaz más extensos y sensibles de la barra lateral:
1. `RegulatoryCompliancePanel` (~850 LOC)
2. `PreliminaryDesignToolsPanel` (~759 LOC)

Esta refactorización busca reducir la complejidad visual, mejorar la mantenibilidad y modularidad del código de la interfaz de usuario, **sin modificar en absoluto**:
* El comportamiento visual externo visto por el usuario.
* La lógica técnica del negocio, reglas de validación o motores de cálculo.
* Los stores de estado global de Zustand.
* El reporte técnico generado y sus exclusiones o advertencias asociadas.

---

## 2. Estado Previo

* **`RegulatoryCompliancePanel.tsx`**: Monolito de ~850 LOC que mezcla visualización de KPIs agregados, la lógica de formateo y traducción local de hallazgos geométricos (`localizedIssue`), la sección de validaciones preliminares de Fase 8/9, y el listado de reglas candidatas con evidencias y severidades limitadas de Fase 10.
* **`PreliminaryDesignToolsPanel.tsx`**: Monolito de ~759 LOC que unifica la biblioteca y dimensionamiento preliminar por contenedores, el selector de formas de grilla, el previsualizador de cuadrículas, la interfaz de trazado de zonas de reparación en el mapa y el motor de ajuste inteligente al terreno.
* **Fase 11A (Cerrada y Aprobada)**: Dejó consolidado el shell del aplicativo con navegación basada en el `SectionRail` vertical (Site, Equipment, Layout, Compliance, Report), la barra superior permanente de KPIs (`KPIBar`), el indicador de paso (`FlowStepper`) y el organizador dinámico de paneles (`SectionPanelHost`).
* **Fase 13 Parcial docs/demo (Cerrada y Aprobada)**: Documentó el flujo de demostración de 3 minutos ([demo-script.md](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/docs/demo-script.md)), la guía del flujo del usuario ([user-flow.md](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/docs/user-flow.md)) y las decisiones arquitectónicas principales de la interfaz ([ux-shell-phase11.md](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/docs/ux-shell-phase11.md)).

---

## 3. Restricciones Duras

Queda estrictamente prohibido modificar, alterar o rediseñar durante esta fase cualquiera de los siguientes elementos del dominio de ingeniería o infraestructura técnica:
* **Motores y Reglas**: Todo el contenido de `src/rules/` (ej. `bessValidationEngine.ts`, `regulatoryProfileEvaluator.ts`, `regulatoryRulesCatalog.ts`).
* **Librerías de Cálculo e Ingeniería**: Directorios `src/lib/electrical/` (ej. `topologyValidation.ts`) y `src/lib/layout/` (ej. `preliminaryLayoutGenerator.ts`, `fitLayoutToTerrain.ts`).
* **Estados y Stores de Zustand**: `src/store/projectStore.ts` y `src/store/regulatoryStore.ts`.
* **Reporte y Salida PDF**: La función `buildReportData` y los componentes de previsualización o PDF (`ReportDocument`, `ReportPreview`).
* **Visor del Mapa**: El componente `BessMap.tsx` y su lógica de renderizado geográfico.
* **Constantes e Invariantes**: `defaultConstraints.ts`, `severityCeiling.ts` y los catálogos estáticos de equipos.
* **Flujos Cerrados**: Lógica eléctrica de Fase 8/9, las exclusiones técnicas explícitas y los warnings globales.

---

## 4. Split Propuesto para `RegulatoryCompliancePanel`

Los nuevos módulos se organizarán dentro del directorio `src/components/sidebar/compliance/`:

### Módulos a Crear

#### A. `ComplianceSummary`
* **Responsabilidad**: Renderizar la barra de resumen de estado, los cuatro tiles de contadores rápidos (Reglas, Críticos, Avisos, Cumple) y el botón de exportación de reporte de auditoría JSON.
* **Props aproximadas**:
  ```typescript
  interface ComplianceSummaryProps {
    result: ReturnType<typeof validateBessLayout>;
    profileName: string;
    profileNotes: string;
    isEs: boolean;
  }
  ```
* **Qué NO debe calcular**: No interactúa directamente con Zustand ni realiza validación física. Recibe el resultado ya computado.
* **Test mínimo**: Renderizar con datos ficticios y comprobar que se visualizan los 4 contadores con los valores pasados por props.

#### B. `ComplianceIssuesList`
* **Responsabilidad**: Iterar la lista de hallazgos activos de la validación física (`issues`) y renderizarlos aplicando los estilos correspondientes a su severidad.
* **Props aproximadas**:
  ```typescript
  interface ComplianceIssuesListProps {
    issues: ValidationIssue[];
    isEs: boolean;
    locale: string;
  }
  ```
* **Qué NO debe calcular**: No computa clearances. Utiliza las funciones puras delegadas en `helpers.ts` para obtener los textos de diagnóstico traducidos.
* **Test mínimo**: Renderizar una colisión de equipos simulada y validar que el mensaje localizado en español sea renderizado.

#### C. `PreliminaryElectricalSection`
* **Responsabilidad**: Presentar los 8 checks eléctricos preliminares de Fase 8/9 clasificados con su severidad efectiva e indicar la necesidad de cargar arquitectura si está vacía.
* **Props aproximadas**:
  ```typescript
  interface PreliminaryElectricalSectionProps {
    entries: EvaluatedRuleEntry[];
    isEs: boolean;
    architecturePopulated: boolean;
  }
  ```
* **Qué NO debe calcular**: No ejecuta `validateElectricalTopology`. Recibe la lista pre-filtrada y el boolean de estado de carga.
* **Test mínimo**: Validar que se muestre el aviso de advertencia amarillo indicando cargar el preset si `architecturePopulated` es false.

#### D. `CandidateRuleMatrix`
* **Responsabilidad**: Renderizar la interfaz de matriz de normas de Fase 10 (Counts de resultados, dropdown selector de perfil de reglas, loader de preset y lista de reglas candidatas agrupadas por categoría).
* **Props aproximadas**:
  ```typescript
  interface CandidateRuleMatrixProps {
    ruleEvaluation: ReturnType<typeof runRegulatoryEvaluation>;
    activeRuleProfileId: string;
    setActiveRuleProfileId: (id: string) => void;
    isEs: boolean;
    hasArchitecture: boolean;
  }
  ```
* **Qué NO debe calcular**: No ejecuta `runRegulatoryEvaluation` ni muta stores autónomamente.
* **Test mínimo**: Cambiar la selección en el dropdown de perfiles debe invocar el callback `setActiveRuleProfileId`.

#### E. Auxiliares
* **`compliance/helpers.ts`**: Aloja las funciones puras `localizedIssue`, `citeLabel` y `exportRegulatoryReport` para descargarlas del archivo JSX primario.
* **`compliance/index.ts`**: Archivo de barril para exportar de manera limpia los subcomponentes del directorio.

---

## 5. Split Propuesto para `PreliminaryDesignToolsPanel`

Los nuevos módulos se organizarán dentro del directorio `src/components/sidebar/design-tools/`:

### Módulos a Crear

#### A. `SizingContainerSection`
* **Responsabilidad**: Agrupar los controles interactivos de dimensionamiento preliminar (BESS, PCS, selector numérico de contenedores, y celdas de ratios resultantes).
* **Props aproximadas**:
  ```typescript
  interface SizingContainerSectionProps {
    batteryContainerSpecId: string;
    setBatteryContainerSpecId: (id: string) => void;
    pcsSpecId: string;
    setPcsSpecId: (id: string) => void;
    batteryContainerCount: number;
    setBatteryContainerCount: (count: number) => void;
    containersPerPcs: number;
    setContainersPerPcs: (ratio: number) => void;
    pcsCount: number;
    blockCount: number;
    isEs: boolean;
    locale: string;
  }
  ```
* **Qué NO debe calcular**: No interactúa directamente con el catálogo global; recibe las listas pre-filtradas o configuraciones estáticas desde el panel padre.
* **Test mínimo**: Modificar el conteo numérico de BESS invoca la función de callback de actualización.

#### B. `GridShapePicker`
* **Responsabilidad**: Mostrar las alternativas de formas de grilla calculadas (ej: 6x5) y permitir que el usuario seleccione columnas personalizadas o visualice el diagrama de celdas.
* **Props aproximadas**:
  ```typescript
  interface GridShapePickerProps {
    blockCount: number;
    effectiveColumns: number;
    setSelectedColumns: (cols: number) => void;
    effectiveRows: number;
    emptyCells: number;
    shapeOptions: Array<{ columns: number; rows: number; shape: string }>;
    isEs: boolean;
    locale: string;
  }
  ```
* **Tipo**: Componente de presentación de cuadrícula e inputs de filas/columnas.
* **Test mínimo**: Hacer clic en un botón de forma de grilla (`6x5`) dispara el callback `setSelectedColumns` con el número `6`.

#### C. `GridPreview`
* **Responsabilidad**: Dibujar celdas proporcionales del bloque PCS-BESS en formato CSS Grid o mostrar el rectángulo proporcional si el parque es masivo.
* **Props aproximadas**:
  ```typescript
  interface GridPreviewProps {
    columns: number;
    rows: number;
    filled: number;
  }
  ```
* **Tipo**: Componente presentacional puro.
* **Test mínimo**: Retornar null si las dimensiones son menores a 1.

#### D. `LayoutRepairSection`
* **Responsabilidad**: Alojar los controles del mapa para dibujar zonas de reparación y los gatilladores de alineación geométrica inteligente al terreno (smart preview, apply, revert).
* **Props aproximadas**:
  ```typescript
  interface LayoutRepairSectionProps {
    placedCount: number;
    polygonLength: number;
    repairRules: { bessToBess_m: number; bessToPropertyLine_m: number; electricalFrontWorkingClearance_m: number };
    isEs: boolean;
    locale: string;
  }
  ```
* **Qué NO debe cambiar**: No recalcula coordenadas. Delega todas las interacciones de trazado y de física a los métodos del store pasados por callback.
* **Test mínimo**: Validar que el botón principal de reparación esté deshabilitado si `placedCount` es 0.

#### E. Auxiliares
* **`design-tools/index.ts`**: Archivo de barril para exportar todos los subcomponentes del directorio.

---

## 6. Orden de Implementación

El refactor se completará de manera estrictamente secuencial e incremental, usando commits atómicos y scope guards dedicados:

1. **Subfase 11B.1**: Extraer subcomponentes de visualización y presentación de `RegulatoryCompliancePanel` (`ComplianceSummary`, `ComplianceIssuesList`, `PreliminaryElectricalSection`) y su archivo de utilidades `compliance/helpers.ts`. El componente principal continuará cargando y orquestando el estado.
2. **Scope Guard 11B.1**: Verificar que no existan regresiones de visualización y que los tests continúen en verde.
3. **Subfase 11B.2**: Extraer `CandidateRuleMatrix` y `PresetLoader` a la carpeta `compliance/`. Reducir el componente `RegulatoryCompliancePanel.tsx` a un componente de ruteo de Zustand limpio.
4. **Scope Guard 11B.2**: El panel de cumplimiento debe quedar 100% modularizado.
5. **Subfase 11B.3**: Extraer `GridPreview`, `GridShapePicker` y `SizingContainerSection` a la carpeta `design-tools/` de forma no destructiva.
6. **Scope Guard 11B.3**: Los controles de sizing y grilla deben quedar modularizados.
7. **Subfase 11B.4**: Extraer `LayoutRepairSection` y el panel colapsable de reparación completa. Limpiar `PreliminaryDesignToolsPanel.tsx`.
8. **Scope Guard Final**: Validación completa del aplicativo modularizado.

---

## 7. Criterios de Aceptación por Subfase

Cada iteración de la refactorización exige:
* **Compilación Limpia**: Ejecución exitosa de `npm run typecheck` (tsc).
* **Tests Unitarios**: Aprobación de la suite completa con `npm run test` (vitest).
* **Linter**: Cero errores devueltos por `npm run lint`.
* **Build de Producción**: Compilación exitosa del bundle con `npm run build` sin errores de framework.
* **Integración Visual**: Idéntica apariencia visual en las vistas Sitio, Equipos, Layout y Cumplimiento.
* **Limpieza de Git**: El working tree debe estar limpio antes de transicionar a la siguiente subfase.

---

## 8. Plan de Tests

Se escribirán tests unitarios específicos con Mocking del store de Zustand donde sea necesario:
* **ComplianceSummary**: Verificar la respuesta del botón de exportación simulando `URL.createObjectURL` y la presencia de la cantidad de reglas analizadas.
* **ComplianceIssuesList**: Probar que las alertas de severidad `critical` y `warning` se renderizan con los estilos correspondientes.
* **PreliminaryElectricalSection**: Comprobar que los checks eléctricos muestran la severidad limitada (`severityCappedBy`) y se ordenan de manera predecible por ID de regla.
* **SizingContainerSection**: Simular cambios en los inputs numéricos y validar que se invocan los callbacks pasados por props.
* **LayoutRepairSection**: Confirmar que al cambiar el modo de interacción a "draw-repair-zone", se renderizan las opciones de "Terminar zona" y "Cancelar".

---

## 9. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| **Romper reactividad eléctrica** | Asegurar que todas las variables auxiliares del store (`auxiliaryServices`, `operationalLimits`, `ppc`) se lee en el panel padre y se inyecten de forma limpia en el componente hijo. |
| **Duplicar estados locales** | Mantener el estado único en el panel padre. Los hijos no deben declarar variables duplicadas para sincronizar sizing. |
| **Pérdida de visualización de warnings** | Asegurar que las exclusiones del reporte preliminar sigan leyéndose y no queden ocultas en subcomponentes. |
| **Complejizar SectionPanelHost** | El contenedor principal `SectionPanelHost` debe seguir sirviendo de puente plano; no debe contener lógica nueva de renderizado de hijos. |

---

## 10. Regla de Implementación

* **Extraer sin reescribir**: El código a modularizar debe ser extraído tal cual está implementado actualmente, respetando lógica y clases de Tailwind o CSS vanilla.
* **Mantener el estado arriba**: El panel contenedor original mantiene la suscripción a los stores de Zustand y coordina las llamadas de mutación mediante callbacks pasados a los componentes hijos.
* **Uso de Commits Pequeños**: Un commit por subfase. Cada subfase debe ser completamente revertible en caso de fallo.

---

## 11. Primera Subfase Recomendada

* **Subfase 11B.1**: Extraer `ComplianceSummary`, `ComplianceIssuesList` y `PreliminaryElectricalSection` a componentes en la carpeta `src/components/sidebar/compliance/`, manteniendo provisionalmente `CandidateRuleMatrix` y `PresetLoader` dentro del archivo principal `RegulatoryCompliancePanel.tsx`. Esto mitiga el riesgo al aislar las vistas presentacionales antes de tocar la matriz de reglas complejas.
