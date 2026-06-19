import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  LazyDraggableFlatList,
  type RenderItemParams,
} from "@/lib/lazy-draggable-flatlist";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { applyListOrder } from "@/lib/reorder-list";
import { normalizeActionRows } from "@/lib/normalize-action-row";
import { AddActionForm } from "@/components/add-action-form";
import { ActionLocationSheet } from "@/components/action-location-sheet";
import { StreakBadge } from "@/components/streak-badge";
import { LoadingIndicator } from "@/components/loading-logo";
import { FluentEmoji } from "@/components/fluent-emoji";
import { PushOptInCard } from "@/components/push-opt-in-card";
import { TodoListShareModal } from "@/components/todo-list-share-modal";
import { useToggleAction } from "@/lib/use-toggle-action";
import { useRefetchTasksOnFocus } from "@/lib/use-refetch-tasks-on-focus";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { formatActionDueTime } from "@repo/api/lib/action-form";
import { confirmPermanentDelete } from "@/lib/confirm-delete";
import { formatActionLocation, resolveMapsQuery } from "@repo/api/lib/maps";

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Recurrence = "NONE" | "DAILY" | "WEEKLY";

function RecurrenceBadge({
  recurrence,
  dow,
}: {
  recurrence: string;
  dow?: number | null;
}) {
  if (recurrence === "DAILY") return <Text style={styles.badgeBlue}>quotidien</Text>;
  if (recurrence === "WEEKLY") {
    return (
      <Text style={styles.badgePurple}>
        hebdo · {dow != null ? DOW_LABELS[dow] : ""}
      </Text>
    );
  }
  return null;
}

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { signOut, user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);

  const { data: personalList } = trpc.lists.getOrCreatePersonal.useQuery();
  const { data: list } = trpc.lists.getById.useQuery(
    { listId: listId! },
    { enabled: !!listId },
  );

  const isOwner = !!user?.id && list?.ownerId === user.id;
  const myMember = list?.members.find((m) => m.userId === user?.id);
  const canWrite = isOwner || myMember?.role === "membre";
  const isShared =
    (list?.members.length ?? 0) > 0 || (!!user?.id && !isOwner && !!myMember);

  useEffect(() => {
    if (personalList && listId === personalList.id) {
      router.replace("/(app)/");
    }
  }, [personalList, listId, router]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const utils = trpc.useUtils();

  const { data: actions, isLoading } = trpc.actions.getByList.useQuery(
    { listId: listId! },
    { enabled: !!listId, staleTime: 15_000, refetchInterval: 30_000 },
  );

  useRefetchTasksOnFocus(listId);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: list?.title ?? "Liste",
      headerRight: isOwner
        ? () => (
            <Pressable
              onPress={() => setShareOpen(true)}
              hitSlop={8}
              style={{ marginRight: 4 }}
            >
              <Text style={styles.headerShare}>Partager</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, list?.title, isOwner]);

  type ActionRow = NonNullable<typeof actions>[number];
  const [locationAction, setLocationAction] = useState<ActionRow | null>(null);
  const actionRows = useMemo(() => normalizeActionRows(actions ?? []), [actions]);
  const [orderOverride, setOrderOverride] = useState<ActionRow[] | null>(null);
  const listData = orderOverride ?? actionRows;

  const actionIdsKey = useMemo(
    () => actionRows.map((a) => a.id).sort().join(","),
    [actionRows],
  );
  useEffect(() => {
    setOrderOverride(null);
  }, [actionIdsKey]);

  const toggleAction = useToggleAction(listId!, { onUnauthorized: () => void signOut() });

  const updateAction = trpc.actions.update.useMutation({
    onSuccess: () => {
      void utils.actions.getByList.invalidate({ listId });
      setEditingId(null);
    },
  });

  const deleteAction = trpc.actions.delete.useMutation({
    onSuccess: () => {
      void utils.actions.getByList.invalidate({ listId });
    },
  });

  const reorderActions = trpc.actions.reorder.useMutation({
    onSuccess: (_result, { listId: lid, orderedIds }) => {
      utils.actions.getByList.setData({ listId: lid }, (old) =>
        old ? applyListOrder(old, orderedIds) : old,
      );
      setOrderOverride(null);
    },
    onError: (_err, input) => {
      setOrderOverride(null);
      void utils.actions.getByList.invalidate({ listId: input.listId });
    },
  });

  const handleDragEnd = useCallback(
    ({ data }: { data: ActionRow[] }) => {
      if (!listId) return;
      setOrderOverride(data);
      reorderActions.mutate({ listId, orderedIds: data.map((a) => a.id) });
    },
    [listId, reorderActions],
  );

  const done = actionRows.filter((a) => a.done).length;
  const total = actionRows.length;
  const dragEnabled = canWrite && !editingId;

  const listHeader = useMemo(
    () => (
      <View>
        {!!list && isShared ? (
          <PushOptInCard visible listKind="todo" />
        ) : null}
        {!canWrite ? (
          <Text style={styles.readOnlyBanner}>Lecture seule — demandez l'accès écriture au propriétaire</Text>
        ) : null}
        {total > 0 && (
          <>
            <Text style={styles.counter}>
              {done} / {total} fait{done > 1 ? "s" : ""}
            </Text>
            {total > 1 && (
              <Text style={styles.dragHint}>Maintenir une ligne pour réordonner</Text>
            )}
          </>
        )}

        {canWrite && listId ? <AddActionForm listId={listId} /> : null}

        {isLoading && <LoadingIndicator style={{ marginTop: 20, marginVertical: 20 }} />}
      </View>
    ),
    [total, done, isLoading, list, isShared, canWrite, listId],
  );

  const renderAction = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ActionRow>) => (
        <View style={[styles.actionCard, isActive && styles.actionCardDragging]}>
          {editingId === item.id ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.input}
                value={editTitle}
                onChangeText={setEditTitle}
                autoFocus
              />
              <View style={styles.editBtns}>
                <Pressable
                  style={styles.saveBtnSmall}
                  onPress={() =>
                    updateAction.mutate({
                      actionId: item.id,
                      title: editTitle,
                      recurrence: item.recurrence as Recurrence,
                    })
                  }
                >
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                </Pressable>
                <Pressable style={styles.cancelBtnSmall} onPress={() => setEditingId(null)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </Pressable>
              </View>
            </View>
          ) : (
              <View style={styles.actionRow}>
                <Pressable
                  onLongPress={dragEnabled ? drag : undefined}
                  delayLongPress={120}
                  disabled={!dragEnabled || isActive}
                  hitSlop={8}
                  style={styles.dragHandleBtn}
                >
                  <Text style={styles.dragHandle}>⠿</Text>
                </Pressable>
                <Pressable
                  style={[styles.checkbox, item.done && styles.checkboxDone]}
                  onPress={() => canWrite && toggleAction.mutate({ actionId: item.id })}
                  disabled={!canWrite}
                >
                  {item.done && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, item.done && styles.actionDone]}>
                    {item.title}
                  </Text>
                  <View style={styles.metaRow}>
                    {item.recurrenceTime && (
                      <Text style={styles.metaText}>{item.recurrenceTime.slice(0, 5)}</Text>
                    )}
                    {item.dueAt && (
                      <Text style={styles.metaText}>
                        {new Date(item.dueAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                        {formatActionDueTime(item.dueAt)
                          ? ` · ${formatActionDueTime(item.dueAt)}`
                          : ""}
                      </Text>
                    )}
                    <RecurrenceBadge recurrence={item.recurrence} dow={item.recurrenceDow} />
                    <StreakBadge streakCount={item.streakCount} bestStreak={item.bestStreak} />
                    {resolveMapsQuery(item.locationLabel ?? null, item.locationAddress ?? null) ? (
                      <Pressable onPress={() => setLocationAction(item)} hitSlop={6}>
                        <Text style={styles.locationLink}>
                          📍{" "}
                          {formatActionLocation(
                            item.locationLabel ?? null,
                            item.locationAddress ?? null,
                          )}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                {canWrite ? (
                  <View style={styles.rowBtns}>
                    <Pressable
                      onPress={() => {
                        setEditingId(item.id);
                        setEditTitle(item.title);
                      }}
                    >
                      <FluentEmoji emoji="✏️" size={16} />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void (async () => {
                          if (!(await confirmPermanentDelete(item.title))) return;
                          deleteAction.mutate({ actionId: item.id });
                        })();
                      }}
                    >
                      <FluentEmoji emoji="🗑️" size={16} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
          )}
        </View>
    ),
    [
      editingId,
      editTitle,
      dragEnabled,
      canWrite,
      updateAction,
      toggleAction,
      deleteAction,
    ],
  );

  return (
    <>
      <LazyDraggableFlatList
        data={listData}
        keyExtractor={(item: ActionRow) => item.id}
        onDragEnd={handleDragEnd}
        activationDistance={12}
        enableLayoutAnimationExperimental={false}
        renderItem={renderAction}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          !isLoading && listData.length === 0 ? (
            <Text style={styles.empty}>Aucune action dans cette liste.</Text>
          ) : null
        }
        containerStyle={styles.container}
        contentContainerStyle={styles.content}
      />
      {listId ? (
        <TodoListShareModal
          listId={listId}
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
      <ActionLocationSheet
        visible={!!locationAction}
        locationLabel={locationAction?.locationLabel ?? null}
        locationAddress={locationAction?.locationAddress ?? null}
        onClose={() => setLocationAction(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  headerShare: { fontSize: 15, fontWeight: "600", color: "#111827" },
  readOnlyBanner: {
    fontSize: 13,
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  counter: { fontSize: 13, color: "#9CA3AF", marginBottom: 4, textAlign: "right" },
  dragHint: { fontSize: 12, color: "#9CA3AF", marginBottom: 12, textAlign: "right" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 12,
  },
  radioRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  radioItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#D1D5DB" },
  radioActive: { borderColor: "#111827", backgroundColor: "#111827" },
  radioLabel: { fontSize: 13, color: "#374151" },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: "#6B7280", minWidth: 80 },
  fieldInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    justifyContent: "center",
    minHeight: 36,
  },
  fieldText: { fontSize: 13, color: "#111827" },
  fieldTextPlaceholder: { color: "#9CA3AF" },
  dowRow: { flexDirection: "row", gap: 4, marginBottom: 10, flexWrap: "wrap" },
  dowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dowBtnActive: { backgroundColor: "#111827", borderColor: "#111827" },
  dowLabel: { fontSize: 12, color: "#374151" },
  dowLabelActive: { color: "#fff" },
  addBtn: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 8,
  },
  actionCardDragging: {
    borderColor: "#111827",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  actionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dragHandleBtn: { paddingVertical: 2, paddingRight: 4 },
  dragHandle: { fontSize: 16, color: "#D1D5DB", width: 14, textAlign: "center" },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkmark: { color: "#fff", fontSize: 11, fontWeight: "700" },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 14, color: "#111827" },
  actionDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  metaText: { fontSize: 11, color: "#9CA3AF" },
  locationLink: { fontSize: 11, color: "#2563EB" },
  badgeBlue: {
    fontSize: 11,
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePurple: {
    fontSize: 11,
    color: "#7C3AED",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rowBtns: { flexDirection: "row", gap: 8, flexShrink: 0 },
  editIcon: { fontSize: 16 },
  deleteIcon: { fontSize: 16 },
  editForm: { gap: 8 },
  editBtns: { flexDirection: "row", gap: 8 },
  saveBtnSmall: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  cancelBtnSmall: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  cancelBtnText: { color: "#6B7280", fontSize: 13 },
  empty: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
});
