# Technical & Engineering Exclusions Registry

This document registers the official technical, civil, electrical, and regulatory exclusions of the **BESS Layout Designer**. Because the application is a preliminary conceptual sizing tool, these exclusions define the boundaries between preliminary conceptual layouts and detailed construction engineering.

---

## Technical Disclaimers

These technical disclaimer texts are presented in the user interface panels and in the exported PDF report to ensure technical defensibility (mapped directly to [disclaimerTexts.ts](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/src/data/disclaimerTexts.ts)).

| ID / Key | Disclaimer Context | Technical Text |
|---|---|---|
| `generalMvp` | General Sizing | Este reporte corresponde a un predimensionamiento preliminar BESS. Los resultados son utiles para evaluacion temprana de capacidad, ocupacion fisica, configuracion conceptual y comparacion de alternativas. No constituyen ingenieria de detalle ni autorizacion de construccion, interconexion, operacion o cumplimiento normativo final. |
| `conceptualSizing` | Electrical calculations | Los calculos electricos son preliminares. No reemplazan estudios de flujo de carga, cortocircuito, coordinacion de protecciones, estabilidad RMS/EMT, armonicos, calidad de suministro, puesta a tierra, arco electrico ni estudios de interconexion exigidos por el Coordinador Electrico Nacional u otra autoridad. |
| `documentTraceability` | Equipment data reliability | Los datos de equipos provienen de documentos publicos de fabricante, reportes publicos de proyecto y referencias tecnicas. Cuando no existe fuente oficial del equipo exacto, el dato se presenta como supuesto editable, benchmark o pendiente. Ningun valor referencial debe usarse como requisito contractual sin validacion documental. |
| `uncertifiedRules` | Benchmarks and defaults | Los valores de espaciamiento y criterios no certificados en el catalogo corresponden a supuestos de prediseno y benchmarks preliminares. Deben ser validados mediante documentacion contractual del fabricante y no constituyen reglas de diseno definitivas. |
| `fireSafetyPending` | Fire separation | Las referencias a UL 9540, UL 9540A y NFPA 855 se usan como contexto tecnico y checklist preliminar. La app no certifica distancias de separacion contra incendio. Toda separacion final debe validarse con el reporte UL 9540A del equipo exacto, criterios del fabricante, requerimientos AHJ, aseguradora y normativa local aplicable. |
| `electricalCompatibility` | Substation & Auxiliaries | La compatibilidad entre contenedores BESS, PCS, transformadores, MV station, EMS/PPC y sistemas auxiliares solo puede considerarse definitiva cuando exista matriz, carta tecnica, manual o BOM del fabricante/EPC/titular. La app puede sugerir configuraciones preliminares, pero no certifica compatibilidad contractual. |
| `conceptualLayout` | Geographic & Site plan | El layout generado es conceptual. Requiere validacion mediante layout guide del fabricante, plano civil, criterios de mantenimiento, caminos de emergencia, radios de giro, restricciones ambientales, topografia, drenaje, geotecnia y criterios AHJ/aseguradora. |
| `conceptualInfrastructure` | Infrastructure routing | Las canalizaciones, zanjas y corredores de cables se muestran como capas conceptuales. Su dimensionamiento final requiere cable schedule, memoria de canalizaciones, criterios de instalacion, agrupamiento termico, metodo de tendido, calculos de ampacidad, caida de tension y detalles civiles. |
| `internationalReferenceOnly` | Normative limits | Las normas internacionales (tales como NFPA 855, UL 9540, UL 9540A, IEC 62933 o IEEE 2800) se consideran unicamente como referencias tecnicas y buenas practicas complementarias de prediseno cuando corresponda. No sustituyen los reglamentos y pliegos tecnicos obligatorios dictados por la SEC u otras autoridades locales en Chile. |

---

## Detailed Engineering Exclusions

These items are registered in the application validation engine and are printed in the regulatory exclusions section of the technical report (mapped to [exclusionRegistry.ts](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/src/data/exclusionRegistry.ts)).

### 1. Electrical Engineering Exclusions

*   **Load Flow (`ex-load-flow`):** The application does not model electrical networks or compute voltage profiles, voltage drops, power flows, or load curves.
*   **Short Circuit (`ex-short-circuit`):** Calculation of three-phase, single-phase, or symmetrical/asymmetrical fault currents is not supported.
*   **Protections Coordination (`ex-protections-coordination`):** The application does not specify relay settings, protection coordinate curves, fuse sizing, or circuit breaker tripping thresholds.
*   **RMS / EMT Stability (`ex-rms-emt-stability`):** Dynamic power system studies, transient stability simulations (RMS), and electromagnetic transient simulations (EMT) are entirely excluded.
*   **Harmonics & Distortion (`ex-harmonics`):** Harmonic generation, total harmonic distortion (THD), resonance frequencies, and active filters are not modeled.
*   **Grounding Grid (`ex-grounding-grid`):** Calculation of soil resistivity (Wenner/Schlumberger methods), step/touch voltages, grounding grid layout, and earthing conductors is excluded.
*   **Arc Flash (`ex-arc-flash`):** Calculation of incident energy levels, flash protection boundaries, and safe approach distances under IEEE 1584 is excluded.
*   **Insulation Coordination BIL (`ex-insulation-coordination`):** Switching/lightning surge coordination and basic impulse level (BIL) specification are excluded.
*   **Power Quality at PCC (`ex-power-quality-pcc`):** System voltage flicker, phase imbalances, and compliance with grid code power quality metrics at the point of common coupling (PCC) are not evaluated.

### 2. Civil & Geotechnical Exclusions

*   **Geotechnical & Soil Foundations (`ex-geotechnical-civil`):** Soil bearing capacity, structural slab calculations, pile depths, dynamic seismic parameters, and structural anchoring are excluded.
*   **Hydrology & Site Drainage (`ex-hydrology-drainage`):** Surface water runoff simulations, hydrological return periods, catch basins, internal site ditch slopes, and flood elevation boundaries are excluded.
*   **Access Road Detail:** The access road layout is conceptual. Detailed civil road engineering (such as super-elevation curves, road cuts/fills, structural subgrade paving, and turning circles for heavy transport cranes) is excluded.

### 3. Safety & Fire Protection Exclusions

*   **Detailed Fire Safety Engineering (`ex-detailed-fire-safety`):** Clean-agent suppression sizing (NFPA 2001), water mist deluge design, hazard mitigation analysis (HMA) calculations, and formal Authority Having Jurisdiction (AHJ) building code compliance reviews are excluded.

### 4. Environmental & Permitting Exclusions

*   **Environmental Permitting (`ex-environmental-permitting`):** Environmental impact declarations (DIA/EIA), noise mapping (DS38), emissions evaluations, flora and fauna exclusions, and sectorial permitting (PAS) are completely outside the tool scope.

### 5. Interconnection & High Voltage Engineering Exclusions

*   **HV Substation / POI Engineering (`ex-detailed-interconnection-hv`):** High voltage substation detailed layouts, switchyard insulation clearances, main grid connection line details, gantry structures, and official connection studies for the national system (CEN) are excluded.
