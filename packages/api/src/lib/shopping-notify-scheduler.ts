import { prisma } from "@repo/db";

import {
  sendAggregatedShoppingNotification,
  SHOPPING_NOTIFY_BATCH_MS,
} from "./shopping-item-notify";

type MemoryPending = {
  listId: string;
  actorUserId: string;
  itemCount: number;
  lastTitle: string;
  lastQuantity: number | null;
  lastUnit: string | null;
  timeout: ReturnType<typeof setTimeout>;
};

const memoryPending = new Map<string, MemoryPending>();
let lastFlushAt = 0;
const FLUSH_MIN_INTERVAL_MS = 30_000;

function batchKey(listId: string, actorUserId: string) {
  return `${listId}:${actorUserId}`;
}

async function flushMemoryEntry(entry: MemoryPending) {
  memoryPending.delete(batchKey(entry.listId, entry.actorUserId));
  await prisma.shoppingNotifyBatch.deleteMany({
    where: { listId: entry.listId, actorUserId: entry.actorUserId },
  });
  await sendAggregatedShoppingNotification({
    listId: entry.listId,
    actorUserId: entry.actorUserId,
    itemCount: entry.itemCount,
    lastTitle: entry.lastTitle,
    lastQuantity: entry.lastQuantity,
    lastUnit: entry.lastUnit,
  });
}

/** Envoie les lots dont le délai est dépassé (secours si le timer mémoire n'a pas tourné). */
export async function flushExpiredShoppingNotifyBatches(): Promise<void> {
  const due = await prisma.shoppingNotifyBatch.findMany({
    where: { sendAfter: { lte: new Date() } },
  });

  for (const batch of due) {
    const key = batchKey(batch.listId, batch.actorUserId);
    const mem = memoryPending.get(key);
    if (mem) {
      clearTimeout(mem.timeout);
      memoryPending.delete(key);
    }

    await prisma.shoppingNotifyBatch.delete({
      where: {
        listId_actorUserId: { listId: batch.listId, actorUserId: batch.actorUserId },
      },
    });

    await sendAggregatedShoppingNotification({
      listId: batch.listId,
      actorUserId: batch.actorUserId,
      itemCount: batch.itemCount,
      lastTitle: batch.lastTitle,
      lastQuantity: batch.lastQuantity,
      lastUnit: batch.lastUnit,
    });
  }
}

/**
 * Regroupe les ajouts rapides : une seule notification ~45 s après le dernier article.
 */
export async function scheduleShoppingItemNotification(params: {
  listId: string;
  actorUserId: string;
  itemTitle: string;
  quantity?: number | null;
  unit?: string | null;
}): Promise<void> {
  const now = Date.now();
  if (now - lastFlushAt >= FLUSH_MIN_INTERVAL_MS) {
    lastFlushAt = now;
    await flushExpiredShoppingNotifyBatches();
  }

  const key = batchKey(params.listId, params.actorUserId);
  const sendAfter = new Date(Date.now() + SHOPPING_NOTIFY_BATCH_MS);

  const existing = memoryPending.get(key);
  if (existing) {
    clearTimeout(existing.timeout);
    existing.itemCount += 1;
    existing.lastTitle = params.itemTitle;
    existing.lastQuantity = params.quantity ?? null;
    existing.lastUnit = params.unit ?? null;
    existing.timeout = setTimeout(() => {
      void flushMemoryEntry(existing);
    }, SHOPPING_NOTIFY_BATCH_MS);

    await prisma.shoppingNotifyBatch.update({
      where: {
        listId_actorUserId: { listId: params.listId, actorUserId: params.actorUserId },
      },
      data: {
        itemCount: existing.itemCount,
        lastTitle: params.itemTitle,
        lastQuantity: params.quantity ?? null,
        lastUnit: params.unit ?? null,
        sendAfter,
      },
    });
    return;
  }

  const entry: MemoryPending = {
    listId: params.listId,
    actorUserId: params.actorUserId,
    itemCount: 1,
    lastTitle: params.itemTitle,
    lastQuantity: params.quantity ?? null,
    lastUnit: params.unit ?? null,
    timeout: setTimeout(() => {
      void flushMemoryEntry(entry);
    }, SHOPPING_NOTIFY_BATCH_MS),
  };
  memoryPending.set(key, entry);

  await prisma.shoppingNotifyBatch.upsert({
    where: {
      listId_actorUserId: { listId: params.listId, actorUserId: params.actorUserId },
    },
    create: {
      listId: params.listId,
      actorUserId: params.actorUserId,
      itemCount: 1,
      lastTitle: params.itemTitle,
      lastQuantity: params.quantity ?? null,
      lastUnit: params.unit ?? null,
      sendAfter,
    },
    update: {
      itemCount: 1,
      lastTitle: params.itemTitle,
      lastQuantity: params.quantity ?? null,
      lastUnit: params.unit ?? null,
      sendAfter,
    },
  });
}
