---
title: La actualización mira la release, no el feed
date: "2026-10-25"
category: fix
verdict: arreglo
---

**Qué era**: la app instalada buscaba sus metadatos en `releases/download/v1/latest-linux.yml` y recibía un
404. `electron-updater` resuelve la etiqueta de dos maneras: si `allowPrerelease` está activo y la versión
instalada es estable, se queda con la **primera entrada** del feed de GitHub; si no, pregunta por la última
release. El feed no trae solo releases: desde que el workflow mueve la etiqueta `v1` de la acción, esa
etiqueta suelta sin versión aparece la primera. La app pedía los metadatos ahí, donde no hay ninguno. En
Windows pasaba lo mismo con `latest.yml`; solo se notó antes en Linux porque ese instalador era el recién
estrenado.

**Qué cambió**: la app ya no deja que electron-updater adivine la etiqueta. Al arrancar —y al pulsar
**Actualizar y reiniciar**— pregunta la lista de releases, descarta los borradores y las etiquetas sin
versión, se queda con la mayor y fija la base de descarga en `releases/download/v<versión>`. El canal no
cambia: `latest.yml` en Windows y `latest-linux.yml` en Linux, con los `.blockmap` al lado, así que la
actualización diferencial sigue igual. Si la lista no se puede leer, la comprobación automática se salta y
se reintenta en el siguiente arranque, en vez de pedir metadatos a una etiqueta equivocada.

**Por qué no se arregló con una línea**: apagar `allowPrerelease` también lo tapaba hoy, porque la última
release del repositorio sí es la de verdad. Pero dejaba la app dependiendo de lo mismo que la rompió —el
orden y el contenido de un feed que no controlamos— y le quitaba las versiones de prueba. Preguntar y fijar
la base quita la suposición entera, y el resultado coincide con lo que ya enseña la sección
**Actualizaciones**, que siempre usó esta misma lista.

**Números**: un fallo de instalación que llegaba a las dos plataformas, cero cambios en el formato de la
release, cuatro casos nuevos en `apps/desktop/test/updates.test.ts` —entre ellos el feed que empieza por
`v1`— y nada que tocar en `cc.json` ni en el checksum.

**Veredicto**: arreglo, hecho. [ADR 0045](../../adr/0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md).
