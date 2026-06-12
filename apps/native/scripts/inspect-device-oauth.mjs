#!/usr/bin/env node
/**
 * Diagnostique l'APK réellement installé sur le téléphone (adb).
 * Complète pnpm test:oauth (fichiers repo) sans rebuild.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OAUTH_EXPECTED,
  normalizeSha1,
  schemeFromWebClientId,
  verifyGoogleOAuth,
} from "./lib/google-oauth-verify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nativeRoot = path.resolve(__dirname, "..");
const packageName = OAUTH_EXPECTED.packageName;

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function findApksigner() {
  const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const candidates = [];
  if (sdkRoot) {
    const buildTools = path.join(sdkRoot, "build-tools");
    if (fs.existsSync(buildTools)) {
      for (const version of fs.readdirSync(buildTools).sort().reverse()) {
        candidates.push(path.join(buildTools, version, "apksigner"));
      }
    }
  }
  candidates.push("apksigner");
  return candidates.find((bin) => {
    if (bin === "apksigner") return false;
    return fs.existsSync(bin);
  });
}

/** @returns {string[] | null} */
function extractApkSha1Fingerprints(apkFile) {
  const apksigner = findApksigner();
  if (!apksigner) return null;
  try {
    const out = execSync(`"${apksigner}" verify --print-certs "${apkFile}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return [
      ...new Set(
        [...out.matchAll(/SHA-1 digest:\s*([0-9A-Fa-f:]+)/g)].map((match) =>
          normalizeSha1(match[1]),
        ),
      ),
    ];
  } catch {
    return null;
  }
}

/** @param {object} googleServices */
function matchShaToOAuthClients(googleServices, sha1List) {
  const androidClients =
    googleServices.client?.[0]?.oauth_client?.filter((e) => e.client_type === 1) ??
    [];
  return sha1List.map((sha1) => {
    const compact = sha1.replace(/:/g, "").toLowerCase();
    const client = androidClients.find(
      (entry) => entry.android_info?.certificate_hash?.toLowerCase() === compact,
    );
    const label =
      Object.entries(OAUTH_EXPECTED.requiredSha1).find(
        ([, value]) => normalizeSha1(value) === sha1,
      )?.[0] ?? null;
    return { sha1, label, clientId: client?.client_id ?? null };
  });
}

try {
  sh("adb get-state");
} catch {
  fail("adb indisponible ou aucun appareil connecté");
}

let versionCode = "?";
try {
  const dump = sh(`adb shell dumpsys package ${packageName}`);
  versionCode = dump.match(/versionCode=(\d+)/)?.[1] ?? "?";
} catch {
  fail(`App ${packageName} non installée sur le device`);
}

const apkPath = sh(`adb shell pm path ${packageName}`)
  .split("\n")
  .find((line) => line.includes("base.apk"))
  ?.replace("package:", "")
  ?.trim();

if (!apkPath) {
  fail("base.apk introuvable via adb");
}

const localApk = path.join(os.tmpdir(), `todolist-device-${versionCode}.apk`);
sh(`adb pull "${apkPath}" "${localApk}"`);
const apkBytes = fs.readFileSync(localApk);

const needles = {
  webClientId: OAUTH_EXPECTED.webClientId.replace(".apps.googleusercontent.com", ""),
  playAndroidClient: "cmc4hcif",
  playShaCompact: OAUTH_EXPECTED.requiredSha1.play.replace(/:/g, "").toLowerCase(),
  scheme: schemeFromWebClientId(OAUTH_EXPECTED.webClientId),
};

const hits = Object.fromEntries(
  Object.entries(needles).map(([key, value]) => [key, apkBytes.includes(Buffer.from(value))]),
);

const googleServices = JSON.parse(
  fs.readFileSync(
    path.join(nativeRoot, OAUTH_EXPECTED.googleServicesRelativePath),
    "utf8",
  ),
);

const repoVerify = verifyGoogleOAuth({
  googleServices,
  appJson: JSON.parse(fs.readFileSync(path.join(nativeRoot, "app.json"), "utf8")),
  manifest: fs.readFileSync(
    path.join(nativeRoot, "android/app/src/main/AndroidManifest.xml"),
    "utf8",
  ),
  buildGradle: fs.readFileSync(
    path.join(nativeRoot, "android/app/build.gradle"),
    "utf8",
  ),
  envExample: fs.readFileSync(path.join(nativeRoot, "env.example"), "utf8"),
});

console.log("📱 Diagnostic OAuth — appareil");
console.log(`   package      : ${packageName}`);
console.log(`   versionCode  : ${versionCode}`);
console.log(`   apk local    : ${localApk}`);
console.log("");
console.log("Contenu APK (recherche binaire) :");
console.log(
  `   webClientId (6ebvh8…)     : ${hits.webClientId ? "✅ présent" : "❌ absent"}`,
);
console.log(
  `   client Play (cmc4hcif…)   : ${hits.playAndroidClient ? "✅ présent" : "⚠ absent (souvent normal — GMS utilise package+SHA)"}`,
);
console.log(
  `   SHA Play en clair (63b71f) : ${hits.playShaCompact ? "✅ présent" : "⚠ absent (normal si non embarqué en clair)"}`,
);
console.log(
  `   schéma OAuth manifest      : ${hits.scheme ? "✅ présent" : "❌ absent"}`,
);
console.log("");
console.log(
  `Repo (fichiers sources)      : ${repoVerify.ok ? "✅ cohérent" : "❌ incohérent"}`,
);
if (repoVerify.summary?.playOAuthClientId) {
  console.log(`   client Play attendu (json) : ${repoVerify.summary.playOAuthClientId}`);
}
console.log(`   SHA Play attendu           : ${normalizeSha1(needles.playShaCompact)}`);

const apkSha1List = extractApkSha1Fingerprints(localApk);
console.log("");
console.log("Certificat réel de l'APK installé (gratuit, sans config-doctor) :");
if (!apkSha1List?.length) {
  console.log("   ⚠ apksigner introuvable — installe Android SDK build-tools, ou :");
  console.log(`     apksigner verify --print-certs "${localApk}"`);
} else {
  const matches = matchShaToOAuthClients(googleServices, apkSha1List);
  for (const { sha1, label, clientId } of matches) {
    const known = label ? ` (${label})` : "";
    const oauth = clientId
      ? `✅ client OAuth : …${clientId.split("-")[1]?.slice(0, 8)}…`
      : "❌ AUCUN client OAuth dans google-services.json — cause probable du code 10";
    console.log(`   SHA-1${known} : ${sha1}`);
    console.log(`      ${oauth}`);
  }
}

console.log(`
Si webClientId ✅ + repo ✅ mais code 10 persiste :
→ Compare le SHA-1 ci-dessus avec Google Cloud (pas besoin de config-doctor payant).

Pistes (dans l'ordre) :
1. SHA APK ❌ absent de google-services.json → ajouter dans Firebase, retélécharger le JSON, rebuild EAS
2. Install via partage interne Play (IAS) → utiliser la piste test interne à la place
3. Play Console → Intégrité → certificat legacy en plus du certificat actuel
4. OAuth → écran de consentement : utilisateur test ou mode Production
5. Test debug : pnpm android (SHA debug 54:40…) sur le même téléphone

Logcat :
  adb logcat -c && adb logcat | rg -i 'GetTokenResponseHandler|not registered|DEVELOPER_ERROR'
`);
