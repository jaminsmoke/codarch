---
title: ADR 0045 — El escritorio se instala y se actualiza mejor
description: El escritorio tiene instaladores (NSIS en Windows, deb y AppImage en Linux) y una release automática cuando sube versions.json. También sabe comprobar si hay una versión nueva,…
section: desarrollo
status: aceptado
date: "2026-10-23"
sidebar:
  label: El escritorio se instala y se actualiza mejor
  order: 45
---

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

El escritorio ya tiene instaladores (NSIS en Windows y deb en Linux) y una release automática
cuando sube `versions.json`. También sabe **comprobar** si hay una versión nueva, pero no
instalarla: abre la release en el navegador y el usuario vuelve a bajar el instalador.

Eso deja dos huecos:

- el instalador de Windows ya es por usuario y permite elegir carpeta, pero no hay metadatos de
  actualización (`latest.yml`) ni un canal que los use;
- la app no se actualiza sola, así que una versión nueva no llega si el usuario no vuelve a la
  página de releases.

El producto sigue siendo alpha y los instaladores van **sin firmar**. La firma es una decisión
aparte: cuesta un certificado de firma de código y una cuenta de Apple Developer. Windows y Linux
pueden instalar el paquete nuevo sin firma, con el aviso del sistema. macOS necesita firma y
notarización incluso para una instalación razonable, así que **no se publica** mientras no existan.
No se va a pedir una cuenta de Apple para mantener un instalador que el sistema bloquea.

## Decisión

### 1. Un instalador por plataforma, con su ruta

- **Windows:** NSIS por usuario (`perMachine: false`), instalación en
  `%LOCALAPPDATA%\Programs\CodArch`, con opción de cambiar la carpeta, accesos directos y
  desinstalador. Es la ruta propia de la app, sin pedir administrador.
- **Linux:** `.deb`, que instala la app en el sistema y deja su entrada de menú, **y AppImage**,
  que no se instala y es el formato con el que la app se reemplaza sola y se vuelve a abrir sin
  pedir permisos.
- **macOS:** fuera de la matriz de builds y de la release. Sin firma ni notarización, Gatekeeper
  bloquea la app y el actualizador no puede aplicarla; no se publica una experiencia que no
  funciona.

**El release no lleva ejecutables portables de Windows.** El `codarch-<versión>-x64.exe` anterior
no se instalaba y no podía actualizarse como la app; se elimina. El AppImage sí se publica, y no
por ser portable: es el único formato de Linux que `electron-updater` puede sustituir **sin root**
y relanzar por sí mismo. El `.deb` sigue siendo la instalación normal —entra en el menú y en el
sistema—, pero actualizarlo pide contraseña, así que quien quiera olvidarse del tema usa el
AppImage. Lo que se descarga es `codarch-<versión>-setup.exe` en Windows,
`codarch-<versión>-amd64.deb` o `codarch-<versión>-x64.AppImage` en Linux.

**Revisión (2026-10-25).** La primera versión de esta decisión dejaba el AppImage fuera porque «es
un ejecutable, no un instalador». En un Linux normal eso obligaba a cada actualización del `.deb` a
pasar por la contraseña de administrador, y la app no podía reiniciarse sola; el AppImage resuelve
las dos cosas porque lo instala el propio actualizador en la carpeta del usuario.

### 2. La release trae metadatos de actualización

`electron-builder.yml` declara el proveedor de publicación de GitHub. Aunque el workflow sigue
subiendo los artefactos con `--publish never`, la configuración hace que electron-builder genere
`latest.yml` y `latest-linux.yml`, además de los `.blockmap` que permiten actualizaciones
diferenciales.

El workflow sube esos archivos al release. Sin ellos, `electron-updater` no tiene a quién preguntar
ni qué descargar.

El paquete instalado lleva además `resources/app-update.yml`: es lo que le dice al actualizador a
qué repositorio mirar. Un instalador sin ese archivo **no se actualiza nunca**, y falla en
silencio, así que el workflow comprueba después de empaquetar que está ahí y que el canal existe
(`scripts/check-desktop-package.mjs`).

El tag de la release es `v<versión>` (`v0.3.1-alpha.2`), no `desktop-v<versión>`: el nombre del
tag acaba en la URL de descarga y la app lo compara como versión semver. Las etiquetas que no llevan
versión —el `v1` de la acción, que vive en el mismo repositorio— se descartan al elegir release. El
planificador acepta las dos formas para seguir leyendo el historial `desktop-v*`.

### 3. Windows y Linux se actualizan solos

La app usa `electron-updater` cuando está empaquetada:

- al arrancar, comprueba si hay una versión nueva y la descarga en segundo plano;
- la instala al cerrar, o cuando el usuario acepte el aviso;
- si no hay red o la comprobación falla, la app sigue funcionando y no molesta.

**La etiqueta la resuelve la app, no el feed.** Con `allowPrerelease` activo y una versión instalada
estable, `electron-updater` se queda con la primera entrada del feed de GitHub, y ese feed también
trae etiquetas que no son releases. La app pregunta la lista de releases, descarta los borradores y
las etiquetas sin versión, se queda con la mayor y fija la base de descarga en
`releases/download/v<versión>`; a partir de ahí el canal es el de siempre (`latest.yml` en Windows,
`latest-linux.yml` en Linux). Si la lista no se puede leer, la comprobación automática se salta y se
reintenta en el siguiente arranque.

En Windows el instalador es por usuario y no necesita administrador. En Linux depende del formato:
desde el **AppImage** la app se reemplaza sola, sin permisos, y al descargar la versión nueva ofrece
**Reiniciar ahora** o esperar al cierre —`quitAndInstall` escribe el binario nuevo y ejecuta la
versión nueva—; desde el `.deb` la actualización la aplica `electron-updater` con `dpkg`/`apt` y el
sistema pide permiso de administrador, así que se aplica al cerrar. La sección **Actualizaciones**
de los ajustes enseña la versión y el enlace, y además ofrece **Actualizar y reiniciar**: descarga la
versión nueva si no lo había hecho ya, la instala y vuelve a abrir la app, sin bajar el instalador a
mano.

macOS queda fuera hasta que haya firma y notarización. No se compila, no se sube y no se ofrece un
DMG que el sistema vaya a bloquear.

### 4. Sin firma no se promete lo que no se puede cumplir

No se añade un certificado ni se finge que los instaladores están firmados. La release lo dice y el
sistema avisa. Cuando haya firma, se podrá reevaluar macOS y quitar los avisos de Windows.

## Consecuencias

- Windows y Linux reciben las versiones nuevas sin volver a la página de releases.
- macOS no se publica hasta que se firme; es una limitación del sistema y una decisión explícita.
- Los releases incluyen más artefactos (`latest*.yml`, `.blockmap` y el AppImage), pero siguen
  siendo ligeros.
- El instalador de Windows no pide administrador y queda en la carpeta del usuario; el `.deb` de
  Linux sí pide permiso al actualizarse, como cualquier paquete del sistema. El AppImage no: se
  actualiza en la carpeta del usuario y puede reiniciarse solo.
- Una actualización fallida no borra la versión que funciona: electron-updater solo instala después
  de descargar y verificar el paquete.

## Alternativas descartadas

- **Seguir solo con el enlace a la release:** es lo que ya hay y obliga a repetir la instalación.
- **Instalar en `Program Files`:** requiere administrador y no aporta nada a una app de un usuario.
- **Publicar macOS sin firma:** Gatekeeper bloquea la app y el actualizador no puede aplicarla;
  prometerlo sería peor. Se reevaluará si algún día hay firma.
- **Publicar desde electron-builder en vez de dejar que el workflow suba los assets:** el workflow
  ya decide cuándo hay release y espera a los dos sistemas; duplicar esa decisión crearía carreras.
- **Publicar el portable de Windows:** es un ejecutable que no se instala; la app instalada no
  puede actualizarlo, así que sigue fuera.
- **Dejar Linux solo con el `.deb`:** cada actualización necesita la contraseña de administrador y
  la app no puede reiniciarse sola. El AppImage cuesta un artefacto más y quita las dos fricciones.
- **Un paquete propio para cada Linux:** `.deb` cubre el caso de Debian/Ubuntu; rpm o pacman
  entrarán si se piden, con su decisión aparte.

## Hoja de ruta

### M28 — El escritorio se instala y se actualiza

- [x] Añadir `publish` de GitHub y los metadatos de actualización a `electron-builder.yml`.
- [x] Incluir `latest*.yml` y los `.blockmap` en los artefactos del workflow; sin macOS.
- [x] Añadir `electron-updater` y la comprobación en segundo plano para Windows y Linux.
- [x] Cambiar el tag a `v<versión>` para que `electron-updater` lo lea como semver.
- [x] Probar el ciclo: `alpha.1` descargó `alpha.2`, la instaló al cerrar y arrancó como `alpha.2`.
- [x] Comprobar en el CI que el instalador lleva `app-update.yml` y `latest*.yml`.
- [x] Actualizar desde los ajustes con un botón que descarga, instala y reinicia la app.
- [x] Dejar macOS fuera hasta que haya firma y notarización; no se publican DMG.
- [x] Fijar la base de descarga a la release resuelta, para que una etiqueta sin versión no deje la
  comprobación en 404.
- [x] Publicar el AppImage junto al `.deb` y subirlo en el workflow de escritorio.
- [x] Ofrecer **Reiniciar ahora** al descargar una actualización cuando la app corre como AppImage.
