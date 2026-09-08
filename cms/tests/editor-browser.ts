import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile } from 'node:fs/promises'
import { authorFixture, fixtureImage, postFixture } from '../src/fixtures'
import { forbiddenSocialRequest } from './social-network-policy'

const { chromium, expect } = createRequire(
  new URL('../../frontend/package.json', import.meta.url),
)('@playwright/test')

// Invoked only by the owned PostgreSQL/MinIO + production frontend/CMS harness.
export async function editorBrowserChecks(
  cmsURL: string,
  frontendURL: string,
  adminCookie: string,
) {
  const api = async (resource: string, method = 'GET', data?: object) => {
    const response = await fetch(`${cmsURL}/api${resource}`, {
      method,
      headers: {
        Cookie: adminCookie,
        Origin: cmsURL,
        'Content-Type': 'application/json',
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    })
    assert.ok(
      response.ok,
      `${method} ${resource}: ${response.status} ${await response.clone().text()}`,
    )
    return response.json()
  }
  const password = randomBytes(24).toString('hex')
  const user = (
    await api('/users', 'POST', {
      email: 'browser-editor@example.test',
      password,
      role: 'editor',
    })
  ).doc
  const author = (
    await api('/authors', 'POST', {
      ...authorFixture,
      name: 'Probni autor za urednika',
    })
  ).doc
  const artifacts = new URL(
    '../../frontend/test-results/blog-editor/',
    import.meta.url,
  )
  await mkdir(artifacts, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  })
  const page = await context.newPage()
  const browserErrors: string[] = []
  context.on('page', (openedPage: typeof page) => {
    openedPage.on('pageerror', (error: Error) => browserErrors.push(error.message))
  })
  context.setDefaultTimeout(15000)
  let mediaID: number | undefined, postID: number | undefined
  try {
    await page.goto(`${cmsURL}/admin/login`)
    await page.locator('#field-email').fill(user.email)
    await page.locator('#field-password').fill(password)
    await page.getByRole('button', { name: 'Login', exact: true }).click()
    await page.waitForURL(`${cmsURL}/admin`)
    await page.goto(`${cmsURL}/admin/collections/media/create`)
    const image = await fixtureImage()
    await page
      .locator('input[type=file]')
      .setInputFiles({
        name: 'editor-fixture.png',
        mimeType: 'image/png',
        buffer: image.data,
      })
    await page
      .locator('#field-alt')
      .fill('Probna fotografija uredničkog vodiča')
    await page.locator('#field-credit').fill('Lokalni test — nije za objavu')
    await page.locator('#field-isPublic').check()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForURL(/\/admin\/collections\/media\/\d+$/)
    mediaID = Number(new URL(page.url()).pathname.split('/').at(-1))
    // Relationship fixtures avoid coupling the journey to Payload's combobox internals;
    // the image upload, saved draft, body editing and publishing below use the real UI.
    const draft = (
      await api('/posts?draft=true', 'POST', {
        ...postFixture,
        slug: 'probni-urednicki-vodic',
        author: author.id,
        coverImage: mediaID,
        marketplaceCategorySlug: 'stapovi',
        _status: 'draft',
      })
    ).doc
    postID = draft.id
    await page.goto(`${cmsURL}/admin/collections/posts/${postID}`)
    await page.locator('#field-title').fill('Probni urednički vodič')
    await page.getByLabel('Naslov za društvene mreže', { exact: true }).fill('Kraći naslov za mreže')
    await page.getByLabel('Opis za društvene mreže', { exact: true }).fill('Privatan opis za sliku: č ć ž š đ.')
    await expect.poll(async () => (await api(`/posts/${postID}?draft=true`)).socialTitle).toBe('Kraći naslov za mreže')
    await expect.poll(async () => (await api(`/posts/${postID}?draft=true`)).socialDescription).toBe('Privatan opis za sliku: č ć ž š đ.')
    await page
      .locator('[contenteditable=true]')
      .first()
      .fill('Proverite stanje štapa i mašinice pre kupovine.')
    await expect
      .poll(async () => (await api(`/posts/${postID}?draft=true`)).title)
      .toBe('Probni urednički vodič')
    await expect
      .poll(async () => JSON.stringify((await api(`/posts/${postID}?draft=true`)).body))
      .toContain('Proverite stanje štapa i mašinice pre kupovine.')
    await page.reload()
    await expect(page.getByLabel('Naslov za društvene mreže', { exact: true })).toHaveValue('Kraći naslov za mreže')
    await expect(page.getByLabel('Opis za društvene mreže', { exact: true })).toHaveValue('Privatan opis za sliku: č ć ž š đ.')
    await page.getByLabel('Naslov za društvene mreže', { exact: true }).focus()
    await expect(page.getByLabel('Naslov za društvene mreže', { exact: true })).toBeFocused()
    await page.screenshot({ path: new URL('social-copy-fields.png', artifacts).pathname, fullPage: true })
    await expect(page.locator('#field-title')).toHaveValue(
      'Probni urednički vodič',
    )
    await expect(page.locator('[contenteditable=true]').first()).toHaveText(
      'Proverite stanje štapa i mašinice pre kupovine.',
    )
    await page.screenshot({
      path: new URL('saved-draft.png', artifacts).pathname,
      fullPage: true,
    })
    const social = page.getByRole('region', { name: 'Slika za Instagram i Facebook' })
    // Payload coalesces successive autosaves. Create an explicit draft checkpoint
    // fixture so the later real Versions UI tests recovery of these known overrides,
    // not the unsupported assumption that every intermediate autosave is retained.
    await api(`/posts/${postID}?draft=true`, 'PATCH', {
      title: 'Probni urednički vodič', socialTitle: 'Kraći naslov za mreže',
      socialDescription: 'Privatan opis za sliku: č ć ž š đ.',
    })
    const generate = social.getByRole('button', { name: 'Pripremi sliku', exact: true })
    const endpoint = `${cmsURL}/api/social-preview/${postID}`
    const forbiddenSocialRequests: string[] = []
    const socialNetworkGuard = async (route: { request: () => { url: () => string; method: () => string }; abort: () => Promise<void>; continue: () => Promise<void> }) => {
      const request = route.request()
      const url = new URL(request.url())
      if (forbiddenSocialRequest(url, request.method(), cmsURL)) {
        forbiddenSocialRequests.push(`${request.method()} ${url.origin}${url.pathname}`)
        await route.abort()
      } else await route.continue()
    }
    await page.route('**/*', socialNetworkGuard)
    await generate.click()
    const download = social.getByRole('link', { name: 'Preuzmi sliku', exact: true })
    await expect(download).toBeVisible()
    const imageURL = await social.locator('img').getAttribute('src')
    assert.equal(await download.getAttribute('href'), imageURL, 'display and download use exactly one blob')
    const previewBytes = await page.evaluate(async (url: string) => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), imageURL)
    const downloadEvent = page.waitForEvent('download')
    await download.focus()
    await page.keyboard.press('Enter')
    const downloaded = await downloadEvent
    assert.deepEqual(await readFile(await downloaded.path()), Buffer.from(previewBytes))
    assert.match(downloaded.suggestedFilename(), /^svezapecanje-blog-\d+\.jpg$/)
    assert.equal((await api(`/posts/${postID}?draft=true`))._status, 'draft')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: new URL('social-preview-desktop.png', artifacts).pathname, fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: new URL('social-preview-mobile.png', artifacts).pathname, fullPage: true })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'social panel has no mobile overflow')
    await page.setViewportSize({ width: 1440, height: 1000 })

    // Freeze autosaves so the server still holds the old copy when rendering the form.
    const postRoute = `**/api/posts/${postID}?*`
    await page.route(postRoute, (route: { request: () => { method: () => string }; abort: () => Promise<void>; continue: () => Promise<void> }) =>
      route.request().method() === 'PATCH' ? route.abort() : route.continue())
    await page.getByLabel('Naslov za društvene mreže', { exact: true }).fill('Nesačuvan naslov')
    await expect(social.getByRole('button', { name: 'Preuzmi sliku', exact: true })).toBeDisabled()
    assert.equal(await page.evaluate(async (url: string) => { try { await fetch(url); return false } catch { return true } }, imageURL), true, 'stale blob is revoked')
    const unsavedRequest = page.waitForRequest(endpoint)
    await generate.click()
    assert.equal((await unsavedRequest).postDataJSON().title, 'Nesačuvan naslov')
    await expect(download).toBeVisible()
    assert.equal((await api(`/posts/${postID}?draft=true`)).socialTitle, 'Kraći naslov za mreže')
    await page.unroute(postRoute)

    // Hold an older response, edit again, and prove it cannot replace a newer image.
    let releaseOld!: () => void
    let oldStarted!: () => void
    let oldFinished!: () => void
    const started = new Promise<void>(resolve => { oldStarted = resolve })
    const finished = new Promise<void>(resolve => { oldFinished = resolve })
    const release = new Promise<void>(resolve => { releaseOld = resolve })
    await page.route(endpoint, async (route: { fulfill: (response: object) => Promise<void> }) => {
      oldStarted()
      await release
      await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from(previewBytes) }).catch(() => undefined)
      oldFinished()
    }, { times: 1 })
    await generate.click()
    await started
    await expect(social.getByRole('status')).toHaveText('Priprema slike…')
    await page.getByLabel('Naslov za društvene mreže', { exact: true }).fill('Novi naslov')
    await generate.click()
    await expect(download).toBeVisible()
    const newest = await download.getAttribute('href')
    releaseOld()
    await finished
    await expect(download).toHaveAttribute('href', newest)
    await expect(social.locator('img')).toHaveAttribute('alt', /Novi naslov/)

    await page.getByLabel('Naslov za društvene mreže', { exact: true }).fill('W'.repeat(100))
    await generate.click()
    await expect(social.getByRole('alert')).toContainText('Skrati naslov ili opis')
    await expect(social.getByRole('button', { name: 'Preuzmi sliku', exact: true })).toBeDisabled()
    await page.getByLabel('Naslov za društvene mreže', { exact: true }).fill('Kraći naslov za mreže')
    await page.route(endpoint, (route: { fulfill: (response: object) => Promise<void> }) => route.fulfill({
      status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Slika trenutno ne može da se pripremi. Pokušaj ponovo.' }),
    }), { times: 1 })
    await generate.click()
    await expect(social.getByRole('alert')).toContainText('Pokušaj ponovo')
    await generate.click()
    await expect(download).toBeVisible()
    await page.getByLabel('Naslov za društvene mreže', { exact: true }).fill('')
    await page.getByLabel('Opis za društvene mreže', { exact: true }).fill('')
    await expect(social.getByRole('button', { name: 'Preuzmi sliku', exact: true })).toBeDisabled()
    await expect(social.locator('dd').nth(0)).toHaveText('Probni urednički vodič')
    await expect(social.locator('dd').nth(1)).toHaveText(postFixture.excerpt)
    await generate.click()
    await expect(download).toBeVisible()
    await expect(social.locator('img')).toHaveAttribute('alt', /Probni urednički vodič/)
    await expect.poll(async () => (await api(`/posts/${postID}?draft=true`)).socialTitle).toBeNull()
    await expect.poll(async () => (await api(`/posts/${postID}?draft=true`)).socialDescription).toBeNull()
    assert.deepEqual(forbiddenSocialRequests, [], 'no public upload, analytics or external/Meta request during social preparation')
    await page.unroute('**/*', socialNetworkGuard)
    console.log('PASS: social preview/download identical bytes, unsaved form copy, stale blob cleanup, race protection, overflow/retry, cleared fallbacks, mobile/keyboard controls and no external/upload/analytics requests')
    const popup = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Preview', exact: true }).click()
    const preview = await popup
    await preview.waitForURL(`${frontendURL}/blog/preview/${postID}`)
    await expect(preview.locator('main h1')).toHaveText(
      'Probni urednički vodič',
    )
    await expect(
      preview.getByRole('complementary', {
        name: 'Pregled nacrta',
        exact: true,
      }),
    ).toBeVisible()
    assert.equal(
      (await fetch(`${frontendURL}/blog/probni-urednicki-vodic`)).status,
      404,
    )
    await preview.close()
    await page
      .getByRole('button', { name: 'Publish changes', exact: true })
      .click()
    await expect
      .poll(
        async () =>
          (await fetch(`${frontendURL}/blog/probni-urednicki-vodic`)).status,
      )
      .toBe(200)
    const publicPage = await context.newPage()
    await publicPage.goto(`${frontendURL}/blog/probni-urednicki-vodic`)
    assert.doesNotMatch(await publicPage.content(), /Kraći naslov za mreže|Privatan opis za sliku|socialTitle|socialDescription/)
    const category = publicPage.locator(
      '[data-blog-marketplace] a[href="/kategorije/stapovi"]',
    )
    await category.scrollIntoViewIfNeeded()
    await category.focus()
    await expect(category).toBeFocused()
    await Promise.all([
      publicPage.waitForURL(`${frontendURL}/kategorije/stapovi`),
      publicPage.keyboard.press('Enter'),
    ])
    await expect(publicPage.locator('main h1')).toHaveText('Štapovi')
    await publicPage.close()
    await page.locator('#field-title').fill('Privatna dopuna uredničkog vodiča')
    await expect
      .poll(async () => (await api(`/posts/${postID}?draft=true`)).title)
      .toBe('Privatna dopuna uredničkog vodiča')
    assert.doesNotMatch(
      await (await fetch(`${frontendURL}/blog/probni-urednicki-vodic`)).text(),
      /Privatna dopuna/,
    )
    await page.reload()
    await expect(page.locator('#field-title')).toHaveValue(
      'Privatna dopuna uredničkog vodiča',
    )
    await page.locator('.doc-controls__popup button').first().click()
    await page.getByRole('button', { name: 'Unpublish', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect
      .poll(
        async () =>
          (await fetch(`${frontendURL}/blog/probni-urednicki-vodic`)).status,
      )
      .toBe(404)
    const versions = (
      await api(`/posts/versions?where[parent][equals]=${postID}&limit=50`)
    ).docs
    const savedVersion = versions.find(
      (version: { id: number; version: { title: string; _status: string; socialTitle?: string } }) =>
        version.version.title === 'Probni urednički vodič' &&
        version.version.socialTitle === 'Kraći naslov za mreže' &&
        version.version._status === 'draft',
    )
    assert.ok(savedVersion, 'saved draft is present in version history')
    await page.getByRole('link', { name: /^Versions/ }).click()
    await page.locator(`a[href$="/versions/${savedVersion.id}"]`).click()
    await page
      .getByRole('button', { name: 'Restore this version', exact: true })
      .click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await page.waitForURL(`${cmsURL}/admin/collections/posts/${postID}`)
    await expect(page.locator('#field-title')).toHaveValue(
      'Probni urednički vodič',
    )
    await expect(page.getByLabel('Naslov za društvene mreže', { exact: true })).toHaveValue('Kraći naslov za mreže')
    await expect(page.getByLabel('Opis za društvene mreže', { exact: true })).toHaveValue('Privatan opis za sliku: č ć ž š đ.')
    await expect(social.getByRole('button', { name: 'Preuzmi sliku', exact: true })).toBeDisabled()
    assert.equal(
      (await fetch(`${frontendURL}/blog/probni-urednicki-vodic`)).status,
      404,
      'restoring a draft does not republish a withdrawn article',
    )
    console.log(
      'PASS: editor browser login, upload, autosave/reload, preview, publication, keyboard inventory navigation, private revision, withdrawal and version recovery',
    )
  } catch (error) {
    console.error('Editor journey browser errors:', browserErrors)
    await page
      .screenshot({
        path: new URL('failure.png', artifacts).pathname,
        fullPage: true,
      })
      .catch(() => undefined)
    console.error(
      'Editor browser page:',
      page.url(),
      await page.locator('body').innerText(),
    )
    throw error
  } finally {
    await browser.close()
    if (postID) await api(`/posts/${postID}`, 'DELETE')
    if (mediaID) await api(`/media/${mediaID}`, 'DELETE')
    await api(`/authors/${author.id}`, 'DELETE')
    await api(`/users/${user.id}`, 'DELETE')
  }
}
