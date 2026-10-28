/**
 * Buscar en los ficheros del análisis la ruta que nombra un import.
 *
 * Los lenguajes en los que un import es una ruta —Java: `com.acme.Invoice`
 * apunta a cualquier `…/com/acme/Invoice.java`— no resuelven contra la raíz,
 * sino contra el sufijo: el fichero puede vivir en `src/main/java/…` o en la
 * raíz del repo. Este índice hace esa búsqueda sin recorrer la lista entera
 * por cada import: agrupa por nombre de fichero y compara el sufijo.
 *
 * Todo es determinista: si dos ficheros del repo acaban igual, gana el de ruta
 * más corta y, a igualdad, el orden lexicográfico.
 */

interface Entry {
  /** Ruta normalizada, en minúsculas si el sistema no distingue. */
  key: string;
  /** Ruta relativa tal cual, para devolverla. */
  path: string;
}

export class ImportTargetIndex {
  private readonly byName = new Map<string, Entry[]>();
  private readonly byLeafDirectory = new Map<string, string[]>();

  constructor(
    files: readonly string[],
    private readonly caseSensitive: boolean
  ) {
    for (const file of files) {
      const key = this.key(file);
      add(this.byName, lastSegment(key), { key, path: file });

      const directory = directoryOf(key);
      if (directory !== null) {
        add(this.byLeafDirectory, lastSegment(directory), directory);
      }
    }

    for (const list of this.byName.values()) {
      list.sort((left, right) => compareByLength(left.key, right.key));
    }
    for (const list of this.byLeafDirectory.values()) list.sort(compareByLength);
  }

  /** La ruta del primer candidato que existe, o `null`. */
  match(paths: readonly string[]): string | null {
    for (const candidate of paths) {
      const key = this.key(candidate);
      for (const entry of this.byName.get(lastSegment(key)) ?? []) {
        if (entry.key === key || entry.key.endsWith(`/${key}`)) {
          return entry.path;
        }
      }
    }
    return null;
  }

  /**
   * Si el repositorio tiene el paquete del import, aunque no la clase.
   *
   * Sirve para distinguir un import roto —el paquete está, la clase no— de una
   * dependencia que no vive en el repositorio, que es externa y no un aviso.
   */
  hasPackage(paths: readonly string[]): boolean {
    for (const candidate of paths) {
      const key = this.key(candidate);
      const directory = directoryOf(key);
      if (directory === null) continue;
      for (const known of this.byLeafDirectory.get(lastSegment(directory)) ?? []) {
        if (known === directory || known.endsWith(`/${directory}`)) return true;
      }
    }
    return false;
  }

  private key(value: string): string {
    const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
    return this.caseSensitive ? normalized : normalized.toLowerCase();
  }
}

function add<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function lastSegment(value: string): string {
  return value.slice(value.lastIndexOf("/") + 1);
}

/** La carpeta de una ruta, o `null` si la ruta no tiene carpeta. */
function directoryOf(value: string): string | null {
  const slash = value.lastIndexOf("/");
  return slash === -1 ? null : value.slice(0, slash);
}

function compareByLength(left: string, right: string): number {
  if (left.length !== right.length) return left.length - right.length;
  return left < right ? -1 : left > right ? 1 : 0;
}
