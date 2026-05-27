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

Esta herramienta **no** realiza cálculos constructivos, análisis físicos tridimensionales complejos ni simulaciones de sistemas eléctricos de potencia. Queda estrictamente excluido del alcance de la aplicación:
* **Estudios Eléctricos de Detalle**: La herramienta no ejecuta flujos de potencia (Load Flow), estudios de cortocircuito (estáticos o dinámicos), coordinación de protecciones, estudios de arco eléctrico (IEEE 1584), sobretensiones transitorias (EMT), análisis de armónicos (THD) ni estabilidad dinámica de red.
* **Diseño del Sistema de Puesta a Tierra**: No calcula la resistividad del suelo ni diseña la malla de tierra del parque o de la subestación.
* **Ingeniería Civil y Geotecnia**: No se consideran estudios de suelos, topografía detallada con curvas de nivel, fundaciones de equipos, obras hidráulicas de drenaje ni canalizaciones subterráneas reales.
* **Estudios de Seguridad e Incendio (HSE)**: La herramienta no reemplaza la ingeniería de protección contra incendios ni los análisis de consecuencias de fuga térmica. No simula sistemas de extinción de incendios ni define planes de emergencia para la autoridad local.
* **Aprobación Regulatoria**: La herramienta no emite planos válidos para tramitaciones ante la Superintendencia de Electricidad y Combustibles (SEC), el Coordinador Eléctrico Nacional (CEN), el Servicio de Evaluación Ambiental (SEA) ni compañías distribuidoras/transmisoras. No reemplaza a un instalador autorizado ni a firmas de ingeniería certificadas.

---

## 3. Modelo de Evidencias (Preliminary Evidence Model)

Para garantizar la transparencia técnica ante revisores externos, cada dato de entrada y regla de la aplicación está clasificado bajo un nivel de evidencia documentada que define su grado de confiabilidad:

* **Certified Data (Dato Certificado)**: Información proveniente directamente de fichas técnicas firmadas por fabricantes, reportes de ensayos normativos (e.g. UL 9540A) o manuales oficiales de instalación. Se considera el nivel más alto de precisión.
* **Preliminary Assumption (Supuesto Preliminar)**: Valores por defecto editables que sirven para inicializar el diseño en ausencia de datos específicos del proyecto (e.g. constantes geométricas genéricas).
* **Reference (Referencia Informativa)**: Citas normativas, de guías técnicas o de buenas prácticas que sugieren un valor o parámetro recomendado, pero que requieren validación especializada en cada caso de estudio.
* **Pending Validation (Validación Pendiente)**: Campos que han sido introducidos por el usuario o sugeridos por el sistema que no cuentan con un respaldo documental verificado y deben ser confirmados de manera externa.

---

## 4. Techo de Severidad (Severity Capping)

La lógica de evaluación regulatoria implementa un mecanismo denominado `severityCappedBy` (techo de severidad). Este mecanismo evita la emisión de advertencias de bloqueo (`blocking`) injustificadas que detengan el flujo del diseño preliminar cuando no existan evidencias concluyentes:

* **Principio de Honestidad Técnica**: Si una regla tiene declarada una severidad teórica crítica, pero la calidad de la evidencia de entrada o del contexto normativo evaluado corresponde a un supuesto preliminar (`preliminary_assumption`) o una referencia indirecta, la severidad efectiva se reduce automáticamente a un nivel no-bloqueante (e.g. `warning` o `checklist`).
* **Prevención de Falsos Positivos**: El sistema no impide la simulación conceptual de layouts por la falta de un documento certificado de ingeniería de detalle. Las advertencias de bloqueo real quedan estrictamente reservadas para infracciones geométricas físicas comprobadas sobre datos certificados (e.g. solapamiento físico de equipos).

---

## 5. Referencias Técnicas Internacionales

Las alusiones a estándares internacionales (tales como NFPA 855, UL 9540, UL 9540A, normas IEC o IEEE) se emplean exclusivamente como directrices de diseño conceptual y buenas prácticas recomendadas:
* **Carácter Referencial**: Ninguno de estos estándares se presenta de forma directa como normativa obligatoria o vinculante en el territorio chileno, salvo que un pliego técnico dictado por la autoridad local así lo establezca de manera explícita.
* **Límites de Seguridad**: Las distancias recomendadas basadas en NFPA 855 o la propagación térmica de UL 9540A son referenciales. La disposición definitiva debe validarse contra el reporte de ensayo UL 9540A del modelo específico provisto por el fabricante del BESS y los requerimientos de la aseguradora del proyecto.

---

## 6. Frontera Regulatoria en Chile

El sistema está configurado para operar bajo las directrices del Reglamento de Seguridad de Instalaciones de Consumo de Energía Eléctrica (Pliegos Técnicos RIC) y el Reglamento de Sistemas de Almacenamiento (RGR/RPTD), pero:
* **No Certificación**: La aplicación no emite certificados de cumplimiento legal de las instalaciones ni realiza el trámite de declaración TE1 ante la SEC.
* **Evaluación Candidata**: Las matrices de reglas y perfiles candidatos evalúan consistencias geométricas y capacidades de acuerdo a la documentación disponible, pero la aprobación formal requerirá siempre de un ingeniero civil electricista colegiado y autorizado.

---

## 7. Registro de Exclusiones de Ingeniería de Detalle

Las siguientes exclusiones técnicas forman parte explícita de los límites de la aplicación y deben mostrarse activamente tanto en la interfaz de usuario como en el documento técnico exportable:
1. **ex-load-flow**: Simulación de flujo de carga y perfiles de tensión en estado estacionario.
2. **ex-short-circuit**: Cálculo de corrientes de falla simétrica y asimétrica.
3. **ex-protections-coordination**: Ajustes de relés, curvas de selectividad y tiempos de despeje de fallas.
4. **ex-rms-emt-stability**: Estudios dinámicos de estabilidad, transitorios electromagnéticos y comportamiento ante huecos de tensión.
5. **ex-harmonics**: Estudios de distorsión armónica total de corriente y tensión.
6. **ex-grounding-grid**: Diseño del sistema de puesta a tierra y cálculo de tensiones de paso y de contacto.
7. **ex-arc-flash**: Estudio de energía incidente por arco eléctrico según IEEE 1584.
8. **ex-insulation-coordination**: Coordinación de aislamiento e impulsos atmosféricos.
9. **ex-power-quality-pcc**: Evaluación del flicker y desbalances de fase en el punto de acoplamiento común.

---

## 8. Límites del Caso de Estudio BESS del Desierto

El caso de estudio "BESS del Desierto" incorporado en la aplicación funciona como un preset de referencia técnica e histórica para demostración y calibración de la plataforma:
* **No Replicabilidad Universal**: Los parámetros de diseño, separación y capacidades definidos en este preset responden a condiciones ambientales, de conexión y de terreno particulares.
* **No Generalización**: Los datos del preset no deben interpretarse como reglas de diseño universales para otros emplazamientos en el territorio nacional.

---

## 9. Promesa al Usuario (User-Facing Promise)

“Esta herramienta ayuda a estructurar, visualizar y documentar un predimensionamiento preliminar. No certifica diseños ni reemplaza estudios especializados.”

---

## 10. Reglas de No Regresión Arquitectónica

Cualquier cambio futuro en el código de la aplicación debe respetar estrictamente los siguientes límites:
1. **Preservación de Exclusiones**: No se permite ocultar, minimizar ni omitir la visualización de la sección de exclusiones en la interfaz de usuario ni en el reporte técnico preliminar.
2. **No Falsificación de Cumplimiento**: Ninguna regla referencial (`reference`) debe evaluarse como un bloqueo normativo mandatorio (`blocking`) sin evidencias certificadas.
3. **Editable por Defecto**: Las restricciones del archivo `defaultConstraints.ts` deben mantenerse editables por el usuario dentro del panel de herramientas y no rigidizarse como si fuesen normativas legales obligatorias.
4. **Claridad en la Salida Técnica**: El PDF emitido por la aplicación no debe aproximarse visualmente a planos de construcción IFC ni contener campos que sugieran firmas de certificación de ingeniería.
