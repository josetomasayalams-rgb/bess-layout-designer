# Defensibility Statement - BESS Layout Designer

Este documento establece la postura técnica y el marco de responsabilidad del predimensionador de sistemas de almacenamiento de energía en baterías (BESS) a gran escala. Su objetivo es delimitar de manera rigurosa qué aspectos cubre la aplicación y cuáles quedan excluidos por pertenecer a fases posteriores de ingeniería de detalle, estudios especializados o aprobaciones regulatorias.

---

## 1. Alcance de la Aplicación (What The App Is)

El BESS Layout Designer es una herramienta preliminar de apoyo para la etapa conceptual y de prefactibilidad de proyectos de almacenamiento de energía a gran escala. La herramienta está diseñada para:
* **Disposición y Layout Conceptual**: Permitir el trazado espacial preliminar de contenedores BESS, inversores/PCS y subestaciones dentro de un polígono de terreno definido por el usuario.
* **Selección Preliminar de Equipamiento**: Facilitar la estimación inicial del equipamiento requerido basándose en especificaciones técnicas extraídas de fichas técnicas comerciales cargadas en el catálogo.
* **Cálculo de Configuración y Capacidad**: Ejecutar cálculos preliminares de potencia activa y reactiva agregada, energía de almacenamiento nominal y capacidad a nivel de corriente alterna (AC) y corriente continua (DC).
* **Verificación Geométrica Interna**: Evaluar colisiones espaciales básicas y validar distancias mínimas (setbacks) preconfiguradas respecto a los límites de la propiedad y entre contenedores.
* **Trazabilidad Documental y Evidencias**: Mapear los datos de entrada con niveles de confianza documentales y vincularlos a fuentes técnicas identificadas.
* **Generación de Reportes Técnicos**: Compilar un resumen de los supuestos, compatibilidades eléctricas elementales y listados de exclusiones bajo una advertencia explícita de carácter preliminar.

---

## 2. Exclusiones de Ingeniería (What The App Is Not)

Esta herramienta **no** realiza cálculos constructivos, análisis físicos tridimensionales complejos ni simulaciones de sistemas eléctricos de potencia. Queda estrictamente excluido del alcance de la aplicación cualquier estudio de ingeniería de detalle o simulación dinámica de red.

> [!IMPORTANT]
> El catálogo completo y detallado de advertencias generales, disclaimers específicos y exclusiones detalladas de ingeniería civil, eléctrica, de seguridad/incendios y permisos ambientales se encuentra consolidado en:
> **[Exclusions Registry (docs/exclusions.md)](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/docs/exclusions.md)**

Para asegurar la postura de defensibilidad técnica y legal del predimensionador:
* **No sustituye ingeniería de detalle:** No realiza simulaciones de flujo de carga, corrientes de cortocircuito, coordinación de relés y protecciones, análisis de estabilidad transitoria RMS/EMT, sobretensiones (BIL), armónicos ni calidad de suministro (THD/flicker) en el PCC.
* **No diseña sistemas de puesta a tierra:** No se calcula resistividad de suelo ni tensiones de paso/contacto.
* **No realiza diseño civil ni estructural:** No hay estudios geotécnicos, fundaciones estructurales, topografía detallada ni drenajes hidráulicos.
* **No reemplaza certificaciones contra incendio:** No calcula propagación térmica ni dimensiona sistemas de extinción (NFPA 2001).

---

## 3. Modelo de Evidencias (Preliminary Evidence Model)

Para garantizar la transparencia técnica ante revisores externos, cada dato de entrada y regla de la aplicación está clasificado bajo un nivel de evidencia documentada que define su grado de confianza (mapeado en [documentRegistry.ts](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/src/data/documentRegistry.ts)):

* **Certified Data (Dato Certificado):** Información proveniente directamente de fichas técnicas firmadas por fabricantes, reportes de ensayos normativos (e.g. UL 9540A) o manuales oficiales de instalación. Se considera el nivel más alto de precisión.
* **Preliminary Assumption (Supuesto Preliminar):** Valores por defecto editables que sirven para inicializar el diseño en ausencia de datos específicos del proyecto.
* **Reference (Referencia Informativa):** Citas normativas, de guías técnicas o de buenas prácticas que sugieren un valor recomendado.
* **Pending Validation (Validación Pendiente):** Campos introducidos por el usuario o sugeridos por el sistema que no cuentan con un respaldo documental verificado.

---

## 4. Techo de Severidad (Severity Capping)

La lógica de evaluación regulatoria implementa el mecanismo `severityCappedBy` (techo de severidad) en [severityCapping.ts](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/src/rules/severityCeiling.ts). Este mecanismo evita la emisión de advertencias de bloqueo (`blocking`) injustificadas que detengan el flujo del diseño preliminar cuando no existan evidencias concluyentes:

* **Principio de Honestidad Técnica:** Si una regla tiene declarada una severidad teórica crítica, pero la calidad de la evidencia de entrada o del contexto normativo evaluado corresponde a un supuesto preliminar (`preliminary_assumption`) o una referencia indirecta, la severidad efectiva se reduce automáticamente a un nivel no-bloqueante (`warning` o `checklist`).
* **Prevención de Falsos Positivos:** El sistema no impide la simulación conceptual de layouts por la falta de un documento certificado. Las advertencias de bloqueo real quedan estrictamente reservadas para infracciones geométricas físicas comprobadas sobre datos certificados (e.g. solapamiento físico de equipos).

---

## 5. Referencias Técnicas Internacionales

Las alusiones a estándares internacionales (tales como NFPA 855, UL 9540, UL 9540A, normas IEC o IEEE) se emplean exclusivamente como directrices de diseño conceptual y buenas prácticas recomendadas:
* **Carácter Referencial:** Ninguno de estos estándares se presenta de forma directa como normativa obligatoria o vinculante en el territorio chileno, salvo que un pliego técnico dictado por la autoridad local así lo establezca de manera explícita (RIC o RGR/RPTD).
* **Límites de Seguridad:** Las distancias recomendadas basadas en NFPA 855 o la propagación térmica de UL 9540A son referenciales. La disposición definitiva debe validarse contra el reporte de ensayo UL 9540A del modelo específico provisto por el fabricante del BESS.

---

## 6. Frontera Regulatoria en Chile

El sistema está configurado para operar bajo las directrices de los Pliegos Técnicos RIC y el Reglamento de Sistemas de Almacenamiento (RGR/RPTD), pero:
* **No Certificación:** La aplicación no emite certificados de cumplimiento legal de las instalaciones ni realiza el trámite de declaración TE1 ante la SEC.
* **Evaluación Candidata:** Las matrices de reglas evalúan consistencias geométricas de acuerdo a la documentación disponible, pero la aprobación formal requerirá siempre de un ingeniero civil electricista colegiado y autorizado.

---

## 7. Límites del Caso de Estudio BESS del Desierto

El caso de estudio "BESS del Desierto" (especificado en [bessDelDesiertoPresetV12.ts](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/src/data/projectCaseStudies/bessDelDesiertoPresetV12.ts)) funciona como un preset de referencia técnica e histórica para demostración y calibración de la plataforma:
* **No Replicabilidad Universal:** Los parámetros de diseño, separación y capacidades definidos en este preset responden a condiciones ambientales, de conexión y de terreno particulares.
* **No Generalización:** Los datos del preset no deben interpretarse como reglas de diseño universales para otros emplazamientos en el territorio nacional.

---

## 8. Promesa al Usuario (User-Facing Promise)

> "Esta herramienta ayuda a estructurar, visualizar y documentar un predimensionamiento preliminar. No certifica diseños ni reemplaza estudios especializados de ingeniería de detalle."

---

## 9. Reglas de No Regresión Arquitectónica

Cualquier cambio futuro en el código de la aplicación debe respetar estrictamente los siguientes límites:
1. **Preservación de Exclusiones:** No se permite ocultar, minimizar ni omitir la visualización de la sección de exclusiones en la interfaz de usuario ni en el reporte técnico preliminar.
2. **No Falsificación de Cumplimiento:** Ninguna regla referencial (`reference`) debe evaluarse como un bloqueo normativo mandatorio (`blocking`) sin evidencias certificadas.
3. **Editable por Defecto:** Las restricciones del archivo `defaultConstraints.ts` deben mantenerse editables por el usuario dentro del panel de herramientas y no rigidizarse como si fuesen normativas legales obligatorias.
4. **Claridad en la Salida Técnica:** El PDF emitido por la aplicación no debe aproximarse visualmente a planos de construcción IFC ni contener campos que sugieran firmas de certificación de ingeniería.
