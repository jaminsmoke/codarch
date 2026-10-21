# ADR 0021 — App de escritorio (Electron) con código copiado, no compartido

**Estado:** aceptado · **Fecha:** 2026-10-21

## Contexto

La app web (M5/M6) ya sabe analizar un repositorio en el navegador, con la misma gramática y el
mismo checksum que el CLI. Funciona bien en un navegador de escritorio, pero tiene límites:

- El File System Access API solo existe en Chromium. En Firefox y Safari no se puede elegir una
  carpeta: hay que tirar de `webkitdirectory`, que carga todo en memoria.
- La web no puede leer el historial de git, así que su snapshot no lleva churn.
- No hay integración con el sistema: no "abrir con", no arrastrar una carpeta a la ventana, no
  barra de menú nativa.
- Sin servidor local, cada recarga repite el análisis.

Una app de escritorio resuelve todo eso. La pregunta es cómo se relaciona con la web.

## Alternativas

### A. Electron que empaqueta la web

Electron carga la web y el "escritorio" es solo el envoltorio. Es lo que hacen casi todas las apps
modernas.

El problema no es Electron: es **la dependencia**. Si la app de escritorio importa componentes de
`apps/web`, cada cambio en la web rompe el escritorio y cada cambio en el escritorio rompe la web.
Con dos ciclos de release independientes (npm para la web, un instalador para el escritorio), eso
es un custo continuo: hay que decidir qué pasa primero cuando los dos cambian a la vez.

### B. Electron con su propia copia de la UI

El escritorio tiene su propio árbol de componentes. La web y el escritorio evolucionan por separado.

El coste es duplicar la UI. El beneficio es que **la frontera queda explícita**: cada app puede
hacer lo que quiera sin romper la otra, y una puede morir sin arrastrar a la otra.

### C. No hacer app de escritorio

El CLI ya cubre el uso local (`codarch serve`), la acción cubre el CI y la web cubre el visor.
Una app de escritorio sería un tercer camino para lo mismo.

## Decisión

**Opción B: app de escritorio con su propia copia de la UI.**

1. **Copiar, no compartir.** `apps/desktop` tendrá su propio árbol de componentes. No importa de
   `apps/web`. La copia es explícita y está en el repositorio, no escondida en un build.
2. **El motor sí se comparte.** Los paquetes de `packages/` (schema, parsers, metrics, layouts,
   render) son la verdad del producto y se usan igual en las dos apps. Lo que se duplica es la
   capa de presentación.
3. **El escritorio usa el CLI en proceso**, no el navegador: el análisis va contra el disco de
   verdad, con git y sin límites de memoria. Es la diferencia que hace que valga la pena.
4. **La web sigue siendo la primera.** Es la que se abre desde un enlace, la que vive en el CI y la
   que no necesita instalar nada. El escritorio es para quien trabaja en local.

## Consecuencias

- La UI se escribe dos veces. Es un coste real y se asume: es el precio de la independence.
- Las dos apps pueden tener sistemas visuales distintos. La de escritorio puede usar menús nativos,
  atajos de sistema y el tema del sistema operativo sin arrastrar a la web.
- Un cambio en el motor (`packages/`) llega a las dos apps a la vez, y eso es lo que debe pasar:
  el modelo es la verdad.
- Habrá que mantener los dos builds. El CI tiene que comprobar las dos.
- La documentación tiene que decir cuál usar: la web para mirar, el escritorio para trabajar.

## Alternativas descartadas

- **A. Electron empaquetando la web.** Una sola UI, pero dos apps atadas: cualquier cambio de la
  web rompe el escritorio y al revés. Con ciclos de release independientes, esa atadura se paga
  cada semana.
- **C. No hacer app de escritorio.** Es la opción de no hacer nada. Se descarta porque el análisis
  en navegador tiene límites reales (sin git, sin Firefox, sin integración con el sistema) y el
  producto ya tiene la base para resolverlos.
- **Tauri en vez de Electron.** Tauri es más ligero y usa el motor del sistema, pero su API de
  ficheros y su integración con el sistema son más jóvenes y menos documentadas que los de
  Electron. Para v1, Electron es la opción con menos rodeos.
