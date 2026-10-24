import path from "node:path";
import { readdirSync } from "node:fs";
import type { Plugin } from "vite";

/**
 * La lista de los documentos ✓ ✅: solo sus rutas ✓ ✅.
 *
 * La guía enlaza a los ADR ✓ y no necesita su texto ✓: con un módulo virtual
 * ✓ queda una lista pequeña en el build ✓ ✅ y los documentos viajan con su
 * propia página ✅ ✅. Vive aquí porque también lo usa el test ✅ ✅.
 */

export const VIRTUAL = "virtual:docs-rutas";
const RESUELTO = `\0${VIRTUAL}`;

/** Las claves de `docs/`, en orden. */
export function clavesDocumentos(root: string): string[] {
  const docs = path.join(root, "docs");
  const salida: string[] = [];

  const andar = (carpeta: string): void => {
    const entradas = readdirSync(path.join(docs, carpeta), {
      withFileTypes: true
    });
    for (const entrada of entradas) {
      const relativa = carpeta ? `${carpeta}/${entrada.name}` : entrada.name;
      if (entrada.isDirectory()) andar(relativa);
      else if (relativa.endsWith(".md")) {
        const clave = relativa.slice(0, -3);
        // La guía tiene su propia página y sus entradas no son documentos, en
        // ningún idioma (`guideline/…` y `en/guideline/…`).
        if (!/(^|\/)guideline\//.test(clave)) {
          salida.push(clave);
        }
      }
    }
  };

  andar("");
  return salida.sort();
}

/** El plugin de Vite: `virtual:docs-rutas` → las claves. */
export function rutasDocs(root: string): Plugin {
  return {
    name: "codarch-docs-rutas",
    resolveId(id) {
      return id === VIRTUAL ? RESUELTO : undefined;
    },
    load(id) {
      return id === RESUELTO
        ? `export default ${JSON.stringify(clavesDocumentos(root))};`
        : undefined;
    },
    configureServer(servidor) {
      // Un documento nuevo en caliente ✓ ✅.
      const invalidar = (archivo: string): void => {
        if (!archivo.startsWith(path.join(root, "docs"))) return;
        const modulo = servidor.moduleGraph.getModuleById(RESUELTO);
        if (modulo) servidor.moduleGraph.invalidateModule(modulo);
      };
      servidor.watcher.on("add", invalidar);
      servidor.watcher.on("unlink", invalidar);
    }
  };
}
