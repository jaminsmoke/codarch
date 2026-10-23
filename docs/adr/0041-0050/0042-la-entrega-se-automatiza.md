# ADR 0042 — La entrega se automatiza

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

La entrega dependía de una persona y de su memoria. El CLI se publicaba a mano con `npm publish`,
OTP mediante; el escritorio se publicaba empujando un tag `desktop-v*`. Las dos cosas funcionan,
pero dejan huecos: una versión puede quedarse sin publicar porque nadie lanzó el comando, un tag
puede apuntar a un commit que no es el que se construyó, y el pin de la acción se actualiza cuando
alguien se acuerda.

ADR 0032 y ADR 0041 ya dejaron **una** versión para el producto, el CLI, el escritorio y el MCP.
Esa versión vive en `versions.json` y `npm run version -- <x>` la propaga. Lo que faltaba era que
la publicación mirase esa versión, no una instrucción manual.

## Decisión

### 1. El CLI se publica con Trusted Publishing

`.github/workflows/publish-cli.yml` publica `codarch` en npm con **OIDC** (`id-token: write`), sin
`NPM_TOKEN` ni OTP. La configuración de npm está fijada al repositorio `jaminsmoke/codarch` y al
workflow `publish-cli.yml`; si el workflow cambia de nombre, hay que recrear la conexión.

El workflow:

- se lanza a mano (`workflow_dispatch`) mientras se valida el canal;
- solo corre desde `main`;
- lee la versión de `versions.json` y **no hace nada** si esa versión ya está en npm;
- construye la web y el CLI y publica con la etiqueta que toca: `next` para una prerelease,
  `latest` para una estable;
- usa Node 24 y npm 11.5.1 o superior, que son los mínimos de Trusted Publishing.

La primera publicación valida la conexión. Después, el workflow puede pasar a un `push` cuando el
equipo quiera; el `workflow_dispatch` sigue siendo la salida para reintentar.

### 2. El escritorio se publica solo cuando la versión sube

`.github/workflows/desktop.yml` tiene tres trabajos:

1. **`prepare`** lee `versions.json` y las releases `desktop-v*`, y compara las versiones con
   `packages/versions`. Si la versión del producto no es mayor que la última publicada, no se
   construye nada.
2. **`build`** empaqueta Windows, macOS y Linux solo si `prepare` dice que hay algo que construir.
   Un PR y un `workflow_dispatch` construyen siempre para poder probar; un push solo construye
   cuando hay versión nueva.
3. **`release`** espera a que los tres builds terminen y crea el tag `desktop-v<versión>` y la
   release de GitHub con los instaladores. El tag se crea **después** del build: si un instalador
   falla, no queda un tag sin artefactos.

El tag y la release los crea el workflow con `GITHUB_TOKEN`. Un tag creado así **no vuelve a
disparar** el workflow, así que no hay bucle. Ya no se empuja `desktop-v*` a mano; el workflow es
la única puerta. Si hay que reintentar, se relanza el workflow.

El comprobador del escritorio no pregunta a `/releases/latest`, que excluye las prereleases: pide la
lista de releases y elige la versión más alta, incluidas las prerelease. Si no, una alpha recién
publicada sería invisible para la app que tiene que actualizarse a ella.

### 3. Una versión, una entrega

Un cambio de `product` puede publicar CLI y escritorio a la vez aunque solo haya cambiado uno. Es
el precio de tener una sola versión (ADR 0032): el producto se entrega como un conjunto. El coste
es pequeño —una alpha más— y la alternativa, dos versiones que se separan, ya se descartó.

El pin de la acción de GitHub se actualiza **después** de publicar el CLI, como dice ADR 0041. No
se pone una versión que todavía no está en npm.

## Consecuencias

- Publicar deja de ser un ritual: se sube la versión, se empuja a `main` y el CI decide.
- Un push que no sube versión no gasta tres builds de Electron.
- Un build fallido no deja tag ni release a medias.
- La release del escritorio queda marcada como prerelease cuando la versión lleva `-`. La alpha.2
  se marcó como `latest` una vez, como puente para los clientes que todavía tenían el comprobador
  anterior; las siguientes vuelven a ser prerelease.
- El CLI conserva el canal `next` mientras el producto sea alpha; `latest` no se mueve sin una
  versión estable.
- La conexión de npm caduca si la primera publicación no llega en dos días. Es una condición de
  npm, no del repo; si caduca, se recrea.

## Alternativas descartadas

- **Seguir publicando a mano**: es lo que ya falló; el tag y el pin se desincronizan sin avisar.
- **Publicar en cada push**: construiría el escritorio por cambios que no cambian la versión y
  llenaría las releases de ruido.
- **Crear el tag antes del build**: si un sistema falla, el tag ya existe y la release queda
  incompleta.
- **Guardar un `NPM_TOKEN` permanente**: es justo lo que Trusted Publishing evita.
- **Versiones separadas para CLI y escritorio**: choca con ADR 0032 y multiplica las decisiones.

## Hoja de ruta

### M25 — La entrega se automatiza

- [x] El CLI se publica con Trusted Publishing (`publish-cli.yml`), sin token permanente.
- [x] La conexión de npm está creada y validada con `0.3.0-alpha.2`.
- [x] El escritorio compara `versions.json` con la última release `desktop-v*`.
- [x] El workflow construye y crea el tag y la release en la misma ejecución.
- [x] La acción de GitHub se actualiza después de publicar; `codarch-action@v1` apunta al pin nuevo.
- [x] Validar el primer release automático del escritorio con `desktop-v0.3.0-alpha.2`.

### Ideas abiertas

- Decidir si `publish-cli.yml` pasa de `workflow_dispatch` a `push`; hoy el manual sigue siendo
  la salida para reintentar y para no publicar sin querer.

El detalle de lo hecho está en el [changelog](0042-la-entrega-se-automatiza.changelog.md).
