/** Applique le thème stocké avant le premier paint (évite le flash latte → mocha). */
export function ThemeScript() {
  const script = `(function(){try{var k="ui_theme_name";var t=localStorage.getItem(k);document.documentElement.dataset.theme=(t==="mocha"||t==="latte")?t:"latte";}catch(e){document.documentElement.dataset.theme="latte";}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
