import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { create, type Font } from 'fontkit'
import sharp from 'sharp'
import layout from '../../assets/social/blog-card-layout.json'
import { SocialCardError, validateSocialCardInput, type SocialCardInput, type SocialCardResult } from './contract'

const hashes = {
  'blog-card.svg': '31885a5a4b13a81b33e1c2eb805632a6df1003bc1cf5b24ca106b8977f195028',
  'blog-card-layout.json': '0db38d9f225677aaf646b214ad66b896fb5cca120788039e47d15501a1614164',
  'Manrope-variable.ttf': 'd0639be45d0af36e798172419d7bd173c4bd4f29e2b76cbb69db1d11bf8b0a40',
} as const

// Internal only: assetDirectory is deployment/test configuration, never user input.
export async function loadSocialAssets(assetDirectory: string) {
  try {
    const entries = await Promise.all(Object.entries(hashes).map(async ([name, expected]) => {
      const filename = path.join(assetDirectory, name)
      if ((await stat(filename)).size > 1_000_000) throw Error('asset size')
      const bytes = await readFile(filename)
      if (createHash('sha256').update(bytes).digest('hex') !== expected) throw Error('asset integrity')
      return [name, bytes] as const
    }))
    const assets = Object.fromEntries(entries)
    const fontBytes = assets['Manrope-variable.ttf']
    const font = create(fontBytes) as Font
    if (font.familyName !== 'Manrope ExtraLight' || !font.variationAxes.wght) throw Error('font')
    return { template: assets['blog-card.svg'].toString('utf8'), fontBytes, font }
  } catch {
    throw new SocialCardError('unavailable')
  }
}

export const escapeXML = (text: string) => text.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[char]!)

type Assets = Awaited<ReturnType<typeof loadSocialAssets>>
type Field = keyof SocialCardInput

export function composeSocialCard(input: unknown, assets: Assets) {
  const copy = validateSocialCardInput(input)
  const fonts = new Map<number, Font>()
  const fontAt = (weight: number) => {
    if (!fonts.has(weight)) fonts.set(weight, assets.font.getVariation({ wght: weight }))
    return fonts.get(weight)!
  }
  for (const field of ['title', 'description'] as const) {
    for (const char of copy[field]) {
      if (!assets.font.hasGlyphForCodePoint(char.codePointAt(0)!)) throw new SocialCardError('unsupported_glyph', field)
    }
  }
  const shape = (text: string, size: number, weight: number) => {
    const font = fontAt(weight)
    const run = font.layout(text, undefined, undefined, 'sr', 'ltr')
    if (run.glyphs.some(glyph => glyph.id === 0)) throw new SocialCardError('unsupported_glyph')
    return { run, scale: size / font.unitsPerEm, width: run.advanceWidth * size / font.unitsPerEm }
  }
  const wrap = (field: Field) => {
    const spec = layout[field]
    const width = (text: string) => shape(text, spec.fontSize, spec.fontWeight).width
    const lines: string[] = []
    for (const word of copy[field].split(' ')) {
      if (width(word) > spec.maxWidth) throw new SocialCardError('overflow', field)
      const last = lines.at(-1)
      if (last && width(`${last} ${word}`) <= spec.maxWidth) lines[lines.length - 1] += ` ${word}`
      else lines.push(word)
    }
    if (lines.length > spec.maxLines) throw new SocialCardError('overflow', field)
    return lines
  }
  const lines = { title: wrap('title'), description: wrap('description') }
  const outlines = (text: string, size: number, weight: number, baseline: number, minY: number, maxY: number) => {
    const { run, scale, width } = shape(text, size, weight)
    let cursorX = 0
    let cursorY = 0
    const left = (layout.width - width) / 2
    return run.glyphs.map((glyph, i) => {
      const position = run.positions[i]
      const x = left + (cursorX + position.xOffset) * scale
      const y = baseline - (cursorY + position.yOffset) * scale
      cursorX += position.xAdvance
      cursorY += position.yAdvance
      const data = glyph.path.toSVG()
      if (!data) return ''
      const bounds = glyph.bbox
      if (x + bounds.minX * scale < layout.safeMargin || x + bounds.maxX * scale > layout.width - layout.safeMargin ||
        y - bounds.maxY * scale < minY || y - bounds.minY * scale > maxY) throw new SocialCardError('overflow')
      return `<path d="${data}" transform="translate(${x} ${y}) scale(${scale} ${-scale})"/>`
    }).join('')
  }
  const tags = (field: Field, paths: boolean) => lines[field].map((line, i) => {
    const spec = layout[field]
    const first = field === 'title' ? layout.title.centerBaseline - (lines.title.length - 1) * spec.lineHeight / 2 : layout.description.firstBaseline
    const y = first + i * spec.lineHeight
    return paths ? outlines(line, spec.fontSize, spec.fontWeight, y, field === 'title' ? 298 : 770, field === 'title' ? 760 : 1000)
      : `<text x="540" y="${y}">${escapeXML(line)}</text>`
  }).join('\n')
  const assemble = (paths: boolean) => {
    const values: Record<string, string> = {
      TITLE: escapeXML(copy.title), DESCRIPTION: escapeXML(copy.description),
      FONT: paths ? '' : assets.fontBytes.toString('base64'),
      TITLE_LINES: tags('title', paths), DESCRIPTION_LINES: tags('description', paths),
    }
    // Only the trusted, hash-verified template is parsed. Copy is never reparsed.
    let svg = assets.template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => values[key])
    if (paths) {
      svg = svg.replace(/<style>[\s\S]*?<\/style>/, '')
      svg = svg.replace(/<text x="540" y="(\d+)" text-anchor="middle" fill="(#[A-F0-9]+)" font-size="(\d+)" font-weight="(\d+)">([^<]+)<\/text>/g,
        (_, y, fill, size, weight, text) => `<g fill="${fill}">${outlines(text, Number(size), Number(weight), Number(y), 1050, 1190)}</g>`)
      if (svg.includes('<text ') || svg.includes('<style>')) throw new SocialCardError('unavailable')
    }
    return svg
  }
  return { svg: assemble(false), rasterSVG: assemble(true), lines }
}

// Called in a disposable subprocess only. Never import this into the CMS request path.
export async function renderSocialCardCore(input: unknown, assetDirectory: string): Promise<SocialCardResult> {
  try {
    const assets = await loadSocialAssets(assetDirectory)
    const { svg, rasterSVG, lines } = composeSocialCard(input, assets)
    sharp.cache(false)
    sharp.concurrency(1)
    const { data: jpeg, info } = await sharp(Buffer.from(rasterSVG), { limitInputPixels: layout.width * layout.height, density: 72 })
      .flatten({ background: '#173F37' }).jpeg({ quality: layout.jpeg.quality, chromaSubsampling: '4:4:4' }).toBuffer({ resolveWithObject: true })
    if (info.width !== layout.width || info.height !== layout.height || jpeg.length > layout.jpeg.maxBytes) throw new SocialCardError('unavailable')
    return { jpeg, svg, width: 1080, height: 1350, templateVersion: 1, lines }
  } catch (error) {
    if (error instanceof SocialCardError) throw error
    throw new SocialCardError('unavailable')
  }
}
