import { Pressable, Text, View } from "react-native";

import { listHubStyles as styles } from "@/lib/list-hub-styles";

type Props = {
  title: string;
  onSignOut?: () => void;
};

export function TabListHeader({ title, onSignOut }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.screenTitle}>{title}</Text>
      {onSignOut ? (
        <Pressable onPress={onSignOut} hitSlop={8}>
          <Text style={styles.signOut}>Déconnexion</Text>
        </Pressable>
      ) : (
        <View style={{ width: 72 }} />
      )}
    </View>
  );
}
