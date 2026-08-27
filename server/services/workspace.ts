import { and, eq } from 'drizzle-orm'
import { workspaces, workspaceMemberships } from '../db/schema'
import type { DbLike } from '../db'

export type WorkspaceKey = string

export async function listAccessibleWorkspaces(db: DbLike, userId: number) {
  return db
    .select({
      id: workspaces.id,
      key: workspaces.key,
      name: workspaces.name,
      description: workspaces.description,
      role: workspaceMemberships.role,
    })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
    .where(and(eq(workspaceMemberships.userId, userId), eq(workspaces.isActive, true)))
    .orderBy(workspaces.id)
}

export async function hasWorkspaceAccess(db: DbLike, userId: number, workspaceKey: WorkspaceKey) {
  const rows = await db
    .select({ id: workspaces.id })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
    .where(and(eq(workspaceMemberships.userId, userId), eq(workspaces.key, workspaceKey), eq(workspaces.isActive, true)))
    .limit(1)
  return Boolean(rows[0])
}

export async function requireWorkspaceAccess(db: DbLike, userId: number, workspaceKey: WorkspaceKey) {
  if (!(await hasWorkspaceAccess(db, userId, workspaceKey))) {
    throw createError({ statusCode: 403, statusMessage: 'Akses workspace tidak diizinkan.' })
  }
}
