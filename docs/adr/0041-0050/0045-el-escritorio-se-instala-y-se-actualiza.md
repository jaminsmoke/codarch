# ADR 0045 — El escritorio se instala y se actualiza mejor

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

El escritorio ya tiene instaladores (NSIS en Windows, DMG en macOS, AppImage y deb en Linux) y una
release automática cuando sube `versions.json`. También sabe **comprobar** si hay una versión nueva,
pero no instalarla: abre la release en el navegador y el usuario vuelve a bajar el instalador.

Eso deja dos huecos:

- el instalador de Windows ya es por usuario y permite elegir carpeta, pero no hay metadatos de
  actualización (`latest.yml`) ni un canal que los use;
- la app no se actualiza sola, así que una versión nueva no llega si el usuario no vuelve a la
  página de releases.

El producto sigue siendo alpha y los instaladores van **sin firmar**. La firma es una decisión
aparte: cuesta un certificado de firma de código y una cuenta de Apple Developer. Sin firma, macOS
no puede aplicar una actualización automática; Windows y Linux sí pueden instalar el paquete nuevo,
con el aviso del sistema.

## Decisión

### 1. Un instalador por plataforma, con su ruta

- **Windows:** NSIS por usuario (`perMachine: false`), instalación en
  `%LOCALAPPDATA%\Programs\CodArch`, con opción de cambiar la carpeta, accesos directos y
  desinstalador. Es la ruta propia de la app, sin pedir administrador.
- **macOS:** DMG que arrastra `CodArch.app` a `/Applications`; se añade también un `.zip` porque es
  el formato que necesita el actualizador.
- **Linux:** AppImage para ejecutarla desde cualquier carpeta y `.deb` para quien prefiera el
  paquete del sistema.

Los nombres de los artefactos siguen la versión del producto y la arquitectura.

### 2. La release trae metadatos de actualización

`electron-builder.yml` declara el proveedor de publicación de GitHub. Aunque el workflow sigue
subiendo los artefactos con `--publish never`, la configuración hace que electron-builder genere
`latest.yml`, `latest-mac.yml` y `latest-linux.yml`, además de los `.blockmap` que permiten
actualizaciones diferenciales.

El workflow sube esos archivos al release. Sin ellos, `electron-updater` no tiene a quién preguntar
ni qué descargar.

### 3. Windows y Linux se actualizan solos; macOS espera a la firma

La app usa `electron-updater` cuando está empaquetada:

- al arrancar, comprueba si hay una versión nueva y la descarga en segundo plano;
- la instala al cerrar, o cuando el usuario acepte el aviso;
- si no hay red o la comprobación falla, la app sigue funcionando y no molesta.

En macOS la comprobación se mantiene, pero la instalación automática queda desactivada hasta que
haya firma y notarización. El botón de la release sigue ahí como salida manual. En Windows el
instalador es por usuario y no necesita administrador; en Linux la actualización automática aplica
al AppImage.

La sección **Actualizaciones** de los ajustes sigue enseñando la versión y el enlace; la
actualización en segundo plano no la sustituye.

### 4. Sin firma no se promete lo que no se puede cumplir

No se añade un certificado ni se finge que los instaladores están firmados. La release lo dice y el
sistema avisa. Cuando haya firma, la misma configuración de `electron-updater` sirve para macOS y
para quitar los avisos de Windows.

## Consecuencias

- Windows y Linux reciben las versiones nuevas sin volver a la página de releases.
- macOS conserva la descarga manual hasta que se firme; es una limitación del sistema, no un olvido.
- Los releases incluyen más artefactos (`latest*.yml` y `.blockmap`), pero siguen siendo ligeros.
- El instalador de Windows no pide administrador y queda en la carpeta del usuario.
- Una actualización fallida no borra la versión que funciona: electron-updater solo instala después
  de descargar y verificar el paquete.

## Alternativas descartadas

- **Seguir solo con el enlace a la release:** es lo que ya hay y obliga a repetir la instalación.
- **Instalar en `Program Files`:** requiere administrador y no aporta nada a una app de un usuario.
- **Activar auto-update en macOS sin firma:** el sistema lo rechaza; prometerlo sería peor.
- **Publicar desde electron-builder en vez de dejar que el workflow suba los assets:** el workflow
  ya decide cuándo hay release y espera a los tres sistemas; duplicar esa decisión crearía carreras.
- **Un instalador propio para cada Linux:** AppImage y deb cubren el caso sin multiplicar el
  mantenimiento.

## Hoja de ruta

### M28 — El escritorio se instala y se actualiza

- [x] Añadir `publish` de GitHub y los metadatos de actualización a `electron-builder.yml`.
- [x] Incluir `latest*.yml`, los `.zip` de macOS y los `.blockmap` en los artefactos del workflow.
- [x] Añadir `electron-updater` y la comprobación en segundo plano para Windows y Linux.
- [ ] Probar un ciclo de actualización con una versión de prueba y documentar el resultado.
- [ ] Dejar la firma y notarización como decisión aparte, cuando el producto lo justifique.

El detalle de lo hecho está en el [changelog](0045-el-escritorio-se-instala-y-se-actualiza.changelog.md).
