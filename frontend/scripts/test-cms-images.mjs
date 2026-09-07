import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cmsImagePattern } from '../config/cms-images.cjs';
import { matchRemotePattern } from 'next/dist/shared/lib/match-remote-pattern.js';

test('CMS image URLs are allowlisted only under the configured bucket/media path', () => {
  for (const base of ['https://cms-bucket.fsn1.your-objectstorage.com', 'http://127.0.0.1:9000/svezapecanje-cms']) {
    const pattern = cmsImagePattern(base);
    assert.equal(matchRemotePattern(pattern, new URL(`${base}/media/image.webp`)), true);
    for (const value of [`${base}/listings/image.webp`, `${base}/media/image.webp?secret=1`, 'https://untrusted.example.test/media/image.webp']) {
      assert.equal(matchRemotePattern(pattern, new URL(value)), false);
    }
  }
  assert.equal(cmsImagePattern(''), null);
  for (const value of ['https://*.example.test', 'https://example.test/*', 'https://user:pass@example.test', 'file:///tmp/images']) {
    assert.throws(() => cmsImagePattern(value));
  }
});
