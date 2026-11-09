// typescript-eslint (utilisé par eslint-config-next) refuse de tourner sur TypeScript >= 7
// (https://github.com/typescript-eslint/typescript-eslint/issues/10940). Le reste du monorepo
// est passé en TypeScript 7 pour la compilation ; ce package isole eslint-config-next avec sa
// propre dépendance TypeScript 6, comme recommandé par l'équipe TS pour ce cas de figure.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default nextCoreWebVitals;
