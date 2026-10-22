# ADR 0027 — Los ajustes: un sitio donde se configura todo

**Estado:** aceptado ✅ · **Fecha:** 2026-10-21

## Contexto

Hoy las preferencias están dispersas: la métrica de área y el modo de color se guardan en
`localStorage` ✓, el proyecto guardado también ✓, y **no hay ningún sitio donde se vea ni se cambie
todo junto** ✓. El usuario abre la app y no tiene forma de saber qué está configurado ✓.

Va a hacer falta un sitio así, porque el **store de plugins** (ADR 0028 ✓) es una sección más de los
ajustes ✓. Y los ajustes son útiles por sí solos ✓: cambiar la métrica de área sin buscar el control
en la barra lateral ✓, ver qué proyecto está guardado ✓, saber qué versión se está usando ✓.

El escritorio ya tiene menú nativo ✓ (ADR 0021 ✓), pero no tiene ajustes ✓.

## Decisión

1. **Un panel de ajustes, con secciones.** Se abre desde un botón en la barra lateral ✓ y, en el
   escritorio, también desde el menú nativo ✓ (que manda la orden por IPC ✓). Las secciones:

   | sección | qué hay |
   |---|---|
   | **Vista** | la métrica de área ✓, el modo de color ✓, la carpeta enfocada ✓ |
   | **Proyecto** | el proyecto guardado ✓, borrarlo ✓, si está persistido ✓ |
   | **Plugins** | el store ✓ (ADR 0028 ✓) |
   | **Diagnóstico** | la versión ✓, la versión del formato ✓, el checksum ✓, el estado del almacenamiento ✓ |

2. **Lo que se ajusta se guarda donde estaba.** Las preferencias siguen en `localStorage` ✓ (la web ✓)
   o en el almacén del escritorio ✓. Los ajustes no inventan un sitio nuevo para lo que ya tenía
   sitio ✓: **mover** sería cambiar el comportamiento de lo que ya funciona ✓.

3. **Los ajustes son locales, no del proyecto.** Cambiar la métrica de área de un repositorio no
   cambia el análisis de nadie más ✓. El repo declara sus reglas ✓; la app es la herramienta ✓.

4. **Sin meter una biblioteca completa.** La app tiene una estética propia ✓ (el treemap denso ✓, el
   tema oscuro ✓) y una biblioteca de componentes con su propia estética pelearía con ella ✓. La
   decisión es **headless + nuestro sistema de diseño**: primitives accesibles (el diálogo ✓, el
   interruptor ✓) y el CSS de la app ✓ sobre las variables que ya existen ✓.

## Consecuencias

- Los ajustes son el sitio natural donde crece el store ✓ (ADR 0028 ✓), y donde el usuario
 ve si algo va mal ✓.
- El panel es un componente **copiado** en las dos apps ✓ (ADR 0021 ✓): la web y el escritorio tienen
  su propia copia ✓ y solo comparten el motor ✓.
- Los primitives headless son una dependencia nueva ✓ (npm ✓, con su `allowScripts` si lo
  necesita ✓).
- Los ajustes no tocan el snapshot ✓ ni el reporte ✓: son de la app ✓, no del análisis ✓.

## Alternativas descartadas

- **Un diálogo del sistema operativo** para los ajustes. Descartado: el escritorio ya es una app con
  su propia UI ✓, y las preferencias de la web y del escritorio tienen que verse igual ✓.
- **Los ajustes dentro de la barra lateral**. Descartado: la barra es para el *contenido* del
  análisis ✓; los ajustes son otra cosa ✓ y no caben ✓.
- **Una biblioteca de componentes completa** (con su diseño). Descartado: pelearía con la estética
  propia ✓ y obligaría a rehacer CSS que ya funciona ✓.

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
