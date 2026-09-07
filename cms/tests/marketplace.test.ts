import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateMarketplaceCategory } from '../src/marketplace'

test('optional category resolves only through FastAPI and gives actionable failures', async () => {
  const original = globalThis.fetch
  let calls = 0
  try {
    globalThis.fetch = async (url, init) => {
      calls++
      assert.match(String(url), /\/categories\/stapovi$/)
      assert.equal(init?.cache, 'no-store')
      assert.equal(init?.redirect, 'error')
      assert.equal(init?.headers, undefined)
      return Response.json({
        data: { id: 'category-id', slug: 'stapovi', name_sr: 'Štapovi' },
      })
    }
    assert.equal(await validateMarketplaceCategory(null), true)
    assert.equal(calls, 0)
    assert.match(
      String(
        await validateMarketplaceCategory('https://site/kategorije/stapovi'),
      ),
      /not the full URL/,
    )
    assert.equal(await validateMarketplaceCategory('stapovi'), true)
    globalThis.fetch = async () => new Response(null, { status: 404 })
    assert.match(
      String(await validateMarketplaceCategory('missing')),
      /does not exist or is inactive/,
    )
    globalThis.fetch = async () => {
      throw new Error('timeout')
    }
    assert.match(
      String(await validateMarketplaceCategory('stapovi')),
      /draft can still be saved/,
    )
    globalThis.fetch = async () => Response.json({ data: [] })
    assert.match(
      String(await validateMarketplaceCategory('stapovi')),
      /could not be checked/,
    )
  } finally {
    globalThis.fetch = original
  }
})
