# CodArch GitHub Action

Vive en el monorepo público [`jaminsmoke/codarch`](https://github.com/jaminsmoke/codarch), en `apps/github-action`.

Analiza el commit base y el head de un pull request, escribe un `report.json` determinista, publica el
mapa como artefacto y actualiza un comentario en el PR.

La acción instala el CLI publicado en npm (la versión que fija el input `version`; por defecto, la última publicada), así que no necesita el
código de CodArch en el workspace ni ejecuta `npm ci` sobre el proyecto analizado. La decisión está en
[ADR 0012](https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/desarrollo/adr/0011-0020/0012-github-action.md) y
[ADR 0014](https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/desarrollo/adr/0011-0020/0014-distribucion-cli-npm.md).

## Uso

```yaml
name: CodArch

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  codarch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: jaminsmoke/codarch/apps/github-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on: none # aviso; usa violations, cycles, hotspots o any para bloquear
          config: .codarch.yml
```

`fetch-depth: 0` es necesario para que la acción pueda calcular el merge-base y crear un worktree
del commit base. Si el PR viene de un fork, el `GITHUB_TOKEN` suele ser de solo lectura; en ese caso
el análisis y el artefacto funcionan, pero el comentario se omite con un warning.

## Entradas

| Entrada | Por defecto | Descripción |
|---|---|---|
| `github-token` | `""` | Token para comentar. En pull requests del mismo repo, `secrets.GITHUB_TOKEN`. |
| `base-ref` | `GITHUB_BASE_REF` | Rama base si no se pasa `base-sha`. |
| `base-sha` | `""` | Commit base explícito; evita calcular el merge-base. |
| `fail-on` | `none` | `none`, `cycles`, `violations`, `hotspots` o `any`. |
| `config` | `.codarch.yml` | Política y alcance relativos al root; vacío o `none` los desactiva. |
| `comment` | `true` | Publica o actualiza el comentario del PR. |
| `artifact-name` | `codarch` | Nombre del artefacto. |
| `node-version` | `22` | Versión de Node. |
| `version` | la última publicada | Versión exacta de `codarch` que se instala desde npm. |
| `working-directory` | `.` | Directorio del proyecto. |
| `title` | `CodArch` | Título del mapa. |
| `top` | `10` | Hotspots incluidos en el reporte. |

El `config` también fija el alcance: base y head leen su propio `ignore` antes de analizar, y `none`
desactiva tanto las reglas del diff como la lectura del archivo en los análisis. Si el alcance cambia
en el PR, el diff muestra los ficheros que entran o salen.

## Salidas

| Salida | Contenido |
|---|---|
| `report` | Ruta absoluta a `report.json`. |
| `map` | Ruta absoluta al `index.html` de la app publicada del head. |
| `status` | `0` sin bloqueo, `2` política incumplida, `1` error. |

## Artefacto

El artefacto contiene:

```
base/snapshot.cc.json
head/snapshot.cc.json
head/app/index.html          # la app de verdad, con datos en head/app/data/
head/map.png                 # la captura del mapa (ADR 0091)
head/map.json                # su resumen: área, color, escala y celdas mayores
report.json
```

El comentario se actualiza en lugar de duplicarse: busca el marcador `<!-- codarch-report -->` y
edita ese comentario. Si no existe, crea uno nuevo.

El comentario acaba con **«Mapa del head»**: enlaza la captura del artefacto y escribe el área, el
color, la escala y las cinco celdas más grandes. La imagen no puede ir dentro del comentario —GitHub
descarta las imágenes que no tengan URL—, así que vive en el artefacto. Si el CLI instalado no sabe
capturar todavía, el paso avisa y el comentario sale sin ese bloque.

## Política

El análisis siempre termina y publica el comentario y el artefacto. El resultado del check depende
de `fail-on`:

- `none`: nunca falla por hallazgos; es el modo aviso.
- `cycles`: falla si hay ciclos nuevos.
- `violations`: falla si hay violaciones introducidas con severidad `error`.
- `hotspots`: falla si hay hotspots nuevos.
- `any`: cualquiera de los tres.

La severidad se decide en `.codarch.yml`; ver
[`apps/site/docs/usar/reglas.md`](https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/usar/reglas.md). La acción
distingue el código `2` (gate) del `1` (error de lectura o configuración) para que el workflow pueda
diagnosticar sin ambigüedad.

## Límites

- No analiza PRs de forks con permiso de escritura si el token es read-only.
- El checkout del head es el workspace actual; no hace un checkout separado del head.
- Instalar `codarch` desde npm añade unos segundos a cada ejecución; se puede cachear el prefijo o usar
  una imagen con el CLI preinstalado.
- La acción usa `git worktree`, así que el runner necesita un checkout con historial suficiente.
