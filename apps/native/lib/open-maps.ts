import { Linking, Platform } from "react-native";

import { buildMapsSearchUrl } from "@repo/api/lib/maps";

export async function openMapsNavigation(address: string) {
  const query = encodeURIComponent(address.trim());
  const candidates =
    Platform.select({
      ios: [`maps://?q=${query}`, `comgooglemaps://?q=${query}`],
      android: [`geo:0,0?q=${query}`],
      default: [],
    }) ?? [];

  for (const url of candidates) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // essayer l'URL suivante
    }
  }

  await Linking.openURL(buildMapsSearchUrl(address));
}
