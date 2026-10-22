import { build } from "esbuild";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_DIR = path.join(ROOT, "apps", "cli");
const DIST = path.join(CLI_DIR, "dist");
const RENDER_SRC = path.join(ROOT, "packages", "render", "src");

const cliPackage = JSON.parse(await readFile(path.join(CLI_DIR, "package.json"), "utf8"));
// La versión es una para el producto (ADR 0032): manda la de la raíz.
const rootPackage = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
const version = rootPackage.version;

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

// `html.ts` resuelve estos assets con import.meta.url; viven junto al bundle.
await copyFile(path.join(RENDER_SRC, "styles.css"), path.join(DIST, "styles.css"));
await copyFile(path.join(RENDER_SRC, "client.js"), path.join(DIST, "client.js"));
await copyFile(path.join(ROOT, "LICENSE"), path.join(DIST, "LICENSE"));
await copyFile(path.join(CLI_DIR, "README.md"), path.join(DIST, "README.md"));

const WEB_DIST = path.join(ROOT, "apps", "web", "dist");
try {
  await cp(WEB_DIST, path.join(DIST, "web"), { recursive: true });
  console.log("ok · app web incluida en el paquete");
} catch {
  console.warn("aviso · no hay build web; `codarch serve` no estará disponible");
}

const published = {
  name: "codarch",
  version,
  description: cliPackage.description,
  license: cliPackage.license,
  type: "module",
  bin: {
    codarch: "./index.js"
  },
  files: ["index.js", "styles.css", "client.js", "web", "LICENSE", "README.md"],
  engines: {
    node: ">=22"
  },
  keywords: ["architecture", "code-analysis", "treemap", "typescript", "mcp"],
  repository: {
    type: "git",
    url: "git+https://github.com/jaminsmoke/codarch.git",
    directory: "apps/cli"
  },
  homepage: "https://github.com/jaminsmoke/codarch",
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

console.log(`ok · CLI empaquetado en ${path.relative(ROOT, DIST)} (codarch@${version})`);
