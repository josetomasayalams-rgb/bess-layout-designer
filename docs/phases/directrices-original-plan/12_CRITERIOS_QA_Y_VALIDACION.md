# 12 — Criterios de QA y validación

Criterios mínimos para aceptar cada fase y para considerar la app lista para uso en evaluación temprana profesional.

---

## 1. Criterios universales (aplican a cada fase)

Antes de cerrar **cualquier** fase:

| ✅ | Criterio |
|---|---|
| ☐ | `npm run lint` pasa sin errores. |
| ☐ | `npm run typecheck` pasa sin errores. |
| ☐ | `npm run test` pasa todos los tests (existentes + nuevos). |
| ☐ | `npm run build` pasa. |
| ☐ | `npm run dev` arranca sin errores en consola del navegador. |
| ☐ | Demo carga y permite colocar equipos sin crashear. |
| ☐ | Preset BESS del Desierto (cuando exista, desde Fase 3) carga sin crashear. |
| ☐ | Export JSON exitoso del proyecto actual. |
| ☐ | Re-import del JSON exportado produce proyecto idéntico (round-trip). |
| ☐ | Cobertura de tests para código nuevo ≥ 70% en `src/lib/` y `src/rules/`. |
| ☐ | Commit + push con mensaje descriptivo siguiendo guidelines en `AGENTS.md`. |
| ☐ | Code review de al menos otra persona. |

---

## 2. Criterios por fase

### Fase 0 — Diagnóstico

- [ ] Los 13 archivos `00_..12_` existen en `docs/directrices-implementation-plan/`.
- [ ] Cada archivo es ≥ 50 líneas (excepto si naturalmente corto).
- [ ] No se modificó ningún archivo en `src/`.
- [ ] Convención de IDs `DocumentRegistry` está documentada.

### Fase 1 — Modelo de datos + trazabilidad

Ver detalle en `11_PLAN_PRIMERA_IMPLEMENTACION.md` §4.

Tests específicos:
- [ ] `evidence.test.ts` valida `asAssumption`, `asDerived`.
- [ ] `documentRegistry.test.ts` valida IDs únicos + ≥ 30 entries.
- [ ] Fixture v1.1 carga sin error en lector v1.2.
- [ ] Export v1.2 contiene `cable_routes`, `mv_feeders`, `mv_buses`, `poi`, etc. (vacíos pero presentes).

### Fase 2 — Catálogo con datasheets

- [ ] ST2752UX-US tiene `EvidenceRef[]` con `documentId: "SUNGROW-ST2752UX-V15"` para footprint, energía, tensiones, certificaciones.
- [ ] SC5000UD-MV-US tiene `EvidenceRef[]` análogo.
- [ ] Datos no encontrados aparecen como `confidence: "missing"` con `PendingDataItem` correspondiente.
- [ ] Catálogos `cables.ts`, `switchgear.ts`, `mainTransformer.ts` existen y se exportan desde `catalogs/index.ts`.
- [ ] `npm run test` pasa.

### Fase 3 — Preset BESS del Desierto

Tests específicos (ver `07_PRESET_BESS_DEL_DESIERTO.md` §5):

- [ ] Cargar preset produce 320 containers + 40 stations + 10 feeders + 2 buses.
- [ ] KPIs documentados se reproducen exactamente (200 MW, 800 MWh, 880,80384 bruto, 0,9083 usableFactor).
- [ ] Las 4 inconsistencias documentales aparecen como `DocumentInconsistency[]`.
- [ ] Los ~10 pendientes de datasheet aparecen como `PendingDataItem[]`.
- [ ] PPC Bluence/Isotrol aparece como metadato.
- [ ] AuxiliaryServices reproducen valores PMAX (1,563 MW / 1,3493 MW).

### Fase 4 — Sizing engine

- [ ] Input `targetPowerMW = 200`, `targetUsableEnergyMWh = 800` devuelve exactamente 320 containers, 40 stations, 10 feeders.
- [ ] Tests parametrizados con al menos 5 escenarios distintos (PMGD ≤ 9 MW, mid-scale 50 MW, utility 100/200/500 MW).
- [ ] UI `BessQuickSizingPanel` muestra los 3 valores (bruto / usable / comercial) con badge fuente.

### Fase 5 — Generador bloques

- [ ] Para 320 containers en polígono ≥ 3 ha se generan 40 bloques 8:1 sin colisiones.
- [ ] Plantilla horizontal vs vertical configurable.
- [ ] Separaciones parametrizadas respetadas.

### Fase 6 — Layout MV/POI

- [ ] `LayoutZone(mv_yard)` renderiza en mapa.
- [ ] `LayoutZone(poi_yard)` renderiza en mapa.
- [ ] CableRoute MT entre stations y sectioning center visible.
- [ ] AccessRoad perimetral generable automáticamente con ancho configurable.
- [ ] Panel `MVArchitecturePanel` muestra feeders, buses y POI.

### Fase 7 — Validaciones físicas extendidas

- [ ] RULE-PHYS-001 a RULE-PHYS-012 implementadas y testeadas.
- [ ] Cada warning tiene `evidence` cuando aplica.
- [ ] WarningsPanel muestra agrupado por categoría.

### Fase 8 — Validaciones eléctricas

- [ ] RULE-ELEC-001 a RULE-ELEC-009 implementadas y testeadas.
- [ ] Topología 8:1 / 4:1 valida.
- [ ] Compatibilidad PCS-trafo extendida.

### Fase 9 — Matriz normativa

- [ ] ≥ 30 reglas implementadas, todas con `EvidenceRef` con `confidence: "documented"` (PDF + página + numeral).
- [ ] Code review por compliance.
- [ ] Cada regla en al menos un perfil regulatorio.
- [ ] Test parametrizado: cargar preset → ejecutar perfil → reportar violaciones esperadas.

### Fase 10 — Motor validaciones normativas

- [ ] `evaluateRules(project, profile): RuleViolation[]` funcional.
- [ ] `RegulatoryCompliancePanel` muestra violaciones con cita.
- [ ] Click en cita abre referencia al documento (no requiere abrir el PDF; solo muestra `documentId + page + section`).

### Fase 11 — Reporte técnico

- [ ] Reporte exportable contiene **todas** las secciones definidas en `04_MODELO_DATOS_PROPUESTO.md` §7.
- [ ] Disclaimer literal en portada y pie.
- [ ] Locale respetado (`es` / `en`).
- [ ] PDF generado descargable.
- [ ] HTML preview navegable.
- [ ] Snapshot del mapa incluido.
- [ ] Single-line diagram (al menos esquemático) incluido.
- [ ] Listado de evidencia agrupado al final del reporte.

### Fase 12 — QA y docs

- [ ] Cobertura de tests ≥ 70% en `src/lib/` y `src/rules/`.
- [ ] `docs/onboarding.md` existe.
- [ ] `docs/data-model.md` documenta el modelo final.
- [ ] CI configurada (si aplica) corre lint + typecheck + test + build.
- [ ] DIRECTRICES_APP_BESS verificado como no expuesto en producción.

---

## 3. Criterios de aceptación de v1 (cierre del plan)

Para considerar la app lista para uso profesional de evaluación temprana:

- [ ] Las 13 fases (0..12) están completas.
- [ ] El preset BESS del Desierto es reproducible y se exporta como reporte completo.
- [ ] Al menos un proyecto **nuevo distinto** del BESS del Desierto se puede crear de cero y exportar.
- [ ] Al menos un perfil regulatorio (`chile-utility`) tiene ≥ 30 reglas con citas formales.
- [ ] El disclaimer aparece **literalmente** en cada export.
- [ ] La lista de exclusiones del análisis ancla §6 aparece en cada reporte.
- [ ] La distinción `targetGrossEnergyMWh` vs `targetUsableEnergyMWh` vs `targetCommercialMWh` está visible en UI.
- [ ] El `InconsistencyDetector` reporta inconsistencias en el preset BESS del Desierto.
- [ ] El sistema de evidencia (`EvidenceRef`, `EvidencedValue<T>`) está en uso en todo el catálogo principal.

---

## 4. Tests E2E recomendados (Fase 12)

### E2E-001: Flujo "preset → export"

```
1. Iniciar app
2. Click "Cargar preset BESS del Desierto"
3. Verificar que aparece banner con disclaimer
4. Click "Validar layout"
5. Verificar que warnings se muestran agrupados
6. Click "Exportar reporte técnico"
7. Verificar que PDF se descarga
8. Validar PDF: disclaimer presente, KPIs correctos, inconsistencies listadas
```

### E2E-002: Flujo "proyecto nuevo"

```
1. Iniciar app
2. Dibujar polígono nuevo en mapa (≥ 3 ha)
3. Definir target 100 MW / 400 MWh
4. Click "Sizing automático"
5. Verificar que se proponen 160 containers + 20 stations + 5 feeders
6. Aceptar layout sugerido
7. Validar
8. Exportar
```

### E2E-003: Flujo "edición de layout"

```
1. Cargar preset BESS del Desierto
2. Activar "Edit layout"
3. Clic en container → seleccionar
4. Mover con flechas
5. Apply
6. Verificar que cambio queda en undo/redo
7. Revertir
8. Verificar que cambio se deshace
```

### E2E-004: Backward compatibility

```
1. Cargar fixture export v1.1
2. Verificar que carga sin error
3. Re-exportar como v1.2
4. Verificar que campos nuevos están como defaults
```

---

## 5. Auditoría documental (Fase 12)

Antes de release:

| ☐ | Cada `RuleDefinition` en el motor tiene `evidence[0].confidence: "documented"` con `documentId` real. |
| ☐ | Cada `EvidencedValue<T>` con `confidence: "documented"` tiene un `documentId` que existe en `DocumentRegistry`. |
| ☐ | Cada `documentId` referenciado en código existe en `DocumentRegistry`. |
| ☐ | Ninguna ruta de PDF en `DocumentRegistry` apunta a archivos de `99_PENDIENTES_*` (no oficiales). |
| ☐ | Ningún `EvidencedValue<T>` con `confidence: "documented"` cita `06/EXTRACCIONES_TEXTO/*` (esos son OCR, no primario). |
| ☐ | Cada `documentId` con `replacedBy` apunta a otro `documentId` existente. |

Implementar como tests automáticos `src/data/documentRegistry.audit.test.ts`.

---

## 6. Métricas de calidad

| Métrica | Objetivo v1 |
|---|---|
| Cobertura tests `src/lib/` | ≥ 70% |
| Cobertura tests `src/rules/` | ≥ 80% |
| Cobertura tests `src/store/` | ≥ 60% |
| Tiempo dev server cold start | ≤ 5 s |
| Tiempo build | ≤ 60 s |
| Tiempo test suite | ≤ 30 s |
| Bundle size (gzip, primer load) | ≤ 800 KB |
| Lighthouse Accessibility | ≥ 90 |
| Lighthouse Best Practices | ≥ 90 |
| Reglas documentadas con cita | ≥ 30 |
| Documentos en registry | ≥ 50 |
| Equipos en catálogo certificados | ≥ 5 |

---

## 7. Gate de release

Para promover a producción:

1. Todas las fases completas.
2. Auditoría documental pasa.
3. E2E-001 a E2E-004 pasan.
4. Métricas de calidad alcanzadas.
5. Code review por al menos 2 personas (incluyendo 1 compliance / técnico BESS).
6. Disclaimer revisado y aprobado por legal / compliance.
7. Smoke test con usuario real BESS (validación de UX).

---

## 8. Política de hot-fix

Si tras release se detecta un error crítico (regla con cita incorrecta, valor de datasheet erróneo, fórmula de sizing rota):

1. Crear branch hotfix.
2. Patch + test específico que reproduce el bug.
3. Bump `app version` patch (`0.1.x → 0.1.x+1`).
4. Si la regla viene de PDF, **dos** personas validan la corrección contra el PDF original.
5. Release con changelog explícito.

---

## 9. Convenciones de PR (de `AGENTS.md`)

- Mensajes imperativos: "Add foo", "Fix bar".
- PR menciona tests corridos, contexto y screenshots para UI.
- Llamar explícitamente cambios en supuestos regulatorios, schema JSON, o datos de equipos.

---

## 10. Cierre del plan

Cuando los criterios de §3 están todos en ✅, esta planificación se considera **ejecutada**. La carpeta `docs/directrices-implementation-plan/` permanece como histórico — la documentación viva pasa a `docs/data-model.md`, `docs/onboarding.md` y al `CLAUDE.md` actualizado.

Cualquier reapertura (nueva normativa, datasheet actualizado, nuevo perfil regulatorio) genera un **nuevo plan complementario** en `docs/directrices-implementation-plan-v2/`, sin sobrescribir este.
