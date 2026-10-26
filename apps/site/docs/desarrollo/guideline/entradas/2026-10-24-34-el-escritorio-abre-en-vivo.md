---
title: El escritorio abre en vivo
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: cerrar la investigación de por qué la app de escritorio "va peor" que la web. Medido con
la app real, el hook compartido no era el problema: el hook cuesta milisegundos. Eran tres cosas del
escritorio, y dos ya estaban arregladas.

**Las causas, con números**:

1. **El análisis corría en el proceso principal** (arreglo de «El escritorio analiza sin
   congelarse»): de 4 a 8 s con la ventana sin responder a clics acusados en 1 ms.
2. **El parser daba tres vueltas al árbol** (arreglo de «El parser lee el árbol una vez»): el
   análisis de este repositorio baja de 5 330 ms a 2 590 ms.
3. **Abrir un repositorio con `.codarch/` escrito dejaba la app congelada** 🔧. `openTarget` leía el
   snapshot guardado, lo pintaba y **volvía**, sin arrancar el vigilante ni reanalizar. Resultado: el
   mapa se veía al instante, pero no se enteraba de ningún guardado y la cabecera decía
   `sin vigilancia`. Abrir por argumento, por «abrir con» o arrastrando la carpeta caía ahí; el
   arranque normal (restaurar el último repo) sí vigilaba, así que el fallo dependía de cómo abrías.

**Qué cambió**:

- `openTarget`: después de pintar lo guardado, `watchRoot(target)` y un refresco de fondo a los
  400 ms, igual que al restaurar el último proyecto.
- `main.ts`: al cargar la ventana se manda el estado de la vigilancia (`did-finish-load`). Antes solo
  se mandaba al arrancar el vigilante, y si el aviso llegaba antes que el renderer, la cabecera se
  quedaba en `sin vigilancia` para siempre.

**Medido en la app real** (este repositorio, 274 ficheros, ventana al frente, depurador de Chromium):

| | Antes | Ahora |
|---|---|---|
| Abrir por argumento · mapa pintado | 623 ms | **696 ms** |
| Cabecera · vigilancia | `sin vigilancia` | **`live`** |
| Guardar un fichero · mapa al día | nunca (0 eventos) | **3,1 s** (0,3 de agrupado + 2,7 de análisis) |
| Arranque normal · mapa pintado | — | 697 ms con el snapshot guardado, y `live` |
| Proceso principal durante el análisis | — | IPC con mediana 1 ms y peor 2 ms |
| Coste del hook por snapshot | — | `JSON.parse` 1 ms · modelo 2 ms · layout 1 ms |

El refresco de fondo que corre al arrancar tarda 2,6 s y no estorba: la ventana ya está pintada y el
principal sigue contestando en 1 ms. Lo que queda entre guardar y ver el cambio es el análisis, no la
app.

**Queda abierto**:

- Analizar una **subcarpeta** no hereda los `.gitignore` de arriba: `codarch analyze apps/cli` se traga
  `dist/` y tarda 20 s en 38 ficheros. Es de hoy, no del escritorio: la misma raíz desde la web
  tardaría lo mismo.
- El refresco `live` aplica el snapshot con `preserveView = false`: al guardar se pierden área, color y
  foco. El mapa se actualiza, pero la vista salta.
- Cada arranque reanaliza el repo en segundo plano aunque el snapshot guardado sea el mismo. Cuesta
  2,6 s de CPU y es lo que mantiene el mapa al día si el repo cambió cerrado; se puede evitar mirando
  fechas, a costa de no detectar cambios sin commit.

**Veredicto**: arreglo; no necesita ADR. El hook compartido (`useCodarchApp`) no cambia: lo que
cambia es lo que la cáscara del escritorio conecta a él.
