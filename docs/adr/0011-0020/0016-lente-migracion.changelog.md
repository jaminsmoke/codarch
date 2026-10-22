# Changelog — ADR 0016 «Lente de migración v1»

**Decisión:** [el ADR](0016-lente-migracion.md) · **Estado:** aceptado · **Fecha:** 2026-10-20

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el [ADR](0016-lente-migracion.md#hoja-de-ruta).

## Lo que se hizo

### M4 — Lente de migración

**Estado:** cerrado (v1). Decisión en [ADR 0016](0016-lente-migracion.md); plan en [`migration.md`](../../migration.md).

- [x] LOC por lenguaje (TS, JS, Rust, WASM, Node) y estado `js|rust|bridge|native` por fichero.
- [x] Aristas FFI para imports `.wasm`/`.node` y conteo de cruces por fichero.
- [x] Detección de puentes napi/`wasm_bindgen`/`WebAssembly` sin inventar aristas.
- [x] "Deuda de migración" `(maxComplexity + 1) × (1 + fanIn)`, sin líneas.
- [x] Métricas `migrationDebt` y `ffiCrossings` visibles en el mapa, `inspect` y `analyze`.
- [x] Validación sobre este repo: 104 ficheros, 13.159 rloc TS/JS, deuda 2.330 y plan por fases.

Límites: Rust solo se mide con escáner léxico; las aristas napi no se observan sin el glue generado.
