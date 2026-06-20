import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getPalette, type AppPalette } from "@repo/theme";

import {
  memberRoleLabel,
  SHARE_ROLES,
  shareRoleLabel,
  toggleShareRole,
  type ShareRole,
} from "@/lib/share-roles";
import { useThemeMode } from "@/lib/theme-context";
import { trpc } from "@/lib/trpc";

type Props = {
  listId: string;
  visible: boolean;
  onClose: () => void;
};

export function TodoListShareModal({ listId, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const { themeName } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);
  const styles = useMemo(() => getStyles(palette), [palette]);

  const { data: list } = trpc.lists.getById.useQuery(
    { listId },
    { enabled: visible && !!listId },
  );

  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("membre");
  const [shareError, setShareError] = useState<string | null>(null);

  const refresh = () => {
    void utils.lists.getById.invalidate({ listId });
    void utils.lists.getSharedTodos.invalidate();
    void utils.lists.getAll.invalidate();
  };

  const shareList = trpc.lists.share.useMutation({
    onSuccess: () => {
      refresh();
      setShareEmail("");
      setShareError(null);
      Alert.alert(
        "Liste partagée",
        "La personne la verra dans Tâches → Listes partagées. Si elle a activé les notifications, elle recevra une alerte.",
      );
    },
    onError: (err) => setShareError(err.message),
  });

  const unshare = trpc.lists.unshare.useMutation({
    onSuccess: refresh,
    onError: (err) => setShareError(err.message),
  });

  function handleClose() {
    setShareError(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <View
          style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}
          onStartShouldSetResponder={() => true}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <Text style={styles.modalTitle}>Partager la liste</Text>

            <TextInput
              style={styles.input}
              placeholder="Email de l'utilisateur"
              placeholderTextColor={palette.textSubtle}
              value={shareEmail}
              onChangeText={setShareEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.roleHint}>Droits accordés à la personne invitée :</Text>
            <View style={styles.roleRow}>
              {SHARE_ROLES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.roleBtn, shareRole === r && styles.roleBtnActive]}
                  onPress={() => setShareRole(r)}
                >
                  <Text style={[styles.roleBtnText, shareRole === r && styles.roleBtnTextActive]}>
                    {shareRoleLabel(r)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {shareError ? <Text style={styles.shareError}>{shareError}</Text> : null}

            <Pressable
              style={[styles.addBtn, !shareEmail.trim() && { opacity: 0.4 }]}
              onPress={() => {
                if (!shareEmail.trim()) return;
                shareList.mutate({ listId, emailOrId: shareEmail.trim(), role: shareRole });
              }}
              disabled={!shareEmail.trim() || shareList.isPending}
            >
              <Text style={styles.addBtnText}>Ajouter</Text>
            </Pressable>

            <Text style={styles.membersTitle}>Membres</Text>
            {list?.owner && (
              <View style={styles.memberRow}>
                <Text style={styles.memberName}>
                  {list.owner.name ?? list.owner.email} (propriétaire)
                </Text>
              </View>
            )}
            {list?.members.map((m) => (
              <View key={m.userId} style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.user.name ?? m.user.email}</Text>
                  <Pressable
                    onPress={() => {
                      const email = m.user.email;
                      if (!email) return;
                      const next = toggleShareRole(m.role as ShareRole);
                      shareList.mutate({ listId, emailOrId: email, role: next });
                    }}
                    disabled={shareList.isPending}
                  >
                    <Text style={styles.memberRoleTap}>
                      {memberRoleLabel(m.role)} · modifier
                    </Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => unshare.mutate({ listId, userId: m.userId })}>
                  <Text style={styles.unshareBtn}>Retirer</Text>
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.modalClose} onPress={handleClose} hitSlop={12}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function getStyles(p: AppPalette) {
  return StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: p.overlay,
    },
    modalScrollContent: { paddingBottom: 8 },
    modalCard: {
      backgroundColor: p.bgElevated,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 20,
      maxHeight: "85%",
    },
    modalTitle: { fontSize: 18, fontWeight: "700", color: p.text, marginBottom: 16 },
    input: {
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: p.text,
      marginBottom: 12,
    },
    roleHint: { fontSize: 12, color: p.textMuted, marginBottom: 8 },
    roleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    roleBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: p.borderSoft,
      alignItems: "center",
    },
    roleBtnActive: { backgroundColor: p.primary, borderColor: p.primary },
    roleBtnText: { fontSize: 12, color: p.text, textAlign: "center" },
    roleBtnTextActive: { color: p.onPrimary },
    shareError: { fontSize: 13, color: p.danger, marginBottom: 8 },
    addBtn: {
      backgroundColor: p.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    addBtnText: { color: p.onPrimary, fontWeight: "600", fontSize: 14 },
    membersTitle: { fontSize: 14, fontWeight: "600", color: p.text, marginTop: 16, marginBottom: 8 },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: p.borderSoft,
    },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 14, color: p.text },
    memberRoleTap: { fontSize: 12, color: p.primary, marginTop: 2 },
    unshareBtn: { fontSize: 13, color: p.danger },
    modalClose: {
      marginTop: 16,
      alignItems: "center",
      paddingVertical: 14,
      minHeight: 48,
      justifyContent: "center",
    },
    modalCloseText: { fontSize: 15, fontWeight: "600", color: p.textMuted },
  });
}
