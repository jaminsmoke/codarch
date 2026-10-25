import { build } from "esbuild";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_DIR = path.join(ROOT, "apps", "cli");
const DIST = path.join(CLI_DIR, "dist");

const cliPackage = JSON.parse(await readFile(path.join(CLI_DIR, "package.json"), "utf8"));
// La versión del CLI se declara en `versions.json` (ADR 0065).
const versions = JSON.parse(await readFile(path.join(ROOT, "versions.json"), "utf8"));
const version = versions.cli;

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

await build({
  absWorkingDir: ROOT,
  entryPoints: [path.join(CLI_DIR, "src", "index.ts")],
  outfile: path.join(DIST, "index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
  minify: false,
  legalComments: "eof",
  define: {
    __CODARCH_VERSION__: JSON.stringify(version)
  },
  external: [
    "ignore",
    "minimatch",
    "tree-sitter",
    "tree-sitter-typescript",
    "typescript",
    "yaml"
  ]
});

await copyFile(path.join(ROOT, "LICENSE"), path.join(DIST, "LICENSE"));
await copyFile(path.join(CLI_DIR, "README.md"), path.join(DIST, "README.md"));

const WEB_DIST = path.join(ROOT, "apps", "web", "dist");
try {
  await cp(WEB_DIST, path.join(DIST, "web"), { recursive: true });
  console.log("ok · app web incluida en el paquete");
} catch {
  console.warn("aviso · no hay build web; `codarch serve` y `codarch render` no estarán disponibles");
}

const published = {
  name: "codarch",
  version,
  description: cliPackage.description,
  license: cliPackage.license,
  type: "module",
  bin: {
    codarch: "bin.js"
  },
  files: [
    "bin.js",
    "index.js",
    "web",
    "LICENSE",
    "README.md"
  ],
  engines: {
    node: ">=22"
  },
  keywords: ["architecture", "code-analysis", "treemap", "typescript", "mcp"],
  repository: {
    type: "git",
    url: "git+https://github.com/jaminsmoke/codarch.git",
    directory: "apps/cli"
  },
  homepage: "https://jaminsmoke.github.io/codarch",
  bugs: {
    url: "https://github.com/jaminsmoke/codarch/issues"
  },
  dependencies: {
    ignore: "^7.0.13",
    minimatch: "^10.2.6",
    "tree-sitter": "0.25.1",
    "tree-sitter-typescript": "0.23.2",
    typescript: "^5.9.0",
    yaml: "^2.9.1"
  }
};

await writeFile(path.join(DIST, "package.json"), `${JSON.stringify(published, null, 2)}\n`);

// El arranque comprueba Node antes de cargar nada: con Node 20 el `install` de
// `tree-sitter` falla y la CLI moría con un error nativo que no decía nada.
// Aquí la versión se mira primero y el resto se importa después.
const BIN = `#!/usr/bin/env node
const major = Number(process.versions.node.split(".")[0]);
if (!(major >= 22)) {
  console.error(
    \`CodArch necesita Node 22 o superior; este es \${process.versions.node}.\`
  );
  console.error("Instala Node 22 y vuelve a instalar: npm i -g codarch");
  process.exit(1);
}
await import("./index.js");
`;
await writeFile(path.join(DIST, "bin.js"), BIN, { mode: 0o755 });

console.log(`ok · CLI empaquetado en ${path.relative(ROOT, DIST)} (codarch@${version})`);
