#!/usr/bin/env node
/**
 * CLI pre-build : vérifie la config OAuth sans compiler l'APK.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OAUTH_EXPECTED,
  verifyGoogleOAuth,
} from "./lib/google-oauth-verify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nativeRoot = path.resolve(__dirname, "..");

function readText(relativePath) {
  const fullPath = path.join(nativeRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const duplicatePath = "app/google-services.json";
const duplicateExists = fs.existsSync(path.join(nativeRoot, duplicatePath));

const result = verifyGoogleOAuth({
  googleServices: readJson(OAUTH_EXPECTED.googleServicesRelativePath),
  appJson: readJson("app.json"),
  manifest: readText("android/app/src/main/AndroidManifest.xml") ?? "",
  buildGradle: readText("android/app/build.gradle") ?? "",
  envExample: readText("env.example") ?? "",
  duplicateGoogleServicesPath: duplicateExists ? duplicatePath : undefined,
});

if (!result.ok) {
  console.error("❌ Vérification OAuth Google échouée :\n");
  for (const error of result.errors) {
    console.error(`  • ${error}`);
  }
  if (result.warnings.length > 0) {
    console.error("\nAvertissements :");
    for (const warning of result.warnings) {
      console.error(`  ⚠ ${warning}`);
    }
  }
  console.error("\nCorrigez puis : pnpm test:oauth (apps/native)");
  process.exit(1);
}

console.log("✅ OAuth Google cohérent");
console.log(`   package         : ${result.summary.packageName}`);
console.log(`   webClientId     : ${result.summary.webClientId}`);
console.log(`   scheme Android  : ${result.summary.scheme}`);
console.log(`   client Play SHA : ${result.summary.playOAuthClientId ?? "MANQUANT"}`);
console.log(`   clients Android : ${result.summary.androidClientCount}`);
if (result.warnings.length > 0) {
  console.log("\nAvertissements :");
  for (const warning of result.warnings) {
    console.log(`  ⚠ ${warning}`);
  }
}
