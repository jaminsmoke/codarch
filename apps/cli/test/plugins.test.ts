import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runPlugins } from "../src/commands/plugins";

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-plugins-cli-"));
  tempRoots.push(root);
  return root;
}

/** Un plugin de verdad, escrito como lo escribiría quien lo publica. */
function writePlugin(dir: string, name = "demo"): string {
  const from = path.join(dir, "origen");
  fs.mkdirSync(from, { recursive: true });
  fs.writeFileSync(
    path.join(from, "plugin.json"),
    JSON.stringify(
      {
        name,
        version: "0.1.0",
        title: "Demo",
        description: "Un plugin de prueba.",
        icon: "beaker",
        contributes: { views: [name] },
        requires: {}
      },
      null,
      2
    ),
    "utf8"
  );
  fs.writeFileSync(
    path.join(from, "index.tsx"),
    [
      "export default function Demo() {",
      "  return null;",
      "}",
      ""
    ].join("\n"),
    "utf8"
  );
  return from;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

describe("codarch plugins", () => {
  it("instala un plugin: copia la carpeta y lo declara en .codarch.yml", () => {
    const root = tempDir();
    const source = writePlugin(root);
    fs.writeFileSync(
      path.join(root, ".codarch.yml"),
      ["# Mis reglas", "version: 1", "", "layers:", "  - name: ui", "    paths: [apps/web/**]", ""].join(
        "\n"
      ),
      "utf8"
    );
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(runPlugins({ action: "add", target: source, root, json: false })).toBe(0);

    expect(fs.existsSync(path.join(root, "plugins", "demo", "plugin.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, "plugins", "demo", "index.tsx"))).toBe(true);
    const config = fs.readFileSync(path.join(root, ".codarch.yml"), "utf8");
    expect(config).toContain("- demo");
    expect(config).toContain("# Mis reglas");
    expect(config).toContain("- name: ui");
  });

  it("no instala dos veces el mismo plugin", () => {
    const root = tempDir();
    const source = writePlugin(root);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(runPlugins({ action: "add", target: source, root, json: false })).toBe(0);
    expect(runPlugins({ action: "add", target: source, root, json: false })).toBe(1);
  });

  it("rechaza un plugin sin vistas y no deja nada copiado", () => {
    const root = tempDir();
    const source = writePlugin(root);
    fs.writeFileSync(
      path.join(source, "plugin.json"),
      JSON.stringify({ name: "demo", version: "0.1.0", title: "Demo", contributes: {} }),
      "utf8"
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(runPlugins({ action: "add", target: source, root, json: false })).toBe(1);
    expect(fs.existsSync(path.join(root, "plugins"))).toBe(false);
  });

  it("rechaza un plugin sin punto de entrada", () => {
    const root = tempDir();
    const source = writePlugin(root);
    fs.rmSync(path.join(source, "index.tsx"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(runPlugins({ action: "add", target: source, root, json: false })).toBe(1);
    expect(fs.existsSync(path.join(root, "plugins"))).toBe(false);
  });

  it("rechaza un nombre que no es de plugin", () => {
    const root = tempDir();
    const source = writePlugin(root, "../fuera");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(runPlugins({ action: "add", target: source, root, json: false })).toBe(1);
    expect(fs.existsSync(path.join(root, "plugins"))).toBe(false);
  });

  it("lista los plugins, los que faltan y los que no se declaran", () => {
    const root = tempDir();
    const source = writePlugin(root);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(runPlugins({ action: "add", target: source, root, json: false })).toBe(0);

    const extra = path.join(root, "plugins", "suelto");
    fs.mkdirSync(extra, { recursive: true });
    fs.writeFileSync(
      path.join(extra, "plugin.json"),
      JSON.stringify({
        name: "suelto",
        version: "0.1.0",
        title: "Suelto",
        contributes: { views: ["suelto"] }
      }),
      "utf8"
    );
    fs.copyFileSync(path.join(source, "index.tsx"), path.join(extra, "index.tsx"));
    fs.writeFileSync(
      path.join(root, ".codarch.yml"),
      "version: 1\n\nplugins:\n  - demo\n  - fantasma\n",
      "utf8"
    );

    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    expect(runPlugins({ action: "list", root, json: true })).toBe(1);
    const parsed = JSON.parse(lines.join("\n")) as {
      declared: string[];
      plugins: Array<{ name: string; declared: boolean; views: string[] }>;
      missing: string[];
    };
    expect(parsed.declared).toEqual(["demo", "fantasma"]);
    expect(parsed.plugins.map((plugin) => plugin.name).sort()).toEqual(["demo", "suelto"]);
    expect(parsed.plugins.find((plugin) => plugin.name === "suelto")?.declared).toBe(false);
    expect(parsed.plugins.find((plugin) => plugin.name === "demo")?.views).toEqual(["demo"]);
    expect(parsed.missing).toEqual(["fantasma"]);

    lines.length = 0;
    expect(runPlugins({ action: "list", root, json: false })).toBe(1);
    const text = lines.join("\n");
    expect(text).toContain("demo 0.1.0 · Demo — instalado");
    expect(text).toContain("suelto 0.1.0 · Suelto — sin declarar");
    expect(text).toContain("fantasma · declarado pero falta la carpeta");
  });

  it("avisa si la carpeta y el manifiesto no se llaman igual", () => {
    const root = tempDir();
    const cable = path.join(root, "plugins", "carpeta");
    fs.mkdirSync(cable, { recursive: true });
    fs.writeFileSync(
      path.join(cable, "plugin.json"),
      JSON.stringify({
        name: "otro",
        version: "0.1.0",
        title: "Otro",
        contributes: { views: ["otro"] }
      }),
      "utf8"
    );
    fs.writeFileSync(path.join(cable, "index.tsx"), "export default function () { return null; }\n");

    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    expect(runPlugins({ action: "list", root, json: false })).toBe(1);
    expect(lines.join("\n")).toContain("carpeta · no se pudo cargar");
    expect(lines.join("\n")).toContain("la carpeta se llama carpeta y plugin.json dice otro");
  });

  it("quita un plugin del repo y de la declaración, sin tocar la carpeta contenedora", () => {
    const root = tempDir();
    const source = writePlugin(root);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(runPlugins({ action: "add", target: source, root, json: false })).toBe(0);

    fs.mkdirSync(path.join(root, "plugins", "otro"), { recursive: true });

    expect(runPlugins({ action: "remove", target: "demo", root, json: false })).toBe(0);
    expect(fs.existsSync(path.join(root, "plugins", "demo"))).toBe(false);
    expect(fs.existsSync(path.join(root, "plugins"))).toBe(true);
    expect(fs.existsSync(path.join(root, "plugins", "otro"))).toBe(true);
    expect(fs.readFileSync(path.join(root, ".codarch.yml"), "utf8")).not.toContain("- demo");
  });

  it("avisa si la carpeta no existe o el nombre no vale", () => {
    const root = tempDir();
    fs.mkdirSync(path.join(root, "plugins"), { recursive: true });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(runPlugins({ action: "remove", target: "fantasma", root, json: false })).toBe(1);
    expect(runPlugins({ action: "remove", target: "../fuera", root, json: false })).toBe(1);
    expect(runPlugins({ action: "add", root, json: false })).toBe(1);
    expect(fs.existsSync(path.join(root, "plugins"))).toBe(true);
  });
});
