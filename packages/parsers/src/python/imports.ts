import * as path from "../path";
import type { ImportTargets, ParsedImport } from "../types";
import { pythonIsStdlib } from "./stdlib";

/**
 * A qué fichero apunta un `import` de Python (ADR 0090).
 *
 * Python no tiene manifiesto que leer para resolver: un módulo es un `.py` y un
 * paquete es una carpeta con `__init__.py`, así que un import es una ruta
 * relativa a alguna raíz del `sys.path` —la raíz del repo, o un `src/`—. El
 * índice de rutas de abajo resuelve por sufijo, así que valen las dos.
 *
 * Las tres formas se leen así:
 *
 * | Se escribe | Se busca |
 * |---|---|
 * | `import a.b` | `a/b.py`, `a/b/__init__.py` |
 * | `from a.b import C` | `a/b/C.py`, `a/b/C/__init__.py`, luego `a/b.py`, `a/b/__init__.py` |
 * | `from . import x` | `<carpeta del fichero>/x.py`, luego `<carpeta>/__init__.py` |
 *
 * Un nombre importado puede ser un submódulo (`from .models import User` es
 * `models/user.py`) o un nombre definido en el módulo (`from .models import
 * User` con `User` en `models/__init__.py`). Los dos casos caben en la lista de
 * candidatos y gana el primero que exista.
 *
 * Lo que no crea arista: la biblioteca estándar —se cuenta como builtin, igual
 * que un módulo de Node en TS— y `from x import *`, que apunta a un paquete
 * entero y no a un fichero.
 */
export function pythonImportTargets(
  imported: ParsedImport,
  filePath: string
): ImportTargets {
  const specifier = imported.specifier;
  if (specifier === "") return { kind: "external", builtin: false };

  // `from paquete import *`: no hay fichero concreto al que apuntar.
  if (specifier.endsWith(".*")) {
    return {
      kind: "external",
      builtin: pythonIsStdlib(specifier.slice(0, -2))
    };
  }

  const dots = leadingDots(specifier);
  const rest = specifier.slice(dots);
  if (dots > 0) {
    return {
      kind: "paths",
      paths: candidates(relativeBase(filePath, dots), rest, imported.names ?? [])
    };
  }

  if (pythonIsStdlib(rest)) return { kind: "external", builtin: true };
  return { kind: "paths", paths: candidates("", rest, imported.names ?? []) };
}

/**
 * Los ficheros candidatos, en orden de preferencia.
 *
 * Un `from` import prueba primero los nombres como submódulos y después el
 * módulo que los contiene: `from .models import User` es `models/user.py` si
 * existe y, si no, el `models/__init__.py` que define `User`.
 */
function candidates(
  base: string,
  rest: string,
  names: readonly string[]
): string[] {
  const modulePath = joinPath(base, rest.replaceAll(".", "/"));
  const paths: string[] = [];

  for (const name of names) {
    const submodule = joinPath(modulePath, name);
    if (submodule === "") continue;
    paths.push(`${submodule}.py`, `${submodule}/__init__.py`);
  }

  if (modulePath !== "") {
    // Sin módulo (`from . import x`) la carpeta es un paquete, no un módulo
    // hermano: `app/api.py` no es `app/api`.
    if (rest === "") {
      paths.push(`${modulePath}/__init__.py`);
    } else {
      paths.push(`${modulePath}.py`, `${modulePath}/__init__.py`);
    }
  }

  return [...new Set(paths)];
}

/** Cuántos puntos lleva delante el import: uno por nivel que sube. */
function leadingDots(specifier: string): number {
  let dots = 0;
  while (specifier[dots] === ".") dots++;
  return dots;
}

/**
 * La carpeta desde la que cuelga un import relativo.
 *
 * Un punto es el paquete del propio fichero; cada punto más sube un nivel. Si
 * sube más de lo que hay, se queda en la raíz: el import está roto y se verá al
 * no encontrar el fichero, no reventando el análisis.
 */
function relativeBase(filePath: string, dots: number): string {
  let base = path.dirname(path.join("/", filePath));
  for (let level = 1; level < dots; level++) base = path.dirname(base);
  return base === "/" ? "" : base.replace(/^\//, "");
}

function joinPath(base: string, rest: string): string {
  if (base === "") return rest;
  if (rest === "") return base;
  return `${base}/${rest}`;
}
