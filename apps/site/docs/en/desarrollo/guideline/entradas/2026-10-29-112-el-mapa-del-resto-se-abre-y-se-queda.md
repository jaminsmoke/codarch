---
title: "The rest map opens and stays open"
date: "2026-10-29"
category: "fix"
verdict: "arreglo"
---

**What it was**: clicking `Docs y config` left the stage on "No se pudo dibujar el mapa: la métrica de color «kind» no existe en este cc.json", and when it did open it went back to the code map on its own a few seconds later. Both failures came from colour by kind: the render accepted only `risk`, `structure` or a metric name, and `loadSnapshot` had started depending on the active map to avoid trampling the rest's view on a refresh.

**What changes**: the `kind` lens is one more lens of the model —it reads no metric: it paints the file's kind and the PNG legend counts the four—, and the area and colour kept on a refresh are read by reference to the active map, so `loadSnapshot` gets its stable identity back. Without that, switching maps re-ran the web session boot, which reloads the snapshot without preserving the view and threw away the rest that had just been opened.

**Why like this**: a map switch cannot change the identity of a function that the web boot hangs off; the active map is data of the moment, not a dependency of loading. And kind, like structure, is not a metric: asking for it as a colour must not require it to exist in the snapshot.

**Verified**: in a real browser, with `serve` and live on, the rest map opens with its legend (`Documentos 454 · Configuración 42 · Assets 38 · Otros 23`) and is still there seven seconds later; adding and deleting a document updates it without leaving the map, and going back to code restores its area and colour. The full suite and lint stay green.

**Verdict**: fix done.
