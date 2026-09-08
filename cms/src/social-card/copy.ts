import { APIError } from 'payload'
import layout from '../../assets/social/blog-card-layout.json'
import type { SocialCardInput } from './contract'

export type SocialCopySource = {
  title?: string | null
  excerpt?: string | null
  socialTitle?: string | null
  socialDescription?: string | null
}

const clean = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim()

// Field validity only: no font, glyph, wrapping or rendering requirement at publication.
export function normalizeSocialOverride(value: unknown, field: keyof SocialCardInput): string | null | undefined {
  if (value === undefined || value === null) return value
  const name = field === 'title' ? 'Naslov za društvene mreže' : 'Opis za društvene mreže'
  if (typeof value !== 'string' || value.length > 10_000) throw new APIError(`${name}: unesi kratak tekst.`, 400)
  const normalized = clean(value)
  if ([...normalized].length > layout[field].maxCharacters) {
    throw new APIError(`${name}: najviše ${layout[field].maxCharacters} znakova.`, 400)
  }
  return normalized || null
}

/** Resolve at preview time, never persist fallbacks or require card readiness to publish. */
export function resolveSocialCardCopy(post: SocialCopySource): SocialCardInput {
  return {
    title: clean(post.socialTitle || '') || clean(post.title || ''),
    description: clean(post.socialDescription || '') || clean(post.excerpt || ''),
  }
}
