"use server"

import { getChatMessagesCollection, ensureIndexes } from "../collections"
import { chatMessagesSchema } from "../schemas"

export async function loadChatMessages(userId: string, projectId: string, deliverableId: string) {
  await ensureIndexes()
  const col = await getChatMessagesCollection()
  const doc = await col.findOne({ userId, projectId, deliverableId })
  return doc?.messages ?? []
}

export async function saveChatMessages(
  userId: string,
  projectId: string,
  deliverableId: string,
  messages: Record<string, unknown>[]
) {
  await ensureIndexes()
  chatMessagesSchema.parse({ projectId, deliverableId, messages })
  const col = await getChatMessagesCollection()

  await col.updateOne(
    { userId, projectId, deliverableId },
    { $set: { messages, updatedAt: Date.now() } },
    { upsert: true }
  )
}

export async function deleteChatMessages(userId: string, projectId: string, deliverableId: string) {
  await ensureIndexes()
  const col = await getChatMessagesCollection()
  await col.deleteOne({ userId, projectId, deliverableId })
}

export async function deleteAllProjectChatMessages(userId: string, projectId: string) {
  await ensureIndexes()
  const col = await getChatMessagesCollection()
  await col.deleteMany({ userId, projectId })
}
