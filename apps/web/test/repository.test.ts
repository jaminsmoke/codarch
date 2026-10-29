import { describe, expect, it } from "vitest";
import { readRepositoryFromFiles } from "../src/repository";

function file(path: string, content: string): File {
  return {
    webkitRelativePath: path,
    text: async () => content
  } as unknown as File;
}

describe("readRepositoryFromFiles", () => {
  it("encuentra snapshot y report dentro de .codarch", async () => {
    const artifacts = await readRepositoryFromFiles([
      file("repo/src/app.ts", "export {};"),
      file("repo/.codarch/snapshot.cc.json", '{"meta":{"apiVersion":"2.0"}}'),
      file("repo/.codarch/report.json", '{"schemaVersion":"1.0"}')
    ]);

    expect(artifacts.snapshot).toEqual({ meta: { apiVersion: "2.0" } });
    expect(artifacts.report).toEqual({ schemaVersion: "1.0" });
    expect(artifacts.label).toBe("repo/.codarch/snapshot.cc.json");
    expect(artifacts.reportLabel).toBe("repo/.codarch/report.json");
  });

  it("acepta un snapshot sin reporte", async () => {
    const artifacts = await readRepositoryFromFiles([
      file(".codarch/snapshot.cc.json", "{}")
    ]);

    expect(artifacts.report).toBeNull();
    expect(artifacts.reportLabel).toBeNull();
    expect(artifacts.rest).toBeNull();
  });

  it("trae el mapa del resto cuando el repo lo tiene", async () => {
    const artifacts = await readRepositoryFromFiles([
      file("repo/.codarch/snapshot.cc.json", '{"meta":{"apiVersion":"2.0"}}'),
      file(
        "repo/.codarch/rest.cc.json",
        '{"meta":{"apiVersion":"2.0"},"lenses":{"rest":{"nodes":{}}}}'
      )
    ]);

    expect(artifacts.rest).toEqual({
      meta: { apiVersion: "2.0" },
      lenses: { rest: { nodes: {} } }
    });
  });

  it("explica qué falta si no hay snapshot", async () => {
    await expect(
      readRepositoryFromFiles([file("repo/README.md", "sin artefactos")])
    ).rejects.toThrow(".codarch/snapshot.cc.json");
  });
});
