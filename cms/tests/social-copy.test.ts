import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSocialOverride, resolveSocialCardCopy } from '../src/social-card/copy'
import { validateSocialCardInput } from '../src/social-card/contract'

test('social overrides normalize, clear and enforce field limits without requiring a renderable card', () => {
  assert.equal(normalizeSocialOverride(undefined, 'title'), undefined)
  assert.equal(normalizeSocialOverride(null, 'title'), null)
  assert.equal(normalizeSocialOverride(' \n ', 'description'), null)
  assert.equal(normalizeSocialOverride(' c\u030c   ć ž š đ ', 'title'), 'č ć ž š đ')
  assert.equal(normalizeSocialOverride('i'.repeat(100), 'title'), 'i'.repeat(100))
  assert.equal(normalizeSocialOverride('i'.repeat(180), 'description'), 'i'.repeat(180))
  for (const value of [false, {}, [], 3]) assert.throws(() => normalizeSocialOverride(value, 'title'))
  assert.throws(() => normalizeSocialOverride('i'.repeat(101), 'title'), /100/)
  assert.throws(() => normalizeSocialOverride('i'.repeat(181), 'description'), /180/)
  // Unsupported glyphs / wide words are preview concerns, not article-publish failures.
  assert.equal(normalizeSocialOverride('🎣 ' + 'W'.repeat(40), 'title'), '🎣 ' + 'W'.repeat(40))
})

test('effective copy uses independent live fallbacks, without mutation or truncation', () => {
  const source = Object.freeze({ title: 'Naslov članka', excerpt: 'Uvod članka.', socialTitle: ' Društveni naslov ', socialDescription: ' ' })
  assert.deepEqual(resolveSocialCardCopy(source), { title: 'Društveni naslov', description: 'Uvod članka.' })
  assert.deepEqual(resolveSocialCardCopy({ ...source, socialTitle: null, socialDescription: 'Kratak opis' }), { title: 'Naslov članka', description: 'Kratak opis' })
  assert.deepEqual(resolveSocialCardCopy({}), { title: '', description: '' })
  const long = { title: 'W'.repeat(180), excerpt: 'Opis '.repeat(80).trim() }
  const effective = resolveSocialCardCopy(long)
  assert.equal(effective.title, long.title)
  assert.equal(effective.description, long.excerpt)
  assert.throws(() => validateSocialCardInput(effective), /Skrati/)
  assert.equal(resolveSocialCardCopy({ ...long, title: 'Novi naslov' }).title, 'Novi naslov')
})
