'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateResult } from '@/lib/engine'
import Papa from 'papaparse'

export async function validateCsvAction(
  schoolId: string,
  academicYearId: string,
  examId: string,
  templateVersion: string,
  csvText: string
) {
  const supabase = await createClient()

  // 1. Fetch global config (schools, rules, class mappings)
  const { data: rules } = await supabase.from('grading_rules').select('*').eq('active', true)
  const { data: classConfigs } = await supabase.from('class_configs').select('*, class_subjects(*, subjects(*))').eq('status', 'ACTIVE')

  if (!rules || !classConfigs) {
    return { error: 'Failed to load global configuration.' }
  }

  // Create class mapping
  const classMap = new Map()
  classConfigs.forEach(c => {
    classMap.set(c.class_name.toLowerCase(), c.class_subjects)
  })

  // 2. Parse CSV
  const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  const rows = parseResult.data as any[]
  
  if (rows.length === 0) return { error: 'CSV file is empty.' }
  if (rows.length > 5000) return { error: 'CSV file exceeds maximum allowed rows.' }

  // 3. Validation and Calculation
  let validRows = 0
  let invalidRows = 0
  const errorSummary: any[] = []
  const stagedData: any[] = []
  
  const seenRolls = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2
    const roll = String(row['roll_number'] || '').trim()
    const name = String(row['student_name'] || '').trim()
    const dob = String(row['date_of_birth'] || '').trim()
    const className = String(row['class_name'] || '').trim()

    if (!roll) { errorSummary.push({ row_number: rowNum, student_name: name, field: 'roll_number', error_message: 'Roll number is required' }); invalidRows++; continue }
    if (seenRolls.has(roll)) { errorSummary.push({ row_number: rowNum, student_name: name, field: 'roll_number', error_message: `Duplicate roll number` }); invalidRows++; continue }
    seenRolls.add(roll)
    if (!name || !dob || !className) { errorSummary.push({ row_number: rowNum, student_name: name, field: 'name/dob/class', error_message: 'Required fields missing' }); invalidRows++; continue }

    // Validate Class
    const classSubjects = classMap.get(className.toLowerCase())
    if (!classSubjects) {
      errorSummary.push({ row_number: rowNum, student_name: name, field: 'class_name', error_message: `Class '${className}' is not configured in system.` })
      invalidRows++
      continue
    }

    // Process marks dynamically based on class configuration
    const marksData = []
    const marksObj: Record<string, any> = {}
    let hasMarkError = false

    for (const cs of classSubjects) {
      const subj = cs.subjects
      const markStr = row[subj.subject_code]
      
      if (markStr === undefined || markStr === '') {
        errorSummary.push({ row_number: rowNum, student_name: name, field: subj.subject_code, error_message: 'Missing mandatory mark for this class' })
        hasMarkError = true
        continue
      }

      const markNum = Number(markStr)
      if (isNaN(markNum) || markNum < 0 || markNum > cs.maximum_marks) {
        errorSummary.push({ row_number: rowNum, student_name: name, field: subj.subject_code, error_message: `Invalid mark: must be 0 to ${cs.maximum_marks}` })
        hasMarkError = true
        continue
      }

      marksData.push({
        subject_id: subj.id,
        marks_obtained: markNum,
        maximum_marks: cs.maximum_marks,
        passing_marks: cs.passing_marks
      })
      // Store complete snapshot for RPC
      marksObj[subj.id] = {
        marks_obtained: markNum,
        maximum_marks: cs.maximum_marks,
        passing_marks: cs.passing_marks
      }
    }

    if (hasMarkError) {
      invalidRows++
      continue
    }

    const calc = calculateResult(marksData, rules)

    stagedData.push({
      roll_number: roll,
      student_name: name,
      date_of_birth: dob,
      class_name: className,
      division: String(row['division'] || '').trim(),
      mobile_number: String(row['mobile_number'] || '').trim() || null,
      marks: marksObj,
      calculated: { ...calc, calculation_version: rules[0]?.version || 1 }
    })
    
    validRows++
  }

  // If there are invalid rows, we enforce "Safe all-or-nothing import" 
  // Wait, the prompt says: "If any critical row is invalid: Do not modify production data. Admin fixes CSV and uploads again."
  // So if invalidRows > 0, we can still save it as 'FAILED' or 'VALIDATING' with errors, but they can't confirm.
  
  // Get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check new vs existing students to show stats
  // Query existing rolls for this school and year
  const { data: existingStudents } = await supabase
    .from('students')
    .select('roll_number')
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .in('roll_number', Array.from(seenRolls))

  const existingRolls = new Set((existingStudents || []).map(s => s.roll_number))
  
  let newStudents = 0
  let updatedStudents = 0
  for (const item of stagedData) {
    if (existingRolls.has(item.roll_number)) {
      updatedStudents++
    } else {
      newStudents++
    }
  }

  const status = invalidRows > 0 ? 'VALIDATING' : 'VALID' // If VALIDATING, user sees errors and must fix.

  // Store in import_jobs
  const { data: job, error: jobError } = await supabase
    .from('import_jobs')
    .insert({
      school_id: schoolId,
      academic_year_id: academicYearId,
      exam_id: examId,
      uploaded_by: user.id,
      template_version: templateVersion,
      file_name: 'uploaded.csv', // Ideally pass real name
      status,
      total_rows: rows.length,
      valid_rows: validRows,
      invalid_rows: invalidRows,
      new_students: newStudents,
      updated_students: updatedStudents,
      new_results: newStudents, // simplified
      updated_results: updatedStudents,
      staged_data: status === 'VALID' ? stagedData : null, // Only stage if valid to save space, or save anyway for partial preview? 
      error_summary: errorSummary
    })
    .select('id')
    .single()

  if (jobError) {
    return { error: 'Failed to create import job: ' + jobError.message }
  }

  return {
    success: true,
    jobId: job.id,
    stats: {
      total: rows.length,
      valid: validRows,
      invalid: invalidRows,
      newStudents,
      updatedStudents,
      errors: errorSummary.slice(0, 50) // Return top 50 errors
    }
  }
}

export async function confirmImportAction(jobId: string) {
  const supabase = await createClient()
  
  // Trigger RPC
  const { data, error } = await supabase.rpc('execute_import_job', { p_job_id: jobId })

  if (error) {
    // Mark as failed
    await supabase.from('import_jobs').update({ status: 'FAILED' }).eq('id', jobId)
    return { error: error.message }
  }

  return { success: true }
}
