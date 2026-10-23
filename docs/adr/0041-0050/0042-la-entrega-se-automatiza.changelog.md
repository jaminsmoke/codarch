# Changelog — ADR 0042

Lo hecho, por orden. La hoja de ruta y lo abierto viven en el [ADR](0042-la-entrega-se-automatiza.md).

## 2026-10-23

- `.github/workflows/publish-cli.yml` publica el CLI con Trusted Publishing: OIDC, Node 24, sin
  `NPM_TOKEN`, solo desde `main` y sin repetir una versión que ya está en npm.
- La conexión de npm (`CodArch CLI` · `jaminsmoke/codarch` · `publish-cli.yml`) se creó y se validó
  publicando `codarch@0.3.0-alpha.2` en la etiqueta `next`.
- `.github/workflows/desktop.yml` deja de esperar un tag manual: `prepare` compara la versión del
  producto con la última release `desktop-v*`, `build` solo empaqueta cuando toca y `release` crea
  el tag y la release después de los tres builds.
- `scripts/desktop-release.ts` decide el plan y `apps/desktop/test/desktop-release.test.ts` cubre
  las versiones, el orden de las prereleases, los PR y el `workflow_dispatch`.
- La acción de GitHub pasa a `0.3.0-alpha.2`; `npm run sync:action` actualiza
  `jaminsmoke/codarch-action` y `v1` apunta al commit nuevo.
- El README del escritorio explica que el tag ya no se empuja a mano.
