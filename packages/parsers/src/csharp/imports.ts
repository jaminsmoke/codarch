import type { ImportTargets } from "../types";

/**
 * A qué apunta un `using` de C# (ADR 0090).
 *
 * C# importa **espacios de nombres**, y un espacio de nombres no se deduce de
 * la ruta del fichero como el paquete de Java: lo declara cada fichero con
 * `namespace`. Por eso este módulo no puede resolver nada —todavía no sabe qué
 * declara el resto del repositorio— y solo dice qué hay que buscar. La
 * resolución se cierra al final del análisis, cuando ya se han medido todos los
 * ficheros.
 *
 * Lo que sí se decide aquí es la plataforma: `System.*` y `Microsoft.*` vienen
 * con el runtime y se cuentan como builtin, igual que un módulo de Node.
 */
export function csharpImportTargets(specifier: string): ImportTargets {
  return {
    kind: "namespace",
    namespaces: [specifier],
    builtin: isPlatformNamespace(specifier)
  };
}

/**
 * Los espacios de nombres del marco de trabajo.
 *
 * La raíz basta: `System.Collections.Generic` y `System` empiezan igual, y
 * ningún proyecto sensato declara `namespace System` en su repositorio. Si
 * algún día lo hace, gana la declaración del repo, porque se mira antes.
 */
const PLATFORM_ROOTS = ["System", "Microsoft"] as const;

/** Si el espacio de nombres viene con el runtime. */
export function isPlatformNamespace(name: string): boolean {
  const first = name.split(".", 1)[0] ?? "";
  return PLATFORM_ROOTS.includes(first as (typeof PLATFORM_ROOTS)[number]);
}
