import pg from 'pg'
import { cmsEnvironment } from '../../../environment'

export const dynamic = 'force-dynamic'

export async function GET() {
  let client: pg.Client | undefined
  try {
    client = new pg.Client({ connectionString: cmsEnvironment().databaseURL, connectionTimeoutMillis: 3000, query_timeout: 3000 })
    await client.connect()
    // Check initial schema as well as database connectivity. No Payload initialization
    // or migration runs during health checks.
    await client.query('SELECT id FROM users LIMIT 0; SELECT id FROM posts LIMIT 0; SELECT id FROM authors LIMIT 0; SELECT id FROM media LIMIT 0; SELECT id FROM _posts_v LIMIT 0')
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  } finally {
    await client?.end()
  }
}
