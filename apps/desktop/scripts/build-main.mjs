import { build } from "esbuild";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Empaqueta el proceso principal, el preload y el proceso que analiza.
 *
 * El análisis vive en su propio `utilityProcess` (guía: «El escritorio analiza
 * sin congelarse»): así no compite con el despacho de clics ni con el IPC. Los
 * tres bundles comparten externals y versión.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

// La versión es una para el producto y se declara en `versions.json` (ADR 0041).
const versions = JSON.parse(
  await readFile(path.join(ROOT, "..", "..", "versions.json"), "utf8")
);

const shared = {
  bundle: true,
  define: {
    __CODARCH_VERSION__: JSON.stringify(versions.desktop)
  },
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: false,
  minify: false,
  external: [
    "electron",
    "electron-updater",
    "ignore",
    "minimatch",
    "tree-sitter",
    "tree-sitter-java",
    "tree-sitter-python",
    "tree-sitter-typescript",
    "typescript",
    "yaml"
  ]
};

await build({
  ...shared,
  entryPoints: [path.join(ROOT, "src", "main.ts")],
  outfile: path.join(DIST, "main.cjs")
});

await build({
  ...shared,
  entryPoints: [path.join(ROOT, "src", "preload.ts")],
  outfile: path.join(DIST, "preload.cjs")
});

// El proceso que analiza: el mismo bundle, pero su propio fichero para que
// `utilityProcess.fork` lo arranque aparte.
await build({
  ...shared,
  entryPoints: [path.join(ROOT, "src", "analyze-worker.ts")],
  outfile: path.join(DIST, "analyze-worker.cjs")
});

console.log(
  `ok · proceso principal, preload y análisis en ${path.relative(ROOT, DIST)}`
);
