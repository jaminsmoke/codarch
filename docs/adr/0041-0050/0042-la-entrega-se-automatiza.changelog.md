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
- El primer release automático salió con `desktop-v0.3.0-alpha.2` (prerelease, 9 instaladores) desde
  el push `0d1bf36`, sin tag manual.
- El comprobador del escritorio pide la lista de releases, incluidas las prerelease, y elige la
  versión más alta; `/releases/latest` no veía las alpha. La alpha.2 se marcó como `latest` una vez
  para que los clientes con el comprobador anterior la pudieran instalar.
- `0.3.1-alpha.1` se publicó en npm con el workflow manual de Trusted Publishing y la release
  automática `desktop-v0.3.1-alpha.1` salió con 16 assets, incluidos `latest*.yml` y los `.zip` de
  macOS. La acción pasa a `0.3.1-alpha.1` y `v1` apunta a `a8c0061`.
