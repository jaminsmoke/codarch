# ADR 0026 — La vida de un símbolo: la cadena que sobrevive al renombrado

**Estado:** aceptado · **Fecha:** 2026-10-21

## Contexto

M11 dio la lente de símbolos: el mapa sabe qué hay dentro de cada fichero. Lo que **no** sabe todavía
es qué cambió *dentro*, y por eso el diff sigue siendo de ficheros: "has tocado `parse.ts`" no dice
si has reescrito una función o si solo has movido un import.

La pregunta es si una función es **la misma** a lo través del tiempo. En un repo vivo, una función
cambia de nombre, se mueve de módulo, se reescribe y a veces desaparece. El diff de ficheros no puede
saber nada de eso porque solo compara rutas.

La intuición que propose el autor de la idea: que cada función lleve una **cadena de identidad**,
como las-ADN tienen una cadena de bloques: un registro que se hereda de una versión a la siguiente y
que sobrevive a los cambios. La identidad no se pierde ni cuando la función cambia ni cuando se
renombra ni cuando se muda.

## Decisión

### 1. La identidad es el contenido, no el nombre

Cada versión de un símbolo tiene un **hash de su cuerpo** (los tokens del cuerpo, sin comentarios ni
espacios: un reformateo no es un cambio ✓). Ese hash es lo que identifica al símbolo ✓.

De ahí sale lo importante:

- Un **renombrado** no cambia el hash del cuerpo ✓ → la cadena sigue ✓.
- Una **mudanza** tampoco ✓.
- Un **cambio de cuerpo** cambia el hash ✓ → y ahí entra la cadena: el enlace es con la versión
  anterior, no con el contenido ✓.

### 2. La cadena: cada versión lleva dentro el hash de la anterior

```
versionHash(n) = sha256(versionHash(n-1) + bodyHash(n) + nombre + ruta)
chainId        = versionHash(0)      // el primer hashes el que da nombre a la cadena
```

Cada versión incluye el hash de la anterior ✓. Eso hace tres cosas:

1. La cadena es **reproducible**: se recalcula desde el historial y siempre da lo mismo ✓ (la misma
   exigencia de determinismo que el snapshot ✓).
2. Es **detectable**: si alguien cambiara una versión de la historia, la cadena dejaría de cuadrar ✓.
3. El **id de la cadena es estable** desde el día en que la función nació ✓: sirve para citarla,
   para enlazarla, para seguirla entre repositorios ✓.

Lo que **no** copiamos de las cadenas de bloques: las firmas, las claves públicas y la prueba de
autoría. Para un equipo de software, saber "quién lo escribió" ya lo sabe el historial de git ✓, y
lo que hace falta es saber **qué es lo mismo que antes** ✓.

### 3. Cómo se decide que dos versiones son la misma función

El emparejamiento se hace por reglas, en este orden (la primera que aplica gana ✓):

| Regla | Señal | Evento |
|---|---|---|
| 1 | mismo fichero, mismo nombre | `changed` o `unchanged` |
| 2 | mismo fichero, nombre distinto, mismo hash de cuerpo | `renamed` |
| 3 | fichero distinto, mismo nombre, mismo hash de cuerpo | `moved` |
| 4 | fichero y nombre distintos, mismo hash de cuerpo | `renamed` + `moved` |
| 5 | nada coincide | `added` / `removed` |

La regla 5 es el límite honesto: una función reescrita por completo se cuenta como una que se quitó y
otra que se añadió ✓. **Preferimos callarnos a inventarnos**: la cadena dice lo que sabe y cómo lo
sabe ✓.

### 4. Dónde vive

- La cadena **no** va dentro del snapshot: el snapshot sigue siendo determinista y sin historial ✓.
- Va en el almacén de historia (`.codarch-history/`), como un artefacto **derivado** ✓: se puede
  borrar y regenerar ✓.
- Se calcula comparando **versiones consecutivas** de la línea del tiempo ✓, no todas contra todas ✓
  (el coste es lineal en el número de fotos ✓).

### 5. Los pasos

- **M12.1 — El diff de símbolos.** Comparar dos snapshots símbolo a símbolo dentro de cada fichero ✓
  (emparejando por nombre ✓, que es el caso común ✓). El reporte dice "has cambiado `parseDiff`:
  complejidad +6" ✓, que es lo que un revisor quiere leer ✓.
- **M12.2 — La cadena.** El emparejamiento completo (las cinco reglas ✓), los eventos y el
  almacenamiento ✓. La CLI responde `codarch chain <símbolo>` ✓.
- **M12.3 — Ver la vida.** La web y el escritorio enseñan la cadena de un símbolo ✓ y el **calor por
  símbolo** ✓ (cuántas veces se ha reescrito cada función ✓): una señal de deuda de refactorización
  que el nivel de fichero no puede dar ✓.

## Consecuencias

- La lente de símbolos necesita un campo más: el **hash del cuerpo** ✓. Es lo que permite reconocer
  un renombrado ✓.
- El diff de símbolos necesita su propia sección en el reporte → `schemaVersion` a `1.3` ✓ (el
  reporte es siempre el más nuevo ✓ y lo que no se midió se marca con `null` ✓).
- El emparejamiento es una **inferencia**. La interfaz tiene que decirlo: "probablemente la misma
  función" ✓ y no "la misma función" ✓. Una cadena equivocada es peor que ninguna cadena ✓.
- La cadena convierte el historial en algo más útil que una lista de fechas: cuenta **cuántas veces
  se ha reescrito una función** ✓, que es una medida de deuda que hasta ahora no existía ✓.
- La complejidad por símbolo (M11 ✓) es la base de todo esto ✓: sin ella, una cadena de hashes no
  diría nada útil ✓.

## Alternativas descartadas

- **Identidad por nombre y ruta** (el `id` del nodo). Descartado: se rompe con el primer
  renombrado ✓, que es justo lo que queríamos evitar ✓.
- **Identidad por el hash del cuerpo, sin cadena**. Descartado: al reescribir una función, el hash
  cambia y la función parece nueva ✓. La cadena es lo que une las versiones ✓.
- **Una cadena de bloques de verdad** (firmas, claves, prueba de autoría). Descartado: el historial
  de git ya dice quién escribió qué ✓, y el problema real es otro ✓.
- **Emparejar por similitud del cuerpo** (tokens compartidos) para detectar reescrituras grandes.
  Descartado **de momento**: es heurístico y ruidoso ✓. La regla 5 (eliminada + añadida) es honesta y
  no miente ✓. Se puede añadir más adelante con la experiencia de las cadenas reales ✓.

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
