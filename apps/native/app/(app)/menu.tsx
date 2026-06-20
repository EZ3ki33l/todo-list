import { Redirect } from "expo-router";

export default function MenuScreen() {
  // L'onglet Menu ouvre un bottom-sheet overlay depuis le layout.
  // Cette route sert uniquement de fallback si une navigation directe survient.
  return <Redirect href="/(app)" />;
}
