---
title: ADR 0016 — Lente de migración v1
description: "M4 nace de un caso real: CodArch migrará de TypeScript a Rust. La pregunta útil no es cuántas líneas quedan, sino qué piezas son caras de mover, dónde está la frontera…"
section: adr
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: Lente de migración v1
  order: 16
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

M4 nace de un caso real: CodArch migrará de TypeScript a Rust. La pregunta útil no es cuántas
líneas quedan, sino **qué piezas son caras de mover**, dónde está la frontera nativa y cuánto
acoplamiento arrastra cada fichero.

El snapshot ya tiene métricas por fichero y un grafo de dependencias TS/JS. La lente de migración
debe añadir señales sin convertir el analizador en un compilador de Rust ni inventar aristas que no
puede observar.

## Decisión

1. **Lenguajes observados en v1:** `ts`, `js`, `rust`, `wasm` y `node`. TS/JS se parsean como hasta
   ahora; Rust solo se mide; `.wasm` y `.node` se tratan como artefactos nativos.
2. **Estado por fichero:** `js` (TS/JS normal), `rust` (Rust normal), `bridge` (declara o consume una
   frontera napi/WASM) y `native` (artefacto `.wasm`/`.node`).
3. **Detección de puentes.** Rust es puente si contiene `#[napi]`, `napi_derive`, `napi::`,
   `#[wasm_bindgen]`, `wasm_bindgen` o `wasm-pack`. TS/JS es puente si importa un `.wasm`/`.node`,
   usa `WebAssembly.instantiate|compile|Module|Instance` o `process.dlopen`.
4. **Aristas FFI observables.** Solo se emiten cuando un import TS/JS resuelve a un `.wasm` o `.node`
   incluido en el análisis. Las anotaciones napi de Rust no producen aristas: el binding generado no
   está en el fuente. Se marca el fichero como `bridge` y se cuenta en el resumen.
5. **Deuda de migración, sin líneas.**
   `migrationDebt = (maxComplexity + 1) × (1 + fanIn)` para TS/JS. La complejidad mide el coste de
   reescribir; el fan-in, cuántos consumidores hay que acompañar. Rust y nativos tienen deuda 0.
6. **Métricas del snapshot.** Cada TS/JS emite `migrationDebt`; cada fichero emite `ffiCrossings`
   (aristas FFI incidentes). La lente `migration` guarda lenguaje, estado, LOC, RLOC, deuda y cruces,
   más un resumen por lenguaje y estado.
7. **Rust LOC sin parser.** Un escáner léxico cuenta líneas físicas y líneas con código, ignorando
   comentarios de línea/bloque y respetando strings y chars. No se promete complejidad Rust en v1.

## Consecuencias

- El mapa puede colorear por `migrationDebt` o `ffiCrossings` sin cambios en el motor de render.
- `inspect` y `analyze` muestran el reparto por lenguaje y la deuda restante.
- Un repositorio sin Rust/WASM sigue funcionando; solo aparecen dos métricas nuevas y una lente con
  todo el código como `js`.
- La deuda es una **heurística de priorización**, no una estimación de esfuerzo. No sustituye a un
  análisis de símbolos ni a un parser de Rust.
- Las aristas napi no se pueden observar sin el glue generado; el estado `bridge` y el resumen son la
  señal disponible. Cuando exista parser de Rust se podrán añadir aristas reales.
- El checksum cambia al añadir la lente y las métricas; es esperado.

## Alternativas descartadas

- **Contar solo líneas.** Favorece ficheros grandes y triviales y ignora el acoplamiento. La deuda
  debe ponderar complejidad y consumidores.
- **Añadir tree-sitter-rust ahora.** Duplica dependencias nativas y solo lo usaríamos para LOC y
  detección de atributos. El escáner léxico cubre v1.
- **Inventar aristas TS→Rust por convención de nombres.** Daría un grafo bonito y falso. Mejor
  declarar el límite: solo se emiten aristas cuando el import resuelve a un artefacto nativo.
- **Meter la migración en la lente de métricas.** El estado y el lenguaje no son números; una lente
  propia mantiene el modelo y permite evolucionarla sin contaminar `metrics`.

## Hoja de ruta

Sin fases abiertas: M4 está cerrada.

El detalle de lo hecho está en el [changelog](0016-lente-migracion.changelog.md).
