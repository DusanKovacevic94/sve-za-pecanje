import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { APIError, type Access, type PayloadRequest } from 'payload'
import { isEditor } from './access'
import { inspectBody, relationshipID } from './content'

// Deliberately tied to the explicit PostgreSQL CMS schema. JSONPath covers image
// blocks in lists/quotes as well as the top level; no substring ID matching.
const reference = (cover: string, body: string) => sql`(
  ${sql.raw(cover)} = media.id OR EXISTS (
    SELECT 1 FROM jsonb_path_query(${sql.raw(body)}, '$.root.** ? (@.type == "block" && @.fields.blockType == "image").fields.image') AS image(value)
    WHERE image.value = to_jsonb(media.id) OR image.value = to_jsonb(media.id::text) OR image.value->>'id' = media.id::text
  ))`

export const publishedMedia: Access = async ({ req }) => {
  if (isEditor(req.user)) return true
  const result = await req.payload.db.drizzle.execute(sql`
    SELECT media.id FROM media WHERE media.is_public = true AND EXISTS (
      SELECT 1 FROM posts WHERE posts._status = 'published' AND ${reference('posts.cover_image_id', 'posts.body')}
    )`)
  return { id: { in: result.rows.map(row => row.id as number) } }
}

async function transaction(req: PayloadRequest) {
  const id = await req.transactionID
  const adapter = req.payload.db as unknown as PostgresAdapter
  if (!id || !adapter.sessions[id]) throw new APIError('Media changes require a database transaction.', 500)
  return adapter.sessions[id].db
}

export async function lockMedia(req: PayloadRequest, ids: (string | number)[]) {
  const unique = [...new Set(ids.map(Number))].sort((a, b) => a - b)
  if (!unique.length) return
  if (unique.some(id => !Number.isSafeInteger(id) || id < 1)) throw new APIError('Invalid media reference.', 400)
  const db = await transaction(req)
  const found = await db.execute(sql`SELECT id FROM media WHERE id IN (${sql.join(unique.map(id => sql`${id}`), sql`, `)}) ORDER BY id FOR UPDATE`)
  if (found.rows.length !== unique.length) throw new APIError('An image was removed. Choose an existing image.', 400)
}

export async function lockPostMedia(req: PayloadRequest, data: Record<string, unknown>) {
  const cover = relationshipID(data.coverImage)
  await lockMedia(req, [...(cover ? [cover] : []), ...(data.body ? inspectBody(data.body).media : [])])
}

export async function protectMediaDeletion(req: PayloadRequest, id: string | number) {
  // Post saves/restores take the same row locks before recording their references.
  // This closes the race between saving a new reference and deleting the file.
  await lockMedia(req, [id])
  const db = await transaction(req)
  const result = await db.execute(sql`SELECT media.id FROM media WHERE media.id = ${id} AND (
    EXISTS (SELECT 1 FROM posts WHERE ${reference('posts.cover_image_id', 'posts.body')}) OR
    EXISTS (SELECT 1 FROM _posts_v WHERE ${reference('_posts_v.version_cover_image_id', '_posts_v.version_body')})
  )`)
  if (result.rows.length) throw new APIError('This image is used by an article or retained version. Keep it for version recovery; upload a replacement as a new image.', 409)
}
