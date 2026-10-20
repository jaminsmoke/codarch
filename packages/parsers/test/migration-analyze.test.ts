import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  fileId,
  parseCcJson,
  type CcMigrationLens
} from "@codarch/schema";
import { analyzeRepository } from "../src/index";

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "migration"
);

describe("analyzeRepository · migración", () => {
  it("incluye lenguajes, estados, deuda y cruces FFI", () => {
    const result = analyzeRepository(fixture, { git: false });

    expect(result.files).toBe(5);
    expect(result.edges).toBe(1);
    expect(result.unresolvedImports).toBe(0);
    expect(result.migration).toMatchObject({
      files: 5,
      bridgeFiles: 2,
      ffiEdges: 2,
      ffiCrossings: 4,
      migrationDebt: 9,
      status: { js: 1, rust: 0, bridge: 2, native: 2 },
      languages: {
        ts: { files: 2, loc: 10, rloc: 9 },
        rust: { files: 1, loc: 6, rloc: 5 },
        wasm: { files: 1, loc: 0, rloc: 0 },
        node: { files: 1, loc: 0, rloc: 0 }
      }
    });

    const cc = parseCcJson(result.snapshot);
    const lens = cc.lenses?.migration as CcMigrationLens;
    expect(Object.keys(lens.nodes)).toHaveLength(5);
    expect(lens.edges).toHaveLength(2);

    const attributes = cc.lenses?.metrics?.attributes ?? {};
    expect(attributes[fileId("src/app.ts")]).toMatchObject({
      migrationDebt: 1,
      ffiCrossings: 2
    });
    expect(attributes[fileId("src/domain.ts")]).toMatchObject({
      migrationDebt: 8,
      ffiCrossings: 0
    });
    expect(attributes[fileId("src/native/lib.rs")]).toMatchObject({
      loc: 6,
      rloc: 5,
      ffiCrossings: 0
    });
    expect(attributes[fileId("src/native/lib.rs")]?.migrationDebt).toBeUndefined();
    expect(attributes[fileId("src/native/math.wasm")]).toMatchObject({
      loc: 0,
      rloc: 0,
      ffiCrossings: 1
    });
  });

  it("es determinista con la lente de migración", () => {
    const first = analyzeRepository(fixture, { git: false });
    const second = analyzeRepository(fixture, { git: false });

    expect(second.snapshot).toEqual(first.snapshot);
    expect(second.snapshot.meta.checksum).toBe(first.snapshot.meta.checksum);
    expect(second.migration).toEqual(first.migration);
  });
});
