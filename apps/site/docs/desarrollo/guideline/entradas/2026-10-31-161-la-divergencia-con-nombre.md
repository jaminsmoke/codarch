---
title: "La divergencia, con nombre"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**Qué era**: la duplicación ya se medía y se pintaba (M68 y M69), y la ficha del fichero enseñaba sus
pares, pero el proyecto y la carpeta solo daban la cifra. Saber que el 3 % del `rloc` está copiado no
dice **entre quiénes** ni **cuáles se están separando**, que es lo que se puede arreglar.

**Qué cambia**: el modelo gana `duplication.list`, la lista de pares con sus dos extremos y las rutas
del mapa, ordenada una vez por similitud, líneas y rutas. La ficha de proyecto y la de carpeta
enseñan esa lista con su estado —`copia` o el porcentaje—, sus líneas y un filtro **Todos / Copias /
Divergentes** con la cuenta de cada estado. Cada extremo es un botón que abre su ficha. La ficha del
fichero, además, avisa con nombre: «comparte el 72 % con `…`: las dos copias se están separando», en
lugar de dejar el porcentaje solo en la fila.

**Por qué así**: un par cuenta en un subárbol cuando sus **dos** ficheros están dentro; el que cruza
la frontera es de la carpeta padre, porque contarlo en los dos lados sumaría dos veces las mismas
líneas. La lista no reordena: hereda el orden determinista del snapshot y el filtro solo decide qué se
enseña, así que dos análisis del mismo árbol dan las mismas filas. `pairsByNode` se queda porque la
ficha de un fichero habla desde un lado, y `list` porque la de proyecto habla desde los dos.

**Verificado**: la suite completa queda en **177 ficheros y 1539 tests**. Tests nuevos del modelo (la
lista con las rutas del mapa, el orden con empate de similitud y el par con un extremo fuera), de la
lista (el filtro por estado, las cuentas y la regla de la frontera), de la ficha de proyecto (los
dos extremos, las cuentas del filtro) y del aviso de divergencia con nombre. Typecheck y lint
limpios.

**Veredicto**: hecho. M70 cierra; queda M71, la duplicación en el diff.
