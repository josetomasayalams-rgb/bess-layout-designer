# Trazabilidad Regulatoria - BESS Layout Designer

Este documento detalla la arquitectura de trazabilidad regulatoria de la aplicación. Describe cómo se estructuran y vinculan las reglas de diseño con evidencias documentales, perfiles normativos y niveles de confianza técnica, y cómo se evalúa de forma transparente y defensible la severidad efectiva mostrada en la interfaz y en los reportes exportables.

---

## 1. Propósito del Documento (Purpose)

El propósito de este documento es explicar de forma rigurosa la lógica de validación interna del software. No define nuevos criterios de ingeniería ni altera las bases normativas existentes, sino que explicita las relaciones lógicas entre las fuentes de datos, los perfiles de diseño y el motor de evaluación implementado en el código fuente.

---

## 2. Alcance Regulatorio de la Aplicación (Regulatory Boundary)

El BESS Layout Designer es un software orientado exclusivamente al predimensionamiento preliminar y al screening conceptual.
* **No Certificante**: La aplicación no garantiza conformidad legal ni sustituye el proceso de revisión por parte de firmas de ingeniería autorizadas, aseguradoras, auditores independientes ni la Superintendencia de Electricidad y Combustibles (SEC) de Chile.
* **No Sustituto de Estudios Especializados**: Queda fuera del alcance cualquier simulación de red eléctrica (Load Flow, cortocircuito, selectividad y coordinación de protecciones, sobretensiones transitorias EMT/RMS o calidad de energía), así como estudios civiles, mecánicos, de puesta a tierra o planes de seguridad contra incendios (HSE) definitivos.

---

## 3. Fuentes Principales del Sistema Regulatorio

La arquitectura de validación descansa sobre un conjunto acotado de módulos y constantes en el código fuente:
1. **`regulatoryRulesCatalog.ts`**: Registro estático que define el catálogo general de reglas normativas, asociando a cada una su ID, categoría, perfiles aplicables, severidad nominal e inyecciones de evidencia requeridas.
2. **`regulatoryRuleProfiles.ts`**: Agrupa y asigna las reglas de cumplimiento correspondientes a cada perfil activo.
3. **`regulatoryProfileEvaluator.ts`**: Motor pure-javascript que contrasta el estado del diseño con el perfil de reglas activas y ejecuta las llamadas a los verificadores de geometría y topología eléctrica.
4. **`severityCeiling.ts`**: Encapsula las reglas de decisión de la "capa técnica intermedia", limitando la severidad efectiva de una alerta basándose en la robustez documental de la evidencia inyectada.
5. **`regulatoryProfileMetadata.ts`**: Centraliza los metadatos de los perfiles (Utility, PMGD, Custom) y ensambla la estructura de dimensiones geométricas (`RegulatoryRuleSet`) consumida por el legacy motor usando los valores de `defaultConstraints.ts`.
6. **`documentRegistry.ts`**: Índice centralizado de documentos normativos y comerciales válidos para el screening, clasificando cada archivo por nivel de evidencia (L1 a L7).
7. **`defaultConstraints.ts`**: Única fuente de verdad de valores numéricos de separación física y holguras espaciales.
8. **`exclusionRegistry.ts`**: Índice estático de disciplinas técnicas de ingeniería excluidas del motor de cálculo.

---

## 4. Estructura del Catálogo de Reglas

Toda regla declarada en `regulatoryRulesCatalog.ts` posee los siguientes campos tipados por `RegulatoryRuleDefinition`:
* **`id`**: Identificador alfanumérico único (e.g. `RULE-PHYS-003`, `RULE-ELEC-015`).
* **`category`**: Clasificación del dominio técnico (`physical_layout`, `electrical`, `regulatory_sec`, `regulatory_cne_cen`, `regulatory_environmental`, `regulatory_territorial`, `regulatory_fire_safety`, `engineering_detail`).
* **`severity`**: Severidad declarada u objetivo por defecto (`blocking`, `warning`, `info`, `checklist`, `out_of_scope`).
* **`title`**: Nombre corto de la regla en inglés.
* **`description`**: Explicación técnica detallada del criterio de screening y su justificación.
* **`evidence`**: Arreglo de referencias a documentos (`EvidenceRef[]`) de la forma `ev(documentId, confidence, note, page?, section?)`.
* **`appParameter`**: Parámetro del modelo de datos o función de validación vinculada (e.g. `losses.budget`).
* **`appliesToProfiles`**: Perfiles en los cuales se evalúa la regla de manera activa.
* **`automation`**: Grado de automatización (`yes`, `no`, `partial`).
* **`status`**: Estado de desarrollo del validador (`implemented`, `pending_validation`, `manual_check`, `out_of_scope`).
* **`priority`**: Nivel de prioridad de integración (`P1`, `P2`, `P3`).

---

## 5. Familias de Reglas (Rule Families)

Las reglas del catálogo se agrupan en las siguientes familias funcionales en base al módulo de evaluación:
* **Físicas y Geométricas (`physical_layout`)**: Validadas directamente por el motor espacial mediante algoritmos geométricos (e.g. contención en el polígono, no colisión de footprints de equipos, holguras BESS-to-BESS o BESS-to-PCS).
* **Eléctricas Preliminares (`electrical`)**: Reglas de consistencia de arquitectura eléctrica evaluadas en `topologyValidation.ts` (e.g. capacidad de barra MT, ampacidad de cable de referencia al aire, pérdidas estimadas y correspondencia de voltajes nominales).
* **Cumplimiento y Permisos**: Subdivididas en reglas SEC (`regulatory_sec`), CNE/CEN (`regulatory_cne_cen`), ambientales (`regulatory_environmental`) e interpretación territorial (`regulatory_territorial`). Actúan en su mayoría como listas de chequeo manual (`manual_check`) para guiar la revisión del pre-diseño.
* **Seguridad Contra Incendios (`regulatory_fire_safety`)**: Distancias de separación referenciales e hitos de certificación de equipos (e.g. UL 9540, test report UL 9540A).
* **Ingeniería de Detalle (`engineering_detail`)**: Reglas clasificadas con estatus `out_of_scope` que documentan explícitamente estudios requeridos en fases avanzadas que el motor de predimensionamiento no ejecuta de forma interna (e.g. coordinación de protecciones, estudios de cortocircuito).

---

## 6. Niveles de Evidencia Documental (Evidence Levels)

El sistema de trazabilidad de datos no equipara la mera declaración de un catálogo comercial con un diseño certificado. Se diferencian los siguientes niveles de robustez documental:

### Nivel de Documento (Document Level)
Proveniente de `documentRegistry.ts`:
* **`L1_oem_exact_equipment`**: Manuales o datasheets específicos del modelo y fabricante exacto colocado. Permite la máxima severidad (`blocking`).
* **`L2_oem_same_family`**: Documentación de la misma familia de productos o tecnologías del fabricante.
* **`L3_standard_or_official`**: Normativa técnica oficial (e.g. SEC pliegos, resoluciones CNE).
* **`L4_public_project_or_authority`**: Informes de conexión CEN u ordenanzas territoriales.
* **`L5_whitepaper_brochure`**: Publicaciones comerciales o folletos de marketing técnico de fabricantes.
* **`L6_inferred_assumption`**: Constantes genéricas del sector o supuestos iniciales preconfigurados.
* **`L7_unverifiable_pending`**: Datos modificados o creados por el usuario que se encuentran pendientes de sustento documental.

### Confianza de la Referencia (Evidence Confidence)
Declarada al vincular un documento en una regla:
* **`documented`**: Cita exacta de un documento registrado que respalda plenamente el valor utilizado.
* **`derived`**: Valor computado procedimentalmente de forma geométrica o matemática básica (sin contraste directo con un texto normativo).
* **`inferred`**: Deducido razonablemente a partir de datos técnicos generales de libre acceso.
* **`assumption`**: Supuesto conceptual asumido en la etapa de pre-diseño.
* **`missing`**: Ausencia de respaldo documental para la regla. Reduce la severidad efectiva a `checklist`.

---

## 7. Lógica del Techo de Severidad (Severity Ceiling)

El módulo `src/rules/severityCeiling.ts` implementa un filtro de seguridad técnica para evitar falsos positivos de bloqueo crítico (`blocking`). 

### Lógica de Operación
Para cualquier regla del catálogo, el método `effectiveSeverity(rule)` evalúa:
1. **Strongest Cited Level**: Obtiene el nivel del documento más fuerte de las referencias asociadas (L1 es el más fuerte, L7 el más débil).
2. **Strongest Confidence**: Obtiene el nivel de confianza de referencia más fuerte entre las evidencias inyectadas (`documented` es el más fuerte, `missing` el más débil).
3. **Cálculo de Techos**:
   - El nivel documental limita la severidad máxima permitida mediante la función `maxSeverityForLevel`:
     - L1 permite `blocking`.
     - L2, L3, L4, L6 permiten un máximo de `warning`.
     - L5 permite un máximo de `info`.
     - L7 permite un máximo de `checklist`.
   - La confianza limita la severidad máxima mediante `maxSeverityForConfidence`:
     - `documented` y `derived` no aplican restricciones de techo.
     - `inferred` y `assumption` limitan a `warning`.
     - `missing` limita a `checklist`.
4. **Severidad Efectiva**: Se calcula el valor mínimo (menos severo) entre la severidad declarada de la regla, el techo por nivel de documento y el techo por confianza. Si la severidad efectiva se relaja respecto a la declarada originalmente, se inyecta el objeto `cappedBy` con el detalle de la restricción aplicada para conocimiento en UI y reporte.

*Nota: Las reglas puramente procedimentales (como colisión de equipos o contención geométrica) utilizan `EVIDENCE_NONE` con confianza `derived` para operar libres de techado, permitiendo mantener la severidad `blocking` activa si hay superposición física de footprints.*

---

## 8. Flujo Conceptual de Evaluación

```
  [ Datos del Proyecto / Layout / Equipos ]
                     │
                     ▼
       [ Regla Declarada en Catálogo ]
                     │
                     ▼
         [ Perfil Activo en Store ]  ──► (Filtro: ¿Aplica a este Perfil?)
                     │
         Sí          ▼
    [ Motor de Evaluación (Evaluator) ]
                     │
                     ▼
    [ Consulta Registro de Documentos ] ──► (Obtiene L1–L7 y Confianza de Evidencia)
                     │
                     ▼
    [ Aplicación de Severity Ceiling ] ──► (Calcula Severidad Efectiva y cappedBy)
                     │
                     ▼
     [ Emisión de Issue con cappedBy ]
                     │
                     ▼
   [ Renderizado en Panel UI y Reporte PDF ]
```

---

## 9. Perfiles Regulatorios Activos

El sistema soporta formalmente tres perfiles regulatorios dentro de `regulatoryProfileMetadata.ts`:
1. **`ifc-2024-nfpa-855-conservative`**: Perfil internacional basado en criterios conservadores típicos de NFPA 855 e IFC. Exige validaciones adicionales para reducción de distancias de seguridad.
2. **`chile-sec-rgr-06-2024`**: Perfil de referencia local chileno enfocado en la estructura de revisión del RGR 06/2024 y Pliegos RIC de consumo.
3. **`custom`**: Perfil libre que asume las constantes base del proyecto pero requiere que el usuario declare y justifique documentalmente las modificaciones de holguras aplicadas.

---

## 10. Exclusiones de Ingeniería y Defensibilidad

El archivo `src/data/exclusionRegistry.ts` lista de forma estática las disciplinas de ingeniería avanzada fuera de alcance. Este registro es fundamental en la estrategia defensiva de la plataforma:
* **Transparencia**: Expone claramente qué análisis debe contratar el desarrollador del proyecto de manera externa e independiente.
* **Control de Expectativas**: Impide que el destinatario del reporte confunda un layout geométrico preliminar con un diseño apto para construcción.

---

## 11. Relación con el Reporte Técnico PDF

La trazabilidad regulatoria debe reflejarse fielmente en el archivo PDF exportable:
* Cada alerta emitida debe indicar su severidad efectiva y si su resultado fue suavizado por `severityCappedBy`.
* La tabla de trazabilidad documental debe imprimir la correspondencia exacta entre las variables de diseño modificadas, los identificadores de documentos citados y los niveles de evidencia técnica aplicables.
* Las exclusiones del registro deben incluirse obligatoriamente en el cuerpo del reporte para advertencia legal del revisor.

---

## 12. Reglas de No Regresión Regulatoria

Cualquier desarrollo futuro en los módulos del motor normativo debe cumplir obligatoriamente con las siguientes reglas:
1. **No Elevación sin Evidencia**: No está permitido forzar severidades críticas (`blocking`) en reglas normativas basadas en referencias (`reference`) o supuestos (`assumption`).
2. **Preservación de defaultConstraints**: Las holguras paramétricas del pre-diseño deben permanecer editables en `defaultConstraints.ts` y no integrarse de forma dura en el código de validación.
3. **Visibilidad Obligatoria de cappedBy**: La indicación de si una severidad teórica fue rebajada por el techo de severidad debe ser visible en el desglose detallado de las alertas del reporte conceptual.
4. **Citas de Normativa Local**: No se debe forzar una regla internacional (e.g. NFPA 855) como un bloqueo legal mandatorio en Chile sin un pliego técnico chileno explícito que la obligue.

---

## 13. Checklist para Revisión de Cambios en Reglas (PR Checklist)

* [ ] ¿La nueva regla está declarada en `regulatoryRulesCatalog.ts` con ID único y categoría asignada?
* [ ] ¿Posee una inyección de evidencia (`evidence`) que cite un documento existente de `documentRegistry.ts`?
* [ ] ¿El nivel de confianza (`confidence`) de la evidencia es congruente con la severidad declarada por defecto?
* [ ] ¿El motor de evaluación (`regulatoryProfileEvaluator.ts`) mapea adecuadamente el parámetro a evaluar?
* [ ] ¿Se verificó que el cálculo de `effectiveSeverity` y su correspondiente badge de `severityCappedBy` se desplieguen correctamente en la interfaz?
* [ ] ¿La regla evita el uso de términos comerciales o promesas de cumplimiento legal certificado?
