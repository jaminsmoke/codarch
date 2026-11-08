import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  biomeUsesRecommended,
  describeLintSystems,
  detectLintSystems,
  expandRuffSelectors,
  parseBiomeConfigRules,
  parseCheckstyleConfigRules,
  parseEslintConfigRules,
  parseOxlintConfigRules,
  parseRuffConfigRules,
  parseRuffRuleCatalog
} from "../src/project";
import type { LintProcessRunner } from "../src/run";

const roots: string[] = [];

function repo(files: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-detect-"));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
  }
  return root;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("el lint que tiene el proyecto", () => {
  it("detecta ESLint por su config y su binario instalado", () => {
    const root = repo({
      "eslint.config.js": "export default [];",
      "node_modules/eslint/bin/eslint.js": "// binario",
      "src/a.ts": "export const a = 1;"
    });

    const [eslint] = detectLintSystems(root);

    expect(eslint).toMatchObject({
      name: "eslint",
      config: "eslint.config.js",
      format: "eslint-json",
      command: "node node_modules/eslint/bin/eslint.js . --format json",
      sample: "src/a.ts",
      exhaustive: true
    });
    expect(eslint?.rulesCommand).toBe(
      "node node_modules/eslint/bin/eslint.js --print-config src/a.ts"
    );
  });

  it("una config sin binario es «declarada y no ejecutable»", () => {
    const root = repo({ ".eslintrc.json": "{}" });

    const [eslint] = detectLintSystems(root);

    expect(eslint?.command).toBeNull();
    expect(eslint?.note).toMatch(/no está instalado/);
  });

  it("detecta oxlint por su config, sin inventar el nombre del fichero", () => {
    const root = repo({
      ".oxlintrc.json": "{}",
      "node_modules/oxlint/bin/oxlint": "// binario"
    });

    const [oxlint] = detectLintSystems(root);

    expect(oxlint).toMatchObject({
      name: "oxlint",
      config: ".oxlintrc.json",
      format: "oxlint-json",
      command: "node node_modules/oxlint/bin/oxlint --format json .",
      listCommand: "node node_modules/oxlint/bin/oxlint --debug=files ."
    });
  });

  it("detecta Biome con su config y su binario", () => {
    const root = repo({
      "biome.json": "{}",
      "node_modules/@biomejs/biome/bin/biome": "// binario"
    });

    const [biome] = detectLintSystems(root);

    expect(biome).toMatchObject({
      name: "biome",
      config: "biome.json",
      format: "biome-json",
      command: "node node_modules/@biomejs/biome/bin/biome lint --reporter=json ."
    });
  });

  it("una config de Biome sin binario no se completa", () => {
    const [biome] = detectLintSystems(repo({ "biome.json": "{}" }));

    expect(biome?.command).toBeNull();
    expect(biome?.note).toMatch(/no está instalado/);
  });

  it("detecta Ruff por su config y lanza el del PATH", () => {
    const [ruff] = detectLintSystems(repo({ "ruff.toml": "line-length = 88\n" }));

    expect(ruff).toMatchObject({
      name: "ruff",
      config: "ruff.toml",
      format: "ruff-json",
      command: "ruff check --output-format=json ."
    });
  });

  it("detecta Go y lanza el `go vet` del PATH", () => {
    const [goVet] = detectLintSystems(repo({ "go.mod": "module ejemplo\n" }));

    expect(goVet).toMatchObject({
      name: "go-vet",
      config: null,
      format: "govet-text",
      command: "go vet ./... 2>&1"
    });
    expect(goVet?.note).toMatch(/versión de Go/);
  });

  it("detecta .NET y prefiere la solución al proyecto suelto", () => {
    const [dotnet] = detectLintSystems(
      repo({ "Demo.sln": "Microsoft Visual Studio Solution File", "Demo.csproj": "<Project />" })
    );

    expect(dotnet).toMatchObject({
      name: "dotnet",
      config: "Demo.sln",
      format: "dotnet-text",
      command:
        'dotnet format "Demo.sln" analyzers --verify-no-changes --no-restore --severity info 2>&1'
    });
    expect(dotnet?.note).toMatch(/AnalysisLevel/);
  });

  it("no queda ningún sistema detectado sin lector", () => {
    const systems = detectLintSystems(
      repo({
        "go.mod": "module ejemplo\n",
        "Demo.csproj": "<Project />",
        "config/checkstyle/checkstyle.xml": '<module name="Checker" />',
        "biome.json": "{}",
        "ruff.toml": "line-length = 88\n"
      })
    );

    expect(systems.map((system) => system.name)).toEqual(
      expect.arrayContaining(["go-vet", "dotnet", "checkstyle", "biome", "ruff"])
    );
    for (const system of systems) expect(system.format).not.toBeNull();
  });

  it("detecta Checkstyle y lanza el del PATH con su XML", () => {
    const [checkstyle] = detectLintSystems(
      repo({ "config/checkstyle/checkstyle.xml": '<module name="Checker" />' })
    );

    expect(checkstyle).toMatchObject({
      name: "checkstyle",
      config: "config/checkstyle/checkstyle.xml",
      format: "checkstyle-xml",
      command: 'checkstyle -c "config/checkstyle/checkstyle.xml" -f xml .'
    });
  });

  it("el plugin de Gradle no basta: no se inventa el XML", () => {
    const [checkstyle] = detectLintSystems(
      repo({ "build.gradle": "plugins { id 'checkstyle' }" })
    );

    expect(checkstyle?.command).toBeNull();
    expect(checkstyle?.note).toMatch(/no dice qué XML/);
  });

  it("lee los módulos de Checkstyle sin contenedores ni filtros", () => {
    expect(
      parseCheckstyleConfigRules(`
<module name="Checker">
  <module name="TreeWalker">
    <module name="EmptyStatement"/>
    <module name="LineLength"/>
  </module>
  <module name="SuppressionFilter"/>
</module>`)
    ).toEqual([
      { id: "EmptyStatement", severity: "error" },
      { id: "LineLength", severity: "error" }
    ]);
  });

  it("Checkstyle lee su config y avisa de la severidad", async () => {
    const root = repo({
      "config/checkstyle/checkstyle.xml": '<module name="Checker"><module name="TreeWalker"><module name="LineLength"/></module></module>'
    });

    const [checkstyle] = await describeLintSystems(
      root,
      detectLintSystems(root),
      { run: vi.fn<LintProcessRunner>() }
    );

    expect(checkstyle?.rules).toEqual([
      { id: "LineLength", severity: "error" }
    ]);
    expect(checkstyle?.note).toMatch(/severidad/);
  });

  it("no detecta nada en un repo sin config ni herramientas", () => {
    expect(detectLintSystems(repo({ "src/a.ts": "export {};" }))).toEqual([]);
  });
});

describe("las reglas activas", () => {
  it("lee las de ESLint con su severidad y descarta las apagadas", () => {
    expect(
      parseEslintConfigRules({
        rules: {
          "no-console": ["error", { allow: [] }],
          "no-var": 1,
          "no-debugger": 0,
          "no-unused-vars": ["warn"]
        }
      })
    ).toEqual([
      { id: "no-console", severity: "error" },
      { id: "no-unused-vars", severity: "warn" },
      { id: "no-var", severity: "warn" }
    ]);
  });

  it("lee las de oxlint, incluidas las formas con opciones", () => {
    expect(
      parseOxlintConfigRules({
        rules: {
          "no-debugger": "warn",
          "no-var": ["error"],
          "no-console": "off"
        }
      })
    ).toEqual([
      { id: "no-debugger", severity: "warn" },
      { id: "no-var", severity: "error" }
    ]);
  });

  it("ESLint resuelve su config de verdad con --print-config", async () => {
    const root = repo({
      "eslint.config.js": "export default [];",
      "node_modules/eslint/bin/eslint.js": "// binario",
      "src/a.ts": "export const a = 1;"
    });
    const run: LintProcessRunner = async () => ({
      stdout: JSON.stringify({ rules: { "no-console": 2, "no-var": 1 } }),
      stderr: "",
      code: 0
    });

    const [eslint] = await describeLintSystems(root, detectLintSystems(root), {
      run
    });

    expect(eslint?.rules).toEqual([
      { id: "no-console", severity: "error" },
      { id: "no-var", severity: "warn" }
    ]);
  });

  it("si --print-config falla, se dice y no se rellena la lista", async () => {
    const root = repo({
      "eslint.config.js": "export default [];",
      "node_modules/eslint/bin/eslint.js": "// binario",
      "src/a.ts": "export const a = 1;"
    });
    const run: LintProcessRunner = async () => {
      throw new Error("config rota");
    };

    const [eslint] = await describeLintSystems(root, detectLintSystems(root), {
      run
    });

    expect(eslint?.rules).toBeUndefined();
    expect(eslint?.note).toMatch(/no se pudieron enumerar/);
  });

  it("lee las reglas que escribe la config de Biome", () => {
    expect(
      parseBiomeConfigRules({
        linter: {
          rules: {
            recommended: true,
            style: { useConst: "error", noNonNullAssertion: "off" },
            suspicious: { noDoubleEquals: { level: "warn" } }
          }
        }
      })
    ).toEqual([
      { id: "style/useConst", severity: "error" },
      { id: "suspicious/noDoubleEquals", severity: "warn" }
    ]);
  });

  it("un Biome desactivado no activa nada y no finge recomendadas", () => {
    expect(
      parseBiomeConfigRules({
        linter: { enabled: false, rules: { style: { useConst: "error" } } }
      })
    ).toEqual([]);
    expect(biomeUsesRecommended({ linter: { enabled: false } })).toBe(false);
    expect(biomeUsesRecommended({ linter: { rules: { recommended: false } } })).toBe(
      false
    );
    expect(biomeUsesRecommended({ linter: { rules: { style: {} } } })).toBe(true);
  });

  it("Biome lee su config y avisa de las recomendadas", async () => {
    const root = repo({
      "biome.json": JSON.stringify({
        linter: { rules: { correctness: { noUnusedVariables: "error" } } }
      }),
      "node_modules/@biomejs/biome/bin/biome": "// binario"
    });

    const [biome] = await describeLintSystems(root, detectLintSystems(root), {
      run: vi.fn<LintProcessRunner>()
    });

    expect(biome?.rules).toEqual([
      { id: "correctness/noUnusedVariables", severity: "error" }
    ]);
    expect(biome?.note).toMatch(/recomendadas/);
  });

  it("lee los selectores de Ruff y descarta los ignorados", () => {
    expect(
      parseRuffConfigRules(
        '[lint]\nselect = ["E", "F"]\nignore = ["E501"]\nextend-select = ["B"]\n'
      )
    ).toEqual([
      { id: "B", severity: "error" },
      { id: "E", severity: "error" },
      { id: "F", severity: "error" }
    ]);
  });

  it("lee los selectores en la tabla de pyproject, con comentarios y varias líneas", () => {
    const pyproject = `[tool.ruff]
line-length = 88

[tool.ruff.lint]
select = [
  "E", # errores de pycodestyle
  "F",
]
extend-ignore = ["E501"]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]
`;

    expect(parseRuffConfigRules(pyproject, { pyproject: true })).toEqual([
      { id: "E", severity: "error" },
      { id: "F", severity: "error" }
    ]);
    expect(parseRuffConfigRules(pyproject)).toEqual([]);
  });

  it("expande los selectores con el catálogo y respeta la especificidad", () => {
    const catalog = ["B006", "E101", "E501", "F401"].map((code) => ({ code }));

    expect(
      expandRuffSelectors({ select: ["E", "F"], ignore: ["E501"] }, catalog)
    ).toEqual([
      { id: "E101", severity: "error" },
      { id: "F401", severity: "error" }
    ]);
    expect(
      expandRuffSelectors({ select: ["E501"], ignore: ["E"] }, catalog)
    ).toEqual([{ id: "E501", severity: "error" }]);
    expect(
      expandRuffSelectors({ select: ["ALL"], ignore: ["ALL"] }, catalog)
    ).toEqual([]);
  });

  it("lee el catálogo sin repetir códigos ni colar basura", () => {
    expect(
      parseRuffRuleCatalog([
        { code: "E501" },
        { code: "E501" },
        { name: "sin código" },
        null
      ])
    ).toEqual([{ code: "E501" }]);
    expect(parseRuffRuleCatalog({ rules: [] })).toEqual([]);
  });

  it("Ruff expande sus selectores con el catálogo de su versión", async () => {
    const root = repo({
      "ruff.toml": '[lint]\nselect = ["E", "F"]\nignore = ["E501"]\n'
    });
    const run: LintProcessRunner = async (command) => ({
      stdout: command.startsWith("ruff rule")
        ? JSON.stringify([{ code: "E101" }, { code: "E501" }, { code: "F401" }])
        : "",
      stderr: "",
      code: 0
    });

    const [ruff] = await describeLintSystems(root, detectLintSystems(root), {
      run
    });

    expect(ruff?.rules).toEqual([
      { id: "E101", severity: "error" },
      { id: "F401", severity: "error" }
    ]);
    expect(ruff?.note).toMatch(/catálogo/);
  });

  it("Ruff guarda su catálogo con la versión y no lo vuelve a pedir", async () => {
    const root = repo({
      "ruff.toml": '[lint]\nselect = ["E"]\n',
      ".codarch/.keep": ""
    });
    const commands: string[] = [];
    const run: LintProcessRunner = async (command) => {
      commands.push(command);
      return {
        stdout:
          command === "ruff --version"
            ? "ruff 0.9.1\n"
            : JSON.stringify([{ code: "E101" }, { code: "E501" }]),
        stderr: "",
        code: 0
      };
    };

    await describeLintSystems(root, detectLintSystems(root), { run });

    expect(commands).toContain("ruff rule --all --output-format=json");
    const cache = JSON.parse(
      fs.readFileSync(path.join(root, ".codarch", "lint-cache.json"), "utf8")
    ) as { ruff: unknown };
    expect(cache.ruff).toEqual({
      version: "ruff 0.9.1",
      rules: ["E101", "E501"]
    });

    // La segunda pasada no pregunta por el catálogo: ya está en `.codarch/`.
    const again: LintProcessRunner = async (command) => {
      if (command.startsWith("ruff rule")) {
        throw new Error("no debería pedir el catálogo otra vez");
      }
      return { stdout: "ruff 0.9.1\n", stderr: "", code: 0 };
    };
    const [ruff] = await describeLintSystems(root, detectLintSystems(root), {
      run: again
    });

    expect(ruff?.rules).toEqual([
      { id: "E101", severity: "error" },
      { id: "E501", severity: "error" }
    ]);
    expect(ruff?.note).toMatch(/catálogo/);
  });

  it("otra versión de Ruff invalida la caché y sin `.codarch/` no se crea", async () => {
    const ruffRunner = (
      version: string,
      codes: string[],
      seen?: string[]
    ): LintProcessRunner => async (command) => {
      seen?.push(command);
      return {
        stdout:
          command === "ruff --version"
            ? `${version}\n`
            : JSON.stringify(codes.map((code) => ({ code }))),
        stderr: "",
        code: 0
      };
    };

    const fresh = repo({ "ruff.toml": '[lint]\nselect = ["E"]\n' });
    await describeLintSystems(fresh, detectLintSystems(fresh), {
      run: ruffRunner("ruff 0.9.1", ["E101"])
    });
    expect(fs.existsSync(path.join(fresh, ".codarch"))).toBe(false);

    const cached = repo({
      "ruff.toml": '[lint]\nselect = ["E"]\n',
      ".codarch/.keep": ""
    });
    await describeLintSystems(cached, detectLintSystems(cached), {
      run: ruffRunner("ruff 0.9.1", ["E101"])
    });

    const seen: string[] = [];
    const [ruff] = await describeLintSystems(cached, detectLintSystems(cached), {
      run: ruffRunner("ruff 0.10.0", ["E101", "E902"], seen)
    });

    expect(seen).toContain("ruff rule --all --output-format=json");
    expect(ruff?.rules).toEqual([
      { id: "E101", severity: "error" },
      { id: "E902", severity: "error" }
    ]);
  });

  it("sin catálogo, Ruff enseña sus selectores y lo dice", async () => {
    const root = repo({ "ruff.toml": '[lint]\nselect = ["E", "F"]\n' });
    const run: LintProcessRunner = async () => {
      throw new Error("no se encontró ruff");
    };

    const [ruff] = await describeLintSystems(root, detectLintSystems(root), {
      run
    });

    expect(ruff?.rules).toEqual([
      { id: "E", severity: "error" },
      { id: "F", severity: "error" }
    ]);
    expect(ruff?.note).toMatch(/catálogo/);
  });

  it("una config de Ruff sin select no se rellena con las de por defecto", async () => {
    const root = repo({ "ruff.toml": "line-length = 88\n" });

    const [ruff] = await describeLintSystems(root, detectLintSystems(root), {
      run: vi.fn<LintProcessRunner>()
    });

    expect(ruff?.rules).toBeUndefined();
    expect(ruff?.note).toMatch(/por defecto/);
  });

  it("oxlint sin config dice que no hay archivo de configuración", async () => {
    const root = repo({ "node_modules/oxlint/bin/oxlint": "// binario" });

    const [oxlint] = await describeLintSystems(root, detectLintSystems(root), {
      run: vi.fn<LintProcessRunner>()
    });

    expect(oxlint?.config).toBeNull();
    expect(oxlint?.note).toBe(
      "sin archivo de configuración: corre sus reglas por defecto y no se enumeran"
    );
  });

  it("oxlint lee su JSON sin lanzar un proceso", async () => {
    const root = repo({
      ".oxlintrc.json": JSON.stringify({
        rules: { "no-debugger": "warn", "no-var": "error" }
      }),
      "node_modules/oxlint/bin/oxlint": "// binario"
    });
    const run = vi.fn<LintProcessRunner>();

    const [oxlint] = await describeLintSystems(root, detectLintSystems(root), {
      run
    });

    expect(oxlint?.rules).toEqual([
      { id: "no-debugger", severity: "warn" },
      { id: "no-var", severity: "error" }
    ]);
    expect(run).not.toHaveBeenCalled();
  });
});
