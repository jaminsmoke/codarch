---
title: La línea de la guía rueda
date: "2026-10-28"
category: feature
verdict: arreglo
---

**Qué era**: la barra de días de la guía no reconocía su propia dirección. El parser buscaba el tramo `guia` en la primera posición, así que cualquier ruta —también la de un día concreto— caía al último día y el día marcado nunca era el de la URL. Tampoco había carrete: los días se desbordaban. Y la línea que debía acompañarlos era un `h-px` pegado al borde inferior del bloque, fuera de la composición y sin señalar nada.

**Qué es**: el día abierto vive siempre en el centro y el resto es un carrete. Los vecinos se hunden por distancia —opacidad, desenfoque y escala— y los de más allá se deshacen en niebla, que también funde los bordes. Se puede arrastrar con el puntero y, al soltar, el carrete sigue rodando con la velocidad del gesto, frena y encaja en la pastilla más cercana; solo entonces se abre ese día. La vía es un raíl de 2 px bajo las pastillas, teñido de rust hasta el día abierto y gris por delante, con un testigo de 2 × 8 px que lo señala: viaja con la pista, no con la ventana, y entra y sale con la misma niebla.

**Por qué así**: la física vive aparte, en [`apps/site/src/lib/carrete.ts`](https://github.com/jaminsmoke/codarch/blob/main/apps/site/src/lib/carrete.ts), para poder fijarla con tests en vez de ajustarla a ojo. La velocidad sale de los últimos 120 ms del gesto y se proyecta 150 ms más, con tope de 280 px: un tirón corto recorre uno o dos días y uno largo no se va de las manos. El imán tarda 260–480 ms según el recorrido, con una curva de resorte que se pasa un pelo antes de encajar. Soltar después de una pausa no es un tirón —las muestras viejas se descartan contra el instante de soltar—, y durante el vuelo el carrete no acepta punteros, para que un segundo gesto no lo corte a medias. La navegación espera al encaje porque el salto inmediato era lo que hacía que un gesto pareciera un corte.

**Cómo se comprueba**: `apps/site/test/carrete.test.ts` cubre la velocidad con su ventana y sus topes, la inercia, el empate del imán y la duración del vuelo (11 casos); `apps/site/test/guia.test.ts` mantiene que la ruta se lea buscando `guia` en cualquier posición (24 casos). En el navegador: el día abierto queda a 0,3 px del centro y el testigo a 0,1, en escritorio y a 390 px de ancho; un arrastre corto vuelve al centro en unos 140 ms sin navegar; soltar tras una pausa encaja en un día y no en dos; y un clic normal sigue abriendo el día al instante. Lo que no se pudo medir fue un tirón rápido real: con la pestaña en segundo plano el navegador limita sus temporizadores a un segundo.

**Veredicto**: arreglo, sin fase ni ADR. La barra de días ya lee la ruta y el carrete tiene su física medida; si al usarlo se pasa de largo, los números que lo gobiernan están arriba de todo en `carrete.ts`.
