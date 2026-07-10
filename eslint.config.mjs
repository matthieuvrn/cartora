import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettierConfig from "eslint-config-prettier";

// Libs blocked in domain + application (frameworks, external services)
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
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),

  // Accessibilité (RGAA/OPQUAST) — démarche outillée explicite : on active le jeu
  // de règles "recommended" de jsx-a11y (le plugin est déjà enregistré par
  // next/core-web-vitals, on ne redéclare donc que les règles) afin de couvrir
  // tout le JSX, au-delà du sous-ensemble par défaut.
  {
    files: ["src/**/*.{jsx,tsx}"],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Choix assumé : on conserve role="list" sur les <ul> dont le style retire
      // les puces (list-style:none). Safari/VoiceOver supprime alors la sémantique
      // de liste ; role="list" la restaure. C'est une amélioration d'accessibilité,
      // pas une redondance — la règle est donc désactivée volontairement.
      "jsx-a11y/no-redundant-roles": "off",
    },
  },

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
   * 1) ZONES — prevents cross-layer imports
   *    - domain cannot import application/infra/interface/app
   *    - application cannot import infra/interface/app
   *    - infrastructure cannot import interface/app
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
            // Domain depends on nothing else
            {
              target: "./src/domain",
              from: "./src/application",
              message: "Domain cannot import Application",
            },
            {
              target: "./src/domain",
              from: "./src/infrastructure",
              message: "Domain cannot import Infrastructure",
            },
            {
              target: "./src/domain",
              from: "./src/interface",
              message: "Domain cannot import Interface",
            },
            {
              target: "./src/domain",
              from: "./src/app",
              message: "Domain cannot import App",
            },

            // Application depends on Domain but not Infra/Interface/App
            {
              target: "./src/application",
              from: "./src/infrastructure",
              message: "Application cannot import Infrastructure",
            },
            {
              target: "./src/application",
              from: "./src/interface",
              message: "Application cannot import Interface",
            },
            {
              target: "./src/application",
              from: "./src/app",
              message: "Application cannot import App",
            },

            // Infrastructure does not depend on Interface/App
            {
              target: "./src/infrastructure",
              from: "./src/interface",
              message: "Infrastructure cannot import Interface",
            },
            {
              target: "./src/infrastructure",
              from: "./src/app",
              message: "Infrastructure cannot import App",
            },

            // Interface must not import Infrastructure (composition root = src/app)
            {
              target: "./src/interface",
              from: "./src/infrastructure",
              message: "Interface cannot import Infrastructure (use the composition root src/app)",
            },
          ],
        },
      ],
    },
  },

  /**
   * 2) DOMAIN — pure TS: no Next/React/infra libs
   *    (complements zones, which don't block external libs)
   */
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            // Block other layers via alias
            "@/application/**",
            "@/infrastructure/**",
            "@/interface/**",
            "@/app/**",

            // Block framework / external libs
            ...noFrameworkPatterns,
          ],
        },
      ],
    },
  },

  /**
   * 3) APPLICATION — no Next/React/UI/infra
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
   * 4) INFRA — prevent cycles: no interface/app imports
   *    (zones already does this, but alias gives a more explicit error message)
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
   * 5) INTERFACE — no infrastructure imports (double lock with zones)
   *    Note: interface can import app (server actions)
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

  // Disable ESLint formatting rules that conflict with Prettier
  prettierConfig,
]);

export default eslintConfig;
