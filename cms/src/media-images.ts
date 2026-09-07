import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { APIError, type File } from 'payload'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_IMAGE_PIXELS = 40_000_000

export async function sanitizeImage(file: File): Promise<File> {
  if (file.data.length > MAX_IMAGE_BYTES || file.size > MAX_IMAGE_BYTES) throw new APIError('Images must be 10 MB or smaller.', 400)
  try {
    const input = sharp(file.data, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning', animated: true })
    const metadata = await input.metadata()
    const expected = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
    if (!metadata.format || !(metadata.format in expected) || expected[metadata.format as keyof typeof expected] !== file.mimetype || (metadata.pages || 1) !== 1) {
      throw new Error('format')
    }
    if (!metadata.width || !metadata.height || Math.min(metadata.width, metadata.height) < 180 || Math.max(metadata.width, metadata.height) > 10000) throw new Error('dimensions')
    // Decode every pixel, auto-orient, and re-encode without EXIF/XMP/ICC metadata.
    // Uploaded filenames and the original untrusted bytes never reach object storage.
    const data = await input.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
    return { data, size: data.length, mimetype: 'image/webp', name: `${randomUUID()}.webp` }
  } catch {
    throw new APIError('Upload a valid, non-animated JPEG, PNG, or WebP image: at least 180 px per side, at most 10,000 px per side and 40 megapixels.', 400)
  }
}
