import { DEFAULT_THEME_NAME } from "@/lib/theme";

/** Applique le thème stocké avant le premier paint (évite un flash de thème incorrect). */
export function ThemeScript() {
  const script = `(function(){try{var k="ui_theme_name";var t=localStorage.getItem(k);document.documentElement.dataset.theme=(t==="mocha"||t==="latte")?t:"${DEFAULT_THEME_NAME}";}catch(e){document.documentElement.dataset.theme="${DEFAULT_THEME_NAME}";}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
