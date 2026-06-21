"use client";

import Image from "next/image";
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
    <Image
      src={getFlatEmojiUrl(emoji)}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flex: "none",
        objectFit: "contain",
      }}
      onError={() => setFailed(true)}
      aria-hidden
    />
  );
}
