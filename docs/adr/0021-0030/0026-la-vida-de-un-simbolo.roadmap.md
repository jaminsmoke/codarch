# Hoja de ruta — ADR 0026 «La vida de un símbolo: la cadena que sobrevive al renombrado»

**Decisión:** [el ADR](0026-la-vida-de-un-simbolo.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-21

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M12 — La vida de un símbolo

**Estado:** ✅ cerrado. El diff habla de símbolos, cada símbolo tiene una cadena que sobrevive a los
renombrados y a las mudanzas, y esa cadena se anida del símbolo al proyecto entero. Decisión en [ADR 0026](0026-la-vida-de-un-simbolo.md).

- [x] **M12.1** El diff de símbolos: comparar dos snapshots símbolo a símbolo dentro de cada
  fichero. El reporte dice "has cambiado `parseDiff`: complejidad +6", no "has tocado `parse.ts`".
  Sección nueva en el reporte → `schemaVersion` `1.3`. La CLI, el comentario del PR y el panel de
  PR de las dos apps lo enseñan ✓.
- [x] **M12.2** La cadena del símbolo: la identidad que sobrevive al renombrado y a la mudanza. El
  hash del cuerpo es la identidad; cada versión lleva dentro el hash de la anterior, así que la
  cadena es reproducible desde el historial. La CLI responde `codarch chain <símbolo>`.
  - [x] El **hash del cuerpo** en la lente: los tokens, sin comentarios y sin el nombre propio, así
    que un reformateo o un comentario nuevo no lo cambian. El mismo código da el mismo hash en el
    navegador y en el CLI ✓ (lo fija el test de paridad ✓).
  - [x] El emparejamiento (las cinco reglas), los eventos y el libro mayor. El libro mayor vive en
    `.codarch/chains.json`: es **derivado**, así que se regenera cuando las fotos cambian ✓.
  - [x] La CLI responde `codarch chain <símbolo>`: la vida de un símbolo, con sus versiones y lo que
    pasó en cada una ✓.
- [x] **M12.3** Ver la vida: la web y el escritorio enseñan la cadena de un símbolo, y el calor por
  símbolo (cuántas veces se ha reescrito cada función) como señal de deuda de refactorización.
