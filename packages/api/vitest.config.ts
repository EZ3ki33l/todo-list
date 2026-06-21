import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    alias: {
      "server-only": path.resolve(__dirname, "src/__tests__/__mocks__/server-only.ts"),
    },
    // Exclure les tests nécessitant une vraie base de données
    exclude: ["src/lib/shopping-item-stat.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts",
        "src/server.ts",
        "src/router/**",
        "src/lib/shopping-item-stat.ts",
        "src/lib/expo-push.ts",
        "src/lib/web-push.ts",
        "src/lib/web-push-subscriptions.ts",
        "src/lib/mistral-client.ts",
        "src/lib/google-calendar.ts",
        "src/lib/clerk-user.ts",
        "src/lib/verify-clerk-session.ts",
      ],
      thresholds: { lines: 75, functions: 75, branches: 70 },
    },
  },
});
