# ADR 0045 — El escritorio se instala y se actualiza mejor

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

El escritorio ya tiene instaladores (NSIS en Windows, AppImage y deb en Linux) y una release
automática cuando sube `versions.json`. También sabe **comprobar** si hay una versión nueva, pero no
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
- **Linux:** AppImage para ejecutarla desde cualquier carpeta y `.deb` para quien prefiera el
  paquete del sistema.
- **macOS:** fuera de la matriz de builds y de la release. Sin firma ni notarización, Gatekeeper
  bloquea la app y el actualizador no puede aplicarla; no se publica una experiencia que no
  funciona.

Los nombres de los artefactos siguen la versión del producto y la arquitectura.

### 2. La release trae metadatos de actualización

`electron-builder.yml` declara el proveedor de publicación de GitHub. Aunque el workflow sigue
subiendo los artefactos con `--publish never`, la configuración hace que electron-builder genere
`latest.yml` y `latest-linux.yml`, además de los `.blockmap` que permiten actualizaciones
diferenciales.

El workflow sube esos archivos al release. Sin ellos, `electron-updater` no tiene a quién preguntar
ni qué descargar.

### 3. Windows y Linux se actualizan solos

La app usa `electron-updater` cuando está empaquetada:

- al arrancar, comprueba si hay una versión nueva y la descarga en segundo plano;
- la instala al cerrar, o cuando el usuario acepte el aviso;
- si no hay red o la comprobación falla, la app sigue funcionando y no molesta.

En Windows el instalador es por usuario y no necesita administrador; en Linux la actualización
automática aplica al AppImage. La sección **Actualizaciones** de los ajustes sigue enseñando la
versión y el enlace; la actualización en segundo plano no la sustituye.

macOS queda fuera hasta que haya firma y notarización. No se compila, no se sube y no se ofrece un
DMG que el sistema vaya a bloquear.

### 4. Sin firma no se promete lo que no se puede cumplir

No se añade un certificado ni se finge que los instaladores están firmados. La release lo dice y el
sistema avisa. Cuando haya firma, se podrá reevaluar macOS y quitar los avisos de Windows.

## Consecuencias

- Windows y Linux reciben las versiones nuevas sin volver a la página de releases.
- macOS no se publica hasta que se firme; es una limitación del sistema y una decisión explícita.
- Los releases incluyen más artefactos (`latest*.yml` y `.blockmap`), pero siguen siendo ligeros.
- El instalador de Windows no pide administrador y queda en la carpeta del usuario.
- Una actualización fallida no borra la versión que funciona: electron-updater solo instala después
  de descargar y verificar el paquete.

## Alternativas descartadas

- **Seguir solo con el enlace a la release:** es lo que ya hay y obliga a repetir la instalación.
- **Instalar en `Program Files`:** requiere administrador y no aporta nada a una app de un usuario.
- **Publicar macOS sin firma:** Gatekeeper bloquea la app y el actualizador no puede aplicarla;
  prometerlo sería peor. Se reevaluará si algún día hay firma.
- **Publicar desde electron-builder en vez de dejar que el workflow suba los assets:** el workflow
  ya decide cuándo hay release y espera a los dos sistemas; duplicar esa decisión crearía carreras.
- **Un instalador propio para cada Linux:** AppImage y deb cubren el caso sin multiplicar el
  mantenimiento.

## Hoja de ruta

### M28 — El escritorio se instala y se actualiza

- [x] Añadir `publish` de GitHub y los metadatos de actualización a `electron-builder.yml`.
- [x] Incluir `latest*.yml` y los `.blockmap` en los artefactos del workflow; sin macOS.
- [x] Añadir `electron-updater` y la comprobación en segundo plano para Windows y Linux.
- [ ] Probar un ciclo de actualización con una versión de prueba y documentar el resultado.
- [x] Dejar macOS fuera hasta que haya firma y notarización; no se publican DMG.

El detalle de lo hecho está en el [changelog](0045-el-escritorio-se-instala-y-se-actualiza.changelog.md).
