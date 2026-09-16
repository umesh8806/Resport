import postgres from 'postgres'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function run() {
  const sql = postgres('postgresql://postgres:Supabase%40221101137@db.oefkogauslgxrgqszwrr.supabase.co:5432/postgres')

  console.log('Running migrations...')
  try {
    const m1 = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20240101000000_initial_schema.sql'), 'utf8')
    await sql.unsafe(m1)
    console.log('Migration 1 applied')

    const m2 = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20240101000001_rls_policies.sql'), 'utf8')
    await sql.unsafe(m2)
    console.log('Migration 2 applied')

    const m3 = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20240101000002_import_rpc.sql'), 'utf8')
    await sql.unsafe(m3)
    console.log('Migration 3 applied')

    const seed = fs.readFileSync(path.join(__dirname, 'supabase', 'seed.sql'), 'utf8')
    await sql.unsafe(seed)
    console.log('Seed data applied')

  } catch (err) {
    console.error('Error applying migrations:', err)
  } finally {
    await sql.end()
  }
}

run()
