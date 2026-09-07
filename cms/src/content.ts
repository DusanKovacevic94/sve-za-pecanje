import { APIError } from 'payload'

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const relationshipID = (value: unknown): string | number | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) return relationshipID(value.id)
}

export function safeLink(value: unknown): boolean {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f]/.test(value)) return false
  if (/^\/(?!\/)/.test(value) || /^#[\w-]+$/.test(value)) return true
  try { return ['https:', 'http:', 'mailto:'].includes(new URL(value).protocol) } catch { return false }
}

// Enforce the editor's restricted vocabulary on REST/Local API writes as well.
export function inspectBody(body: unknown): { text: string; media: (string | number)[] } {
  const media: (string | number)[] = []
  const text: string[] = []
  const fail = () => { throw new APIError('Body contains unsupported content or an unsafe link.', 400) }
  let count = 0
  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== 'object' || depth > 32 || ++count > 10000) return fail()
    const node = value as Record<string, unknown>
    if (!['root', 'paragraph', 'heading', 'text', 'linebreak', 'list', 'listitem', 'quote', 'link', 'block'].includes(String(node.type))) return fail()
    if (node.type === 'heading' && !['h2', 'h3'].includes(String(node.tag))) return fail()
    if (node.type === 'text') {
      if (typeof node.text !== 'string' || (Number(node.format || 0) & ~3) !== 0 || node.style) return fail()
      text.push(node.text)
    }
    if (node.type === 'list' && !['bullet', 'number'].includes(String(node.listType))) return fail()
    if (node.type === 'link') {
      const fields = node.fields as Record<string, unknown> | undefined
      if (fields?.linkType !== 'custom' || !safeLink(fields.url) || fields.doc) return fail()
    }
    if (node.type === 'block') {
      const fields = node.fields as Record<string, unknown> | undefined
      if (fields?.blockType !== 'image' || !relationshipID(fields.image)) return fail()
      media.push(relationshipID(fields.image)!)
    }
    if (node.children !== undefined) {
      if (!Array.isArray(node.children)) return fail()
      node.children.forEach(child => visit(child, depth + 1))
    }
  }
  if (!body || typeof body !== 'object' || !('root' in body)) return fail()
  if ((body.root as Record<string, unknown>)?.type !== 'root') return fail()
  visit(body.root, 0)
  return { text: text.join(' ').trim(), media }
}
