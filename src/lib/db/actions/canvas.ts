"use server"

import { getCanvasCollection, ensureIndexes } from "../collections"

export async function loadCanvasFromDb(userId: string, sessionId: string) {
  await ensureIndexes()
  const col = await getCanvasCollection()
  return col.findOne({ userId, sessionId })
}

export async function saveCanvasToDb(userId: string, data: {
  sessionId: string
  documents: Record<string, unknown>[]
  activeDocumentId?: string
  completions?: Record<string, unknown>[]
}) {
  await ensureIndexes()
  const col = await getCanvasCollection()

  await col.updateOne(
    { userId, sessionId: data.sessionId },
    {
      $set: {
        documents: data.documents,
        activeDocumentId: data.activeDocumentId,
        completions: data.completions ?? [],
        updatedAt: Date.now(),
      },
    },
    { upsert: true }
  )
}

export async function deleteCanvasFromDb(userId: string, sessionId: string) {
  await ensureIndexes()
  const col = await getCanvasCollection()
  await col.deleteOne({ userId, sessionId })
}

// --- Agent completions ---

export async function loadCompletionsFromDb(userId: string, sessionId: string) {
  await ensureIndexes()
  const col = await getCanvasCollection()
  const doc = await col.findOne({ userId, sessionId })
  return doc?.completions ?? []
}

export async function addCompletionToDb(
  userId: string,
  sessionId: string,
  agentId: string,
  reportPath: string
) {
  await ensureIndexes()
  const col = await getCanvasCollection()

  await col.updateOne(
    { userId, sessionId },
    {
      $push: {
        completions: {
          agentId,
          reportPath,
          completedAt: Date.now(),
          acknowledged: false,
        },
      } as any,
      $set: { updatedAt: Date.now() },
    },
    { upsert: true }
  )
}

export async function acknowledgeCompletionInDb(userId: string, sessionId: string, agentId: string) {
  await ensureIndexes()
  const col = await getCanvasCollection()

  await col.updateOne(
    { userId, sessionId, "completions.agentId": agentId },
    {
      $set: {
        "completions.$.acknowledged": true,
        updatedAt: Date.now(),
      },
    }
  )
}
