# CodArch

> Visual CodArch — un mapa vivo de la arquitectura de tu software: en el pull request, en el CI y
> en tu agente.

**Estado:** M0 en marcha. Esquema `cc.json` + CLI de inspección funcionando sobre datos reales.
Las decisiones están registradas en [`docs/adr/`](docs/adr/) y el diseño del mapa en
[`docs/design/map.md`](docs/design/map.md).

---

## Quickstart

```bash
npm install
npm run samples                 # descarga dos cc.json reales de CodeCharta (1,3 MB)
npm run inspect -- samples/codecharta_visualization.cc.json.gz
npm test
```

Salida:

```
  CodArch · inspección

  fichero      samples/codecharta_visualization.cc.json.gz (727 KB)
  formato      cc.json 2.1
  estructura   2003 ficheros · 510 carpetas · profundidad 9
  lentes       metrics · dependency · domain
  métricas     105 distintas · rloc en 1924 ficheros
  aristas      3727 · leafEdges 8677
```

---

## El problema

Las métricas de código se miran en dashboards que nadie abre. La arquitectura se discute en
pizarras que caducan. Y cuando un cambio rompe una capa, se descubre en revisión — o en producción.

CodeCharta demostró que un mapa visual del código funciona. Pero un mapa que hay que abrir es un
mapa que se consulta poco. Nosotros queremos el mismo mapa **donde se toma la decisión**: en el diff
del PR, en el pipeline y en la conversación con un agente.

## La cuña

Un **modelo de arquitectura headless** que alimenta tres consumidores:

```
$ codarch analyze . --base origin/main --head HEAD

  ✓ 4.812 ficheros · 1.9s · 38 MB
  ⚠ 2 ciclos nuevos        src/domain → src/infra → src/domain
  ⚠ 1 capa violada         ui/Checkout.tsx importa db/queries.ts
  ▲ 3 hotspots movidos     payments/service.ts  +41 complejidad
  → mapa: .codarch/index.html   reporte: .codarch/report.json
```

1. **CLI + mapa estático** — el artefacto que se ve y se comparte.
2. **Bot de PR** — el mismo análisis, convertido en comentario y en gate.
3. **Servidor MCP** — el mismo modelo, consultable por agentes.

## Principios

1. **El modelo es el producto.** Render, CLI y MCP son consumidores. Si el modelo está bien, los
   demás son baratos.
2. **Snapshots inmutables y deterministas.** Mismo repo + mismo commit = mismo hash. Sin esto no
   hay diff fiable, ni caché, ni CI.
3. **Grafo primero.** La jerarquía de ficheros es una proyección, no la verdad.
4. **Compatible con `cc.json` 2.x.** Entrada garantizada; salida si sale gratis.
5. **Cero configuración para empezar.** Reglas y umbrales cuando duelan, no antes.
6. **Núcleo headless.** Los `packages/` no saben qué es un componente; las `apps/` no tienen
   lógica de dominio.
7. **Incremental por defecto.** Ningún paso deja el producto roto. Cada milestone se puede usar,
   medir y comparar con el anterior.

## No objetivos de la v1

Plugins · cloud · auth · multi-repo · 3D · importación de Sonar · más de un lenguaje.

Si algo de esto entra, el MVP se convierte en CodeCharta 2 y perdemos la cuña.

## Criterios de éxito

| Criterio | Objetivo |
|---|---|
| Repo de 5k ficheros | analizado en < 3 s |
| Salida | determinista (mismo hash) |
| Configuración | cero para el primer resultado |
| Comentario de PR | < 10 s de extremo a extremo |
| Legibilidad | el mapa se entiende en una captura |

## Estructura propuesta

```
packages/   schema · model · metrics · parsers · render · layouts
apps/       cli · web · mcp · github-action
docs/       adr/ · design/ · model.md · roadmap.md
design/     prototipo navegable del mapa 2D
```

## Inspiración

[CodeCharta](https://github.com/MaibornWolff/codecharta) (BSD-3-Clause, MaibornWolff). Proyecto
independiente, sin código derivado. Ver [ADR 0001](docs/adr/0001-clean-room-con-ccjson.md).
