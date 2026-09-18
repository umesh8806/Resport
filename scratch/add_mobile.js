const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  try {
    const res = await client.query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15);
      CREATE INDEX IF NOT EXISTS idx_students_mobile ON students(mobile_number);
    `);
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
