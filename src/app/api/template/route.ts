import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const isGlobal = searchParams.get('type') === 'global'
  
  const supabase = await createClient()

  const { data: subjects } = await supabase
    .from('subjects')
    .select('subject_code')
    .eq('active', true)
    .order('display_order')

  if (!subjects) {
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 })
  }

  // Define required columns
  const baseColumns = ['roll_number', 'student_name', 'date_of_birth', 'class_name', 'division', 'mobile_number']
  
  if (isGlobal) {
    baseColumns.unshift('school_code')
  }
  
  const subjectColumns = subjects.map(s => s.subject_code)
  
  const headers = [...baseColumns, ...subjectColumns]

  const csv = Papa.unparse({
    fields: headers,
    data: [] // Empty data rows
  })

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="result_import_template.csv"'
    }
  })
}
