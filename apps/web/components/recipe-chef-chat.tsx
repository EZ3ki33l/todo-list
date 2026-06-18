"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { ChefChatMessageContent } from "@/components/chef-chat-message-content";
import { detectCategory } from "@/lib/grocery-detect";
import { trpc } from "@/lib/trpc";

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

type Props = {
  listId: string;
  /** Bouton fixe au scroll (défaut) ou inline dans la page. */
  variant?: "floating" | "inline";
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
    return "L'API en cours d'exécution n'inclut pas encore Chef IA (route recipes.chat). Lancez le serveur local à jour ou déployez le code récent en production.";
  }
  return null;
}

export function RecipeChefChat({ listId, variant = "floating" }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [addedKeys, setAddedKeys] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat.isPending]);

  function resetChat() {
    setMode(null);
    setMessages([]);
    setDraft("");
    setAddedKeys(new Set());
    chat.reset();
  }

  async function addItemToList(
    item: ChatItemToAdd,
    messageIndex: number,
  ) {
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

  const triggerClass =
    variant === "floating"
      ? "fixed right-4 z-40 bottom-[max(1.5rem,env(safe-area-inset-bottom))] inline-flex items-center gap-2.5 rounded-full border border-app-border-soft bg-app-bg-elevated py-1.5 pl-1.5 pr-4 shadow-lg transition hover:border-orange-300 hover:bg-orange-50 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:right-8 sm:bottom-[max(2rem,env(safe-area-inset-bottom))]"
      : "inline-flex items-center gap-2.5 rounded-full border border-app-border-soft bg-app-bg-elevated py-1 pl-1 pr-4 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir Chef IA — idées repas et articles à acheter"
        className={triggerClass}
      >
        <Image
          src="/chef-ia.png"
          alt=""
          width={variant === "floating" ? 44 : 40}
          height={variant === "floating" ? 44 : 40}
          className="rounded-full"
          aria-hidden
        />
        <span className="text-sm font-semibold text-app-text">Chef IA</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/45"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chef-chat-title"
            className="relative flex h-[min(92dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-app-border-soft bg-app-bg-elevated shadow-2xl sm:rounded-2xl"
          >
            <header className="flex items-center gap-3 border-b border-app-border-soft bg-gradient-to-r from-orange-50 to-white px-4 py-3">
              <Image
                src="/chef-ia.png"
                alt=""
                width={44}
                height={44}
                className="rounded-full"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <h3 id="chef-chat-title" className="font-semibold text-app-text">
                  Chef IA
                </h3>
                <p className="truncate text-xs text-app-text-subtle">
                  {mode === "from_list"
                    ? "Recettes avec votre liste"
                    : mode === "suggest_items"
                      ? "Articles à acheter"
                      : mode === "seasonal_produce"
                        ? "Fruits & légumes de saison"
                        : "Choisissez un mode"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Fermer"
                className="rounded-lg p-2 text-app-text-subtle hover:bg-app-bg-soft hover:text-app-text"
              >
                ✕
              </button>
            </header>

            {mode === null ? (
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                <p className="text-center text-sm text-app-text-muted">
                  Bonjour ! Que souhaitez-vous faire ?
                </p>
                <button
                  type="button"
                  onClick={() => selectMode("from_list")}
                  className="rounded-xl border-2 border-app-border-soft bg-orange-50/80 p-4 text-left transition hover:border-orange-400 hover:bg-orange-50"
                >
                  <p className="font-semibold text-app-text">🍳 Recettes avec ma liste</p>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Des idées de plats à partir des articles déjà dans vos courses.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectMode("suggest_items")}
                  className="rounded-xl border-2 border-app-border-soft bg-app-badge-bg/80 p-4 text-left transition hover:border-app-primary hover:bg-app-badge-bg"
                >
                  <p className="font-semibold text-app-text">🛒 Articles pour cuisiner</p>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Décrivez un plat : je vous dis quoi ajouter à la liste.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => selectMode("seasonal_produce")}
                  className="rounded-xl border-2 border-app-border-soft bg-green-50/80 p-4 text-left transition hover:border-green-400 hover:bg-green-50"
                >
                  <p className="font-semibold text-app-text">🌿 Fruits & légumes de saison</p>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Calendrier des produits par saison — pas de recettes.
                  </p>
                </button>
              </div>
            ) : (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
                >
                  {messages.map((msg, index) => (
                    <div
                      key={`${msg.role}-${index}`}
                      className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={
                          msg.role === "user"
                            ? "max-w-[88%] rounded-2xl bg-app-primary px-3.5 py-2.5 text-sm leading-relaxed text-app-on-primary"
                            : "max-w-[95%] rounded-2xl border border-orange-100 bg-orange-50/30 p-2.5 sm:p-3"
                        }
                      >
                        {msg.role === "assistant" ? (
                          <ChefChatMessageContent
                            text={msg.content}
                            productsOnly={mode === "seasonal_produce"}
                          />
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.role === "assistant" && (msg.sources?.length ?? 0) > 0 ? (
                        <div className="max-w-[88%] text-xs text-app-text-subtle">
                          <span className="font-medium">Sources : </span>
                          {msg.sources!.map((source, si) => (
                            <span key={`${source.label}-${si}`}>
                              {si > 0 ? " · " : null}
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-app-primary underline-offset-2 hover:underline"
                                >
                                  {source.label}
                                </a>
                              ) : (
                                source.label
                              )}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {msg.role === "assistant" && (msg.itemsToAdd?.length ?? 0) > 0 ? (
                        <div className="max-w-[88%] rounded-xl border border-app-border-soft bg-green-50/80 p-2.5">
                          <p className="mb-2 text-xs font-medium text-green-900">
                            Ajouter à la liste
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.itemsToAdd!.map((item) => {
                              const key = itemAddKey(index, item.title);
                              const added = addedKeys.has(key);
                              return (
                                <button
                                  key={item.title}
                                  type="button"
                                  disabled={added || createItem.isPending}
                                  onClick={() => void addItemToList(item, index)}
                                  className="rounded-full border border-green-300 bg-app-bg-elevated px-2.5 py-1 text-xs text-green-900 hover:bg-green-50 disabled:opacity-50"
                                >
                                  {added ? `✓ ${item.title}` : `+ ${item.title}`}
                                </button>
                              );
                            })}
                          </div>
                          {msg.itemsToAdd!.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => void addAllItems(msg.itemsToAdd!, index)}
                              disabled={createItem.isPending}
                              className="mt-2 text-xs font-medium text-green-800 hover:underline disabled:opacity-50"
                            >
                              Tout ajouter ({msg.itemsToAdd!.length})
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {chat.isPending ? (
                    <div className="flex justify-start">
                      <div className="rounded-2xl border border-app-border-soft bg-app-bg-soft px-4 py-2 text-sm text-app-text-subtle">
                        Le chef réfléchit…
                      </div>
                    </div>
                  ) : null}
                  {chat.error ? (
                    <p className="text-center text-sm text-app-danger">
                      {recipesApiHint(chat.error.message) ?? chat.error.message}
                    </p>
                  ) : null}
                  {welcome.error ? (
                    <p className="text-center text-sm text-app-danger">
                      {recipesApiHint(welcome.error.message) ?? welcome.error.message}
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-app-border-soft bg-app-bg-elevated p-3">
                  {messages.length <= 1 &&
                  (mode === "from_list" || mode === "seasonal_produce") ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {(mode === "from_list"
                        ? ["Surprenez-moi !", "Un plat rapide", "Quelque chose de léger"]
                        : [
                            "Toutes les saisons",
                            "Saison actuelle",
                            "Produits du mois",
                          ]
                      ).map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => void sendMessage(chip)}
                          disabled={chat.isPending}
                          className="rounded-full border border-app-border-soft bg-app-bg-elevated px-3 py-1 text-xs text-app-text hover:bg-app-bg-soft disabled:opacity-50"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendMessage(draft);
                    }}
                  >
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={
                        mode === "suggest_items"
                          ? "Ex. lasagnes végétariennes…"
                          : "Votre message…"
                      }
                      disabled={chat.isPending}
                      className="min-w-0 flex-1 rounded-xl border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || chat.isPending}
                      className="rounded-xl bg-app-primary px-4 py-2 text-sm font-medium text-app-on-primary hover:opacity-90 disabled:opacity-40"
                    >
                      Envoyer
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={resetChat}
                    className="mt-2 w-full text-center text-xs text-app-text-subtle hover:text-app-text"
                  >
                    ← Changer de mode
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
