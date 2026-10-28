import type { ImportTargets } from "../types";

/**
 * A qué fichero apunta un `import` de Java (ADR 0090).
 *
 * Java no se resuelve leyendo `pom.xml` ni `build.gradle`: el paquete de un
 * fichero se deduce de su ruta y la clase de su nombre, así que un import es un
 * sufijo. `import com.acme.billing.Invoice;` busca un fichero que termine en
 * `com/acme/billing/Invoice.java`, viva en `src/main/java/…` o en la raíz.
 *
 * Dos clases de import no son aristas:
 *
 * - Los de la plataforma (`java.`, `javax.`, `jdk.`…), que se cuentan como
 *   builtin, igual que un módulo de Node en TS.
 * - Los de paquete entero (`import com.acme.billing.*;`): apuntan a un paquete,
 *   no a un fichero, así que se cuentan como externos y no crean arista.
 */

/** Paquetes que no están en el repositorio porque los trae la plataforma. */
const PLATFORM_PREFIXES = [
  "java.",
  "javax.",
  "jdk.",
  "sun.",
  "com.sun.",
  "org.ietf.",
  "org.w3c.",
  "org.xml."
] as const;

export function javaImportTargets(specifier: string): ImportTargets {
  if (specifier.endsWith(".*")) {
    return {
      kind: "external",
      builtin: isPlatform(specifier.slice(0, -2))
    };
  }

  if (isPlatform(specifier)) return { kind: "external", builtin: true };

  const segments = specifier.split(".").filter((segment) => segment !== "");
  if (segments.length === 0) return { kind: "external", builtin: false };

  // La clase, y —si el nombre es el de un miembro o una clase anidada— la
  // clase que la contiene: `import static com.acme.Money.ZERO` es
  // `com/acme/Money.java`, no `com/acme/Money/ZERO.java`.
  const paths = [`${segments.join("/")}.java`];
  if (segments.length > 1) {
    paths.push(`${segments.slice(0, -1).join("/")}.java`);
  }

  return { kind: "paths", paths };
}

function isPlatform(specifier: string): boolean {
  return PLATFORM_PREFIXES.some((prefix) => specifier.startsWith(prefix));
}
