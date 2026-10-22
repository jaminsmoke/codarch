# Hoja de ruta — ADR 0016 «Lente de migración v1»

**Decisión:** [el ADR](0016-lente-migracion.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-20

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M4 — Lente de migración

**Estado:** ✅ cerrado (v1). Decisión en [ADR 0016](0016-lente-migracion.md); plan en
[`migration.md`](../../migration.md).

- [x] LOC por lenguaje (TS, JS, Rust, WASM, Node) y estado `js|rust|bridge|native` por fichero.
- [x] Aristas FFI para imports `.wasm`/`.node` y conteo de cruces por fichero.
- [x] Detección de puentes napi/`wasm_bindgen`/`WebAssembly` sin inventar aristas.
- [x] "Deuda de migración" `(maxComplexity + 1) × (1 + fanIn)`, sin líneas.
- [x] Métricas `migrationDebt` y `ffiCrossings` visibles en el mapa, `inspect` y `analyze`.
- [x] Validación sobre este repo: 104 ficheros, 13.159 rloc TS/JS, deuda 2.330 y plan por fases.

Límites: Rust solo se mide con escáner léxico; las aristas napi no se observan sin el glue generado.
