# Changelog — ADR 0045

Lo hecho, por orden. La hoja de ruta y lo abierto viven en el [ADR](0045-el-escritorio-se-instala-y-se-actualiza.md).

## 2026-10-23

- Se acepta el camino: instalador por usuario en Windows, DMG/ZIP en macOS y AppImage/deb en Linux,
  con metadatos `latest*.yml` y actualización automática en Windows y Linux.
- `electron-builder.yml` declara el proveedor de GitHub y genera `latest.yml` y `app-update.yml`;
  la prueba local de Windows produjo `codarch-0.3.0-alpha.2-setup.exe`, su `.blockmap` y
  `latest.yml`.
- `electron-updater` comprueba y descarga en segundo plano en Windows y Linux; macOS espera a la
  firma. El workflow sube también los `.zip` de macOS y los metadatos.
- La firma y la notarización quedan fuera de esta fase: primero se valida el canal y la instalación.
