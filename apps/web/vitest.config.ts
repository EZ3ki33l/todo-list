import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**/*.ts", "components/**/*.tsx"],
      exclude: ["lib/**/*.d.ts", "components/__tests__/**"],
      thresholds: { lines: 50, functions: 50, branches: 50 },
    },
    projects: [
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "."),
          },
        },
        test: {
          name: "lib",
          environment: "node",
          include: ["lib/**/*.test.ts", "lib/**/*.test.tsx"],
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
