/**
 * Validation statique OAuth Google (sans build Android).
 * Utilisé par le CLI pre-build et la suite Vitest.
 */

export const OAUTH_EXPECTED = {
  packageName: "com.ez3ki33l.todolist",
  projectNumber: "782595741716",
  webClientId:
    "782595741716-6ebvh8k73pbeta3hpcqapq4jj7lrtk6d.apps.googleusercontent.com",
  /** Ancien client Web NextAuth — ne doit plus apparaître dans la config native */
  deprecatedWebClientMarker: "7t6oc4",
  requiredSha1: {
    play: "63:B7:1F:21:26:78:AC:54:78:AF:14:50:9F:C1:C4:CB:AF:F5:79:18",
    debug: "54:40:61:09:64:FF:CD:14:BB:6F:99:22:01:C8:4B:B7:F0:E2:18:E1",
    upload: "9A:29:56:1B:3D:53:35:8F:91:1B:93:46:0D:43:11:A2:E7:9A:0F:28",
  },
  googleServicesRelativePath: "android/app/google-services.json",
};

export function schemeFromWebClientId(clientId) {
  const prefix = clientId.replace(".apps.googleusercontent.com", "");
  return `com.googleusercontent.apps.${prefix}`;
}

export function normalizeSha1(hash) {
  if (!hash) return "";
  const compact = hash.replace(/:/g, "").toLowerCase();
  return compact.match(/.{1,2}/g)?.join(":").toUpperCase() ?? hash.toUpperCase();
}

function sha1Compact(sha1) {
  return sha1.replace(/:/g, "").toLowerCase();
}

function parseEnvExampleGoogleClientId(envExampleText) {
  const match = envExampleText.match(
    /^EXPO_PUBLIC_GOOGLE_CLIENT_ID=(.+)$/m,
  );
  return match?.[1]?.trim() ?? null;
}

/**
 * @param {object} input
 * @param {object|null} input.googleServices
 * @param {object|null} input.appJson
 * @param {string} input.manifest
 * @param {string} input.buildGradle
 * @param {string} [input.envExample]
 * @param {string} [input.duplicateGoogleServicesPath] — chemin si un doublon existe
 * @param {string} [input.easWebClientId] — EXPO_PUBLIC_GOOGLE_CLIENT_ID au build
 */
export function verifyGoogleOAuth(input) {
  const errors = [];
  const warnings = [];
  const {
    googleServices,
    appJson,
    manifest,
    buildGradle,
    envExample = "",
    duplicateGoogleServicesPath,
    easWebClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  } = input;

  const { packageName, projectNumber, webClientId, requiredSha1, deprecatedWebClientMarker } =
    OAUTH_EXPECTED;
  const expectedScheme = schemeFromWebClientId(webClientId);

  if (duplicateGoogleServicesPath) {
    errors.push(
      `Doublon inutile : ${duplicateGoogleServicesPath} (seul android/app/google-services.json est utilisé au build)`,
    );
  }

  if (!googleServices) {
    errors.push("google-services.json introuvable ou JSON invalide");
    return { ok: false, errors, warnings, summary: null };
  }

  const client = googleServices.client?.[0];
  const gsPackage = client?.client_info?.android_client_info?.package_name;
  const oauthClients = client?.oauth_client ?? [];
  const webClient = oauthClients.find((entry) => entry.client_type === 3);
  const androidClients = oauthClients.filter((entry) => entry.client_type === 1);
  const actualWebClientId = webClient?.client_id;

  if (!gsPackage) {
    errors.push("google-services.json : package_name Android manquant");
  } else if (gsPackage !== packageName) {
    errors.push(
      `google-services.json package (${gsPackage}) ≠ attendu (${packageName})`,
    );
  }

  if (!actualWebClientId) {
    errors.push("google-services.json : client Web (client_type 3) manquant");
  } else {
    if (actualWebClientId !== webClientId) {
      errors.push(
        `google-services.json web client incorrect.\n  attendu : ${webClientId}\n  actuel  : ${actualWebClientId}`,
      );
    }
    if (!actualWebClientId.startsWith(`${projectNumber}-`)) {
      errors.push(
        `web client_id ne commence pas par le project_number Firebase (${projectNumber})`,
      );
    }
    if (actualWebClientId.includes(deprecatedWebClientMarker)) {
      errors.push(
        `ancien client Web détecté (${deprecatedWebClientMarker}) — utiliser le client Firebase 6ebvh8…`,
      );
    }
  }

  const inviteWeb =
    client?.services?.appinvite_service?.other_platform_oauth_client?.find(
      (entry) => entry.client_type === 3,
    )?.client_id;
  if (actualWebClientId && inviteWeb && inviteWeb !== actualWebClientId) {
    errors.push(
      "appinvite_service.other_platform_oauth_client ≠ client Web principal",
    );
  }

  const certHashes = androidClients.map(
    (entry) => entry.android_info?.certificate_hash?.toLowerCase() ?? "",
  );
  const uniqueCerts = new Set(certHashes.filter(Boolean));
  if (uniqueCerts.size !== certHashes.filter(Boolean).length) {
    errors.push("google-services.json : certificate_hash Android en doublon");
  }

  for (const entry of androidClients) {
    const pkg = entry.android_info?.package_name;
    const hash = entry.android_info?.certificate_hash;
    if (pkg && pkg !== packageName) {
      errors.push(`client Android ${entry.client_id} : package ${pkg} incorrect`);
    }
    if (!hash || hash.length !== 40) {
      errors.push(`client Android ${entry.client_id} : certificate_hash invalide`);
    }
    if (
      entry.client_id &&
      !entry.client_id.startsWith(`${projectNumber}-`)
    ) {
      errors.push(`client Android ${entry.client_id} : project_number incohérent`);
    }
  }

  for (const [label, sha1] of Object.entries(requiredSha1)) {
    const compact = sha1Compact(sha1);
    const found = androidClients.some(
      (entry) =>
        entry.android_info?.certificate_hash?.toLowerCase() === compact,
    );
    if (!found) {
      const severity = label === "upload" ? warnings : errors;
      const msg = `SHA-1 ${label} (${sha1}) absent de google-services.json`;
      if (label === "upload") {
        severity.push(`${msg} (recommandé pour builds EAS locaux)`);
      } else {
        severity.push(msg);
      }
    }
  }

  const playClient = androidClients.find(
    (entry) =>
      entry.android_info?.certificate_hash?.toLowerCase() ===
      sha1Compact(requiredSha1.play),
  );
  if (playClient && playClient.client_id?.includes("a1l1dhjt")) {
    warnings.push(
      "SHA Play (63:B7…) est sur le client a1l1dhjt — Firebase devrait utiliser un client dédié (ex. cmc4hcif…)",
    );
  }

  if (!appJson) {
    errors.push("app.json introuvable ou JSON invalide");
  } else {
    const expoAndroid = appJson.expo?.android;
    if (expoAndroid?.package !== packageName) {
      errors.push(
        `app.json package (${expoAndroid?.package}) ≠ ${packageName}`,
      );
    }
    if (expoAndroid?.googleServicesFile !== `./${OAUTH_EXPECTED.googleServicesRelativePath}`) {
      errors.push(
        `app.json googleServicesFile incorrect : ${expoAndroid?.googleServicesFile}`,
      );
    }
    const appScheme =
      expoAndroid?.intentFilters?.[0]?.data?.[0]?.scheme;
    if (actualWebClientId && appScheme !== expectedScheme) {
      errors.push(
        `app.json intentFilters scheme incorrect.\n  attendu : ${expectedScheme}\n  actuel  : ${appScheme ?? "MANQUANT"}`,
      );
    }
  }

  if (manifest && actualWebClientId) {
    if (!manifest.includes(`android:scheme="${expectedScheme}"`)) {
      errors.push(
        `AndroidManifest.xml : schéma OAuth absent (attendu ${expectedScheme})`,
      );
    }
    if (manifest.includes(deprecatedWebClientMarker)) {
      errors.push("AndroidManifest.xml contient encore l'ancien schéma OAuth");
    }
  }

  if (buildGradle && !buildGradle.includes(`applicationId '${packageName}'`)) {
    errors.push(`build.gradle applicationId ≠ ${packageName}`);
  }

  const envExampleClientId = parseEnvExampleGoogleClientId(envExample);
  if (envExample && envExampleClientId !== webClientId) {
    errors.push(
      `env.example EXPO_PUBLIC_GOOGLE_CLIENT_ID ≠ client Web Firebase`,
    );
  }

  if (easWebClientId && actualWebClientId && easWebClientId !== actualWebClientId) {
    errors.push(
      `EXPO_PUBLIC_GOOGLE_CLIENT_ID (build) ≠ google-services.json.\n  env : ${easWebClientId}\n  JSON: ${actualWebClientId}`,
    );
  }

  const rawJson = JSON.stringify(googleServices);
  if (rawJson.includes(deprecatedWebClientMarker)) {
    errors.push(
      `google-services.json référence encore l'ancien client (${deprecatedWebClientMarker})`,
    );
  }

  const summary = {
    packageName: gsPackage ?? packageName,
    webClientId: actualWebClientId ?? webClientId,
    scheme: expectedScheme,
    androidClientCount: androidClients.length,
    playOAuthClientId: playClient?.client_id ?? null,
    registeredSha1: androidClients.map((entry) =>
      normalizeSha1(entry.android_info?.certificate_hash ?? ""),
    ),
  };

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}
