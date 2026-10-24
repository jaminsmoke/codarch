import tseslint from "typescript-eslint";
import base from "./eslint.config.js";

/**
 * Las reglas que necesitan los tipos (ADR 0054).
 *
 * Es la pasada lenta: va en el CI, no en cada guardado. Se limita al código
 * de Node (paquetes, CLI, MCP, proceso principal y scripts); el renderer ya
 * cubre sus promesas con `void` y las reglas de React.
 */
const TYPED_FILES = [
  "packages/**/*.ts",
  "apps/cli/src/**/*.ts",
  "apps/mcp/src/**/*.ts",
  "apps/desktop/src/**/*.ts",
  "scripts/**/*.ts"
];

export default tseslint.config(
  ...base,
  {
    files: TYPED_FILES,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error"
    }
  }
);
