import { describe, expect, it } from "vitest";
import { McpDataError } from "../src/store";
import { makeStore } from "./fixtures";

describe("rutas e ids", () => {
  it("normaliza separadores, prefijo de raíz e id", () => {
    const store = makeStore();
    expect(store.resolveTarget("acme/src/a.ts")).toMatchObject({
      path: "src/a.ts"
    });
    expect(store.resolveTarget("src\\domain\\c.ts")).toMatchObject({
      path: "src/domain/c.ts"
    });
    expect(store.resolveTarget("a")).toMatchObject({ path: "src/a.ts" });
  });

  it("rechaza absolutas y salidas del proyecto", () => {
    const store = makeStore();
    expect(() => store.resolveTarget("/src/a.ts")).toThrow(McpDataError);
    expect(() => store.resolveTarget("../src/a.ts")).toThrow(McpDataError);
  });

  it("sugiere una ruta cuando no existe", () => {
    expect(() => makeStore().resolveTarget("other/c.ts")).toThrow(
      /Quizá quisiste decir/
    );
  });
});
