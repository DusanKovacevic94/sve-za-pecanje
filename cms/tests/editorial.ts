import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { authorFixture, mediaFixture, paragraph, postFixture } from '../src/fixtures'
import { uploadMedia } from './media-upload'
import { resolveSocialCardCopy } from '../src/social-card/copy'
import { validateSocialCardInput } from '../src/social-card/contract'

export async function editorialChecks(baseURL: string, adminCookie: string, mailURL: string) {
  const request = async (path: string, method = 'GET', data?: object, cookie = '') => {
    const response = await fetch(`${baseURL}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json', Origin: baseURL, ...(cookie ? { Cookie: cookie } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}),
    })
    const text = await response.text()
    return { status: response.status, headers: response.headers, text, json: () => JSON.parse(text) }
  }
  const ok = async (path: string, method = 'GET', data?: object, cookie = adminCookie) => {
    const result = await request(path, method, data, cookie)
    assert.ok(result.status >= 200 && result.status < 300, `${method} ${path}: ${result.status} ${result.text}`)
    return result.json()
  }
  const denied = async (path: string, method = 'GET', data?: object, cookie = '') => {
    const result = await request(path, method, data, cookie)
    assert.ok([400, 401, 403, 404].includes(result.status), `${method} ${path} was not denied: ${result.status} ${result.text}`)
  }
  const email = 'content-editor@example.test'
  const password = randomBytes(24).toString('hex')
  const user = (await ok('/users', 'POST', { email, password, role: 'editor' })).doc
  await denied('/users', 'POST', { email: 'weak@example.test', password: 'short', role: 'editor' }, adminCookie)
  assert.equal(user.role, 'editor')
  const login = await request('/users/login', 'POST', { email, password })
  assert.equal(login.status, 200)
  const editorCookie = login.headers.get('set-cookie')!.split(';')[0]
  const untrustedOrigin = await fetch(`${baseURL}/api/users/me`, { headers: { Cookie: editorCookie, Origin: 'https://untrusted.example.test' } })
  assert.equal((await untrustedOrigin.json()).user, null)
  const edit = (path: string, method = 'GET', data?: object) => ok(path, method, data, editorCookie)
  await denied('/users')
  await denied(`/users/${user.id}?showHiddenFields=true`)
  await denied('/users', 'POST', { email: 'escalated@example.test', password, role: 'admin' }, editorCookie)
  await denied(`/users/${user.id}`, 'PATCH', { role: 'admin' }, editorCookie)
  await denied('/users?where[role][equals]=admin', 'PATCH', { role: 'editor' }, editorCookie)
  await denied('/users/unlock', 'POST', { email }, editorCookie)
  await denied('/users/unlock', 'POST', { email })
  assert.equal((await edit('/users')).totalDocs, 1)
  assert.equal((await edit('/users/me')).user.role, 'editor')
  await denied('/graphql', 'POST', { query: '{ Users { docs { email } } }' })
  console.log('PASS: administrator/editor permissions, private accounts, and disabled GraphQL')

  const author = (await edit('/authors', 'POST', { ...authorFixture, internalNotes: 'PRIVATE_AUTHOR_NOTE' })).doc
  const media = await uploadMedia(baseURL, editorCookie, { ...mediaFixture, internalNotes: 'PRIVATE_MEDIA_NOTE' })
  const privateAuthor = (await edit('/authors', 'POST', { ...authorFixture, name: 'PRIVATE_AUTHOR', isPublic: false })).doc
  const privateMedia = await uploadMedia(baseURL, editorCookie, { ...mediaFixture, alt: 'PRIVATE_MEDIA', isPublic: false })
  await denied(`/authors/${privateAuthor.id}`)
  await denied(`/media/${privateMedia.id}`)
  const incomplete = (await edit('/posts?draft=true', 'POST', { title: 'PRIVATE_INCOMPLETE' })).doc
  await denied(`/posts/${incomplete.id}`)
  await denied(`/posts/${incomplete.id}?draft=true&depth=10`)
  await denied(`/posts/${incomplete.id}`, 'PATCH', { _status: 'published' }, editorCookie)

  const fields = { ...postFixture, author: author.id, coverImage: media.id,
    body: { root: { ...postFixture.body.root, children: [...postFixture.body.root.children,
      { type: 'block', version: 2, format: '', fields: { blockType: 'image', image: media.id, caption: 'Probni opis.' } },
    ] } },
  }
  const draft = (await edit('/posts?draft=true', 'POST', { ...fields, _status: 'draft', socialTitle: ' PRIVATE_SOCIAL_TITLE č ', socialDescription: 'PRIVATE_SOCIAL_DESCRIPTION ć ž š đ' })).doc
  assert.equal(draft.socialTitle, 'PRIVATE_SOCIAL_TITLE č')
  assert.equal((await edit(`/posts/${draft.id}?draft=true`)).socialDescription, 'PRIVATE_SOCIAL_DESCRIPTION ć ž š đ')
  await denied(`/posts/${draft.id}?draft=true&autosave=true`, 'PATCH', { socialTitle: 'x'.repeat(101) }, editorCookie)
  await denied(`/posts/${draft.id}?draft=true`, 'PATCH', { socialDescription: 'x'.repeat(181) }, editorCookie)
  const editPage = await fetch(`${baseURL}/admin/collections/posts/${draft.id}`, { headers: { Cookie: editorCookie, Origin: baseURL } })
  assert.equal(editPage.status, 200)
  assert.ok((await editPage.text()).includes(fields.title), 'editor article page renders saved content')
  assert.equal((await edit(`/posts/${draft.id}?draft=true`)).title, fields.title)
  await denied('/posts?draft=true', 'POST', fields, editorCookie)
  await denied(`/posts/${draft.id}`, 'PATCH', { author: privateAuthor.id, _status: 'published' }, editorCookie)
  await denied(`/posts/${draft.id}`, 'PATCH', { coverImage: privateMedia.id, _status: 'published' }, editorCookie)
  await denied(`/posts/${draft.id}?draft=true`, 'PATCH', { body: { root: { type: 'root', children: [{ type: 'html', html: '<script>alert(1)</script>' }] } } }, editorCookie)
  await denied(`/posts/${draft.id}?draft=true`, 'PATCH', { body: { root: { type: 'root', children: [{ type: 'link', fields: { linkType: 'custom', url: 'javascript:alert(1)' }, children: [] }] } } }, editorCookie)
  const live = (await edit(`/posts/${draft.id}`, 'PATCH', { _status: 'published', firstPublishedAt: '2000-01-01T00:00:00.000Z' })).doc
  assert.ok(Date.parse(live.firstPublishedAt) > Date.parse('2026-01-01'))
  assert.equal((await request(`/posts/${draft.id}`)).status, 200)
  await denied(`/posts/${draft.id}?draft=true`, 'PATCH', { slug: 'changed-after-publication' }, editorCookie)
  await edit(`/posts/${draft.id}?draft=true&autosave=true`, 'PATCH', { title: 'PRIVATE_REVISION', body: paragraph('PRIVATE_DRAFT_BODY'), socialTitle: 'PRIVATE_SOCIAL_REVISION', socialDescription: 'PRIVATE_SOCIAL_REVISION_DESCRIPTION', _status: 'draft' })
  assert.equal((await edit(`/posts/${draft.id}?draft=true`)).title, 'PRIVATE_REVISION')
  assert.equal((await edit(`/posts/${draft.id}?draft=true`)).socialTitle, 'PRIVATE_SOCIAL_REVISION')
  for (const suffix of ['', '?draft=true', '?draft=true&depth=10&showHiddenFields=true', '?draft=true&select[title]=true&select[internalNotes]=true&select[socialTitle]=true&select[socialDescription]=true']) {
    const publicPost = await request(`/posts/${draft.id}${suffix}`)
    assert.equal(publicPost.status, 200)
    assert.doesNotMatch(publicPost.text, /PRIVATE_|@example.test|resetPassword|"role"/)
    assert.doesNotMatch(publicPost.text, /"socialTitle"|"socialDescription"/)
    assert.equal(publicPost.json().title, fields.title)
  }
  for (const path of ['/posts?draft=true&depth=10', '/authors?depth=10', '/media?depth=10', '/posts?where[_status][equals]=draft&draft=true']) {
    const result = await request(path)
    assert.equal(result.status, 200)
    assert.doesNotMatch(result.text, /PRIVATE_|@example.test/)
    assert.doesNotMatch(result.text, /"socialTitle"|"socialDescription"/)
  }
  const versions = (await edit(`/posts/versions?where[parent][equals]=${draft.id}&sort=-updatedAt`)).docs
  assert.ok(versions.length >= 3)
  await denied('/posts/versions')
  await denied(`/posts/versions/${versions[0].id}`)
  await denied(`/posts/versions/${versions[0].id}`, 'POST')
  const publishedVersion = versions.find((version: { version: { _status: string } }) => version.version._status === 'published')
  assert.ok(publishedVersion)
  await edit(`/posts/versions/${publishedVersion.id}?draft=true`, 'POST')
  assert.equal((await edit(`/posts/${draft.id}?draft=true`)).title, fields.title)
  assert.equal((await edit(`/posts/${draft.id}?draft=true`)).socialTitle, 'PRIVATE_SOCIAL_TITLE č')
  const clearedTitle = (await edit(`/posts/${draft.id}?draft=true&autosave=true`, 'PATCH', { socialTitle: ' \n ' })).doc
  assert.equal(clearedTitle.socialTitle, null)
  assert.equal(clearedTitle.socialDescription, 'PRIVATE_SOCIAL_DESCRIPTION ć ž š đ')
  assert.equal(resolveSocialCardCopy(clearedTitle).title, fields.title)
  await edit(`/posts/${draft.id}?draft=true`, 'PATCH', { socialDescription: null })
  const cleared = await edit(`/posts/${draft.id}?draft=true`)
  assert.equal(cleared.socialDescription, null)
  assert.deepEqual(resolveSocialCardCopy(cleared), { title: fields.title, description: fields.excerpt })
  const publishedAgain = (await edit(`/posts/${draft.id}`, 'PATCH', { title: 'Dopunjen probni vodič', _status: 'published' })).doc
  assert.equal(publishedAgain.firstPublishedAt, live.firstPublishedAt)
  await denied(`/posts/${draft.id}`, 'PATCH', { substantiveUpdatedAt: '2000-01-01T00:00:00.000Z', _status: 'published' }, editorCookie)
  await denied(`/posts/${draft.id}`, 'PATCH', { substantiveUpdatedAt: new Date(Date.now() + 3600000).toISOString(), _status: 'published' }, editorCookie)
  const substantiveUpdatedAt = new Date().toISOString()
  assert.equal((await edit(`/posts/${draft.id}`, 'PATCH', { substantiveUpdatedAt, _status: 'published' })).doc.substantiveUpdatedAt, substantiveUpdatedAt)
  await edit(`/posts/${draft.id}`, 'PATCH', { _status: 'draft' })
  await denied(`/posts/${draft.id}`)
  await denied(`/posts/${draft.id}?draft=true`)
  assert.equal((await request('/posts?draft=true')).json().totalDocs, 0)
  await denied(`/posts/${draft.id}?draft=true`, 'PATCH', { slug: 'changed-after-unpublish' }, editorCookie)
  const firstVersion = versions.at(-1)
  await edit(`/posts/versions/${firstVersion.id}?draft=true`, 'POST')
  assert.equal((await edit(`/posts/${draft.id}?draft=true`)).firstPublishedAt, live.firstPublishedAt)
  for (let index = 0; index < 52; index++) {
    await edit(`/posts/${draft.id}?draft=true`, 'PATCH', { title: `Probna revizija ${index}`, _status: 'draft' })
  }
  assert.equal((await edit(`/posts/versions?where[parent][equals]=${draft.id}&limit=100`)).totalDocs, 50)
  console.log('PASS: drafts/autosave/recovery, publish/unpublish, immutable slugs/dates, and anonymous query/relationship privacy')

  // Existing article limits exceed card limits; empty social fields never block publication.
  const longFields = { ...fields, slug: 'probni-social-fallback', title: 'W'.repeat(180), excerpt: 'Opis '.repeat(80).trim(), socialTitle: null, socialDescription: null, _status: 'published' }
  const longPost = (await edit('/posts', 'POST', longFields)).doc
  assert.equal((await request(`/posts/${longPost.id}`)).json().title, longFields.title)
  assert.throws(() => validateSocialCardInput(resolveSocialCardCopy(longPost)), /Skrati/)
  const nonRenderable = (await edit(`/posts/${longPost.id}`, 'PATCH', { socialTitle: '🎣 ' + 'W'.repeat(40), _status: 'published' })).doc
  assert.equal(nonRenderable._status, 'published', 'glyph/width readiness is not a publish prerequisite')
  const publicLong = await request(`/posts/${longPost.id}?depth=10&showHiddenFields=true`)
  assert.doesNotMatch(publicLong.text, /socialTitle|socialDescription|🎣/)
  for (const name of ['title', 'excerpt', 'seoTitle', 'seoDescription']) assert.equal(publicLong.json()[name], longFields[name as keyof typeof longFields])
  await denied(`/posts/${longPost.id}`, 'PATCH', { socialTitle: 'Unauthorized' })
  await denied('/graphql', 'POST', { query: '{ Posts { docs { socialTitle socialDescription } } }' })
  await edit(`/posts/${longPost.id}`, 'DELETE')
  console.log('PASS: private social fields, per-field fallback/clearing, override limits, version recovery, and publication independent of card readiness')

  // Five bad passwords lock the account. Editors cannot bypass that lock.
  for (let attempt = 0; attempt < 5; attempt++) await denied('/users/login', 'POST', { email, password: 'incorrect-password' })
  const locked = await request('/users/login', 'POST', { email, password })
  assert.notEqual(locked.status, 200)
  await denied('/users/unlock', 'POST', { email }, editorCookie)
  await ok('/users/unlock', 'POST', { email })
  assert.equal((await request('/users/login', 'POST', { email, password })).status, 200)
  const forgot = await request('/users/forgot-password', 'POST', { email })
  const unknown = await request('/users/forgot-password', 'POST', { email: 'missing@example.test' })
  assert.equal(forgot.status, 200)
  assert.equal(unknown.text, forgot.text)
  assert.doesNotMatch(forgot.text, /token|passwordExpiration/i)
  const inbox = await (await fetch(`${mailURL}/api/v1/messages`)).json()
  assert.equal(inbox.total, 1)
  const message = await (await fetch(`${mailURL}/api/v1/message/${inbox.messages[0].ID}`)).json()
  const token = message.HTML.match(/\/admin\/reset\/([^"<\s]+)/)?.[1]
  assert.ok(token, 'reset email contains CMS reset URL')
  assert.ok(message.HTML.includes(baseURL), 'reset link uses configured CMS origin')
  const newPassword = randomBytes(24).toString('hex')
  await denied('/users/reset-password', 'POST', { token, password: 'short' })
  await ok('/users/reset-password', 'POST', { token, password: newPassword }, '')
  await denied('/users/reset-password', 'POST', { token, password })
  await denied('/users/login', 'POST', { email, password })
  const recovered = await request('/users/login', 'POST', { email, password: newPassword })
  assert.equal(recovered.status, 200)
  const recoveredCookie = recovered.headers.get('set-cookie')!.split(';')[0]
  await ok('/users/logout', 'POST', {}, recoveredCookie)
  assert.equal((await request('/users/me', 'GET', undefined, recoveredCookie)).json().user, null)
  console.log('PASS: login throttling, admin-only unlock, locally captured recovery, single-use reset, and logout')
}
