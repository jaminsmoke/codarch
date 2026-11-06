---
title: El riesgo y el lint
description: "La base no cambia. El lint suma un término antes de gamma, leído de la salud de cada fichero, y las contribuciones en puntos suman el índice 0..100."
section: desarrollo
sidebar:
  label: El riesgo y el lint
  order: 5
---

La decisión es el [ADR 0108](adr/0101-0110/0108-el-lint-suma-al-riesgo.md). La salud que se copia es la de [el artefacto 1.3](lint-1.3.md).

## La base

B es la de siempre: complejidad 50 %, churn 32 % y tamaño 18 %. Si una señal no existe, esos pesos se renormalizan. Cada señal se divide por su p95 y se corta a 1. Gamma es 1,7. Una carpeta se queda con el máximo de sus ficheros, no con la suma.

Sin término de lint, `risk = B^1,7`. Es el mismo número de antes.

## El término

```
D   = errores + 0,25·avisos
nL  = clamp(D / 10, 0, 1)
raw = min(B + 0,2·nL, 1)
risk  = raw^1,7          0..1
score = 100·raw^1,7      0..100
```

Info no entra en D. α = 0,2 y Dsat = 10 no están calibrados. El lint nunca resta. Si `raw` ya es 1, más deuda no sube el índice: un mapa de dos ficheros suele estar ya en ese tope, porque el p95 es el menor de los dos.

## Qué se le pasa

Por fichero, la vista que sale de su `scopeHealth`:

| Campo | Qué es |
|---|---|
| `fresh` | `true` si `meta.tree` es el checksum del snapshot. `false` si los dos existen y no coinciden. `null` si no hubo comparación. |
| `counts` | Errores, avisos, info y hallazgos, contados desde los mensajes. |
| `coverage.state` | `unmeasured`, `unknown`, `partial` o `complete`. |
| `coverage.eligible` | Tamaño del universo. `null` no es cero. |
| `coverage.measured` | No entra en la fórmula. |
| `coverage.reasons` | Los códigos del contrato. Importan `not-found`, `not-eligible` y `no-eligible`. |
| `applicability` | `applicable`, `na` o `not-found`. |
| `reason` | El primer motivo, para acreditar `na`. |

No se pasa la salud del proyecto ni el artefacto entero. Si no hay artefacto, no hay vista. Un fichero que no está en `files` no se rellena con 0.

`lintView` gana al número legado. Ese número solo vive para quien todavía no construye la vista: se lee como deuda fresca de cobertura desconocida, y hace falta `options.lint`.

## Cuándo entra la deuda

| Situación | Qué hace el índice |
|---|---|
| `fresh === true` y hay errores o avisos, aunque el estado sea `unknown` | Suma. La confianza es mínimo observado, no medida cerrada. |
| `fresh === true`, cobertura `complete`, `eligible > 0`, deuda 0 e info 0 | No suma. Puede decirse limpio. |
| `fresh === true` y deuda 0 con universo desconocido | Suma 0. No baja al resto y no se llama limpio. |
| `fresh === false` | No penaliza. El árbol no es este. |
| `fresh === null` | No penaliza. No hubo comparación (`freshness-unverified`). |
| `applicability: "na"` | No penaliza. No es cero. |
| `applicability: "not-found"` | No penaliza. No es no aplicable ni cero. |
| Sin artefacto | No hay vista. El riesgo es B^1,7. |

## Las contribuciones

Cada señal tiene `points`, `percent` y `weight`.

- `points` son puntos del índice 0..100. Los que no son null suman `score`.
- `percent` es el porcentaje de ese índice. Null si el índice es 0 o la señal no entra.
- `weight` es el peso nominal (0,50, 0,32, 0,18, y 0,2 para el lint cuando hay nL). No es la parte renormalizada ni el porcentaje.

`points` null significa que la señal no entra. No es un cero.

## Dónde vive

El objeto es el que devuelve `riskBreakdown` en `@codarch/metrics` (`packages/metrics/src/risk.ts`). El modelo de render lo guarda en `riskBreakdown` de cada fichero, y de ahí pasa a la ficha. No se escribe en `cc.json`. El MCP y la captura lo copian solo en su salida. Si el snapshot no trae métricas, el campo es `null`: la ficha no lo recalcula.
