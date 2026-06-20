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
          coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            include: ["lib/**/*.ts"],
            exclude: ["lib/**/*.d.ts"],
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
