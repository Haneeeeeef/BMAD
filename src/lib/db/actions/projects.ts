"use server"

import { getProjectsCollection, ensureIndexes } from "../collections"
import { createProjectSchema, updateProjectSchema } from "../schemas"

export async function listProjects(userId: string) {
  await ensureIndexes()
  const col = await getProjectsCollection()
  return col.find({ userId }).sort({ createdAt: -1 }).toArray()
}

export async function getProjectById(userId: string, id: string) {
  await ensureIndexes()
  const col = await getProjectsCollection()
  return col.findOne({ userId, id })
}

export async function createProject(userId: string, data: Record<string, unknown>) {
  await ensureIndexes()
  const parsed = createProjectSchema.parse(data)
  const col = await getProjectsCollection()

  const doc = {
    ...parsed,
    userId,
    updatedAt: parsed.updatedAt ?? Date.now(),
  }

  await col.insertOne(doc as any)
  return doc
}

export async function updateProject(userId: string, id: string, updates: Record<string, unknown>) {
  await ensureIndexes()
  const parsed = updateProjectSchema.parse(updates)
  const col = await getProjectsCollection()

  const result = await col.findOneAndUpdate(
    { userId, id },
    { $set: { ...parsed, updatedAt: Date.now() } as any },
    { returnDocument: "after" }
  )

  return result ?? null
}

export async function deleteProject(userId: string, id: string) {
  await ensureIndexes()
  const col = await getProjectsCollection()
  const result = await col.deleteOne({ userId, id })
  return result.deletedCount > 0
}

export async function findProjectByChatSession(userId: string, chatSessionId: string) {
  await ensureIndexes()
  const col = await getProjectsCollection()
  return col.findOne({ userId, chatSessionId })
}
