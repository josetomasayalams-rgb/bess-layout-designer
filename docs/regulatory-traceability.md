# Trazabilidad Regulatoria - BESS Layout Designer

Este documento detalla la arquitectura de trazabilidad regulatoria de la aplicación. Describe cómo se estructuran y vinculan las reglas de diseño con evidencias documentales, perfiles normativos y niveles de confianza técnica, y cómo se evalúa de forma transparente y defensible la severidad efectiva mostrada en la interfaz y en los reportes exportables.

---

## 1. Propósito del Documento (Purpose)

El propósito de este documento es explicar de forma rigurosa la lógica de validación interna del software. No define nuevos criterios de ingeniería ni altera las bases normativas existentes, sino que explicita las relaciones lógicas entre las fuentes de datos, los perfiles de diseño y el motor de evaluación implementado en el código fuente.

---

## 2. Alcance Regulatorio de la Aplicación (Regulatory Boundary)

El BESS Layout Designer es un software orientado exclusivamente al predimensionamiento preliminar y al screening conceptual.
* **No Certificante:** La aplicación no garantiza conformidad legal ni sustituye el proceso de revisión por parte de firmas de ingeniería autorizadas, aseguradoras, auditores independientes ni la Superintendencia de Electricidad y Combustibles (SEC) de Chile.
* **No Sustituto de Estudios Especializados:** Queda fuera del alcance cualquier simulación de red eléctrica (Load Flow, cortocircuito, selectividad y coordinación de protecciones, sobretensiones transitorias EMT/RMS o calidad de energía), así como estudios civiles, mecánicos, de puesta a tierra o planes de seguridad contra incendios (HSE) definitivos.

---

## 3. Fuentes Principales del Sistema Regulatorio

La arquitectura de validación descansa sobre los siguientes módulos en el código fuente:
1.  **`src/rules/regulatoryRulesCatalog.ts`**: Registro estático que define el catálogo general de reglas normativas, asociando a cada una su ID, categoría, perfiles aplicables, severidad nominal e inyecciones de evidencia requeridas.
2.  **`src/rules/profiles/regulatoryRuleProfiles.ts`**: Agrupa y asigna las reglas de cumplimiento correspondientes a cada perfil activo.
3.  **`src/rules/regulatoryProfileEvaluator.ts`**: Motor Javascript puro que contrasta el estado del diseño con el perfil de reglas activas y ejecuta las llamadas a los verificadores de geometría y topología eléctrica.
4.  **`src/rules/severityCeiling.ts`**: Encapsula las reglas de decisión de la "capa técnica intermedia", limitando la severidad efectiva de una alerta basándose en la robustez documental de la evidencia inyectada.
5.  **`src/rules/regulatoryProfileMetadata.ts`**: Centraliza los metadatos de los perfiles (Utility, PMGD, Custom) y ensambla la estructura de dimensiones geométricas consumida por el motor usando los valores de `defaultConstraints.ts`.
6.  **`src/data/documentRegistry.ts`**: Índice centralizado de documentos normativos y comerciales válidos para el screening, clasificando cada archivo por nivel de evidencia (L1 a L7).
7.  **`src/data/defaultConstraints.ts`**: Única fuente de verdad de valores numéricos de separación física y holguras espaciales.
8.  **`src/data/exclusionRegistry.ts`**: Índice estático de disciplinas técnicas de ingeniería excluidas del motor de cálculo.

---

## 4. Diferencia entre Normativa Obligatoria en Chile y Referencias Internacionales

Para garantizar la honestidad técnica y la defensibilidad de la herramienta, se aplica una distinción explícita en la clasificación de las reglas y evidencias:

### A. Normativa Chilena Obligatoria (Binding)
*   **Reglamento SEC RGR 06/2024 / RPTD:** Criterios obligatorios de diseño y separación física para sistemas de almacenamiento de energía en Chile.
*   **Pliegos Técnicos RIC (Consumo):** Pliegos RIC N° 01 a RIC N° 19 de la Superintendencia de Electricidad y Combustibles (SEC).
*   **Normativa del Coordinador Eléctrico Nacional (CEN):** Criterios de conexión e interconexión al Sistema Eléctrico Nacional.
*   *Tratamiento:* El incumplimiento de estas normas con datos de entrada certificados genera alertas críticas de tipo `warning` o `blocking` si hay infracción geométrica comprobada.

### B. Bibliografía y Guías Internacionales (Non-Binding / Reference)
*   **Estándares NFPA 855 / IFC 2024:** Guías internacionales de protección contra incendios en BESS.
*   **Estándares UL 9540 / UL 9540A:** Pruebas y certificaciones del fabricante para propagación térmica de celdas.
*   **Estándares IEEE 2800 / IEC 62933:** Requisitos técnicos de interconexión y desempeño de sistemas BESS.
*   *Tratamiento:* Estas normas **no son obligatorias** en Chile, a menos que un pliego técnico SEC las cite expresamente. En el motor de validación se catalogan únicamente como **referencias técnicas complementarias**. Su incumplimiento genera a lo sumo alertas tipo `warning` y se reducen automáticamente por la lógica del `severityCeiling` en ausencia de datasheets certificados del fabricante.

---

## 5. Lógica del Techo de Severidad (Severity Capping)

El módulo [severityCeiling.ts](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/src/rules/severityCeiling.ts) implementa un filtro de seguridad técnica para evitar falsos positivos de bloqueo crítico (`blocking`) cuando no existen evidencias concluyentes:

### Lógica de Operación:
Para cualquier regla del catálogo, el método `effectiveSeverity(rule)` evalúa:
1.  **Nivel de Documentación (Document Level - L1 a L7):**
    *   `L1` (Manual del fabricante del modelo exacto) permite `blocking`.
    *   `L2` (Misma familia del fabricante), `L3` (Norma técnica oficial), `L4` (Reporte público) e `L6` (Supuesto genérico) permiten un máximo de `warning`.
    *   `L5` (Folleto comercial) permite un máximo de `info`.
    *   `L7` (Pendiente de verificación / ingresado por usuario) permite un máximo de `checklist`.
2.  **Confianza de la Referencia (Confidence):**
    *   `documented` y `derived` no aplican restricciones.
    *   `inferred` y `assumption` limitan a `warning`.
    *   `missing` (sin evidencia) limita a `checklist`.
3.  **Severidad Efectiva:** Es el valor mínimo (menos severo) entre la severidad declarada de la regla, el techo por nivel de documento y el techo por confianza. Si la severidad efectiva se relaja respecto a la declarada originalmente, se inyecta el objeto `cappedBy` con el detalle de la restricción aplicada para conocimiento en UI y reporte.

---

## 6. El Rol de las Exclusiones en la Defensibilidad del Reporte

El archivo [exclusionRegistry.ts](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/src/data/exclusionRegistry.ts) contiene las disciplinas complejas no ejecutadas por la app. Su inclusión automática e inalterable en el reporte técnico PDF (página de exclusiones) cumple tres funciones de defensibilidad:
1.  **Deslinde de Responsabilidad Civil/Eléctrica:** Excluye explícitamente simulaciones dinámicas (flujos de carga, cortocircuitos, arco eléctrico, coordinación de protecciones) que requieren firmas certificadas.
2.  **Advertencia de Hitos Posteriores:** Indica al cliente o revisor que el predimensionamiento es solo un screening espacial y que debe contratar estudios formales posteriores.
3.  **Prevención de Firma Constructiva:** Alistar explícitamente estas disciplinas evita que el PDF sea interpretado como plano IFC definitivo o apto para construcción.
