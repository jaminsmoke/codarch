# ADR 0002 — Monorepo core-first

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

La pregunta de partida era: ¿package, web app o framework? La respuesta importa porque determina
qué se puede reutilizar y qué se puede vender.

Un framework diseñado antes de tener usuarios es una API inventada. Una web monolítica valida
rápido pero entierra la lógica en componentes. Un paquete sin producto es una librería que nadie
instala.

## Decisión

Monorepo con **núcleo headless primero**:

```
packages/
  schema/     tipos, validación, import/export cc.json
  model/      snapshot, nodos, aristas, lentes, consultas
  metrics/    agregación, deltas, riesgo
  parsers/    git, tree-sitter, resolución de imports
  layouts/    treemap, grafo, jerarquía
  render/     viewport agnóstico (sin React)
apps/
  cli/        `codarch analyze`
  web/        visor
  mcp/        servidor para agentes
  github-action/
```

**Reglas de dependencia:**

- `schema` no depende de nada. `model` solo de `schema`. El resto hacia arriba.
- Ningún `package` importa un framework de UI.
- Ninguna `app` contiene lógica de dominio; solo composición y presentación.
- El CLI y el servidor MCP consumen exactamente la misma API pública que la web.

## Consecuencias

- El primer entregable (CLI + mapa estático) y el último (web) comparten motor desde el inicio.
- El "framework" no se decide: emerge cuando la API haya sobrevivido a dos consumidores reales.
- Coste: algo más de ceremonia (workspaces, builds) antes de ver nada en pantalla.

## Alternativas descartadas

- **Web app monolítica.** Más rápida al principio; extraer después cuesta más que haber separado.
- **Framework primero.** Diseñar para usuarios inexistentes. Se pospone hasta que la web y el MCP
  usen la misma API sin fricción.
