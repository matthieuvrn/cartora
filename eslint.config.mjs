import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

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
            { target: "./src/domain", from: "./src/application" },
            { target: "./src/domain", from: "./src/infrastructure" },
            { target: "./src/domain", from: "./src/interface" },
            { target: "./src/domain", from: "./src/app" },

            // Application dépend de domain mais pas d'infra/interface/app
            { target: "./src/application", from: "./src/infrastructure" },
            { target: "./src/application", from: "./src/interface" },
            { target: "./src/application", from: "./src/app" },

            // Infrastructure ne dépend pas de interface/app
            { target: "./src/infrastructure", from: "./src/interface" },
            { target: "./src/infrastructure", from: "./src/app" },

            // Interface ne doit pas importer infrastructure (composition root = src/app)
            { target: "./src/interface", from: "./src/infrastructure" },
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
            "next",
            "next/**",
            "react",
            "react/**",
            "next-intl",
            "next-intl/**",
            "@sentry/**",
            "@supabase/**",
            "stripe",
            "posthog-js",
            // "umami", // si on ajoutes une lib spécifique Umami
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
          patterns: [
            "@/infrastructure/**",
            "@/interface/**",
            "@/app/**",

            "next",
            "next/**",
            "react",
            "react/**",
            "next-intl",
            "next-intl/**",
            "@sentry/**",
            "@supabase/**",
            "stripe",
            "posthog-js",
          ],
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
]);

export default eslintConfig;
