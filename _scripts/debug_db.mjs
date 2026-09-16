import postgres from 'postgres'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sql = postgres(process.env.DATABASE_URL)

async function run() {
  const students = await sql`SELECT id, roll_number, date_of_birth, school_id FROM students WHERE roll_number = 'S1-001'`
  console.log("Students:", students)
  
  if (students.length > 0) {
    const results = await sql`SELECT id, publication_status, student_id, school_id FROM results WHERE student_id = ${students[0].id}`
    console.log("Results:", results)
  }
  
  const schools = await sql`SELECT id, school_name FROM schools`
  console.log("Schools:", schools)

  process.exit(0)
}
run()
