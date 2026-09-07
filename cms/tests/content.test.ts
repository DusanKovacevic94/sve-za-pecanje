import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectBody, safeLink, slugPattern } from '../src/content'
import { paragraph } from '../src/fixtures'
import { cmsEmail } from '../src/email'

test('editor vocabulary rejects code, HTML, embeds, unsafe URLs, and text styles', () => {
  assert.equal(inspectBody(paragraph('Čuvaj č ć ž š đ')).text, 'Čuvaj č ć ž š đ')
  for (const type of ['html', 'code', 'iframe', 'upload', 'relationship']) {
    assert.throws(() => inspectBody({ root: { type: 'root', children: [{ type }] } }))
  }
  assert.throws(() => inspectBody({ root: { type: 'root', children: [{ type: 'text', text: 'code', format: 16 }] } }))
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', '//other.test', '/\\other.test', 'java\nscript:alert(1)']) assert.equal(safeLink(url), false)
  for (const url of ['https://example.test/a', '/blog/probni-clanak', '#oprema', 'mailto:editor@example.test']) assert.equal(safeLink(url), true)
  assert.equal(slugPattern.test('stapovi-i-masinice'), true)
  assert.equal(slugPattern.test('Štapovi I Mašinice'), false)
})

test('mail configuration fails closed in production and captures locally otherwise', async () => {
  await assert.rejects(cmsEmail({ CMS_ENV: 'production' }), /CMS_RESEND_API_KEY/)
  await assert.rejects(cmsEmail({ CMS_ENV: 'test', CMS_SMTP_HOST: 'smtp.external.test' }), /Mailpit/)
  await assert.rejects(cmsEmail({ CMS_ENV: 'test', CMS_SMTP_PORT: 'no' }), /CMS_SMTP_PORT/)
  assert.equal(typeof await cmsEmail({ CMS_ENV: 'test' }), 'function')
})
