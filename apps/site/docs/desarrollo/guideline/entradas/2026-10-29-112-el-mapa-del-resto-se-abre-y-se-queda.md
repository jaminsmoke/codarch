---
title: "El mapa del resto se abre y se queda"
date: "2026-10-29"
category: "fix"
verdict: "arreglo"
---

**Qué era**: al pulsar `Docs y config` el escenario se quedaba en «No se pudo dibujar el mapa: la métrica de color "kind" no existe en este cc.json», y cuando llegaba a abrirse volvía solo al mapa del código unos segundos después. Los dos fallos venían del color por tipo: el render solo aceptaba `risk`, `structure` o el nombre de una métrica, y `loadSnapshot` pasó a depender del mapa activo para no pisar la vista del resto en un refresco.

**Qué cambia**: la lente `kind` es una lente más del modelo —no lee ninguna métrica: pinta el tipo del fichero y la leyenda del PNG cuenta los cuatro—, y el área y el color que se conservan en un refresco se consultan por referencia al mapa activo, así que `loadSnapshot` recupera su identidad estable. Sin eso, cambiar de mapa volvía a lanzar el arranque de la sesión de la web, que recarga el snapshot sin conservar la vista y tiraba el resto recién abierto.

**Por qué así**: un cambio de mapa no puede cambiar la identidad de una función de la que cuelga el arranque de la web; el mapa activo es un dato de ahora, no una dependencia de la carga. Y el tipo, como la estructura, no es una métrica: pedirlo como color no debe exigir que exista en el snapshot.

**Verificado**: en un navegador real, con `serve` y el live encendidos, el mapa del resto abre con su leyenda (`Documentos 454 · Configuración 42 · Assets 38 · Otros 23`) y sigue ahí a los siete segundos; añadir y borrar un documento lo actualiza sin salirse del mapa, y volver al código recupera su área y su color. La suite completa y el lint siguen en verde.

**Veredicto**: arreglo hecho.
