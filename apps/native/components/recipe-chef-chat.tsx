import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { LoadingLogo } from "@/components/loading-logo";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChefChatMessageContent } from "@/components/chef-chat-message-content";
import { FluentEmoji } from "@/components/fluent-emoji";
import { detectCategory } from "@repo/domain/grocery-detect";
import { trpc } from "@/lib/trpc";

const CHEF_IMAGE = require("@/assets/chef-ia.png");

type ChatMode = "from_list" | "suggest_items" | "seasonal_produce";

type ChatSource = { label: string; url?: string };

type ChatItemToAdd = {
  title: string;
  quantity: number | null;
  unit: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  itemsToAdd?: ChatItemToAdd[];
};

function itemAddKey(messageIndex: number, title: string) {
  return `${messageIndex}:${title}`;
}

function recipesApiHint(message: string | undefined): string | null {
  if (!message) return null;
  if (
    /no procedure found|not found/i.test(message) &&
    /recipes?\.chat/i.test(message)
  ) {
    return "Cette version de l'API ne inclut pas encore Chef IA. En dev : EXPO_PUBLIC_API_URL vers votre PC (ex. http://192.168.1.30:3000) + pnpm --filter web dev. En prod : déployer le code récent.";
  }
  return null;
}

type Props = {
  listId: string;
};

const MODE_LABELS: Record<ChatMode, string> = {
  from_list: "Recettes avec votre liste",
  suggest_items: "Articles à acheter",
  seasonal_produce: "Fruits & légumes de saison",
};

export function RecipeChefChat({ listId }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [addedKeys, setAddedKeys] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<ScrollView>(null);

  const utils = trpc.useUtils();
  const welcome = trpc.recipes.chatWelcome.useQuery(
    { listId, mode: mode ?? "from_list" },
    { enabled: open && mode !== null },
  );
  const chat = trpc.recipes.chat.useMutation();
  const createItem = trpc.shoppingItems.create.useMutation({
    onSuccess: () => {
      void utils.shoppingItems.getByList.invalidate({ listId });
      void utils.shoppingItems.getFrequent.invalidate();
    },
  });

  useEffect(() => {
    if (!open || mode === null || welcome.isFetching) return;
    if (welcome.data && messages.length === 0) {
      setMessages([{ role: "assistant", content: welcome.data.message }]);
    }
  }, [open, mode, welcome.data, welcome.isFetching, messages.length]);

  useEffect(() => {
    if (messages.length > 0 || chat.isPending) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, chat.isPending]);

  function resetChat() {
    setMode(null);
    setMessages([]);
    setDraft("");
    setAddedKeys(new Set());
    chat.reset();
  }

  async function addItemToList(item: ChatItemToAdd, messageIndex: number) {
    const key = itemAddKey(messageIndex, item.title);
    if (addedKeys.has(key) || createItem.isPending) return;

    const category = detectCategory(item.title) ?? "AUTRE";
    await createItem.mutateAsync({
      listId,
      title: item.title,
      quantity: item.quantity,
      unit: item.unit,
      category,
    });
    setAddedKeys((prev) => new Set(prev).add(key));
  }

  async function addAllItems(items: ChatItemToAdd[], messageIndex: number) {
    for (const item of items) {
      const key = itemAddKey(messageIndex, item.title);
      if (addedKeys.has(key)) continue;
      await addItemToList(item, messageIndex);
    }
  }

  function closeModal() {
    setOpen(false);
    resetChat();
  }

  function selectMode(next: ChatMode) {
    setMode(next);
    setMessages([]);
    setDraft("");
    chat.reset();
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !mode || chat.isPending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setDraft("");

    try {
      const result = await chat.mutateAsync({
        listId,
        mode,
        messages: nextMessages,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply,
          sources: result.sources,
          itemsToAdd: result.itemsToAdd,
        },
      ]);
    } catch {
      setMessages((prev) => prev.slice(0, -1));
      setDraft(trimmed);
    }
  }

  const quickChips =
    mode === "from_list"
      ? ["Surprenez-moi !", "Un plat rapide", "Quelque chose de léger"]
      : mode === "seasonal_produce"
        ? ["Toutes les saisons", "Saison actuelle", "Produits du mois"]
        : [];

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: Math.max(insets.bottom, 16) + 8,
            right: 16,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        onPress={() => setOpen(true)}
        accessibilityLabel="Ouvrir Chef IA"
      >
        <Image source={CHEF_IMAGE} style={styles.fabImage} />
        <Text style={styles.fabLabel}>Chef IA</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={closeModal} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 12), maxHeight: "92%" },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Image source={CHEF_IMAGE} style={styles.headerImage} />
              <View style={styles.headerText}>
                <Text style={styles.sheetTitle}>Chef IA</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {mode ? MODE_LABELS[mode] : "Choisissez un mode"}
                </Text>
              </View>
              <Pressable onPress={closeModal} hitSlop={12} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            {mode === null ? (
              <ScrollView contentContainerStyle={styles.modePicker}>
                <Text style={styles.modeIntro}>Bonjour ! Que souhaitez-vous faire ?</Text>
                <Pressable style={styles.modeCardOrange} onPress={() => selectMode("from_list")}>
                  <View style={styles.modeCardTitleRow}>
                    <FluentEmoji emoji="🍳" size={20} />
                    <Text style={styles.modeCardTitle}>Recettes avec ma liste</Text>
                  </View>
                  <Text style={styles.modeCardDesc}>
                    Des idées de plats à partir des articles déjà dans vos courses.
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.modeCardIndigo}
                  onPress={() => selectMode("suggest_items")}
                >
                  <View style={styles.modeCardTitleRow}>
                    <FluentEmoji emoji="🛒" size={20} />
                    <Text style={styles.modeCardTitle}>Articles pour cuisiner</Text>
                  </View>
                  <Text style={styles.modeCardDesc}>
                    Décrivez un plat : je vous dis quoi ajouter à la liste.
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.modeCardGreen}
                  onPress={() => selectMode("seasonal_produce")}
                >
                  <View style={styles.modeCardTitleRow}>
                    <FluentEmoji emoji="🌿" size={20} />
                    <Text style={styles.modeCardTitle}>Fruits & légumes de saison</Text>
                  </View>
                  <Text style={styles.modeCardDesc}>
                    Calendrier des produits par saison — pas de recettes.
                  </Text>
                </Pressable>
              </ScrollView>
            ) : (
              <>
                <ScrollView
                  ref={scrollRef}
                  style={styles.messages}
                  contentContainerStyle={styles.messagesContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {messages.map((msg, index) => (
                    <View
                      key={`${msg.role}-${index}`}
                      style={[
                        styles.messageBlock,
                        msg.role === "user" ? styles.bubbleRowUser : styles.bubbleRowAssistant,
                      ]}
                    >
                      <View
                        style={[
                          msg.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
                          msg.role === "user" ? styles.bubble : styles.assistantBubble,
                        ]}
                      >
                        {msg.role === "assistant" ? (
                          <ChefChatMessageContent
                            text={msg.content}
                            productsOnly={mode === "seasonal_produce"}
                          />
                        ) : (
                          <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
                            {msg.content}
                          </Text>
                        )}
                      </View>
                      {msg.role === "assistant" && (msg.sources?.length ?? 0) > 0 ? (
                        <View style={styles.sourcesBox}>
                          <Text style={styles.sourcesLabel}>Sources : </Text>
                          {msg.sources!.map((source, si) => (
                            <Text key={`${source.label}-${si}`}>
                              {si > 0 ? " · " : ""}
                              {source.url ? (
                                <Text
                                  style={styles.sourceLink}
                                  onPress={() => void Linking.openURL(source.url!)}
                                >
                                  {source.label}
                                </Text>
                              ) : (
                                source.label
                              )}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                      {msg.role === "assistant" && (msg.itemsToAdd?.length ?? 0) > 0 ? (
                        <View style={styles.addBox}>
                          <Text style={styles.addTitle}>Ajouter à la liste</Text>
                          <View style={styles.addChips}>
                            {msg.itemsToAdd!.map((item) => {
                              const key = itemAddKey(index, item.title);
                              const added = addedKeys.has(key);
                              return (
                                <Pressable
                                  key={item.title}
                                  style={[styles.addChip, added && styles.addChipDone]}
                                  onPress={() => void addItemToList(item, index)}
                                  disabled={added || createItem.isPending}
                                >
                                  <Text style={styles.addChipText}>
                                    {added ? `✓ ${item.title}` : `+ ${item.title}`}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          {msg.itemsToAdd!.length > 1 ? (
                            <Pressable
                              onPress={() => void addAllItems(msg.itemsToAdd!, index)}
                              disabled={createItem.isPending}
                            >
                              <Text style={styles.addAll}>
                                Tout ajouter ({msg.itemsToAdd!.length})
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))}
                  {chat.isPending ? (
                    <View style={styles.bubbleRowAssistant}>
                      <View style={styles.bubbleAssistant}>
                        <Text style={styles.bubbleText}>Le chef réfléchit…</Text>
                      </View>
                    </View>
                  ) : null}
                  {chat.error ? (
                    <Text style={styles.error}>
                      {recipesApiHint(chat.error.message) ?? chat.error.message}
                    </Text>
                  ) : null}
                  {welcome.error ? (
                    <Text style={styles.error}>
                      {recipesApiHint(welcome.error.message) ?? welcome.error.message}
                    </Text>
                  ) : null}
                </ScrollView>

                <View style={styles.composer}>
                  {messages.length <= 1 && quickChips.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipsRow}
                    >
                      {quickChips.map((chip) => (
                        <Pressable
                          key={chip}
                          style={styles.chip}
                          onPress={() => void sendMessage(chip)}
                          disabled={chat.isPending}
                        >
                          <Text style={styles.chipText}>{chip}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={draft}
                      onChangeText={setDraft}
                      placeholder={
                        mode === "suggest_items"
                          ? "Ex. lasagnes végétariennes…"
                          : "Votre message…"
                      }
                      placeholderTextColor="#9CA3AF"
                      editable={!chat.isPending}
                      returnKeyType="send"
                      onSubmitEditing={() => void sendMessage(draft)}
                    />
                    <Pressable
                      style={[styles.sendBtn, (!draft.trim() || chat.isPending) && styles.sendDisabled]}
                      onPress={() => void sendMessage(draft)}
                      disabled={!draft.trim() || chat.isPending}
                    >
                      {chat.isPending ? (
                        <LoadingLogo size={18} tintColor="#fff" />
                      ) : (
                        <Text style={styles.sendBtnText}>Envoyer</Text>
                      )}
                    </Pressable>
                  </View>
                  <Pressable onPress={resetChat}>
                    <Text style={styles.changeMode}>← Changer de mode</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabImage: { width: 44, height: 44, borderRadius: 22 },
  fabLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: "55%",
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFBEB",
  },
  headerImage: { width: 44, height: 44, borderRadius: 22 },
  headerText: { flex: 1, minWidth: 0 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  sheetSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 18, color: "#9CA3AF" },
  modePicker: { padding: 20, gap: 12 },
  modeIntro: { textAlign: "center", fontSize: 14, color: "#4B5563", marginBottom: 4 },
  modeCardOrange: {
    borderWidth: 2,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 16,
  },
  modeCardIndigo: {
    borderWidth: 2,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 16,
  },
  modeCardGreen: {
    borderWidth: 2,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 16,
  },
  modeCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modeCardTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  modeCardDesc: { fontSize: 13, color: "#4B5563", marginTop: 4, lineHeight: 18 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },
  messageBlock: { maxWidth: "88%", gap: 6 },
  bubbleRowUser: { alignSelf: "flex-end" },
  bubbleRowAssistant: { alignSelf: "flex-start" },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  assistantBubble: {
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    backgroundColor: "#FFF7ED",
    maxWidth: "100%",
  },
  sourcesBox: { flexDirection: "row", flexWrap: "wrap" },
  sourcesLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  sourceLink: { fontSize: 11, color: "#4F46E5", textDecorationLine: "underline" },
  addBox: {
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  addTitle: { fontSize: 11, fontWeight: "600", color: "#14532D" },
  addChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  addChip: {
    borderWidth: 1,
    borderColor: "#86EFAC",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addChipDone: { opacity: 0.6 },
  addChipText: { fontSize: 12, color: "#14532D" },
  addAll: { fontSize: 12, fontWeight: "600", color: "#166534" },
  bubbleUser: { backgroundColor: "#111827" },
  bubbleAssistant: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bubbleText: { fontSize: 14, lineHeight: 20, color: "#1F2937" },
  bubbleTextUser: { color: "#fff" },
  error: { textAlign: "center", fontSize: 13, color: "#DC2626" },
  composer: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  chipsRow: { gap: 8, paddingBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, color: "#374151" },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  sendBtn: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 84,
    alignItems: "center",
  },
  sendDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  changeMode: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
    marginBottom: 4,
  },
});
