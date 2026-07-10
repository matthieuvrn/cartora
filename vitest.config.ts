import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/domain/**/*.test.ts",
      "src/application/**/*.test.ts",
      "src/infrastructure/rate-limit/**/*.test.ts",
      "src/lib/**/*.test.ts",
      "src/i18n/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      // Périmètre des tests unitaires = la logique métier (domaine + application
      // + utilitaires). L'infrastructure/UI est validée par la CI, le typage et
      // le cahier de recettes, pas par des tests unitaires (cf. dossier Bloc 2).
      include: [
        "src/domain/**",
        "src/application/**",
        "src/lib/**",
        "src/i18n/**",
        "src/infrastructure/rate-limit/**",
      ],
      // Le périmètre `include` ci-dessus fait remonter aussi les fichiers non
      // couverts (rapportés à 0 %), donnant un taux honnête sur tout le métier.
      exclude: ["**/*.test.ts", "**/__fixtures__/**", "**/index.ts", "**/*.d.ts"],
    },
  },
});
