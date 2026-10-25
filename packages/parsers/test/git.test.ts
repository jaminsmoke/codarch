import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fileId } from "@codarch/schema";
import { ChurnCache, analyzeRepository, collectGitChurn } from "../src/index";

const tempRoots: string[] = [];

function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-git-"));
  tempRoots.push(root);
  return root;
}

function initRepo(root: string): void {
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Test"]);
  git(root, ["config", "user.email", "test@example.com"]);
}

function git(root: string, args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

function writeProject(root: string): void {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "churn-repo" }),
    "utf8"
  );
  fs.writeFileSync(
    path.join(root, "src", "a.ts"),
    "export const a = 1;\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(root, "src", "b.ts"),
    "export const b = 2;\n",
    "utf8"
  );
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("collectGitChurn", () => {
  it("cuenta commits y autores por fichero", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const first = collectGitChurn(root, ["src/a.ts", "src/b.ts"]);
    expect(first.enabled).toBe(true);
    expect(first.commits).toBe(1);
    expect(first.authors).toBe(1);
    expect(first.metrics.get("src/a.ts")).toEqual({
      commits: 1,
      authors: 1
    });
    expect(first.metrics.get("src/b.ts")).toEqual({
      commits: 1,
      authors: 1
    });

    fs.writeFileSync(
      path.join(root, "src", "a.ts"),
      "export const a = 2;\n",
      "utf8"
    );
    git(root, ["add", "."]);
    git(root, [
      "-c",
      "user.name=Other",
      "-c",
      "user.email=other@example.com",
      "commit",
      "-q",
      "-m",
      "segundo"
    ]);

    const second = collectGitChurn(root, ["src/a.ts", "src/b.ts"]);
    expect(second.commits).toBe(2);
    expect(second.authors).toBe(2);
    expect(second.metrics.get("src/a.ts")).toEqual({
      commits: 2,
      authors: 2
    });
    expect(second.metrics.get("src/b.ts")).toEqual({
      commits: 1,
      authors: 1
    });
  });

  it("mapea rutas cuando se analiza un subdirectorio del repo", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const churn = collectGitChurn(path.join(root, "src"), ["a.ts", "b.ts"]);
    expect(churn.metrics.get("a.ts")).toEqual({ commits: 1, authors: 1 });
    expect(churn.metrics.get("b.ts")).toEqual({ commits: 1, authors: 1 });
  });

  it("se desactiva sin ejecutar git", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const churn = collectGitChurn(root, ["src/a.ts"], { enabled: false });
    expect(churn.enabled).toBe(false);
    expect(churn.metrics.size).toBe(0);
  });

  it("no falla fuera de un repositorio git", () => {
    const root = tempRepo();
    fs.writeFileSync(path.join(root, "a.ts"), "export const a = 1;\n", "utf8");

    const churn = collectGitChurn(root, ["a.ts"]);
    expect(churn.enabled).toBe(false);
    expect(churn.metrics.size).toBe(0);
    expect(churn.warnings.join("\n")).toContain("no hay historial git");
  });
});

describe("la caché de churn", () => {
  it("reutiliza el churn mientras HEAD y los ficheros no cambien", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const cache = new ChurnCache();
    const primero = analyzeRepository(root, { churnCache: cache });
    expect(cache.stats()).toEqual({ hits: 0, misses: 1 });

    const segundo = analyzeRepository(root, { churnCache: cache });
    expect(cache.stats()).toEqual({ hits: 1, misses: 1 });
    expect(segundo.snapshot).toEqual(primero.snapshot);
  });

  it("se rehace con un commit nuevo y da el mismo snapshot que sin caché", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const cache = new ChurnCache();
    analyzeRepository(root, { churnCache: cache });
    fs.writeFileSync(
      path.join(root, "src", "a.ts"),
      "export const a = 2;\n",
      "utf8"
    );
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "segundo"]);

    const conCache = analyzeRepository(root, { churnCache: cache });
    expect(cache.stats()).toEqual({ hits: 0, misses: 2 });
    expect(conCache.git.commits).toBe(2);
    expect(conCache.snapshot).toEqual(analyzeRepository(root).snapshot);
  });

  it("se rehace cuando cambia la lista de ficheros", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const cache = new ChurnCache();
    analyzeRepository(root, { churnCache: cache });
    fs.writeFileSync(
      path.join(root, "src", "c.ts"),
      "export const c = 3;\n",
      "utf8"
    );

    const conAlta = analyzeRepository(root, { churnCache: cache });
    expect(cache.stats()).toEqual({ hits: 0, misses: 2 });
    expect(conAlta.snapshot).toEqual(analyzeRepository(root).snapshot);
  });
});

describe("analyzeRepository con git", () => {
  it("añade churn al snapshot y es determinista", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const first = analyzeRepository(root);
    expect(first.git).toMatchObject({
      enabled: true,
      commits: 1,
      authors: 1,
      shallow: false
    });
    expect(first.metricNames).toContain("number_of_commits");
    expect(first.metricNames).toContain("number_of_authors");

    const attributes = first.snapshot.lenses?.metrics?.attributes ?? {};
    expect(attributes[fileId("src/a.ts")]).toMatchObject({
      number_of_commits: 1,
      number_of_authors: 1
    });
    expect(attributes[fileId("src/b.ts")]).toMatchObject({
      number_of_commits: 1,
      number_of_authors: 1
    });

    const second = analyzeRepository(root);
    expect(second.snapshot).toEqual(first.snapshot);
    expect(second.snapshot.meta.checksum).toBe(first.snapshot.meta.checksum);
  });

  it("refleja commits nuevos y cambia el checksum", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const base = analyzeRepository(root);
    fs.writeFileSync(
      path.join(root, "src", "a.ts"),
      "export const a = 3;\n",
      "utf8"
    );
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "segundo"]);

    const head = analyzeRepository(root);
    const attributes = head.snapshot.lenses?.metrics?.attributes ?? {};
    expect(attributes[fileId("src/a.ts")]).toMatchObject({
      number_of_commits: 2,
      number_of_authors: 1
    });
    expect(head.snapshot.meta.checksum).not.toBe(base.snapshot.meta.checksum);
  });

  it("no emite churn cuando git está desactivado", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const result = analyzeRepository(root, { git: false });
    expect(result.git.enabled).toBe(false);
    expect(result.metricNames).not.toContain("number_of_commits");
    expect(result.snapshot.meta.checksum).toMatch(/^[0-9a-f]{32}$/);
  });
});
