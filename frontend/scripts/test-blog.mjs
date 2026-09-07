import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapBody, mapPost, safeBlogLink, jsonLD } from '../src/lib/blog-content.ts';
import { CMSUnavailable, cmsRead } from '../src/lib/cms-http.ts';
import { blogAnalyticsEnabled } from '../src/lib/blog-analytics-policy.ts';
import { formatMonthYear, formatRelativeDate } from '../src/lib/format.ts';

test('related marketplace cards preserve Serbian Latin date labels', () => {
  assert.equal(formatRelativeDate(new Date(Date.now() - 6 * 86400000).toISOString()), 'pre 6 dana');
  assert.doesNotMatch(formatMonthYear('2026-09-07T12:00:00Z'), /[\u0400-\u04ff]/u);
});

test('blog collection needs explicit enablement and excludes fixture slugs and IDs', () => {
  const post = { id: '12', slug: 'vodic' };
  for (const setting of ['', 'false', '1', 'TRUE']) assert.equal(blogAnalyticsEnabled(post, setting, ''), false);
  assert.equal(blogAnalyticsEnabled(post, 'true', ''), true);
  assert.equal(blogAnalyticsEnabled(post, 'true', ' 12, 13 '), false);
  assert.equal(blogAnalyticsEnabled(post, 'true', '112'), true);
  assert.equal(blogAnalyticsEnabled({ ...post, slug: 'probni-vodic' }, 'true', ''), false);
});

test('public mapping and rich text cannot expose private fields, inject HTML or unsafe links', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', '/\\evil.test', 'https://a.test/\n']) assert.equal(safeBlogLink(url), undefined);
  for (const url of ['/oglasi', '#oprema', 'https://example.test', 'mailto:contact@example.test']) assert.equal(safeBlogLink(url), url);
  assert.doesNotMatch(jsonLD({ text: '</script><script>alert(1)</script>&' }), /[<>&]/);
  const post = mapPost({ id: 1, slug: 'test', title: 'č ć ž š đ', _status: 'published', firstPublishedAt: '2026-09-01T00:00:00Z', internalNotes: 'PRIVATE', author: { name: 'Autor', internalNotes: 'PRIVATE' } });
  assert.doesNotMatch(JSON.stringify(post), /PRIVATE|internalNotes/);
  assert.throws(() => mapPost({ ...post, _status: 'draft' }));
  assert.deepEqual(mapBody({ root: { type: 'html', html: '<script>bad</script>' } }), []);
  assert.equal(mapPost({ id: 1 }, true).title, 'Članak bez naslova');
  assert.equal(mapPost({ id: 1, marketplaceCategorySlug: 'stapovi' }, true).marketplaceCategorySlug, 'stapovi');
  for (const slug of ['https://example.test', '../secret', 'a'.repeat(181), { slug: 'stapovi' }]) {
    assert.equal(mapPost({ id: 1, marketplaceCategorySlug: slug }, true).marketplaceCategorySlug, undefined);
  }
});

test('CMS fetches are uncached, credential-free, timeout-bound and reject failures or oversized bodies', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => {
      assert.equal(init.cache, 'no-store');
      assert.equal(init.redirect, 'error');
      assert.ok(init.signal instanceof AbortSignal);
      assert.deepEqual(init.headers, { Accept: 'application/json' });
      return Response.json({ docs: [] });
    };
    assert.deepEqual(await cmsRead('posts'), { docs: [] });
    globalThis.fetch = async () => new Response('{}', { status: 503 });
    await assert.rejects(cmsRead('posts'), CMSUnavailable);
    globalThis.fetch = async () => new Response('x'.repeat(4_000_001));
    await assert.rejects(cmsRead('posts'), CMSUnavailable);
    globalThis.fetch = async () => new Response('not json');
    await assert.rejects(cmsRead('posts'), CMSUnavailable);
    globalThis.fetch = async () => { throw new Error('secret upstream detail'); };
    await assert.rejects(cmsRead('posts'), error => error instanceof CMSUnavailable && !error.message.includes('secret'));
  } finally { globalThis.fetch = originalFetch; }
});
