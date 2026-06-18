export type FluentEmojiCdn = "unpkg" | "aliyun";

/** Séquence Unicode d’un emoji (ex. « 🥬 » → « 1f96c »). */
export function emojiToUnicode(emoji: string): string {
  return Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16) ?? "")
    .filter(Boolean)
    .join("-");
}

/** URL CDN SVG Fluent Emoji Flat (@lobehub/fluent-emoji-flat). */
export function getFlatEmojiUrl(
  emoji: string,
  cdn: FluentEmojiCdn = "unpkg",
): string {
  const path = `assets/${emojiToUnicode(emoji)}.svg`;
  const pkg = "@lobehub/fluent-emoji-flat";
  if (cdn === "unpkg") {
    return `https://unpkg.com/${pkg}@latest/${path}`;
  }
  return `https://registry.npmmirror.com/${pkg}/latest/files/${path}`;
}
