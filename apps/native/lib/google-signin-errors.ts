const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

function webClientIdHint(): string {
  if (!WEB_CLIENT_ID) {
    return "webClientId : MANQUANT (EXPO_PUBLIC_GOOGLE_CLIENT_ID absent au build)";
  }
  const suffix = WEB_CLIENT_ID.slice(-12);
  return `webClientId : …${suffix}`;
}

export function formatGoogleSignInError(error: {
  code?: string;
  message?: string;
}): string {
  const code = error.code ?? "inconnu";
  const message = error.message?.trim();
  const lines = [`Code Google : ${code}`, webClientIdHint()];

  if (message) {
    lines.push(`Détail : ${message}`);
  }

  if (code === "10" || code === "DEVELOPER_ERROR") {
    lines.push(
      "",
      "Pistes Play Store :",
      "• SHA-1 Play dans Google Cloud (package com.ez3ki33l.todolist)",
      "• OAuth consent screen → Test users (votre Gmail)",
      "• Réinstaller depuis le lien test interne (versionCode 7+)",
      "• Logs : adb logcat | grep -i google",
    );
  }

  return lines.join("\n");
}
