import { Alert } from "react-native";

import {
  permanentBulkDeleteMessage,
  permanentDeleteMessage,
} from "@repo/api/lib/confirm-delete";

export function confirmPermanentDelete(label: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert("Suppression définitive", permanentDeleteMessage(label), [
      { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
      { text: "Supprimer", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export function confirmPermanentBulkDelete(label: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert("Suppression définitive", permanentBulkDeleteMessage(label), [
      { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
      { text: "Supprimer", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
