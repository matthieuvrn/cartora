import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier";

// Libs bloquées dans domain + application (framework, services externes)
const noFrameworkPatterns = [
  "next",
  "next/**",
  "react",
  "react/**",
  "next-intl",
  "next-intl/**",
  "@sentry/**",
  "@supabase/**",
  "@prisma/client",
  "@/generated/prisma/**",
  "stripe",
  "posthog-js",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  // Underscore prefix = intentionally unused
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  /**
   * 1) ZONES — empêche les imports cross-layer
   *    - domain ne peut pas importer application/infra/interface/app
   *    - application ne peut pas importer infra/interface/app
   *    - infrastructure ne peut pas importer interface/app
   */
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // Domain ne dépend de rien d'autre
            {
              target: "./src/domain",
              from: "./src/application",
              message: "Domain ne peut pas importer Application",
            },
            {
              target: "./src/domain",
              from: "./src/infrastructure",
              message: "Domain ne peut pas importer Infrastructure",
            },
            {
              target: "./src/domain",
              from: "./src/interface",
              message: "Domain ne peut pas importer Interface",
            },
            {
              target: "./src/domain",
              from: "./src/app",
              message: "Domain ne peut pas importer App",
            },

            // Application dépend de domain mais pas d'infra/interface/app
            {
              target: "./src/application",
              from: "./src/infrastructure",
              message: "Application ne peut pas importer Infrastructure",
            },
            {
              target: "./src/application",
              from: "./src/interface",
              message: "Application ne peut pas importer Interface",
            },
            {
              target: "./src/application",
              from: "./src/app",
              message: "Application ne peut pas importer App",
            },

            // Infrastructure ne dépend pas de interface/app
            {
              target: "./src/infrastructure",
              from: "./src/interface",
              message: "Infrastructure ne peut pas importer Interface",
            },
            {
              target: "./src/infrastructure",
              from: "./src/app",
              message: "Infrastructure ne peut pas importer App",
            },

            // Interface ne doit pas importer infrastructure (composition root = src/app)
            {
              target: "./src/interface",
              from: "./src/infrastructure",
              message:
                "Interface ne peut pas importer Infrastructure (utiliser la composition root src/app)",
            },
          ],
        },
      ],
    },
  },

  /**
   * 2) DOMAIN — pur TS : pas de Next/React/infra libs
   *    (complément utile aux zones, car zones ne bloque pas les libs externes)
   */
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            // Bloque les autres couches via alias
            "@/application/**",
            "@/infrastructure/**",
            "@/interface/**",
            "@/app/**",

            // Bloque framework / libs externes
            ...noFrameworkPatterns,
          ],
        },
      ],
    },
  },

  /**
   * 3) APPLICATION — pas de Next/React/UI/infra
   */
  {
    files: ["src/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/infrastructure/**", "@/interface/**", "@/app/**", ...noFrameworkPatterns],
        },
      ],
    },
  },

  /**
   * 4) INFRA — évite cycles : pas d'import interface/app
   *    (zones le fait déjà, mais ça donne un message d'erreur plus explicite via alias)
   */
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/interface/**", "@/app/**"],
        },
      ],
    },
  },

  /**
   * 5) INTERFACE — pas d'import infrastructure (double verrou avec les zones)
   *    Note : interface peut importer app (server actions)
   */
  {
    files: ["src/interface/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/infrastructure/**"],
        },
      ],
    },
  },

  // Désactive les règles de formatting ESLint qui entrent en conflit avec Prettier
  prettierConfig,
]);

export default eslintConfig;
