import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { authorFixture, fixtureImage, postFixture } from '../src/fixtures'

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
      (version: { id: number; version: { title: string; _status: string } }) =>
        version.version.title === 'Probni urednički vodič' &&
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
