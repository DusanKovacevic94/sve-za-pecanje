import type { SocialCardInput } from './contract'

export type SocialCopySource = {
  title?: string | null
  excerpt?: string | null
  socialTitle?: string | null
  socialDescription?: string | null
}

export const cleanSocialText = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim()

/** Browser-safe: resolve current form values without persisting or truncating fallbacks. */
export function resolveSocialCardCopy(post: SocialCopySource): SocialCardInput {
  return {
    title: cleanSocialText(post.socialTitle || '') || cleanSocialText(post.title || ''),
    description: cleanSocialText(post.socialDescription || '') || cleanSocialText(post.excerpt || ''),
  }
}
