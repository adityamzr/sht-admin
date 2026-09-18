import { and, eq, isNull, count } from 'drizzle-orm'
import { adminAttachments, tourPayments, tourExpenses, workspaces } from '../db/schema'
import type { DbLike } from '../db'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, readFile, unlink, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { existsSync } from 'node:fs'

function makeHttpError(statusCode: number, statusMessage: string): any {
  const err: any = new Error(statusMessage)
  err.statusCode = statusCode
  err.statusMessage = statusMessage
  // Try to use Nitro's createError if available globally
  try {
    const globalAny = globalThis as any
    if (typeof globalAny.createError === 'function') {
      return globalAny.createError({ statusCode, statusMessage })
    }
  } catch {}
  return err
}

function badRequest(msg: string): never {
  throw makeHttpError(400, msg)
}
function forbidden(msg: string): never {
  throw makeHttpError(403, msg)
}
function notFound(msg: string): never {
  throw makeHttpError(404, msg)
}

function notDeleted(table: any) {
  return isNull(table.deletedAt)
}

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
])

export const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.pdf'])
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export function getAttachmentsBaseDir(): string {
  // In production, use project root storage folder
  // /home/user/sht-admin/storage/private-attachments
  return join(process.cwd(), 'storage', 'private-attachments')
}

export function getAttachmentFilePath(storageKey: string): string {
  return join(getAttachmentsBaseDir(), storageKey)
}

export async function ensureAttachmentsDir() {
  const base = getAttachmentsBaseDir()
  if (!existsSync(base)) {
    await mkdir(base, { recursive: true })
  }
}

function sanitizeFileName(name: string): string {
  // Remove directory traversal, keep only basename, replace unsafe chars
  const base = name.split('/').pop()?.split('\\').pop() || 'file'
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file'
}

function getExtensionFromMime(mime: string, originalName: string): string {
  const extFromName = extname(originalName).toLowerCase()
  if (ALLOWED_EXTENSIONS.has(extFromName)) return extFromName
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'application/pdf') return '.pdf'
  return extFromName || '.bin'
}

export function validateFile(file: { filename?: string; type?: string; data: Buffer }) {
  const mime = (file.type || '').toLowerCase()
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    badRequest('Format file tidak didukung. Gunakan JPG, PNG, atau PDF.')
  }
  const size = file.data.length
  if (size > MAX_FILE_SIZE) {
    badRequest(`Ukuran file terlalu besar. Maksimal ${MAX_FILE_SIZE / 1024 / 1024} MB.`)
  }
  if (size === 0) badRequest('File kosong tidak diperbolehkan.')
  const originalName = file.filename || 'file'
  const ext = extname(originalName).toLowerCase()
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    // Allow if mime is allowed but extension weird? Still reject if extension not allowed
    // But if no extension, we will generate from mime
    if (ext !== '') badRequest('Format file tidak didukung. Gunakan JPG, PNG, atau PDF.')
  }
  // Basic MIME spoofing check: extension should match mime loosely
  if (ext === '.pdf' && mime !== 'application/pdf') badRequest('File PDF harus memiliki MIME application/pdf')
  if ((ext === '.jpg' || ext === '.jpeg') && mime !== 'image/jpeg') badRequest('File JPG harus memiliki MIME image/jpeg')
  if (ext === '.png' && mime !== 'image/png') badRequest('File PNG harus memiliki MIME image/png')
}

export async function validateEntityOwnership(
  db: DbLike,
  workspaceId: number,
  entityType: string,
  entityId: number,
) {
  if (entityType === 'PAYMENT') {
    const rows = await db.select({ id: tourPayments.id }).from(tourPayments).where(and(eq(tourPayments.id, entityId), eq(tourPayments.workspaceId, workspaceId), notDeleted(tourPayments))).limit(1)
    if (!rows[0]) badRequest(`Payment #${entityId} tidak ditemukan atau bukan milik workspace ini`)
  } else if (entityType === 'EXPENSE') {
    const rows = await db.select({ id: tourExpenses.id }).from(tourExpenses).where(and(eq(tourExpenses.id, entityId), eq(tourExpenses.workspaceId, workspaceId), notDeleted(tourExpenses))).limit(1)
    if (!rows[0]) badRequest(`Expense #${entityId} tidak ditemukan atau bukan milik workspace ini`)
  } else {
    badRequest(`Entity type tidak didukung: ${entityType}`)
  }
}

export async function createAttachment(
  db: DbLike,
  workspaceId: number,
  input: {
    entityType: string
    entityId: number
    file: { filename?: string; type?: string; data: Buffer }
    uploadedBy?: number
  },
) {
  const entityType = String(input.entityType).toUpperCase()
  if (!['PAYMENT', 'EXPENSE'].includes(entityType)) badRequest(`Entity type tidak didukung: ${entityType}`)

  const entityId = Number(input.entityId)
  if (!entityId || isNaN(entityId)) badRequest('entityId tidak valid')

  // Validate workspace exists
  const wsRows = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  if (!wsRows[0]) badRequest('Workspace tidak ditemukan')

  // Validate entity belongs to workspace
  await validateEntityOwnership(db, workspaceId, entityType, entityId)

  // Validate file
  validateFile(input.file)

  const originalName = sanitizeFileName(input.file.filename || 'file')
  const mime = (input.file.type || 'application/octet-stream').toLowerCase()
  const fileSize = input.file.data.length
  const ext = getExtensionFromMime(mime, originalName)
  const safeFileName = `${randomUUID()}${ext}`
  const storageKey = `${workspaceId}/${entityType}/${entityId}/${safeFileName}`

  await ensureAttachmentsDir()
  const fullPath = getAttachmentFilePath(storageKey)
  const dir = join(fullPath, '..')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })

  await writeFile(fullPath, input.file.data)

  const rows = await db.insert(adminAttachments).values({
    workspaceId,
    entityType,
    entityId,
    fileName: safeFileName,
    originalName,
    storageKey,
    mimeType: mime,
    fileSize,
    uploadedBy: input.uploadedBy || null,
  } as any).returning()

  return rows[0]
}

export async function listAttachments(
  db: DbLike,
  workspaceId: number,
  entityType: string,
  entityId: number,
) {
  const type = String(entityType).toUpperCase()
  const id = Number(entityId)
  if (!['PAYMENT', 'EXPENSE'].includes(type)) badRequest('Entity type tidak didukung')
  await validateEntityOwnership(db, workspaceId, type, id)

  const rows = await db.select().from(adminAttachments).where(and(eq(adminAttachments.workspaceId, workspaceId), eq(adminAttachments.entityType, type), eq(adminAttachments.entityId, id), notDeleted(adminAttachments))).orderBy(adminAttachments.createdAt)
  return rows
}

export async function getAttachment(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(adminAttachments).where(and(eq(adminAttachments.id, id), eq(adminAttachments.workspaceId, workspaceId), notDeleted(adminAttachments))).limit(1)
  if (!rows[0]) notFound('Attachment tidak ditemukan')
  return rows[0]
}

export async function softDeleteAttachment(db: DbLike, id: number, workspaceId: number) {
  const existing = await getAttachment(db, id, workspaceId)
  // Soft delete
  const rows = await db.update(adminAttachments).set({ deletedAt: new Date() } as any).where(and(eq(adminAttachments.id, id), eq(adminAttachments.workspaceId, workspaceId))).returning({ id: adminAttachments.id })
  // Optionally delete physical file? For safety, keep file but mark deleted. We can also delete file after auth, but keep soft-delete semantics.
  // For V1, we keep file on disk but not accessible via API after soft delete. Physical cleanup can be manual.
  return rows[0] ?? null
}

export async function getAttachmentFileBuffer(storageKey: string): Promise<{ buffer: Buffer; mime: string; fileName: string }> {
  const fullPath = getAttachmentFilePath(storageKey)
  if (!existsSync(fullPath)) notFound('File fisik tidak ditemukan')
  const buffer = await readFile(fullPath)
  return { buffer: buffer as Buffer, mime: '', fileName: '' } // mime/fileName from DB
}
