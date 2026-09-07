import { loadEnvFile } from 'node:process'
import { existsSync } from 'node:fs'
import pg from 'pg'
import { CMS_DATABASE, CMS_DATABASE_USER, databaseURL, requireOperatorMaintenance } from '../src/environment'

if (existsSync('.env')) loadEnvFile('.env')

export async function provision() {
  requireOperatorMaintenance()
  const cmsURL = new URL(databaseURL())
  const adminURL = new URL(cmsURL)
  adminURL.pathname = '/postgres'
  adminURL.username = process.env.CMS_PROVISION_USER || 'postgres'
  adminURL.password = process.env.CMS_PROVISION_PASSWORD || ''
  if (!adminURL.password || adminURL.username === CMS_DATABASE_USER) {
    throw new Error('Provide separate local database-administrator credentials for provisioning.')
  }
  const client = new pg.Client({ connectionString: adminURL.toString(), connectionTimeoutMillis: 5000 })
  const ident = (value: string) => `"${value.replaceAll('"', '""')}"`
  try {
    await client.connect()
    // Serialize repeat/concurrent provisioning, including CREATE DATABASE (not transactional).
    await client.query("SELECT pg_advisory_lock(hashtext('szp-cms-provision'))")
    const role = await client.query('SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = $1', [CMS_DATABASE_USER])
    if (role.rowCount && Object.values(role.rows[0]).some(Boolean)) {
      throw new Error('Existing CMS role has elevated privileges; refusing to reuse it.')
    }
    const memberships = await client.query('SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = $1)', [CMS_DATABASE_USER])
    if (memberships.rowCount) throw new Error('Existing CMS role has memberships; refusing to reuse it.')
    const database = await client.query('SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = $1', [CMS_DATABASE])
    if (database.rowCount && database.rows[0].owner !== decodeURIComponent(adminURL.username)) {
      throw new Error('Existing CMS database has an unexpected owner; refusing to take ownership.')
    }
    const password = await client.query('SELECT quote_literal($1) AS value', [process.env.CMS_DATABASE_PASSWORD])
    await client.query(`${role.rowCount ? 'ALTER' : 'CREATE'} ROLE ${ident(CMS_DATABASE_USER)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD ${password.rows[0].value}`)
    if (!database.rowCount) await client.query(`CREATE DATABASE ${ident(CMS_DATABASE)} OWNER ${ident(decodeURIComponent(adminURL.username))}`)
    await client.query(`REVOKE ALL ON DATABASE ${ident(CMS_DATABASE)} FROM PUBLIC`)
    await client.query(`GRANT CONNECT ON DATABASE ${ident(CMS_DATABASE)} TO ${ident(CMS_DATABASE_USER)}`)
  } finally {
    await client.end()
  }
  adminURL.pathname = `/${CMS_DATABASE}`
  const schemaClient = new pg.Client({ connectionString: adminURL.toString() })
  try {
    await schemaClient.connect()
    await schemaClient.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
    await schemaClient.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${ident(CMS_DATABASE_USER)}`)
  } finally {
    await schemaClient.end()
  }
}

if (process.argv[1]?.endsWith('/provision.ts')) {
  provision().then(() => console.log('CMS database and restricted role are ready.')).catch(() => {
    console.error('CMS provisioning failed. Check local administrator credentials, server availability, and existing role/database ownership.')
    process.exitCode = 1
  })
}
