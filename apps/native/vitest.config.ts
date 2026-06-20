import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "lib",
          environment: "node",
          include: ["lib/**/*.test.ts"],
          coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            include: ["lib/**/*.ts"],
            exclude: ["lib/**/*.d.ts", "lib/*-context.tsx", "lib/lazy-*.tsx"],
            thresholds: { lines: 80, functions: 80, branches: 75 },
          },
        },
      },
      {
        esbuild: {
          jsx: "automatic",
          jsxImportSource: "react",
        },
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "."),
            "react-native": "react-native-web",
          },
        },
        test: {
          name: "components",
          environment: "jsdom",
          include: ["components/**/*.test.tsx"],
          setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
        },
      },
    ],
  },
});
