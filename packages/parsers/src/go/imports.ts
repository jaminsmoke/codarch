import type { ImportTargets } from "../types";

/**
 * A qué ficheros apunta un `import` de Go (ADR 0090).
 *
 * Go importa **paquetes**, no ficheros: `import "acme/internal/billing"` es
 * cada `.go` de esa carpeta, y todos son aristas. Eso cambia la forma del
 * resultado: un import deja de ser una ruta y pasa a ser una lista de ficheros
 * que se resuelve al recorrerla.
 *
 * El nombre del módulo vive en el `go.mod` de la raíz, no en cada fichero, así
 * que entra por `prepare` una vez por análisis:
 *
 * - Con módulo, un import que empieza por él es una carpeta del repositorio.
 *   Si esa carpeta no existe, el import está **roto**: Go lo rechazaría.
 * - Con módulo, un import que no empieza por él es de fuera. La biblioteca
 *   estándar no lleva punto en su primer segmento (`fmt`, `net/http`) y se
 *   cuenta como builtin; el resto son dependencias.
 * - Sin `go.mod` legible se prueba el sufijo del import, de más específico a
 *   menos: `github.com/acme/x/internal/billing` casa con `internal/billing`.
 *   Es lo que vale para un proyecto plano, y a cambio un import de fuera puede
 *   casar con una carpeta del repo que se llame igual.
 */
export function goImportTargets(
  specifier: string,
  module: string | null
): ImportTargets {
  const importPath = specifier.trim();
  const extensions = [".go"] as const;

  if (importPath === "") return { kind: "external", builtin: false };

  if (module !== null) {
    if (importPath === module) {
      return {
        kind: "package",
        directories: [""],
        extensions,
        required: true
      };
    }
    if (importPath.startsWith(`${module}/`)) {
      return {
        kind: "package",
        directories: [importPath.slice(module.length + 1)],
        extensions,
        required: true
      };
    }
    return { kind: "external", builtin: isStandardLibrary(importPath) };
  }

  const segments = importPath.split("/").filter((segment) => segment !== "");
  const directories: string[] = [];
  for (let start = 0; start < segments.length; start++) {
    directories.push(segments.slice(start).join("/"));
  }

  return {
    kind: "package",
    directories,
    extensions,
    builtin: isStandardLibrary(importPath)
  };
}

/**
 * El nombre del módulo, o `null` si el `go.mod` no está o no se puede leer.
 *
 * La línea es `module example.com/acme`, con el nombre posiblemente entre
 * comillas, y puede llevar un comentario detrás.
 */
export function readGoModule(source: string | null): string | null {
  if (!source) return null;

  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*module\s+"?([^\s"]+)"?\s*(?:\/\/.*)?$/.exec(line);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Si el import es de la biblioteca estándar.
 *
 * Un paquete de fuera lleva dominio en el primer segmento (`github.com/…`);
 * los de la estándar no (`fmt`, `net/http`, `crypto/tls`).
 */
function isStandardLibrary(importPath: string): boolean {
  const first = importPath.split("/", 1)[0] ?? "";
  return first !== "" && !first.includes(".");
}
