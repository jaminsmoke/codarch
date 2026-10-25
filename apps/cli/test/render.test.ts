import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseCcJson } from "@codarch/schema";
import { afterEach, describe, expect, it } from "vitest";
import { defaultOutputPath, publishSnapshot } from "../src/commands/render";

const temporary: string[] = [];

function scratch(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-render-"));
  temporary.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temporary.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const snapshot = parseCcJson({
  meta: { projectName: "publicado", apiVersion: "2.1" },
  files: [
    {
      id: "root",
      name: "root",
      type: "Folder",
      children: [{ id: "a", name: "a.ts", type: "File" }]
    }
  ],
  lenses: { metrics: { attributes: { a: { rloc: 10 } } } }
});

describe("codarch render", () => {
  it("publica la app real con el snapshot dentro", () => {
    // Un build de mentira: lo que importa es que se copie tal cual.
    const web = scratch();
    fs.writeFileSync(path.join(web, "index.html"), "<div id=root></div>\n");
    fs.mkdirSync(path.join(web, "assets"));
    fs.writeFileSync(path.join(web, "assets", "app.js"), "export {};\n");

    const out = path.join(scratch(), "publico");
    publishSnapshot(snapshot, out, web);

    expect(fs.readFileSync(path.join(out, "index.html"), "utf8")).toContain(
      "id=root"
    );
    expect(fs.existsSync(path.join(out, "assets", "app.js"))).toBe(true);

    // La misma ruta que lee la app al arrancar sin servidor de análisis.
    const served = JSON.parse(
      fs.readFileSync(path.join(out, "data", "snapshot.cc.json"), "utf8")
    );
    expect(served.meta.projectName).toBe("publicado");
    expect(served.files[0].children[0].name).toBe("a.ts");
  });

  it("deriva la carpeta de salida del nombre del fichero", () => {
    expect(defaultOutputPath("mapa.cc.json.gz")).toBe("mapa");
    expect(defaultOutputPath("mapa.json")).toBe("mapa");
    expect(defaultOutputPath("mapa")).toBe("mapa.sitio");
  });
});
