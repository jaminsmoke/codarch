import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runAddons } from "../src/commands/addons";

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-addons-cli-"));
  tempRoots.push(root);
  return root;
}

/** Un addon de verdad, escrito como lo escribiría un equipo. */
function writeAddon(dir: string, name = "demo"): string {
  const from = path.join(dir, "origen");
  fs.mkdirSync(from, { recursive: true });
  fs.writeFileSync(
    path.join(from, "addon.json"),
    JSON.stringify(
      {
        name,
        version: "0.1.0",
        title: "Demo",
        description: "Un addon de prueba.",
        contributes: { profiles: ["profile.yml"], views: ["views.yml"] }
      },
      null,
      2
    ),
    "utf8"
  );
  fs.writeFileSync(
    path.join(from, "profile.yml"),
    [
      "id: demo",
      "title: Las capas de demo",
      "layers:",
      "  - name: domain",
      "    patterns: [src/domain/**]",
      "  - name: infra",
      "    patterns: [src/infra/**]",
      "rules:",
      "  - type: forbidden",
      "    name: domain-no-infra",
      "    from: domain",
      "    to: infra",
      "    severity: warn"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(from, "views.yml"),
    ["- id: capas", "  title: Las capas", "  state:", "    color: layer", "    labels: true"].join(
      "\n"
    ),
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

describe("codarch addons", () => {
  it("instala un addon: copia la carpeta y lo declara en .codarch.yml", () => {
    const root = tempDir();
    const source = writeAddon(root);
    fs.writeFileSync(
      path.join(root, ".codarch.yml"),
      ["# Mis reglas", "version: 1", "", "layers:", "  - name: ui", "    paths: [apps/web/**]", ""].join(
        "\n"
      ),
      "utf8"
    );

    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(runAddons({ action: "add", target: source, root, json: false })).toBe(0);

    expect(fs.existsSync(path.join(root, "addons", "demo", "addon.json"))).toBe(true);
    const config = fs.readFileSync(path.join(root, ".codarch.yml"), "utf8");
    expect(config).toContain("- demo");
    expect(config).toContain("# Mis reglas");
    expect(config).toContain("- name: ui");
  });

  it("no instala dos veces el mismo addon", () => {
    const root = tempDir();
    const source = writeAddon(root);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(runAddons({ action: "add", target: source, root, json: false })).toBe(0);
    expect(runAddons({ action: "add", target: source, root, json: false })).toBe(1);
  });

  it("rechaza un addon que no cumple el contrato y no deja nada copiado", () => {
    const root = tempDir();
    const source = writeAddon(root);
    fs.writeFileSync(
      path.join(source, "addon.json"),
      JSON.stringify({ name: "demo", version: "0.1.0", title: "Demo", extra: true }),
      "utf8"
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(runAddons({ action: "add", target: source, root, json: false })).toBe(1);
    expect(fs.existsSync(path.join(root, "addons"))).toBe(false);
  });

  it("lista los addons y cuáles declara el repo", () => {
    const root = tempDir();
    const source = writeAddon(root);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(runAddons({ action: "add", target: source, root, json: false })).toBe(0);

    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    expect(runAddons({ action: "list", root, json: true })).toBe(0);
    const parsed = JSON.parse(lines.join("\n")) as {
      declared: string[];
      addons: Array<{ name: string; declared: boolean; profiles: string[]; views: unknown[] }>;
    };
    expect(parsed.declared).toEqual(["demo"]);
    expect(parsed.addons[0]?.name).toBe("demo");
    expect(parsed.addons[0]?.declared).toBe(true);
    expect(parsed.addons[0]?.profiles).toEqual(["demo"]);
    expect(parsed.addons[0]?.views).toHaveLength(1);
  });

  it("quita un addon del repo y de la declaración", () => {
    const root = tempDir();
    const source = writeAddon(root);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(runAddons({ action: "add", target: source, root, json: false })).toBe(0);

    expect(runAddons({ action: "remove", target: "demo", root, json: false })).toBe(0);
    expect(fs.existsSync(path.join(root, "addons", "demo"))).toBe(false);
    expect(fs.readFileSync(path.join(root, ".codarch.yml"), "utf8")).not.toContain("- demo");
  });

  it("avisa si un addon declarado no tiene carpeta", () => {
    const root = tempDir();
    fs.writeFileSync(
      path.join(root, ".codarch.yml"),
      "version: 1\n\naddons:\n  - fantasma\n",
      "utf8"
    );

    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    expect(runAddons({ action: "list", root, json: true })).toBe(1);
    const parsed = JSON.parse(lines.join("\n")) as { missing: string[] };
    expect(parsed.missing).toEqual(["fantasma"]);

    lines.length = 0;
    expect(runAddons({ action: "list", root, json: false })).toBe(1);
    expect(lines.join("\n")).toContain("fantasma · declarado pero falta la carpeta");
  });

  it("avisa si la carpeta no existe o el nombre no vale", () => {
    const root = tempDir();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(runAddons({ action: "remove", target: "fantasma", root, json: false })).toBe(1);
    expect(runAddons({ action: "add", root, json: false })).toBe(1);
  });
});
