import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeRepository, TypeScriptParser } from "@codarch/parsers";
import { analyzeFiles } from "@codarch/parsers/browser";
import type { DirectoryHandleLike, FileHandleLike } from "../src/fs-access";
import { readDirectoryToMemory } from "../src/analysis/reader";

/**
 * El lector del navegador no decide el alcance: lo deciden `.gitignore` y el
 * `ignore` del proyecto, como en el CLI (ADR 0038, ADR 0103).
 *
 * El caso que lo fija es un `build/generated.ts` versionado y sin ignorar: el
 * lector lo tiene que leer y el snapshot tiene que dar el mismo checksum que el
 * CLI con `--no-git`. Al lado, una carpeta ignorada que se lee pero el analizador
 * descarta.
 */

const roots: string[] = [];

function write(root: string, relative: string, content: string): void {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function fileHandle(physical: string, name: string): FileHandleLike {
  return {
    kind: "file",
    name,
    async getFile() {
      return { text: async () => fs.readFileSync(physical, "utf8") } as File;
    }
  };
}

function directoryHandle(physical: string, name: string): DirectoryHandleLike {
  return {
    kind: "directory",
    name,
    async getDirectoryHandle(child: string) {
      return directoryHandle(path.join(physical, child), child);
    },
    async getFileHandle(child: string) {
      return fileHandle(path.join(physical, child), child);
    },
    async *entries() {
      for (const entry of fs.readdirSync(physical, { withFileTypes: true })) {
        const child = path.join(physical, entry.name);
        if (entry.isDirectory()) {
          yield [entry.name, directoryHandle(child, entry.name)];
        } else {
          yield [entry.name, fileHandle(child, entry.name)];
        }
      }
    }
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("el lector del navegador", () => {
  it("lee el mismo alcance que el CLI, con build/ y .gitignore", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-reader-"));
    roots.push(root);
    write(root, "package.json", JSON.stringify({ name: "reader-demo" }));
    write(root, "src/a.ts", "export const a = 1;\n");
    write(root, "build/generated.ts", "export const generated = 1;\n");
    write(root, "ignored/secret.ts", "export const secret = 1;\n");
    write(root, ".gitignore", "ignored/\n");

    const read = await readDirectoryToMemory(
      directoryHandle(root, "reader-demo")
    );
    // El lector no salta `build` por su nombre y sí lee el `.gitignore`.
    expect(read.fileSystem.paths()).toContain("/build/generated.ts");
    expect(read.fileSystem.paths()).toContain("/ignored/secret.ts");
    expect(read.fileSystem.paths()).toContain("/.gitignore");

    const onDisk = analyzeRepository(root, { git: false });
    const browser = analyzeFiles({
      fileSystem: read.fileSystem,
      parsers: [new TypeScriptParser()],
      projectName: onDisk.snapshot.meta.projectName,
      rest: false
    });

    // Dos ficheros de código: `src/a.ts` y `build/generated.ts`.
    expect(onDisk.files).toBe(2);
    expect(browser.snapshot.meta.checksum).toBe(onDisk.snapshot.meta.checksum);
    expect(
      browser.snapshot.files[0]?.children?.map((child) => child.name)
    ).toContain("build");
  });
});
