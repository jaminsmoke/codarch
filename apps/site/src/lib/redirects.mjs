import fs from "node:fs";
import path from "node:path";
import { GUIDE } from "./zones.mjs";

function listar(carpeta) {
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const entryPath = path.join(carpeta, entrada.name);
    return entrada.isDirectory() ? listar(entryPath) : [entryPath];
  });
}

/**
 * Las direcciones antiguas (antes de ADR 0081) → las nuevas, en los dos
 * idiomas. Las claves van sin barra final, como las pide Astro, y los destinos
 * llevan `base` delante porque Astro no se la añade.
 */
export function redirects(docsRoot, base = "") {
  const pares = new Map();
  const poner = (antigua, nueva) => {
    pares.set(antigua, `${base}${nueva}`);
    pares.set(`/en${antigua}`, `${base}/en${nueva}`);
  };

  const adr = path.join(docsRoot, "desarrollo", "adr");
  poner("/docs/adr", "/desarrollo/adr/");
  for (const fichero of listar(adr)) {
    if (!fichero.endsWith(".md")) continue;
    const key = path
      .relative(adr, fichero)
      .split(path.sep)
      .join("/")
      .replace(/\.md$/, "");
    if (key === "index") continue;
    poner(`/docs/adr/${key}`, `/desarrollo/adr/${key}/`);
  }
  poner("/docs/adr/roadmap", "/desarrollo/roadmap/");
  poner("/docs/model", "/desarrollo/model/");
  poner("/docs/migration", "/desarrollo/migration/");
  poner("/docs/design/map", "/desarrollo/design/map/");
  poner("/docs/rules", "/docs/usar/reglas/");
  poner("/docs/mcp", "/docs/usar/mcp/");
  poner("/docs/usar/cli/mcp", "/docs/usar/mcp/");

  poner("/guia", "/desarrollo/guia/");
  poner("/guia/normas", "/desarrollo/guia/normas/");
  poner("/guia/futuro", "/desarrollo/guia/futuro/");
  const dates = new Set(
    [
      path.join(docsRoot, GUIDE, "entradas"),
      path.join(docsRoot, "en", GUIDE, "entradas")
    ]
      .flatMap(listar)
      .map((fichero) => /^(\d{4}-\d{2}-\d{2})/.exec(path.basename(fichero))?.[1])
      .filter(Boolean)
  );
  for (const date of [...dates].sort())
    poner(`/guia/${date}`, `/desarrollo/guia/${date}/`);

  return Object.fromEntries([...pares.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
