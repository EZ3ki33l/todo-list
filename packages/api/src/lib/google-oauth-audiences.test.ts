import { describe, expect, it } from "vitest";

import { allowedGoogleAudiences } from "./google-oauth-audiences";

const WEB_CLIENT =
  "782595741716-6ebvh8k73pbeta3hpcqapq4jj7lrtk6d.apps.googleusercontent.com";

describe("allowedGoogleAudiences", () => {
  it("inclut EXPO_PUBLIC_GOOGLE_CLIENT_ID (aud du idToken mobile)", () => {
    const audiences = allowedGoogleAudiences({
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: WEB_CLIENT,
    });
    expect(audiences).toContain(WEB_CLIENT);
  });

  it("déduplique et ignore les variables vides", () => {
    const audiences = allowedGoogleAudiences({
      GOOGLE_CLIENT_ID: WEB_CLIENT,
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: WEB_CLIENT,
      GOOGLE_ANDROID_CLIENT_ID: "",
    });
    expect(audiences).toEqual([WEB_CLIENT]);
  });

  it("accepte les clients web et android distincts", () => {
    const androidClient =
      "782595741716-cmc4hcifcecpe01iq3p42i0stirof3v7.apps.googleusercontent.com";
    const audiences = allowedGoogleAudiences({
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: WEB_CLIENT,
      GOOGLE_ANDROID_CLIENT_ID: androidClient,
    });
    expect(audiences).toEqual([androidClient, WEB_CLIENT]);
  });
});
