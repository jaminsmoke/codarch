---
title: "El resto se lee por tipo"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: con el [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) el resto ya tenía su botón y su carga, pero su color seguía siendo el tamaño: el raíl no tenía una lente que dijera qué es cada fichero y la leyenda no tenía versión por tipo.

**Qué cambia**: el modelo del mapa lleva el `kind` de la lente `rest` en cada fichero, el color del resto pasa a ser su tipo —Documentos, Configuración, Assets u Otros— con cuatro tonos apagados, y la leyenda cuenta cuántos hay de cada uno, callando los que no existen. El tamaño queda como un color más del selector. Al cambiar al mapa del resto su color inicial es el tipo; al volver al código se recuperan el área y el color que tenía, y un refresco del live con el resto delante ya no los pisa.

**Por qué así**: el tipo ya se calculaba al recorrer, así que era lo que el mapa sabía y no enseñaba. Se pinta desde `RenderFile.kind` y no volviendo al snapshot porque el color lo consumen también los plugins ([ADR 0028](../../adr/0021-0030/0028-los-plugins.md)), que no tienen por qué llevar el resto cargado. Cuatro tonos y no uno por extensión: el color dice la familia, y una leyenda con cuarenta colores no se lee.

**Lo que falta**: los estratos agrupados por `kind` y la ficha propia del fichero que no es código; las reglas del resto, en su ADR.

**Veredicto**: fase en marcha.
