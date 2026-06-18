import { getFlatEmojiUrl } from "@repo/emoji";
import { useEffect, useState } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";

const xmlCache = new Map<string, string>();

async function loadEmojiXml(emoji: string): Promise<string> {
  const cached = xmlCache.get(emoji);
  if (cached) return cached;

  const response = await fetch(getFlatEmojiUrl(emoji));
  if (!response.ok) throw new Error("emoji load failed");
  const xml = await response.text();
  xmlCache.set(emoji, xml);
  return xml;
}

type Props = {
  emoji: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function FluentEmoji({ emoji, size = 20, style }: Props) {
  const [xml, setXml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setXml(null);

    loadEmojiXml(emoji)
      .then((loaded) => {
        if (!cancelled) setXml(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [emoji]);

  if (failed) {
    return <Text style={{ fontSize: size * 0.9 }}>{emoji}</Text>;
  }

  if (!xml) {
    return <View style={[{ width: size, height: size }, style]} />;
  }

  return <SvgXml xml={xml} width={size} height={size} style={style} />;
}
