export type SocialCardInput = { title: string; description: string }
export type SocialCardErrorCode = 'invalid_input' | 'overflow' | 'unsupported_glyph' | 'busy' | 'timeout' | 'cancelled' | 'unavailable'
export type SocialCardResult = {
  jpeg: Buffer
  svg: string
  width: 1080
  height: 1350
  templateVersion: 1
  lines: { title: string[]; description: string[] }
}

const messages: Record<SocialCardErrorCode, string> = {
  invalid_input: 'Unesi naslov i kratak opis kao običan tekst.',
  overflow: 'Skrati naslov ili opis za društvene mreže da tekst stane u sliku.',
  unsupported_glyph: 'Tekst sadrži nepodržan znak. Ukloni ga i pokušaj ponovo.',
  busy: 'Generisanje slika je trenutno zauzeto. Pokušaj ponovo.',
  timeout: 'Generisanje slike je trajalo predugo. Pokušaj ponovo.',
  cancelled: 'Generisanje slike je otkazano.',
  unavailable: 'Slika trenutno ne može da se pripremi. Pokušaj ponovo.',
}

export class SocialCardError extends Error {
  constructor(public readonly code: SocialCardErrorCode, public readonly field?: keyof SocialCardInput) {
    super(messages[code])
    this.name = 'SocialCardError'
  }
}

export function validateSocialCardInput(input: unknown): SocialCardInput {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(input)) ||
    Reflect.ownKeys(input).length !== 2 || !Object.hasOwn(input, 'title') || !Object.hasOwn(input, 'description')) {
    throw new SocialCardError('invalid_input')
  }
  const normalize = (field: keyof SocialCardInput, max: number) => {
    // No getters, arbitrary objects, resource URLs, font choices, or render options.
    const descriptor = Object.getOwnPropertyDescriptor(input, field)
    const value = descriptor && 'value' in descriptor ? descriptor.value : undefined
    if (typeof value !== 'string' || value.length > 1000) throw new SocialCardError('invalid_input', field)
    const normalized = value.normalize('NFC')
    if (/[\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}]|[^\S\n\r\t ]/u.test(normalized.replace(/\u00a0/g, ' ')) ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(normalized)) {
      throw new SocialCardError('unsupported_glyph', field)
    }
    const text = normalized.replace(/\s+/gu, ' ').trim()
    if (!text) throw new SocialCardError('invalid_input', field)
    if ([...text].length > max) throw new SocialCardError('overflow', field)
    return text
  }
  return { title: normalize('title', 100), description: normalize('description', 180) }
}
