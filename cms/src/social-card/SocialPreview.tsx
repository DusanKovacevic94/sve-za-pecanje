'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'
import { resolveSocialCardCopy } from './effective-copy'
import { validateSocialCardInput, type SocialCardInput } from './contract'
import './preview.css'

export function SocialPreview() {
  const { id } = useDocumentInfo()
  const title = useFormFields(([fields]) => fields.title?.value as string | undefined)
  const excerpt = useFormFields(([fields]) => fields.excerpt?.value as string | undefined)
  const socialTitle = useFormFields(([fields]) => fields.socialTitle?.value as string | undefined)
  const socialDescription = useFormFields(([fields]) => fields.socialDescription?.value as string | undefined)
  const copy = resolveSocialCardCopy({ title, excerpt, socialTitle, socialDescription })
  const key = JSON.stringify([id, title, excerpt, socialTitle, socialDescription])
  // Remount on every relevant edit: immediately discard stale links/status, cancel
  // the old request and revoke its blob. Reverting text also requires a fresh render.
  return <SocialPreviewPanel key={key} id={id} copy={copy} />
}

function SocialPreviewPanel({ id, copy }: { id?: string | number; copy: SocialCardInput }) {
  const active = useRef<AbortController | null>(null)
  const objectURL = useRef<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; alt: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => () => {
    active.current?.abort()
    active.current = null
    if (objectURL.current) URL.revokeObjectURL(objectURL.current)
    objectURL.current = null
  }, [])

  async function generate() {
    if (!id) return
    active.current?.abort()
    if (objectURL.current) URL.revokeObjectURL(objectURL.current)
    objectURL.current = null
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    setError('')
    setPreview(null)
    const timer = setTimeout(() => controller.abort(), 15_000)
    try {
      const input = validateSocialCardInput(copy)
      const response = await fetch(`/api/social-preview/${encodeURIComponent(id)}`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(typeof data?.message === 'string' ? data.message : 'Slika nije pripremljena. Pokušaj ponovo.')
      }
      const blob = await response.blob()
      if (blob.type !== 'image/jpeg' || blob.size > 1_000_000) throw new Error('Slika nije ispravna. Pokušaj ponovo.')
      if (controller.signal.aborted || active.current !== controller) return
      // Own the URL immediately, even if this component unmounts before React
      // commits the state update below.
      objectURL.current = URL.createObjectURL(blob)
      setPreview({ url: objectURL.current,
        alt: `${input.title}. ${input.description}. Pročitaj ceo tekst na svezapecanje.rs.` })
    } catch (failure) {
      if (active.current === controller) {
        setError(controller.signal.aborted ? 'Generisanje je trajalo predugo. Pokušaj ponovo.' :
          failure instanceof Error ? failure.message : 'Slika nije pripremljena. Pokušaj ponovo.')
      }
    } finally {
      clearTimeout(timer)
      if (active.current === controller) setBusy(false)
    }
  }

  const ready = preview
  return <section className="social-preview" aria-labelledby="social-preview-heading">
    <h3 id="social-preview-heading">Slika za Instagram i Facebook</h3>
    <p>Pregled koristi trenutni naslov i opis iz formulara, uključujući nesačuvane izmene.
      Priprema i preuzimanje slike ne objavljuju niti zakazuju objavu članka ili sadržaja na društvenim mrežama.</p>
    {!id && <p>Prvo sačuvaj nacrt, pa pripremi sliku.</p>}
    <dl><dt>Naslov na slici</dt><dd>{copy.title || 'Unesi naslov.'}</dd>
      <dt>Opis na slici</dt><dd>{copy.description || 'Unesi opis.'}</dd></dl>
    <button type="button" onClick={generate} disabled={!id || busy}>Pripremi sliku</button>
    <p role="status" aria-live="polite">{busy ? 'Priprema slike…' : ready ? 'Slika je spremna. JPEG, 1080 × 1350 px.' :
      !error ? 'Nema aktuelnog pregleda. Pripremi sliku posle svake izmene teksta.' : ''}</p>
    {error && <p role="alert">{error}</p>}
    {ready && <figure>
      {/* Native image intentionally displays the same private blob as the download. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ready.url} alt={ready.alt} width={1080} height={1350} />
      <figcaption>Privatan pregled trenutnog teksta. Pre objavljivanja proveri sliku i članak.</figcaption>
    </figure>}
    {ready ? <a className="social-preview-download" href={ready.url} download={`svezapecanje-blog-${id}.jpg`}>Preuzmi sliku</a> :
      <button type="button" disabled>Preuzmi sliku</button>}
  </section>
}
