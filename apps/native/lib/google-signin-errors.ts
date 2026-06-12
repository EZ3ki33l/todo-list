const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

function webClientIdHint(): string {
  if (!WEB_CLIENT_ID) {
    return "webClientId : MANQUANT (EXPO_PUBLIC_GOOGLE_CLIENT_ID absent au build)";
  }
  const marker = WEB_CLIENT_ID.match(/782595741716-([a-z0-9]+)/)?.[1];
  const clientLine = marker
    ? `webClientId : 782595741716-${marker.slice(0, 8)}…`
    : `webClientId : ${WEB_CLIENT_ID.slice(0, 24)}…`;
  const schemePrefix = WEB_CLIENT_ID.replace(".apps.googleusercontent.com", "");
  return `${clientLine}\nscheme Android : com.googleusercontent.apps.${schemePrefix}`;
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
      "• Schéma Android = com.googleusercontent.apps.<WEB_CLIENT_ID>",
      "• Réinstaller depuis le lien test interne après chaque build",
      "• Logs : adb logcat | grep -i google",
    );
  }

  return lines.join("\n");
}
