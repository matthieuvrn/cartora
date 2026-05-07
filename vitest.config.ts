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
    ],
  },
});
