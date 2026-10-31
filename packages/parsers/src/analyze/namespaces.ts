import type { DependencyLink } from "../graph";
import type { Metrics, ParsedImport } from "../types";
import type { AnalysisState } from "./state";
import type { UnresolvedImportIssue } from "./types";

/**
 * Los `using` de C#, que no se pueden cerrar mientras se mide.
 *
 * Mientras se recorre un fichero, un `using Acme.Billing;` no tiene destino: el
 * espacio de nombres puede estar declarado en cualquier otro. Así que se apunta
 * y se resuelve al final, cuando ya se sabe qué declara cada fichero. Es la
 * única familia de imports que necesita una segunda pasada.
 */

/** Un `using` que espera a saber qué ficheros declaran su espacio de nombres. */
export interface PendingNamespaceImport {
  file: string;
  /** Las métricas del fichero: el recuento se cierra cuando se resuelve. */
  metrics: Metrics;
  imported: ParsedImport;
  namespaces: string[];
  builtin: boolean;
}

/**
 * Apunta los espacios de nombres de un fichero, sin repetirlo.
 *
 * Los ficheros se recorren en orden de ruta, así que la lista de cada espacio
 * sale ordenada sin volver a ordenarla.
 */
export function noteNamespaces(
  namespaces: readonly string[],
  relativePath: string,
  declarations: Map<string, string[]>
): void {
  for (const namespace of namespaces) {
    const declared = declarations.get(namespace);
    if (!declared) declarations.set(namespace, [relativePath]);
    else if (!declared.includes(relativePath)) declared.push(relativePath);
  }
}

/** Cierra los `using` pendientes: ya se sabe quién declara cada espacio. */
export function closeNamespaces(state: AnalysisState): void {
  if (state.pendingNamespaces.length === 0) return;
  const resolved = resolveNamespaceImports(
    state.pendingNamespaces,
    state.namespaceDeclarations,
    state.links
  );
  state.external += resolved.external;
  state.builtin += resolved.builtin;
  state.unresolved.push(...resolved.unresolved);
}

/**
 * Cierra los `using` de C# cuando ya se ha medido el repositorio entero.
 *
 * La regla son tres preguntas, en este orden (ADR 0090):
 *
 * 1. ¿Algún fichero declara el espacio de nombres? Entonces son aristas, una
 *    por fichero: `using Acme.Billing;` depende de cada fichero que declare
 *    `Acme.Billing`, no de un fichero concreto.
 * 2. ¿El repositorio declara su raíz —`Acme` para `using Acme.Gone`—? Entonces
 *    el espacio falta y el import está roto: C# no compilaría.
 * 3. Si no: `System…` y `Microsoft…` son plataforma; el resto, dependencia.
 *
 * Un fichero no se importa a sí mismo: es lo normal en C# —el `using` del
 * espacio que el propio fichero declara— y una arista de un nodo a sí mismo
 * sería un ciclo que nadie tiene.
 */
export function resolveNamespaceImports(
  pending: readonly PendingNamespaceImport[],
  declarations: ReadonlyMap<string, readonly string[]>,
  links: DependencyLink[]
): { external: number; builtin: number; unresolved: UnresolvedImportIssue[] } {
  const roots = new Set<string>();
  for (const namespace of declarations.keys()) {
    const root = namespace.split(".", 1)[0];
    if (root) roots.add(root);
  }

  let external = 0;
  let builtin = 0;
  const unresolved: UnresolvedImportIssue[] = [];

  for (const entry of pending) {
    const { targets, known } = namespaceTargets(entry, declarations);

    if (targets.size > 0) {
      for (const target of [...targets].sort()) {
        links.push({
          from: entry.file,
          to: target,
          typeOnly: entry.imported.typeOnly
        });
      }
      continue;
    }

    // El espacio es del repositorio y, quitando el propio fichero, no queda
    // nadie: es el `using` del espacio que uno mismo declara. Ni arista, ni
    // import roto, ni dependencia.
    if (known) continue;

    const local = entry.namespaces.some((namespace) => {
      const root = namespace.split(".", 1)[0];
      return root !== undefined && roots.has(root);
    });

    if (local) {
      entry.metrics.unresolvedImports =
        (entry.metrics.unresolvedImports ?? 0) + 1;
      unresolved.push({
        file: entry.file,
        line: entry.imported.line,
        specifier: entry.imported.specifier,
        reason: "no se encontró el espacio de nombres"
      });
    } else if (entry.builtin) {
      entry.metrics.builtinImports = (entry.metrics.builtinImports ?? 0) + 1;
      builtin += 1;
    } else {
      entry.metrics.externalImports = (entry.metrics.externalImports ?? 0) + 1;
      external += 1;
    }
  }

  return { external, builtin, unresolved };
}

/** Busca los declarantes, excluyendo el propio fichero y sin duplicar destinos. */
function namespaceTargets(
  entry: PendingNamespaceImport,
  declarations: ReadonlyMap<string, readonly string[]>
): { targets: Set<string>; known: boolean } {
  const targets = new Set<string>();
  let known = false;
  for (const namespace of entry.namespaces) {
    const files = declarations.get(namespace);
    if (!files) continue;
    known = true;
    for (const file of files) {
      if (file !== entry.file) targets.add(file);
    }
  }
  return { targets, known };
}
