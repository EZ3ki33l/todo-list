"use client";

import { getFlatEmojiUrl } from "@repo/emoji";
import { useState } from "react";

type Props = {
  emoji: string;
  size?: number;
  className?: string;
};

export function FluentEmoji({ emoji, size = 20, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={className}
        style={{ fontSize: size * 0.9, lineHeight: 1, display: "inline-block" }}
        aria-hidden
      >
        {emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- CDN SVG Fluent Emoji
    <img
      src={getFlatEmojiUrl(emoji)}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flex: "none",
        objectFit: "contain",
      }}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      aria-hidden
    />
  );
}
