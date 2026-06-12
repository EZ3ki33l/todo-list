import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  OAUTH_EXPECTED,
  normalizeSha1,
  schemeFromWebClientId,
  verifyGoogleOAuth,
} from "../scripts/lib/google-oauth-verify.mjs";

const nativeRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(nativeRoot, relativePath), "utf8");
}

function readProjectJson(relativePath: string): unknown {
  return JSON.parse(readProjectFile(relativePath));
}

const validGoogleServices = () =>
  readProjectJson(OAUTH_EXPECTED.googleServicesRelativePath);

const baseValidInput = () => ({
  googleServices: validGoogleServices(),
  appJson: readProjectJson("app.json"),
  manifest: readProjectFile("android/app/src/main/AndroidManifest.xml"),
  buildGradle: readProjectFile("android/app/build.gradle"),
  envExample: readProjectFile("env.example"),
  easWebClientId: OAUTH_EXPECTED.webClientId,
});

function minimalGoogleServices(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    project_info: { project_number: OAUTH_EXPECTED.projectNumber },
    client: [
      {
        client_info: {
          android_client_info: { package_name: OAUTH_EXPECTED.packageName },
        },
        oauth_client: [
          {
            client_id:
              "782595741716-cmc4hcifcecpe01iq3p42i0stirof3v7.apps.googleusercontent.com",
            client_type: 1,
            android_info: {
              package_name: OAUTH_EXPECTED.packageName,
              certificate_hash: "63b71f212678ac5478af14509fc1c4cbaff57918",
            },
          },
          {
            client_id:
              "782595741716-kv474jirrh53l83irvitorjvjeedaag2.apps.googleusercontent.com",
            client_type: 1,
            android_info: {
              package_name: OAUTH_EXPECTED.packageName,
              certificate_hash: "5440610964ffcd14bb6f992201c84bb7f0e218e1",
            },
          },
          {
            client_id: OAUTH_EXPECTED.webClientId,
            client_type: 3,
          },
        ],
        services: {
          appinvite_service: {
            other_platform_oauth_client: [
              { client_id: OAUTH_EXPECTED.webClientId, client_type: 3 },
            ],
          },
        },
      },
    ],
    ...overrides,
  };
}

describe("schemeFromWebClientId", () => {
  it("dérive le schéma Android depuis le client Web Firebase", () => {
    expect(schemeFromWebClientId(OAUTH_EXPECTED.webClientId)).toBe(
      "com.googleusercontent.apps.782595741716-6ebvh8k73pbeta3hpcqapq4jj7lrtk6d",
    );
  });
});

describe("normalizeSha1", () => {
  it("formate un hash compact en SHA-1 lisible", () => {
    expect(normalizeSha1("63b71f212678ac5478af14509fc1c4cbaff57918")).toBe(
      "63:B7:1F:21:26:78:AC:54:78:AF:14:50:9F:C1:C4:CB:AF:F5:79:18",
    );
  });
});

describe("verifyGoogleOAuth — projet réel (intégration)", () => {
  it("valide la config actuelle du dépôt sans build Android", () => {
    const result = verifyGoogleOAuth(baseValidInput());

    expect(result.errors, result.errors.join("\n")).toEqual([]);
    expect(result.summary?.webClientId).toBe(OAUTH_EXPECTED.webClientId);
    expect(result.summary?.playOAuthClientId).toMatch(/cmc4hcif/);
    expect(result.summary?.registeredSha1).toContain(
      OAUTH_EXPECTED.requiredSha1.play,
    );
    expect(result.summary?.registeredSha1).toContain(
      OAUTH_EXPECTED.requiredSha1.debug,
    );
  });

  it("n'a pas de doublon app/google-services.json", () => {
    expect(fs.existsSync(path.join(nativeRoot, "app/google-services.json"))).toBe(
      false,
    );
  });

  it("aligne app.json, manifest et env.example sur le même webClientId", () => {
    const appJson = readProjectJson("app.json") as {
      expo: { android: { intentFilters: { data: { scheme: string }[] }[] } };
    };
    const manifest = readProjectFile("android/app/src/main/AndroidManifest.xml");
    const scheme = schemeFromWebClientId(OAUTH_EXPECTED.webClientId);

    expect(appJson.expo.android.intentFilters[0]?.data[0]?.scheme).toBe(scheme);
    expect(manifest).toContain(`android:scheme="${scheme}"`);
    expect(readProjectFile("env.example")).toContain(OAUTH_EXPECTED.webClientId);
  });
});

describe("verifyGoogleOAuth — cas d'erreur (régression)", () => {
  const minimalAppJson = {
    expo: {
      android: {
        package: OAUTH_EXPECTED.packageName,
        googleServicesFile: `./${OAUTH_EXPECTED.googleServicesRelativePath}`,
        intentFilters: [
          {
            data: [
              {
                scheme: schemeFromWebClientId(OAUTH_EXPECTED.webClientId),
              },
            ],
          },
        ],
      },
    },
  };

  const minimalManifest = `<data android:scheme="${schemeFromWebClientId(OAUTH_EXPECTED.webClientId)}"/>`;
  const minimalGradle = `applicationId '${OAUTH_EXPECTED.packageName}'`;

  it("rejette l'absence du SHA Play Store", () => {
    const gs = minimalGoogleServices();
    const clients = (gs.client as { oauth_client: { android_info?: { certificate_hash: string } }[] }[])[0]
      .oauth_client;
    (gs.client as { oauth_client: unknown[] }[])[0].oauth_client = clients.filter(
      (c) => c.android_info?.certificate_hash !== "63b71f212678ac5478af14509fc1c4cbaff57918",
    );

    const result = verifyGoogleOAuth({
      googleServices: gs,
      appJson: minimalAppJson,
      manifest: minimalManifest,
      buildGradle: minimalGradle,
      envExample: `EXPO_PUBLIC_GOOGLE_CLIENT_ID=${OAUTH_EXPECTED.webClientId}`,
      easWebClientId: OAUTH_EXPECTED.webClientId,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("SHA-1 play"))).toBe(true);
  });

  it("rejette un webClientId EAS différent de google-services.json", () => {
    const result = verifyGoogleOAuth({
      ...baseValidInput(),
      easWebClientId:
        "782595741716-7t6oc4xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("EXPO_PUBLIC_GOOGLE_CLIENT_ID"))).toBe(
      true,
    );
  });

  it("rejette un schéma AndroidManifest incorrect", () => {
    const result = verifyGoogleOAuth({
      ...baseValidInput(),
      manifest: '<data android:scheme="com.googleusercontent.apps.ANCIEN"/>',
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("AndroidManifest"))).toBe(true);
  });

  it("rejette un doublon app/google-services.json", () => {
    const result = verifyGoogleOAuth({
      ...baseValidInput(),
      duplicateGoogleServicesPath: "app/google-services.json",
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Doublon inutile");
  });

  it("rejette l'ancien client Web 7t6oc4 dans google-services", () => {
    const gs = minimalGoogleServices();
    (gs.client as { oauth_client: { client_id: string }[] }[])[0].oauth_client.push({
      client_id:
        "782595741716-7t6oc4xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
      client_type: 3,
    });

    const result = verifyGoogleOAuth({
      googleServices: gs,
      appJson: minimalAppJson,
      manifest: minimalManifest,
      buildGradle: minimalGradle,
      easWebClientId: OAUTH_EXPECTED.webClientId,
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.includes("7t6oc4") || e.includes("ancien")),
    ).toBe(true);
  });

  it("rejette un package incohérent entre app.json et google-services", () => {
    const result = verifyGoogleOAuth({
      ...baseValidInput(),
      appJson: {
        expo: {
          android: {
            package: "com.autre.app",
            googleServicesFile: `./${OAUTH_EXPECTED.googleServicesRelativePath}`,
            intentFilters: [{ data: [{ scheme: "x" }] }],
          },
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("app.json package"))).toBe(true);
  });

  it("avertit si le SHA Play est encore sur a1l1dhjt (édition manuelle)", () => {
    const gs = minimalGoogleServices();
    const oauth = (gs.client as { oauth_client: Record<string, unknown>[] }[])[0]
      .oauth_client;
    oauth[0] = {
      client_id:
        "782595741716-a1l1dhjtqvr5fsjjhfthi0uqam90q39b.apps.googleusercontent.com",
      client_type: 1,
      android_info: {
        package_name: OAUTH_EXPECTED.packageName,
        certificate_hash: "63b71f212678ac5478af14509fc1c4cbaff57918",
      },
    };

    const result = verifyGoogleOAuth({
      googleServices: gs,
      appJson: minimalAppJson,
      manifest: minimalManifest,
      buildGradle: minimalGradle,
      easWebClientId: OAUTH_EXPECTED.webClientId,
    });

    expect(result.warnings.some((w) => w.includes("a1l1dhjt"))).toBe(true);
  });
});
