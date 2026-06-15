import { isClerkAPIResponseError } from "@clerk/expo";
import type { useClerk } from "@clerk/expo";
import {
  ClerkGoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from "@clerk/expo/google-one-tap";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";

type ClerkClientWithReset = NonNullable<ReturnType<typeof useClerk>["client"]> & {
  resetSignIn?: () => void;
  resetSignUp?: () => void;
};

type ClerkWithGoogleOneTap = ReturnType<typeof useClerk> & {
  authenticateWithGoogleOneTap?: (params: {
    token: string;
    legalAccepted?: boolean;
  }) => Promise<ClerkAuthResource>;
};

type ClerkAuthResource = {
  status: string | null;
  createdSessionId: string | null;
  firstFactorVerification?: { status: string | null };
  missingFields?: string[];
};

export type ClerkGoogleNativeAuthResult =
  | { kind: "success"; createdSessionId: string }
  | { kind: "cancelled" }
  | { kind: "no_credential" }
  | { kind: "google_non_success"; responseType: string }
  | { kind: "clerk_not_ready" }
  | { kind: "missing_requirements"; missingFields: string[] }
  | { kind: "needs_continuation"; signInStatus: string | null; signUpStatus: string | null };

function getWebClientId(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID as string | undefined) ??
    process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID
  );
}

function resetClerkAuthState(client: ClerkClientWithReset) {
  client.resetSignIn?.();
  client.resetSignUp?.();
}

async function activateSession(
  createdSessionId: string | null,
  setActive: NonNullable<ReturnType<typeof useClerk>["setActive"]>,
): Promise<ClerkGoogleNativeAuthResult | null> {
  if (!createdSessionId) return null;
  await setActive({ session: createdSessionId });
  return { kind: "success", createdSessionId };
}

async function exchangeTokenWithClerk(
  clerk: ReturnType<typeof useClerk>,
  idToken: string,
): Promise<ClerkGoogleNativeAuthResult> {
  const { client, setActive, session } = clerk;
  if (!client || !setActive) {
    return { kind: "clerk_not_ready" };
  }

  const clerkWithGoogle = clerk as ClerkWithGoogleOneTap;

  try {
    if (clerkWithGoogle.authenticateWithGoogleOneTap) {
      const resource = await clerkWithGoogle.authenticateWithGoogleOneTap({
        token: idToken,
        legalAccepted: true,
      });
      return finalizeClerkResource(client, resource, setActive);
    }
  } catch (err) {
    if (
      isClerkAPIResponseError(err) &&
      err.errors?.some((e) => e.code === "session_exists")
    ) {
      const activeSessionId = session?.id ?? client.signIn.createdSessionId;
      if (activeSessionId) {
        const activated = await activateSession(activeSessionId, setActive);
        if (activated) return activated;
      }
    }
    throw err;
  }

  const { signIn, signUp } = client;

  try {
    await signIn.create({
      strategy: "google_one_tap",
      token: idToken,
    });

    if (signIn.firstFactorVerification.status === "transferable") {
      await signUp.create({ transfer: true, legalAccepted: true });
      const activated = await activateSession(signUp.createdSessionId, setActive);
      if (activated) return activated;
    }

    const activated = await activateSession(signIn.createdSessionId, setActive);
    if (activated) return activated;

    if (signIn.status === "needs_identifier" || signIn.status === "needs_first_factor") {
      await signIn.attemptFirstFactor({
        strategy: "google_one_tap",
        token: idToken,
      } as unknown as Parameters<typeof signIn.attemptFirstFactor>[0]);
      const retried = await activateSession(signIn.createdSessionId, setActive);
      if (retried) return retried;
    }
  } catch (signInError) {
    if (
      isClerkAPIResponseError(signInError) &&
      signInError.errors?.some((e) => e.code === "external_account_not_found")
    ) {
      await signUp.create({
        strategy: "google_one_tap",
        token: idToken,
        legalAccepted: true,
      });
      const activated = await activateSession(signUp.createdSessionId, setActive);
      if (activated) return activated;

      if (signUp.status === "missing_requirements") {
        return { kind: "missing_requirements", missingFields: signUp.missingFields ?? [] };
      }
    } else {
      throw signInError;
    }
  }

  if (signUp.status === "missing_requirements") {
    return { kind: "missing_requirements", missingFields: signUp.missingFields ?? [] };
  }

  return {
    kind: "needs_continuation",
    signInStatus: signIn.status,
    signUpStatus: signUp.status,
  };
}

async function finalizeClerkResource(
  client: NonNullable<ReturnType<typeof useClerk>["client"]>,
  resource: ClerkAuthResource,
  setActive: NonNullable<ReturnType<typeof useClerk>["setActive"]>,
): Promise<ClerkGoogleNativeAuthResult> {
  const { signIn, signUp } = client;

  if (resource.status === "complete" && resource.createdSessionId) {
    const activated = await activateSession(resource.createdSessionId, setActive);
    if (activated) return activated;
  }

  if ("firstFactorVerification" in resource && resource.firstFactorVerification?.status === "transferable") {
    await signUp.create({ transfer: true, legalAccepted: true });
    const activated = await activateSession(signUp.createdSessionId, setActive);
    if (activated) return activated;
  }

  if (resource.status === "missing_requirements" && "missingFields" in resource) {
    return { kind: "missing_requirements", missingFields: resource.missingFields ?? [] };
  }

  return {
    kind: "needs_continuation",
    signInStatus: signIn.status,
    signUpStatus: signUp.status,
  };
}

export async function runClerkGoogleNativeAuth(
  clerk: ReturnType<typeof useClerk>,
): Promise<ClerkGoogleNativeAuthResult> {
  const { client, loaded, setActive, session } = clerk;

  if (!loaded || !client || !setActive) {
    return { kind: "clerk_not_ready" };
  }

  const existingSessionId = session?.id;
  if (existingSessionId) {
    await setActive({ session: existingSessionId });
    return { kind: "success", createdSessionId: existingSessionId };
  }

  resetClerkAuthState(client as ClerkClientWithReset);

  const webClientId = getWebClientId();
  if (!webClientId) {
    throw new Error(
      "Google Sign-In credentials not found. Please set EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID in your .env file.",
    );
  }

  ClerkGoogleOneTapSignIn.configure({ webClientId });
  const nonce = Crypto.randomUUID();

  const googleResponse = await ClerkGoogleOneTapSignIn.presentExplicitSignIn({ nonce });

  if (isCancelledResponse(googleResponse)) {
    return { kind: "cancelled" };
  }
  if (isNoSavedCredentialFoundResponse(googleResponse)) {
    return { kind: "no_credential" };
  }
  if (!isSuccessResponse(googleResponse)) {
    const responseType = (googleResponse as { type?: string }).type ?? "unknown";
    return { kind: "google_non_success", responseType };
  }

  const idToken = googleResponse.data.idToken;
  return exchangeTokenWithClerk(clerk, idToken);
}
