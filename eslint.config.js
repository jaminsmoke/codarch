import globals from "globals";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import vitest from "@vitest/eslint-plugin";

/**
 * La segunda red del lint (ADR 0054).
 *
 * Oxlint hace la pasada rápida; esto añade lo que se le escapa: hooks,
 * accesibilidad, claves de listas y pruebas. Las reglas con tipos van en
 * `eslint.config.types.js`, que es más lento y no corre en cada guardado.
 */

const IGNORES = [
  "**/dist/**",
  "**/node_modules/**",
  "**/.codarch/**",
  "**/release/**",
  "**/.astro/**",
  "**/coverage/**",
  "**/samples/**",
  "packages/parsers/test/fixtures/**",
  "**/*.d.ts"
];

/** Lo que pinta React: UI compartida, las dos apps y los plugins. */
const REACT_FILES = [
  "packages/ui/src/**/*.{ts,tsx}",
  "apps/web/src/**/*.{ts,tsx}",
  "apps/desktop/src/renderer/**/*.{ts,tsx}",
  "plugins/**/*.{ts,tsx}"
];

export default tseslint.config(
  { ignores: IGNORES },
  {
    files: ["**/*.{ts,tsx,mjs}"],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  {
    files: REACT_FILES,
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error"
    }
  },
  {
    files: ["**/test/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    ...vitest.configs.recommended
  }
);
