import fs from "node:fs";
import path from "node:path";
import { GUIA } from "./zonas.mjs";

function listar(carpeta) {
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(carpeta, entrada.name);
    return entrada.isDirectory() ? listar(ruta) : [ruta];
  });
}

/**
 * Las direcciones antiguas (antes de ADR 0081) → las nuevas, en los dos
 * idiomas. Las claves van sin barra final, como las pide Astro, y los destinos
 * llevan `base` delante porque Astro no se la añade.
 */
export function redirecciones(docsRoot, base = "") {
  const pares = new Map();
  const poner = (antigua, nueva) => {
    pares.set(antigua, `${base}${nueva}`);
    pares.set(`/en${antigua}`, `${base}/en${nueva}`);
  };

  const adr = path.join(docsRoot, "desarrollo", "adr");
  poner("/docs/adr", "/desarrollo/adr/");
  for (const fichero of listar(adr)) {
    if (!fichero.endsWith(".md")) continue;
    const clave = path
      .relative(adr, fichero)
      .split(path.sep)
      .join("/")
      .replace(/\.md$/, "");
    if (clave === "index") continue;
    poner(`/docs/adr/${clave}`, `/desarrollo/adr/${clave}/`);
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
  const fechas = new Set(
    [
      path.join(docsRoot, GUIA, "entradas"),
      path.join(docsRoot, "en", GUIA, "entradas")
    ]
      .flatMap(listar)
      .map((fichero) => /^(\d{4}-\d{2}-\d{2})/.exec(path.basename(fichero))?.[1])
      .filter(Boolean)
  );
  for (const fecha of [...fechas].sort())
    poner(`/guia/${fecha}`, `/desarrollo/guia/${fecha}/`);

  return Object.fromEntries([...pares.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
