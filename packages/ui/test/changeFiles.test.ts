import { describe, expect, it } from "vitest";
import {
  MAX_FILES_PER_GROUP,
  changeFileGroups,
  deltaLabel,
  filesSummary,
  formatDelta,
  pickChange,
  rowTitle,
  type ChangeFileGroup,
  type ChangeFileRow,
  type ChangeStatus
} from "../src/changeFiles";

/** Un fichero de un lado del reporte. */
function file(
  path: string,
  rloc = 100
): { id: string; path: string; metrics: Record<string, number> } {
  return { id: `n:${path}`, path, metrics: { rloc, loc: rloc + 10 } };
}

/** Un fichero modificado con los pares métrica/base/head que le des. */
function changed(path: string, changes: Array<[string, number | null, number | null]>) {
  return {
    id: `n:${path}`,
    path,
    changes: changes.map(([metric, base, head]) => ({
      metric,
      base,
      head,
      delta: base === null || head === null ? null : head - base
    }))
  };
}

/** El reporte con los tres grupos, vacíos por defecto. */
function reportFiles(
  files: {
    added?: ReturnType<typeof file>[];
    changed?: ReturnType<typeof changed>[];
    removed?: ReturnType<typeof file>[];
  } = {}
) {
  return { added: files.added ?? [], changed: files.changed ?? [], removed: files.removed ?? [] };
}

/** Un grupo por su estado; el test falla si no está. */
function groupOf(groups: readonly ChangeFileGroup[], status: ChangeStatus): ChangeFileGroup {
  const group = groups.find((item) => item.status === status);
  if (!group) throw new Error(`falta el grupo ${status}`);
  return group;
}

/** La primera fila de un grupo; el test falla si no hay ninguna. */
function firstRow(groups: readonly ChangeFileGroup[], status: ChangeStatus): ChangeFileRow {
  const row = groupOf(groups, status).files[0];
  if (!row) throw new Error(`el grupo ${status} no tiene filas`);
  return row;
}

describe("la lista de ficheros del cambio", () => {
  it("siempre trae los tres grupos, en el orden de lectura", () => {
    const groups = changeFileGroups(reportFiles());

    expect(groups.map((group) => group.status)).toEqual(["added", "changed", "removed"]);
    expect(groups.map((group) => group.letter)).toEqual(["A", "M", "D"]);
    expect(groups.every((group) => group.count === 0 && group.files.length === 0)).toBe(true);
  });

  it("un nuevo suma, un eliminado resta y un modificado lleva su delta", () => {
    const groups = changeFileGroups(
      reportFiles({
        added: [file("src/a.ts", 84)],
        changed: [changed("src/b.ts", [["rloc", 100, 112]])],
        removed: [file("src/c.ts", 120)]
      })
    );

    expect(firstRow(groups, "added").delta).toBe(84);
    expect(firstRow(groups, "changed").delta).toBe(12);
    expect(firstRow(groups, "removed").delta).toBe(-120);
  });

  it("en un modificado manda el rloc aunque otra métrica se mueva más", () => {
    const groups = changeFileGroups(
      reportFiles({
        changed: [
          changed("src/a.ts", [
            ["complexity", 10, 40],
            ["rloc", 100, 103]
          ])
        ]
      })
    );

    expect(firstRow(groups, "changed")).toMatchObject({ metric: "rloc", delta: 3 });
  });

  it("si el rloc no se movió, enseña la métrica que más se movió, con su nombre", () => {
    const groups = changeFileGroups(
      reportFiles({
        changed: [
          changed("src/a.ts", [
            ["rloc", 100, 100],
            ["complexity", 10, 18],
            ["functions", 4, 5]
          ])
        ]
      })
    );

    expect(firstRow(groups, "changed")).toMatchObject({ metric: "complexity", delta: 8 });
  });

  it("sin delta en ninguna métrica, la fila queda en ±", () => {
    expect(pickChange([{ metric: "rloc", base: null, head: null, delta: null }])).toEqual({
      metric: "rloc",
      delta: null
    });
    expect(formatDelta(null)).toBe("±");
  });

  it("el tooltip del modificado lleva todas las métricas que se movieron", () => {
    const groups = changeFileGroups(
      reportFiles({
        changed: [
          changed("src/a.ts", [
            ["rloc", 100, 112],
            ["complexity", 10, 7],
            ["functions", 4, 4]
          ])
        ]
      })
    );

    expect(firstRow(groups, "changed").detail).toBe("rloc +12 · complexity −3");
  });

  it("ordena por ruta, sin depender del orden del reporte", () => {
    const groups = changeFileGroups(
      reportFiles({
        changed: [changed("src/z.ts", [["rloc", 1, 2]]), changed("src/a.ts", [["rloc", 1, 2]])]
      })
    );

    expect(groupOf(groups, "changed").files.map((row) => row.path)).toEqual([
      "src/a.ts",
      "src/z.ts"
    ]);
  });

  it("corta a 25 por grupo y cuenta los que sobran", () => {
    const many = Array.from({ length: MAX_FILES_PER_GROUP + 3 }, (_, index) =>
      file(`src/f${String(index).padStart(2, "0")}.ts`)
    );

    const added = groupOf(changeFileGroups(reportFiles({ added: many })), "added");

    expect(added.files).toHaveLength(MAX_FILES_PER_GROUP);
    expect(added.count).toBe(28);
    expect(added.rest).toBe(3);
  });

  it("la cabecera cuenta todos, también los que se quedan fuera del corte", () => {
    const many = Array.from({ length: 30 }, (_, index) => file(`src/f${index}.ts`));
    const groups = changeFileGroups(reportFiles({ added: many }));

    expect(filesSummary(groups)).toBe("30 nuevos");
  });

  it("el reparto concuerda con cada cuenta", () => {
    expect(filesSummary(changeFileGroups(reportFiles()))).toBe("");

    const groups = changeFileGroups(
      reportFiles({
        added: [file("a.ts"), file("b.ts")],
        changed: [changed("c.ts", [["rloc", 1, 2]])],
        removed: [file("d.ts")]
      })
    );

    expect(filesSummary(groups)).toBe("2 nuevos · 1 modificado · 1 eliminado");
  });

  it("el eliminado avisa de que no hay ficha que abrir", () => {
    const groups = changeFileGroups(reportFiles({ removed: [file("src/viejo.ts", 12)] }));

    expect(rowTitle(firstRow(groups, "removed"))).toContain("no hay ficha que abrir");
  });

  it("formatea el delta como la casa", () => {
    expect(formatDelta(84)).toBe("+84");
    expect(formatDelta(-3)).toBe("−3");
    expect(formatDelta(0)).toBe("±0");
  });

  it("nombra la métrica cuando no es el rloc", () => {
    const groups = changeFileGroups(
      reportFiles({ changed: [changed("src/a.ts", [["complexity", 10, 18]])] })
    );

    expect(deltaLabel(firstRow(groups, "changed"))).toBe("complexity +8");
  });

  it("un fichero sin rloc ni loc no inventa una cifra", () => {
    const groups = changeFileGroups({
      added: [{ id: "n:x", path: "x.ts", metrics: {} }],
      changed: [],
      removed: []
    });

    expect(firstRow(groups, "added").delta).toBe(0);
    expect(formatDelta(firstRow(groups, "added").delta)).toBe("±0");
  });
});
