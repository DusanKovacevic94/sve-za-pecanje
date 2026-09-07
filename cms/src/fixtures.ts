// Synthetic Serbian Latin content, never a real author or approved publication.
import sharp from 'sharp'

export async function fixtureImage() {
  const data = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#245344' } }).png().toBuffer()
  return { data, size: data.length, mimetype: 'image/png', name: 'synthetic-fixture.png' }
}

export const paragraph = (text: string) => ({ root: {
  type: 'root', version: 1, direction: null, format: '' as const, indent: 0,
  children: [{ type: 'paragraph', version: 1, direction: null, format: '', indent: 0,
    children: [{ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' }],
  }],
} })

export const authorFixture = { name: 'Probni autor', bio: 'Profil za lokalnu proveru bloga.', isPublic: true }
export const mediaFixture = { alt: 'Probni prikaz štapa i mašinice', caption: 'Probni opis fotografije.', credit: 'Lokalni test', isPublic: true }
export const postFixture = {
  title: 'Probni vodič za izbor opreme', slug: 'probni-vodic-za-izbor-opreme',
  excerpt: 'Probni tekst za proveru prikaza članka. Nije namenjen javnoj objavi.',
  body: paragraph('Pre izbora opreme proverite tehniku pecanja, uslove na vodi i stanje štapa i mašinice.'),
  seoTitle: 'Probni vodič za izbor opreme',
  seoDescription: 'Lokalni primer članka za proveru naslova, opisa i srpskih slova: č ć ž š đ.',
  internalNotes: 'PRIVATE_EDITORIAL_NOTE',
}
