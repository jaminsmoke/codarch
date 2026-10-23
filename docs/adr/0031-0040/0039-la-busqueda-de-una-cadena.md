# ADR 0039 — La búsqueda de una cadena: símbolos, no nodos

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

`get_symbol_chain` promete «la vida de un símbolo» y, en la misma frase, el **calor** del repo. La
auditoría de este repositorio (2026-10-23) encontró cuatro cosas que no cuadraban con esa promesa:

- Sin `symbol`, la herramienta devolvía `available: false` y el calor vacío, aunque
  `chainsPayload` ya sabe devolver el calor sin símbolo y las dos apps lo usan así. El parámetro
  opcional no servía para nada.
- La búsqueda recorría **todos** los niveles de la cadena y solo miraba el nombre y la ruta
  actuales. Pedir `src` podía devolver la cadena de una carpeta; pedir el nombre anterior de una
  función renombrada no devolvía nada, aunque la cadena conserva ese nombre en sus versiones.
- El esquema del MCP permitía `limit` hasta 50, pero el payload cortaba en 20 sin decirlo.
- `buildChains` y `summarizeChains` guardaban `kind: "function"` para cualquier símbolo. Una clase,
  una interfaz o un tipo perdían su condición en la cadena y en el calor.

No es una lente nueva ni un cambio de formato: es una consulta que no estaba diciendo la verdad
sobre lo que ya había.

## Decisión

### 1. Sin símbolo, el calor

Si no se pasa `symbol` (o se pasa vacío), `get_symbol_chain` devuelve el **calor del repo**: los
símbolos más reescritos, ordenados por ruido. No devuelve cadenas. Si no hay historial, sigue
devolviendo `available: false` con el motivo; sin fotos no hay calor que calcular.

Esto es lo mismo que ya hacen la web y el escritorio con `chainsPayload(root, null)`. El MCP deja
de ser la excepción.

### 2. Con símbolo, solo símbolos

La búsqueda se limita a las cadenas de nivel `symbol`. El nombre o la ruta pueden ser los actuales
o los de **cualquier versión** de la cadena: así se encuentra una función por el nombre que tenía
antes de un renombrado, o por la carpeta de la que se mudó. La comparación es por subcadena y sin
distinguir mayúsculas, como el resto de búsquedas del producto. No se buscan ficheros, carpetas ni
el proyecto: para eso están el mapa y `explain_module`.

### 3. El límite se cumple

`limit` acota las cadenas devueltas y se respeta hasta 50. El valor por defecto del MCP es 10; el
payload compartido usa 20 para las apps. No hay un recorte escondido por debajo del límite pedido.

### 4. Cada símbolo conserva su tipo

La cadena guarda el `kind` real del símbolo (`function`, `class`, `interface`, `type`, `enum` o
`variable`) y el calor lo repite. Si una versión cambia de tipo y la cadena se mantiene por el
cuerpo, la cadena muestra el tipo de la última versión. Los ficheros, carpetas y el proyecto siguen
usando su propio nivel como `kind`.

### 5. Nada del snapshot cambia

El formato de `cc.json` y el checksum no cambian. La consulta lee las cadenas que ya existen; el
arreglo es de búsqueda y de presentación. El libro mayor es un artefacto derivado: sube a la
versión 2 para que las cadenas calculadas antes de este arreglo se rehagan y no conserven el
`kind` antiguo.

## Consecuencias

- Un agente puede pedir solo el calor, sin inventarse un símbolo, y puede encontrar una función
  por el nombre que tenía antes del renombrado.
- Las dos apps buscan solo símbolos, que es lo que ya pedían al inspector; una búsqueda de una
  carpeta deja de devolver una cadena que no era de un símbolo.
- El `kind` del calor deja de mentir: una interfaz caliente se ve como interfaz.
- El `limit` del MCP deja de tener un techo oculto de 20.
- La CLI conserva su vista de todos los niveles cuando no se le pasa símbolo; su búsqueda con
  símbolo se alinea con esta decisión para que no haya dos significados de «cadena».

## Alternativas descartadas

- **Seguir rechazando la llamada sin `symbol`**: desperdicia el calor que el payload ya calcula y
  contradice la descripción de la herramienta.
- **Buscar en todos los niveles**: convierte una consulta de símbolo en una consulta de fichero o
  carpeta y puede devolver el proyecto entero.
- **Buscar solo el nombre actual**: un renombrado hace que el símbolo sea imposible de encontrar
  por su nombre anterior, que es justo lo que la cadena promete conservar.
- **Mantener el corte de 20**: el esquema promete 50; un límite que no se cumple es una promesa
  rota.
- **Deducir el tipo del nombre o dejarlo en `function`**: el dato ya está en la lente de símbolos;
  no hay que inventarlo.

## Hoja de ruta

**Estado:** cerrado. No abre una fase: corrige la consulta de una decisión ya cerrada (M12).

- [x] **0039.1** `packages/schema`: el `kind` real en `LiveNode`, en la cadena y en el calor; tests
  de clase, interfaz y tipo.
- [x] **0039.2** `packages/schema`: `chainsPayload` devuelve calor sin símbolo, busca solo símbolos
  por nombre o ruta actuales o históricos y respeta `limit`; tests de nombre antiguo, nivel y
  límite. El libro mayor sube a la versión 2 para rehacerse.
- [x] **0039.3** `apps/mcp`: `getSymbolChain` devuelve calor sin símbolo, pasa el límite y actualiza
  la descripción; tests de la herramienta y del helper compartido con la CLI.
- [x] **0039.4** Documentos: `docs/mcp.md` y la guía describen la búsqueda; suite, lint, typecheck y
  builds en verde.

El detalle de lo hecho está en el [changelog](0039-la-busqueda-de-una-cadena.changelog.md).
