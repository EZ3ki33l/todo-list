import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "@repo/eslint-config/next";

export default defineConfig([
  ...nextCoreWebVitals,
  globalIgnores([".next/**", "out/**", "node_modules/**", "coverage/**"]),
  {
    rules: {
      // Pattern valide : réinitialiser du state dans un effect au changement d'une clé
      // (ex: setOverride(null) quand la liste change). Le React Compiler est trop strict
      // sur ce pattern qui est correct pour les composants non-compilés.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
