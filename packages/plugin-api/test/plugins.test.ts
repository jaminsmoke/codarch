import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkRequirements, hasWebgl2 } from "../src/index";
import { compiledPlugins, pluginManifests } from "../src/build";

const temporales: string[] = [];

afterEach(() => {
  for (const directory of temporales.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** Un repo de mentira con un plugin. */
function repo(contenido: string, manifest?: unknown): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-plugins-"));
  temporales.push(root);
  fs.writeFileSync(path.join(root, ".codarch.yml"), contenido, "utf8");
  if (manifest) {
    const directory = path.join(root, "plugins", "ejemplo");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, "plugin.json"),
      JSON.stringify(manifest),
      "utf8"
    );
  }
  return root;
}

describe("el contrato de los plugins", () => {
  it("comprueba lo que un plugin necesita", () => {
    const manifest = {
      name: "vista-3d",
      version: "0.1.0",
      title: "Vista 3D",
      requires: { webgl2: true }
    };

    const sinWebgl = checkRequirements(manifest, { webgl2: false });
    expect(sinWebgl.ok).toBe(false);
    expect(sinWebgl.missing).toEqual(["WebGL2"]);

    const conWebgl = checkRequirements(manifest, { webgl2: true });
    expect(conWebgl.ok).toBe(true);
    expect(conWebgl.missing).toEqual([]);
  });

  it("un plugin sin requisitos no pide nada", () => {
    const manifest = { name: "ejemplo", version: "0.1.0", title: "Ejemplo" };
    expect(checkRequirements(manifest, { webgl2: false }).ok).toBe(true);
  });

  it("la comprobación de WebGL2 no revienta si no hay navegador", () => {
    expect(typeof hasWebgl2()).toBe("boolean");
  });
});

describe("el registro de plugins", () => {
  it("lee los plugins que declara el repo", () => {
    const root = repo("version: 1\nplugins:\n  - ejemplo\n");
    expect(compiledPlugins(root)).toEqual(["ejemplo"]);
  });

  it("sin plugins declarados no hay ninguno", () => {
    const root = repo("version: 1\n");
    expect(compiledPlugins(root)).toEqual([]);
  });

  it("un nombre que no es de plugin no entra en el build", () => {
    const root = repo("version: 1\nplugins:\n  - ../fuera\n  - vista-3d\n");
    expect(compiledPlugins(root)).toEqual(["vista-3d"]);
  });

  it("lee el manifiesto del plugin", () => {
    const root = repo("version: 1\nplugins:\n  - ejemplo\n", {
      name: "ejemplo",
      version: "0.2.0",
      title: "Ejemplo",
      contributes: { views: ["ejemplo"] }
    });

    const manifests = pluginManifests(root);
    expect(manifests).toHaveLength(1);
    expect(manifests[0]?.version).toBe("0.2.0");
    expect(manifests[0]?.contributes?.views).toEqual(["ejemplo"]);
  });

  it("un manifiesto roto no para el build: el plugin no aparece", () => {
    const root = repo("version: 1\nplugins:\n  - ejemplo\n", {
      name: "ejemplo"
    });
    fs.writeFileSync(
      path.join(root, "plugins", "ejemplo", "plugin.json"),
      "{ esto no es json",
      "utf8"
    );

    expect(pluginManifests(root)).toEqual([]);
  });

  it("un plugin declarado pero sin manifiesto no aparece", () => {
    const root = repo("version: 1\nplugins:\n  - ejemplo\n");
    expect(pluginManifests(root)).toEqual([]);
  });
});
