#!/usr/bin/env node
/**
 * Vérifie la cohérence OAuth Google avant un build EAS ou local.
 * Échoue (exit 1) si webClientId, schéma Android ou package divergent.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nativeRoot = path.resolve(__dirname, "..");
const errors = [];

function readJson(relativePath) {
  const fullPath = path.join(nativeRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Fichier manquant : ${relativePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function schemeFromWebClientId(clientId) {
  const prefix = clientId.replace(".apps.googleusercontent.com", "");
  return `com.googleusercontent.apps.${prefix}`;
}

function normalizeSha1(hash) {
  return hash.toUpperCase().match(/.{1,2}/g)?.join(":") ?? hash;
}

const googleServicesPath = "android/app/google-services.json";
const googleServices = readJson(googleServicesPath);
if (!googleServices) {
  console.error("❌ verify-google-oauth : google-services.json introuvable");
  process.exit(1);
}

const client = googleServices.client?.[0];
const packageName = client?.client_info?.android_client_info?.package_name;
const oauthClients = client?.oauth_client ?? [];
const webClient = oauthClients.find((entry) => entry.client_type === 3);
const androidClients = oauthClients.filter((entry) => entry.client_type === 1);

if (!packageName) {
  errors.push("google-services.json : package_name Android manquant");
}
if (!webClient?.client_id) {
  errors.push("google-services.json : client Web (client_type 3) manquant");
}

const expectedWebClientId = webClient?.client_id;
const expectedScheme = expectedWebClientId
  ? schemeFromWebClientId(expectedWebClientId)
  : null;

const appJson = readJson("app.json");
if (appJson?.expo?.android?.package !== packageName) {
  errors.push(
    `app.json package (${appJson?.expo?.android?.package}) ≠ google-services (${packageName})`,
  );
}

if (appJson?.expo?.android?.googleServicesFile !== "./android/app/google-services.json") {
  errors.push(
    `app.json googleServicesFile incorrect : ${appJson?.expo?.android?.googleServicesFile}`,
  );
}

const appJsonScheme = appJson?.expo?.android?.intentFilters?.[0]?.data?.[0]?.scheme;
if (expectedScheme && appJsonScheme !== expectedScheme) {
  errors.push(
    `app.json intentFilters scheme incorrect.\n  attendu : ${expectedScheme}\n  actuel  : ${appJsonScheme ?? "MANQUANT"}`,
  );
}

const manifestPath = path.join(
  nativeRoot,
  "android/app/src/main/AndroidManifest.xml",
);
const manifest = fs.readFileSync(manifestPath, "utf8");
if (expectedScheme && !manifest.includes(`android:scheme="${expectedScheme}"`)) {
  errors.push(
    `AndroidManifest.xml : schéma OAuth absent ou incorrect (attendu ${expectedScheme})`,
  );
}

const buildGradle = fs.readFileSync(
  path.join(nativeRoot, "android/app/build.gradle"),
  "utf8",
);
if (packageName && !buildGradle.includes(`applicationId '${packageName}'`)) {
  errors.push(`build.gradle applicationId ≠ ${packageName}`);
}

const easWebClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
if (easWebClientId && expectedWebClientId && easWebClientId !== expectedWebClientId) {
  errors.push(
    `EXPO_PUBLIC_GOOGLE_CLIENT_ID (build) ≠ client Web google-services.json.\n  EAS/env : ${easWebClientId}\n  JSON    : ${expectedWebClientId}`,
  );
}

const appGoogleServices = readJson("app/google-services.json");
if (appGoogleServices && expectedWebClientId) {
  const appWeb = appGoogleServices.client?.[0]?.oauth_client?.find(
    (entry) => entry.client_type === 3,
  );
  if (appWeb?.client_id !== expectedWebClientId) {
    errors.push("app/google-services.json désynchronisé avec android/app/google-services.json");
  }
}

const requiredSha1 = {
  installed: "63:B7:1F:21:26:78:AC:54:78:AF:14:50:9F:C1:C4:CB:AF:F5:79:18",
  debug: "54:40:61:09:64:FF:CD:14:BB:6F:99:22:01:C8:4B:B7:F0:E2:18:E1",
};

for (const [label, sha1] of Object.entries(requiredSha1)) {
  const normalized = sha1.replace(/:/g, "").toLowerCase();
  const found = androidClients.some(
    (entry) => entry.android_info?.certificate_hash?.toLowerCase() === normalized,
  );
  if (!found) {
    errors.push(`google-services.json : SHA-1 ${label} (${sha1}) absent`);
  }
}

if (errors.length > 0) {
  console.error("❌ Vérification OAuth Google échouée :\n");
  for (const error of errors) {
    console.error(`  • ${error}`);
  }
  console.error(
    "\nCorrigez ces fichiers puis relancez le build. Voir apps/native/DEPLOY.md §3.",
  );
  process.exit(1);
}

console.log("✅ OAuth Google cohérent");
console.log(`   package        : ${packageName}`);
console.log(`   webClientId    : ${expectedWebClientId}`);
console.log(`   scheme Android : ${expectedScheme}`);
console.log(`   clients Android: ${androidClients.length}`);
if (easWebClientId) {
  console.log(`   EAS env        : OK (${easWebClientId.slice(0, 24)}…)`);
}
