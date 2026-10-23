import { build } from "esbuild";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Empaqueta el proceso principal y el preload.
 *
 * El proceso principal usa `node:fs` y el binding nativo de tree-sitter, así
 * que se empaqueta como CommonJS y las dependencias nativas se quedan fuera.
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
    __CODARCH_VERSION__: JSON.stringify(versions.product)
  },
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: false,
  minify: false,
  external: [
    "electron",
    "ignore",
    "minimatch",
    "tree-sitter",
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

console.log(`ok · proceso principal y preload en ${path.relative(ROOT, DIST)}`);
