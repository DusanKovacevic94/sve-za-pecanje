import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import {
  authorFixture,
  mediaFixture,
  paragraph,
  postFixture,
} from '../src/fixtures'
import { signPreview, signature, verifyHook } from '../src/blog-signing'
import { blogPreviewURL } from '../src/hooks/blog'
import type { PayloadRequest } from 'payload'
import { uploadMedia } from './media-upload'

const requireFrontend = createRequire(
  new URL('../../frontend/package.json', import.meta.url),
)
// Runtime-only sibling test dependency; CMS image builds remain independent.
const { chromium } = requireFrontend('@playwright/test')

export async function createBlogHarness(cmsURL: string) {
  let failReads = false,
    failHooks = false,
    forwardHooks = false
  const events: string[] = []
  let marketplaceMode:
    'available' | 'empty' | 'outage' | 'listings-outage' | 'missing' =
    'available'
  const category = {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'stapovi',
    name_sr: 'Štapovi',
  }
  const listings = [1, 2, 3].map((id) => ({
    id: `00000000-0000-4000-8000-00000000000${id + 1}`,
    slug: `probni-stap-${id}`,
    title: `Probni štap ${id}`,
    status: 'active',
    category,
    key_attributes: [],
    seller: {
      id: 'seller',
      username: 'probni-prodavac',
      display_name: 'Probni prodavac',
    },
    price_type: 'fixed',
    price_amount: '2500',
    currency: 'RSD',
    city: 'Beograd',
    condition: 'used_good',
    cover_image_url: null,
    is_featured: false,
    created_at: '2026-09-01T12:00:00Z',
  }))
  let frontend: ChildProcess | undefined,
    log = ''
  const relay = createServer(async (req, res) => {
    if (req.url === '/api/blog/revalidate') {
      let body = ''
      for await (const chunk of req) body += chunk
      assert.ok(
        verifyHook(
          body,
          String(req.headers['x-blog-timestamp']),
          String(req.headers['x-blog-signature']),
        ),
      )
      events.push(body)
      if (failHooks) {
        res.writeHead(503).end()
        return
      }
      if (!forwardHooks) {
        res.end('{}')
        return
      }
      const response = await fetch(`${frontendURL}/api/blog/revalidate`, {
        method: 'POST',
        body,
        headers: {
          'x-blog-timestamp': String(req.headers['x-blog-timestamp']),
          'x-blog-signature': String(req.headers['x-blog-signature']),
        },
      })
      res.writeHead(response.status).end(await response.text())
      return
    }
    if (
      req.url?.startsWith('/api/posts') ||
      req.url?.startsWith('/api/blog-preview/')
    ) {
      if (failReads) {
        res.writeHead(503).end('{}')
        return
      }
      const response = await fetch(`${cmsURL}${req.url}`, {
        headers: req.headers.authorization
          ? { Authorization: req.headers.authorization }
          : {},
      })
      res
        .writeHead(response.status, { 'Content-Type': 'application/json' })
        .end(await response.text())
      return
    }
    if (req.url?.includes('/auth/me')) {
      assert.doesNotMatch(
        String(req.headers.cookie || ''),
        /szp-blog-preview|szp-cms-token/,
        'editorial cookies must not be forwarded to the marketplace API',
      )
      res.writeHead(401).end('{}')
      return
    }
    if (
      req.url?.startsWith('/api/v1/categories/') ||
      (req.url?.startsWith('/api/v1/listings?') &&
        new URL(req.url, 'http://localhost').searchParams.get(
          'availability',
        ) === 'available')
    ) {
      assert.equal(
        req.headers.cookie,
        undefined,
        'inventory requests are anonymous',
      )
      assert.equal(req.headers.authorization, undefined)
      if (
        marketplaceMode === 'outage' ||
        (marketplaceMode === 'listings-outage' &&
          req.url.startsWith('/api/v1/listings?'))
      ) {
        res.writeHead(503).end('{}')
        return
      }
      if (req.url.startsWith('/api/v1/categories/')) {
        if (marketplaceMode === 'missing' || !req.url.endsWith('/stapovi')) {
          res.writeHead(404).end('{}')
          return
        }
        res.end(JSON.stringify({ data: category }))
        return
      }
      const params = new URL(req.url, 'http://localhost').searchParams
      assert.equal(params.get('category'), 'stapovi')
      assert.equal(params.get('availability'), 'available')
      assert.equal(params.get('page_size'), '3')
      res.end(
        JSON.stringify({ data: marketplaceMode === 'empty' ? [] : listings }),
      )
      return
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ data: [], meta: { total_pages: 1 } }))
  })
  relay.listen(0, '127.0.0.1')
  await once(relay, 'listening')
  const relayAddress = relay.address()
  assert.ok(relayAddress && typeof relayAddress !== 'string')
  const relayURL = `http://127.0.0.1:${relayAddress.port}`
  const portProbe = createServer()
  portProbe.listen(0, '127.0.0.1')
  await once(portProbe, 'listening')
  const address = portProbe.address()
  assert.ok(address && typeof address !== 'string')
  const frontendURL = `http://127.0.0.1:${address.port}`
  portProbe.close()
  await once(portProbe, 'close')
  Object.assign(process.env, {
    CMS_PREVIEW_SECRET: randomBytes(32).toString('hex'),
    CMS_REVALIDATE_SECRET: randomBytes(32).toString('hex'),
    CMS_FRONTEND_URL: frontendURL,
    CMS_REVALIDATE_URL: `${relayURL}/api/blog/revalidate`,
    CMS_MARKETPLACE_API_URL: `${relayURL}/api/v1`,
  })
  return {
    async close() {
      if (frontend && frontend.exitCode === null) {
        frontend.kill('SIGTERM')
        await once(frontend, 'exit')
      }
      relay.closeAllConnections()
      relay.close()
      await once(relay, 'close')
    },
    async run(cookie: string) {
      const api = async (path: string, method = 'GET', data?: object) => {
        const response = await fetch(`${cmsURL}/api${path}`, {
          method,
          headers: {
            Cookie: cookie,
            Origin: cmsURL,
            'Content-Type': 'application/json',
          },
          ...(data ? { body: JSON.stringify(data) } : {}),
        })
        const text = await response.text()
        assert.ok(response.ok, `${method} ${path}: ${response.status} ${text}`)
        return JSON.parse(text)
      }
      const frontendEnv: NodeJS.ProcessEnv = {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: frontendURL,
        NEXT_PUBLIC_API_URL: `${frontendURL}/api/v1`,
        NEXT_PUBLIC_ANALYTICS_URL: '',
        NEXT_PUBLIC_ANALYTICS_WEBSITE_ID: '',
        NEXT_PUBLIC_SENTRY_DSN: '',
        INTERNAL_API_URL: `${relayURL}/api/v1`,
        CMS_INTERNAL_URL: relayURL,
        BLOG_ANALYTICS_ENABLED: 'true', // Only this isolated synthetic server.
        BLOG_ANALYTICS_EXCLUDED_POST_IDS: '',
      }
      const build = spawn('pnpm', ['build'], {
        cwd: '../frontend',
        env: frontendEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let buildLog = ''
      build.stdout!.on('data', (data) => {
        buildLog += data
      })
      build.stderr!.on('data', (data) => {
        buildLog += data
      })
      assert.equal((await once(build, 'exit'))[0], 0, buildLog)
      frontend = spawn(
        process.execPath,
        [
          'node_modules/next/dist/bin/next',
          'start',
          '--hostname',
          '127.0.0.1',
          '--port',
          String(address.port),
        ],
        {
          cwd: '../frontend',
          env: frontendEnv,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )
      frontend.stdout!.on('data', (data) => {
        log += data
      })
      frontend.stderr!.on('data', (data) => {
        log += data
      })
      for (let i = 0; i < 60; i++) {
        try {
          if ((await fetch(`${frontendURL}/blog`)).ok) break
        } catch {
          /* Starting. */
        }
        if (i === 59) throw new Error(`Frontend failed to start: ${log}`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      forwardHooks = true
      const read = async (path: string, init?: RequestInit) => {
        const response = await fetch(`${frontendURL}${path}`, init)
        return { response, html: await response.text() }
      }
      const author = (
        await api('/authors', 'POST', {
          ...authorFixture,
          name: 'Probni autor bloga',
          internalNotes: 'PRIVATE_AUTHOR',
        })
      ).doc
      const media = await uploadMedia(cmsURL, cookie, {
        ...mediaFixture,
        internalNotes: 'PRIVATE_MEDIA',
      })
      const draft = (
        await api('/posts?draft=true', 'POST', {
          ...postFixture,
          slug: 'blog-provera',
          author: author.id,
          coverImage: media.id,
          _status: 'draft',
        })
      ).doc
      const user = (await api('/users/me')).user
      const handoff = (
        post = String(draft.id),
        exp = Math.floor(Date.now() / 1000) + 60,
      ) =>
        signPreview({ purpose: 'handoff', post, editor: String(user.id), exp })
      const configuredPreview = await blogPreviewURL(draft, {
        req: { user: { ...user, collection: 'users' } } as PayloadRequest,
        locale: 'sr',
        token: null,
      })
      assert.ok(
        configuredPreview?.startsWith(
          `${frontendURL}/blog/preview/start#token=`,
        ),
        'CMS preview action points to the configured site with a fragment-only handoff',
      )
      assert.equal(new URL(configuredPreview!).search, '')
      assert.equal((await read('/blog/blog-provera')).response.status, 404)
      assert.equal((await read('/blog/does-not-exist')).response.status, 404)
      assert.equal(
        (await read(`/blog/preview/${draft.id}`)).response.status,
        404,
      )
      const exchange = (token: string, origin = frontendURL) =>
        read('/blog/preview/session', {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, redirect: 'https://evil.test' }),
        })
      for (const token of [
        '',
        handoff() + 'x',
        handoff(String(draft.id), Math.floor(Date.now() / 1000) - 1),
        handoff('999999999'),
      ])
        assert.ok((await exchange(token)).response.status >= 400)
      assert.equal(
        (await exchange(handoff(), 'https://evil.test')).response.status,
        403,
      )
      const session = await exchange(handoff())
      assert.equal(session.response.status, 200, session.html)
      assert.equal(JSON.parse(session.html).path, `/blog/preview/${draft.id}`)
      const sessionCookie = session.response.headers.get('set-cookie')!
      assert.match(sessionCookie, /HttpOnly/)
      assert.match(sessionCookie, /SameSite=strict/i)
      assert.match(sessionCookie, /Path=\/blog\/preview/)
      assert.doesNotMatch(sessionCookie, /Domain=/)
      const preview = await read(`/blog/preview/${draft.id}`, {
        headers: { Cookie: sessionCookie.split(';')[0] },
      })
      assert.equal(preview.response.status, 200, preview.html.slice(0, 400))
      assert.match(
        preview.response.headers.get('cache-control')!,
        /private.*no-store/,
      )
      assert.match(preview.response.headers.get('x-robots-tag')!, /noindex/)
      assert.match(preview.html, /Pregled nacrta/)
      assert.match(preview.html, /Probni vodič/)
      assert.doesNotMatch(
        preview.html,
        /PRIVATE_|application\/ld\+json|rel="canonical"|property="og:|name="twitter:/,
      )
      assert.equal(
        (
          await read(`/blog/preview/${Number(draft.id) + 1}`, {
            headers: { Cookie: sessionCookie.split(';')[0] },
          })
        ).response.status,
        404,
      )
      const cmsReadToken = signPreview({
        purpose: 'read',
        post: String(draft.id),
        editor: String(user.id),
        exp: Math.floor(Date.now() / 1000) + 30,
      })
      assert.equal(
        (await fetch(`${cmsURL}/api/blog-preview/${draft.id}`)).status,
        401,
      )
      assert.equal(
        (
          await fetch(`${cmsURL}/api/blog-preview/${Number(draft.id) + 1}`, {
            headers: { Authorization: `Bearer ${cmsReadToken}` },
          })
        ).status,
        401,
      )
      const temporaryEditor = (
        await api('/users', 'POST', {
          email: 'preview-revocation@example.test',
          password: randomBytes(24).toString('hex'),
          role: 'editor',
        })
      ).doc
      const editorHandoff = signPreview({
        purpose: 'handoff',
        post: String(draft.id),
        editor: String(temporaryEditor.id),
        exp: Math.floor(Date.now() / 1000) + 60,
      })
      const editorSession = await exchange(editorHandoff)
      assert.equal(editorSession.response.status, 200)
      await api(`/users/${temporaryEditor.id}`, 'DELETE')
      const revoked = await read(`/blog/preview/${draft.id}`, {
        headers: {
          Cookie: editorSession.response.headers
            .get('set-cookie')!
            .split(';')[0],
        },
      })
      assert.ok(
        revoked.response.status >= 400,
        'deleted editor cannot use a previously issued preview session',
      )
      assert.doesNotMatch(revoked.html, /Probni vodič|PRIVATE_/)
      console.log(
        'PASS: real CMS draft preview, scoped sessions, invalid handoffs, private metadata and isolated cookies',
      )

      await api(`/posts/${draft.id}?draft=true`, 'PATCH', {
        marketplaceCategorySlug: 'missing',
        _status: 'draft',
      })
      const publishAttempt = () =>
        fetch(`${cmsURL}/api/posts/${draft.id}`, {
          method: 'PATCH',
          headers: {
            Cookie: cookie,
            Origin: cmsURL,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ _status: 'published' }),
        })
      const invalidCategory = await publishAttempt()
      assert.equal(invalidCategory.status, 400)
      assert.match(
        await invalidCategory.text(),
        /does not exist or is inactive/,
      )
      marketplaceMode = 'outage'
      await api(`/posts/${draft.id}?draft=true`, 'PATCH', {
        marketplaceCategorySlug: 'stapovi',
        _status: 'draft',
      })
      const categoryOutage = await publishAttempt()
      assert.equal(categoryOutage.status, 400)
      assert.match(await categoryOutage.text(), /draft can still be saved/)
      marketplaceMode = 'available'
      await api(`/posts/${draft.id}`, 'PATCH', {
        marketplaceCategorySlug: 'stapovi',
        _status: 'published',
      })
      const publicPaths = ['/blog', '/blog/blog-provera', '/blog/sitemap.xml']
      for (const path of publicPaths) {
        const result = await read(path)
        assert.equal(
          result.response.status,
          200,
          `${path}: ${result.html.slice(0, 300)}`,
        )
        assert.match(result.html, /blog-provera/)
        assert.doesNotMatch(result.html, /PRIVATE_|Pregled nacrta/)
        assert.match(result.response.headers.get('cache-control')!, /no-store/)
      }
      const html = (await read('/blog/blog-provera')).html
      assert.match(html, /application\/ld\+json/)
      assert.match(html, /BlogPosting/)
      assert.match(html, /BreadcrumbList/)
      assert.match(html, /č ć ž š đ/)
      assert.match(
        html,
        new RegExp(`rel="canonical" href="${frontendURL}/blog/blog-provera"`),
      )
      for (const path of [
        '/blog?page=0',
        '/blog?page=1001',
        '/blog?page=2',
        '/blog?page=1&page=2',
      ])
        assert.equal((await read(path)).response.status, 404)
      const firstPageRedirect = await read('/blog?page=1', {
        redirect: 'manual',
      })
      assert.equal(firstPageRedirect.response.status, 308)
      assert.equal(
        new URL(
          firstPageRedirect.response.headers.get('location')!,
          frontendURL,
        ).pathname,
        '/blog',
      )
      const beforeDraft = events.length
      const sitemapBeforeDraft = (await read('/blog/sitemap.xml')).html
      await api(`/posts/${draft.id}?draft=true&autosave=true`, 'PATCH', {
        title: 'PRIVATE_DRAFT_REVISION',
        body: paragraph('PRIVATE_DRAFT_BODY'),
        _status: 'draft',
      })
      assert.equal(
        events.length,
        beforeDraft,
        'draft saves do not invalidate live content',
      )
      assert.equal(
        (await read('/blog/sitemap.xml')).html,
        sitemapBeforeDraft,
        'autosave does not change public sitemap timestamps',
      )
      for (const path of publicPaths)
        assert.doesNotMatch((await read(path)).html, /PRIVATE_/)
      assert.match(
        (
          await read(`/blog/preview/${draft.id}`, {
            headers: { Cookie: sessionCookie.split(';')[0] },
          })
        ).html,
        /PRIVATE_DRAFT_REVISION/,
      )
      const beforeUpdate = events.length
      const body = paragraph('Javni dopunjeni tekst: č ć ž š đ.')
      const richBody = {
        root: {
          ...body.root,
          children: [
            ...body.root.children,
            {
              type: 'heading',
              tag: 'h2',
              version: 1,
              children: paragraph('Na šta da obratite pažnju').root.children[0]
                .children,
            },
            {
              type: 'paragraph',
              version: 1,
              children: [
                {
                  type: 'text',
                  version: 1,
                  text: 'Proverite stanje opreme. ',
                  format: 3,
                },
                {
                  type: 'link',
                  version: 1,
                  fields: { linkType: 'custom', url: '/saveti-za-bezbednost' },
                  children: paragraph('Saveti za bezbednu kupovinu').root
                    .children[0].children,
                },
              ],
            },
            {
              type: 'list',
              listType: 'bullet',
              tag: 'ul',
              version: 1,
              children: [
                {
                  type: 'listitem',
                  version: 1,
                  children: paragraph('Pregledajte štap i mašinicu.').root
                    .children[0].children,
                },
              ],
            },
            {
              type: 'quote',
              version: 1,
              children: paragraph(
                'Probni citat za proveru prikaza, bez tvrdnje o autorstvu.',
              ).root.children[0].children,
            },
            {
              type: 'block',
              version: 2,
              fields: {
                blockType: 'image',
                image: media.id,
                caption: 'Detalj probne fotografije u tekstu.',
              },
            },
          ],
        },
      }
      await api(`/posts/${draft.id}`, 'PATCH', {
        title: 'Dopunjeni probni vodič',
        body: richBody,
        _status: 'published',
      })
      assert.ok(events.length > beforeUpdate)
      assert.match(
        (await read('/blog/blog-provera')).html,
        /Dopunjeni probni vodič/,
      )
      await api(`/authors/${author.id}`, 'PATCH', { name: 'Dopunjeni autor' })
      assert.match((await read('/blog/blog-provera')).html, /Dopunjeni autor/)
      await api(`/media/${media.id}`, 'PATCH', {
        caption: 'Dopunjeni opis fotografije.',
      })
      assert.match(
        (await read('/blog/blog-provera')).html,
        /Dopunjeni opis fotografije/,
      )
      const hookBody = events.at(-1)!,
        timestamp = String(Date.now())
      const hook = (mac: string) =>
        read('/api/blog/revalidate', {
          method: 'POST',
          body: hookBody,
          headers: { 'x-blog-timestamp': timestamp, 'x-blog-signature': mac },
        })
      assert.equal((await hook('invalid')).response.status, 401)
      for (let i = 0; i < 2; i++)
        assert.equal(
          (
            await hook(
              signature(`${timestamp}.${hookBody}`, 'CMS_REVALIDATE_SECRET'),
            )
          ).response.status,
          200,
        )
      console.log(
        'PASS: production HTML/SEO/sitemap, draft isolation, signed change hooks, author/media updates and duplicates',
      )

      const browser = await chromium.launch({ headless: true })
      try {
        const context = await browser.newContext(),
          page = await context.newPage()
        let automatedEvents = 0
        context.on('request', (request: { url(): string }) => {
          if (request.url().endsWith('/analytics/events')) automatedEvents++
        })
        context.setDefaultTimeout(15_000)
        context.setDefaultNavigationTimeout(15_000)
        const artifactDir = new URL(
          '../../frontend/test-results/blog/',
          import.meta.url,
        )
        await mkdir(artifactDir, { recursive: true })
        for (const width of [320, 1280]) {
          await page.setViewportSize({ width, height: 900 })
          await page.goto(`${frontendURL}/blog/blog-provera`)
          await page.locator('main article h1').waitFor()
          assert.equal(
            await page
              .locator('[data-blog-marketplace] [data-listing-card]')
              .count(),
            3,
          )
          assert.equal(
            await page
              .locator('[data-blog-marketplace] a[href="/kategorije/stapovi"]')
              .count(),
            1,
          )
          await page.locator('main img').first().waitFor()
          assert.equal(
            await page
              .locator('main h2')
              .filter({ hasText: 'Na šta da obratite pažnju' })
              .count(),
            1,
          )
          assert.equal(await page.locator('main strong em').count(), 0) // Renderer nests strong inside em.
          assert.equal(await page.locator('main em strong').count(), 1)
          assert.equal(await page.locator('main blockquote').count(), 1)
          await page.waitForFunction(() =>
            [...document.querySelectorAll('main img')].every(
              (img) =>
                (img as HTMLImageElement).complete &&
                (img as HTMLImageElement).naturalWidth > 0,
            ),
          )
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
            `article fits ${width}px`,
          )
          await page.screenshot({
            path: new URL(`article-${width}.png`, artifactDir).pathname,
            fullPage: true,
          })
          await page.goto(`${frontendURL}/blog`)
          await page.locator('main article h1').waitFor()
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
            `index fits ${width}px`,
          )
          await page.screenshot({
            path: new URL(`index-${width}.png`, artifactDir).pathname,
            fullPage: true,
          })
        }
        // Browser zoom halves the CSS viewport and doubles pixel density. CSS
        // style.zoom is not equivalent: it does not change media queries.
        const zoomContext = await browser.newContext({
          viewport: { width: 640, height: 450 },
          deviceScaleFactor: 2,
        })
        zoomContext.setDefaultTimeout(15_000)
        const zoomPage = await zoomContext.newPage()
        await zoomPage.goto(`${frontendURL}/blog/blog-provera`)
        await zoomPage.locator('main article h1').waitFor()
        assert.ok(
          await zoomPage.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          '200% browser-zoom equivalent fits viewport',
        )
        await zoomPage.screenshot({
          path: new URL('article-zoom-200.png', artifactDir).pathname,
          fullPage: true,
        })
        await zoomContext.close()
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(`${frontendURL}/blog/blog-provera`)
        await page.locator('main article h1').waitFor()
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%'
        })
        const textDimensions = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        }))
        assert.ok(
          textDimensions.scroll <= textDimensions.viewport,
          `200% text fits viewport: ${JSON.stringify(textDimensions)}`,
        )
        await page.screenshot({
          path: new URL('article-text-200.png', artifactDir).pathname,
          fullPage: true,
        })
        await page.evaluate(() => {
          document.documentElement.style.fontSize = ''
        })
        await page.keyboard.press('Tab')
        assert.equal(
          await page.evaluate(() =>
            document.activeElement?.textContent?.trim(),
          ),
          'Preskoči na sadržaj',
        )
        assert.notEqual(
          await page.evaluate(
            () => getComputedStyle(document.activeElement!).outlineStyle,
          ),
          'none',
        )
        const previewURL = await blogPreviewURL(draft, {
          req: { user: { ...user, collection: 'users' } } as PayloadRequest,
          locale: 'sr',
          token: null,
        })
        await page.goto(previewURL!)
        await page.waitForURL(`${frontendURL}/blog/preview/${draft.id}`)
        await page.locator('main article h1').waitFor()
        assert.equal(new URL(page.url()).hash, '')
        assert.match(await page.locator('main').innerText(), /Pregled nacrta/)
        await page.screenshot({
          path: new URL('preview.png', artifactDir).pathname,
          fullPage: true,
        })
        const stranger = await browser.newContext(),
          strangerPage = await stranger.newPage()
        assert.equal(
          (await strangerPage.goto(
            `${frontendURL}/blog/preview/${draft.id}`,
          ))!.status(),
          404,
        )
        await stranger.close()
        await page.getByRole('button', { name: 'Završi pregled' }).click()
        await page.waitForURL(`${frontendURL}/blog`)
        assert.ok(
          !(await context.cookies()).some(
            (item: { name: string }) => item.name === 'szp-blog-preview',
          ),
        )
        await api(`/posts/${draft.id}`, 'PATCH', {
          title: 'Štap'.repeat(40),
          _status: 'published',
        })
        await page.setViewportSize({ width: 320, height: 900 })
        await page.goto(`${frontendURL}/blog/blog-provera`)
        await page.locator('main article h1').waitFor()
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          'long title fits 320px',
        )
        await page.screenshot({
          path: new URL('long-title-320.png', artifactDir).pathname,
          fullPage: true,
        })
        // Privacy changes can make an optional relationship unavailable after
        // publication; the public renderer must not expose its private metadata.
        await api(`/media/${media.id}`, 'PATCH', { isPublic: false })
        await page.goto(`${frontendURL}/blog/blog-provera`)
        await page.locator('main article h1').waitFor()
        assert.equal(await page.locator('main img').count(), 0)
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          'missing image fits 320px',
        )
        await page.screenshot({
          path: new URL('missing-image-320.png', artifactDir).pathname,
          fullPage: true,
        })
        await api(`/media/${media.id}`, 'PATCH', { isPublic: true })
        await api(`/posts/${draft.id}`, 'PATCH', {
          title: 'Dopunjeni probni vodič',
          _status: 'published',
        })
        for (const mode of [
          'empty',
          'outage',
          'listings-outage',
          'missing',
        ] as const) {
          marketplaceMode = mode
          const response = await page.goto(`${frontendURL}/blog/blog-provera`)
          assert.equal(response!.status(), 200)
          await page.locator('main article h1').waitFor()
          assert.equal(
            await page
              .locator('[data-blog-marketplace] [data-listing-card]')
              .count(),
            0,
          )
          assert.match(
            await page.locator('[data-blog-marketplace]').innerText(),
            mode === 'empty'
              ? /Trenutno nema dostupnih/
              : /trenutno nisu dostupni/,
          )
          assert.equal(
            await page.locator('[data-blog-marketplace] a').count(),
            mode === 'empty' || mode === 'listings-outage' ? 1 : 0,
          )
          await page.screenshot({
            path: new URL(`inventory-${mode}-320.png`, artifactDir).pathname,
            fullPage: true,
          })
        }
        marketplaceMode = 'available'

        assert.equal(
          automatedEvents,
          0,
          'ordinary webdriver fixture runs emit no analytics',
        )
        // Controlled collection: local interception only; never send test events externally.
        const trackingContext = await browser.newContext()
        // String source avoids tsx/esbuild's __name helper leaking into browser serialization.
        await trackingContext.addInitScript(`
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          Object.defineProperty(navigator, 'doNotTrack', { get: () => location.search.includes('dnt') ? '1' : null });
          Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => location.search.includes('gpc') });
        `)
        const trackingPage = await trackingContext.newPage()
        const trackingErrors: string[] = []
        trackingPage.on('pageerror', (error: Error) =>
          trackingErrors.push(error.message),
        )
        const analytics: Array<{
          event_name: string
          properties: { post_id: string; view_id: string; target_id?: string }
        }> = []
        await trackingContext.route(
          '**/analytics/events',
          async (route: {
            request(): {
              method(): string
              headers(): Record<string, string>
              postDataJSON(): (typeof analytics)[number]
            }
            fulfill(options: unknown): Promise<void>
          }) => {
            const request = route.request()
            if (request.method() === 'POST') {
              assert.equal(request.headers()['cookie'], undefined)
              assert.equal(request.headers()['referer'], undefined)
              analytics.push(request.postDataJSON())
            }
            await route.fulfill({
              status: 200,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
              },
              json: { data: { tracked: true } },
            })
          },
        )
        await trackingPage.goto(`${frontendURL}/blog/blog-provera`)
        await trackingPage.locator('main article h1').waitFor()
        await trackingPage.waitForFunction(
          () => document.visibilityState === 'visible',
        )
        for (let attempt = 0; analytics.length < 1 && attempt < 50; attempt++)
          await new Promise((resolve) => setTimeout(resolve, 100))
        assert.equal(
          analytics.length,
          1,
          `one public document emits one view; ${JSON.stringify(trackingErrors)}`,
        )
        // Keep the page mounted while exercising real pointer/keyboard handlers.
        await trackingPage.evaluate(() =>
          document.addEventListener(
            'click',
            (event) => event.preventDefault(),
            { capture: true },
          ),
        )
        const categoryLink = trackingPage.locator(
          '[data-blog-marketplace] a[href="/kategorije/stapovi"]',
        )
        await categoryLink.focus()
        await trackingPage.keyboard.press('Enter')
        await categoryLink.click()
        await trackingPage
          .locator('[data-blog-marketplace] a[href="/oglasi/probni-stap-1"]')
          .first()
          .click()
        await trackingPage
          .locator('[data-blog-marketplace] a[href="/oglasi/probni-stap-1"]')
          .last()
          .click()
        for (let attempt = 0; analytics.length < 3 && attempt < 50; attempt++)
          await new Promise((resolve) => setTimeout(resolve, 100))
        assert.deepEqual(
          analytics.map((row) => row.event_name),
          ['blog_viewed', 'blog_category_clicked', 'blog_listing_clicked'],
        )
        assert.ok(
          analytics.every((row) => row.properties.post_id === String(draft.id)),
          'stable CMS ID used',
        )
        assert.equal(
          new Set(analytics.map((row) => row.properties.view_id)).size,
          1,
        )
        assert.equal(
          await trackingPage.evaluate(() =>
            localStorage.getItem('szp_marketplace_anonymous_id'),
          ),
          null,
        )
        const countBeforePreview = analytics.length
        await trackingPage.goto(
          (await blogPreviewURL(draft, {
            req: { user: { ...user, collection: 'users' } } as PayloadRequest,
            locale: 'sr',
            token: null,
          }))!,
        )
        await trackingPage.waitForURL(`${frontendURL}/blog/preview/${draft.id}`)
        await trackingPage.locator('[data-blog-marketplace]').waitFor()
        assert.equal(
          analytics.length,
          countBeforePreview,
          'preview emits no blog events',
        )
        const fixture = (
          await api('/posts', 'POST', {
            ...postFixture,
            slug: 'probni-analytics-excluded',
            author: author.id,
            coverImage: media.id,
            _status: 'published',
          })
        ).doc
        await trackingPage.goto(`${frontendURL}/blog/${fixture.slug}`)
        await trackingPage.locator('main article h1').waitFor()
        assert.equal(
          analytics.length,
          countBeforePreview,
          'reserved probni- fixtures emit no blog events',
        )
        await api(`/posts/${fixture.id}`, 'DELETE')
        for (const privacy of ['dnt', 'gpc']) {
          await trackingPage.goto(
            `${frontendURL}/blog/blog-provera?privacy=${privacy}`,
          )
          await trackingPage.locator('main article h1').waitFor()
          await trackingPage.waitForLoadState('networkidle')
          assert.equal(
            analytics.length,
            countBeforePreview,
            `${privacy} suppresses collection`,
          )
        }
        assert.deepEqual(trackingErrors, [])
        await trackingContext.close()
        console.log(
          'PASS: category validation, available/empty/outage inventory, keyboard and pointer analytics, dedupe, fixture and preview exclusion',
        )
        await context.close()
      } finally {
        await browser.close()
      }
      console.log(
        'PASS: mobile/desktop images, overflow, 200% zoom, keyboard focus, fragment handoff, browser isolation and exit',
      )

      // Warm every surface, fail all delivery attempts, then withdraw. There is no
      // stale-on-error or SWR escape hatch: each subsequent request checks CMS.
      for (const path of publicPaths) await read(path)
      failHooks = true
      const withdrawnAt = Date.now()
      await api(`/posts/${draft.id}`, 'PATCH', { _status: 'draft' })
      assert.equal((await read('/blog/blog-provera')).response.status, 404)
      for (const path of ['/blog', '/blog/sitemap.xml'])
        assert.doesNotMatch((await read(path)).html, /blog-provera/)
      assert.ok(Date.now() - withdrawnAt < 60_000)
      await api(`/posts/${draft.id}`, 'PATCH', { _status: 'published' })
      for (const path of publicPaths)
        assert.match((await read(path)).html, /blog-provera/)
      failReads = true
      assert.ok((await read('/blog/blog-provera')).response.status >= 500)
      assert.ok((await read('/blog')).response.status >= 500)
      assert.equal((await read('/blog/sitemap.xml')).response.status, 503)
      assert.equal((await read('/sitemap.xml')).response.status, 200)
      assert.equal((await read('/o-nama')).response.status, 200)
      failReads = false
      failHooks = false
      assert.equal((await read('/blog/blog-provera')).response.status, 200)
      await api(`/posts/${draft.id}`, 'DELETE')
      assert.equal((await read('/blog/blog-provera')).response.status, 404)
      assert.doesNotMatch(
        (await read('/blog/sitemap.xml')).html,
        /blog-provera/,
      )
      const paginatedIDs: number[] = []
      for (let index = 0; index < 13; index++) {
        const post = (
          await api('/posts', 'POST', {
            ...postFixture,
            slug: index === 0 ? 'preview-opreme' : `blog-stranica-${index}`,
            title: `Probni članak ${index + 1}`,
            author: author.id,
            coverImage: media.id,
            _status: 'published',
          })
        ).doc
        paginatedIDs.push(post.id)
      }
      const paginated = await read('/blog?page=2')
      assert.equal(
        (await read('/blog/preview-opreme')).response.status,
        200,
        'only the exact preview path is reserved, not ordinary slug prefixes',
      )
      assert.equal(paginated.response.status, 200)
      assert.match(paginated.html, /name="robots" content="noindex, follow"/)
      assert.match(
        paginated.html,
        /rel="canonical" href="[^" ]*\/blog\?page=2"/,
      )
      for (const id of paginatedIDs) await api(`/posts/${id}`, 'DELETE')
      if (process.env.CMS_TEST_SCOPE === 'blog')
        assert.match((await read('/blog')).html, /Još nema objavljenih članaka/)
      console.log(
        'PASS: missed-hook withdrawal/republication, CMS outage fail-closed, recovery, deletion and marketplace isolation',
      )
    },
  }
}
