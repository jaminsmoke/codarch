---
title: "GitHub Action"
description: "El mapa y el diff de arquitectura en cada pull request, en modo aviso o bloqueo."
section: usar
sidebar:
  label: "GitHub Action"
  order: 60
---

La acción analiza la base y el head de cada pull request, sube el mapa y el reporte como artefacto y
deja un comentario con el diff de arquitectura. Hoy se usa por subruta del
monorepo.

## Uso

`.github/workflows/codarch.yml`:

```yaml
name: CodArch
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  codarch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }
      - uses: jaminsmoke/codarch/apps/github-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on: none
```

- `fetch-depth: 0` es obligatorio: la base se calcula con el merge-base y se analiza en un `git worktree`.
- La acción instala `codarch` desde npm; no necesita el código de CodArch ni ejecuta `npm ci` sobre tu
  proyecto. La versión se fija con `version`.

## Qué produce

- **Un comentario, actualizado**: lleva el marcador `<!-- codarch-report -->`; cada push edita el mismo
  comentario en vez de crear otro.
- **Un artefacto** (`codarch`): los snapshots de base y head, el mapa del head, `report.json` y la
  captura `head/map.png` con su resumen en `head/map.json`.

El comentario enlaza esa captura y escribe lo que el PNG no dice: por qué área y color está pintado,
la escala y las cinco celdas más grandes. La imagen no se puede incrustar en un comentario —GitHub
descarta las que no tienen URL—, así que vive en el artefacto.

## Aviso o bloqueo

| `fail-on` | Bloquea cuando |
|---|---|
| `none` (por defecto) | nunca: comenta y sube el artefacto |
| `violations` | hay violaciones nuevas de [`.codarch.yml`](reglas.md) |
| `cycles` | aparecen ciclos nuevos |
| `hotspots` | aparecen hotspots nuevos |
| `any` | cualquiera de los anteriores |

Solo bloquea lo **introducido** por el PR. Código de salida `2`: política incumplida; `1`: error de
análisis o configuración. La severidad de cada regla (`info`/`warn`/`error`) se decide en `.codarch.yml`.

## Entradas

`github-token`, `base-ref`, `base-sha`, `fail-on`, `config` (por defecto `.codarch.yml`; `none` lo
desactiva), `comment`, `artifact-name`, `node-version`, `version`, `working-directory`, `title` y `top`.
La lista completa con sus valores por defecto está en `apps/github-action/action.yml`.

## Forks

En PRs desde forks el token suele ser de solo lectura: el comentario se omite con un warning, pero el
análisis y el artefacto siguen funcionando.

:::note[Para saber más]
Las decisiones detrás de esta página: [ADR 0012 — GitHub Action para PRs](../desarrollo/adr/0011-0020/0012-github-action.md), [ADR 0015 — Acción pública separada](../desarrollo/adr/0011-0020/0015-accion-publica-separada.md).
:::
