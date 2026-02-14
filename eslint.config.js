import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Import custom security plugin (CommonJS module)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const dbWriteGuard = require("./eslint-plugins/no-unsafe-db-writes.js");

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**", "eslint-plugins/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "db-guard": dbWriteGuard,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "db-guard/no-unsafe-db-writes": "error",
    },
  },
);
