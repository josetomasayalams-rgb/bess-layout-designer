# Demo script - BESS Layout Designer

## Objetivo

Mostrar en 3 minutos el flujo actual de la app despues de Fase 11A: una herramienta profesional de predimensionamiento preliminar BESS utility-scale, con navegacion por secciones, KPIs, validaciones preliminares, warnings, exclusiones y reporte tecnico preliminar.

La demo debe dejar claro que la app ayuda a ordenar una evaluacion temprana. No reemplaza ingenieria electrica, civil, ambiental, de seguridad, fabricante, AHJ ni estudios de conexion.

## Audiencia sugerida

- Equipo interno de producto o ingenieria.
- Stakeholders que necesitan entender el alcance del prototipo.
- Potenciales usuarios tecnicos que evaluan layout preliminar BESS.
- Revision previa a refactors de Fase 11B.

## Narrativa principal

La app convierte un sitio y supuestos preliminares en una vista trazable de:

1. sitio,
2. equipos,
3. layout,
4. cumplimiento preliminar,
5. reporte.

El mensaje central es: "la app acelera el predimensionamiento y explicita sus limites; no cierra el diseno de detalle".

## Guion de 3 minutos

### 0:00-0:25 - Apertura y KPI bar

Accion:

- Abrir la app.
- Mostrar la barra superior de KPIs.
- Senalar potencia, energia, duracion, area, equipos, cumplimiento, warnings, exclusiones y estado de reporte.

Frase sugerida:

> "Esta barra resume el estado preliminar del proyecto. Cuando faltan datos, la app muestra placeholders seguros en vez de inventar resultados."

Punto clave:

- La barra sirve como lectura rapida, no como motor tecnico independiente.

### 0:25-0:55 - Sitio

Accion:

- Ir a `Sitio`.
- Mostrar terreno, poligono, area, coordenadas locales y presets/casos si estan disponibles.
- Si no hay poligono, mostrar el estado inicial.

Frase sugerida:

> "El flujo parte por el sitio. El poligono habilita area, coordenadas locales y la base para el layout."

No decir:

- "Esto reemplaza topografia, catastro o permisos."

### 0:55-1:20 - Equipos

Accion:

- Ir a `Equipos`.
- Mostrar biblioteca de modelos, sizing preliminar y catalogo.

Frase sugerida:

> "Aqui se seleccionan modelos y supuestos de dimensionamiento preliminar. Los datos se clasifican por confiabilidad: certificado, supuesto preliminar o pendiente de validacion."

Punto clave:

- No presentar un supuesto preliminar como dato certificado.

### 1:20-1:50 - Layout

Accion:

- Ir a `Layout`.
- Mostrar herramientas de disposicion, arquitectura MT preliminar y comparacion si aplica.

Frase sugerida:

> "Esta seccion organiza la disposicion fisica y arquitectura MT a nivel conceptual. Es suficiente para comparar alternativas, no para construir."

No decir:

- "El layout ya cumple distancias finales de fabricante o autoridad."

### 1:50-2:25 - Cumplimiento

Accion:

- Ir a `Cumplimiento`.
- Mostrar perfil regulatorio, warnings, panel de cumplimiento, supuestos de spacing y checklist avanzado.

Frases sugeridas:

> "Los warnings no bloquean la navegacion; quedan visibles para que el usuario no pierda trazabilidad."

> "Spacing assumptions es una vista informativa de supuestos preliminares desde `defaultConstraints`, no una validacion normativa independiente."

> "Advanced checks es un checklist orientativo. No ejecuta estudios electricos, civiles ni de seguridad."

Puntos clave:

- Las validaciones electricas de Fase 8/9 son preliminares.
- Las exclusiones siguen visibles.
- La app no ejecuta load-flow, cortocircuito, protecciones, RMS/EMT, arc flash ni otros estudios de detalle.

### 2:25-2:55 - Reporte

Accion:

- Ir a `Reporte`.
- Mostrar resumen tecnico y acceso a preview/descarga si esta disponible.

Frase sugerida:

> "El reporte empaqueta la salida preliminar con advertencias y exclusiones. Sirve para documentar una evaluacion temprana, no para emitir un estudio de detalle."

Punto clave:

- El reporte debe conservar limitaciones, warnings y exclusiones.

### 2:55-3:00 - Cierre

Frase sugerida:

> "Fase 11A ya dejo el flujo navegable y demostrable. El siguiente refactor debe preservar esta experiencia y no mover el alcance tecnico."

## Checklist antes de grabar o mostrar

- `npm run dev` activo y app cargada sin errores visibles.
- Poligono o preset listo si se quiere mostrar layout con datos.
- KPI bar visible.
- Rail con 5 secciones visible: Sitio, Equipos, Layout, Cumplimiento, Reporte.
- Warnings visibles en Cumplimiento.
- Exclusiones visibles donde corresponda.
- Reporte preliminar accesible si hay datos suficientes.
- No hay consola con errores criticos.

## Errores que no se deben decir

- "La app entrega ingenieria de detalle."
- "Las validaciones electricas son estudios definitivos."
- "Los spacing assumptions son reglas normativas nuevas."
- "`defaultConstraints` define normativa obligatoria."
- "Advanced checks ejecuta estudios electricos, civiles o de seguridad."
- "Warnings o exclusiones pueden ignorarse."
- "BESS del Desierto es una regla universal."
- "NFPA, UL, IEC o IEEE son automaticamente normativa chilena obligatoria."
- "El reporte reemplaza fabricante, AHJ, estudio de conexion o revision de especialista."
