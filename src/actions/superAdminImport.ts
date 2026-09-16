'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { calculateResult } from '@/lib/engine'
import Papa from 'papaparse'

export async function superAdminGlobalImportAction(
  academicYearId: string,
  examId: string,
  rows: any[]
) {
  // 1. Fetch globals
  const [{ data: subjects }, { data: schools }] = await Promise.all([
    supabaseAdmin.from('subjects').select('*').eq('active', true),
    supabaseAdmin.from('schools').select('id, school_code').eq('status', 'ACTIVE')
  ])

  if (!subjects || !schools) {
    return { error: 'Failed to load global configuration.' }
  }

  const schoolMap = new Map(schools.map(s => [s.school_code, s.id]))
  const subjectMap = new Map(subjects.map(s => [s.subject_code, s]))

  const errorSummary: string[] = []
  
  try {
    let currentSchoolId = ''
    const newSchoolsToCreate: Set<string> = new Set()
    
    // 1. Identify missing schools
    for (const row of rows) {
      const schoolCode = String(row['school_code'] || '').trim()
      if (schoolCode && !schoolMap.has(schoolCode)) {
        newSchoolsToCreate.add(schoolCode)
      }
    }

    // Auto-create missing schools
    if (newSchoolsToCreate.size > 0) {
      const schoolsToInsert = Array.from(newSchoolsToCreate).map(code => ({
        school_code: code,
        school_name: `Auto-Created (${code})`,
        status: 'ACTIVE'
      }))
      const { data: createdSchools, error: createError } = await supabaseAdmin
        .from('schools')
        .insert(schoolsToInsert)
        .select('id, school_code')
      
      if (createError) {
         return { error: `Failed to auto-create missing schools: ${createError.message}` }
      }
      if (createdSchools) {
        createdSchools.forEach(s => schoolMap.set(s.school_code, s.id))
      }
    }

    // 2. Prepare Students Array
    const studentUpserts = []
    const validRows = []
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      const schoolCode = String(row['school_code'] || '').trim()
      const roll = String(row['roll_number'] || '').trim()
      const name = String(row['student_name'] || '').trim()
      const dob = String(row['date_of_birth'] || '').trim()
      
      const sid = schoolMap.get(schoolCode)
      if (!sid || !roll || !name) {
        errorSummary.push(`Row ${rowNum}: Missing critical data (school/roll/name)`)
        continue
      }
      
      studentUpserts.push({
        school_id: sid,
        academic_year_id: academicYearId,
        roll_number: roll,
        student_name: name,
        date_of_birth: dob || null,
        class_name: String(row['class_name'] || '').trim() || 'Unspecified',
        division: String(row['division'] || '').trim() || 'A',
        status: 'ACTIVE'
      })
      
      validRows.push({ row, rowNum, sid, roll })
    }

    if (studentUpserts.length === 0) {
      return { error: 'No valid rows found to import.', details: errorSummary.slice(0, 50) }
    }

    // 3. Upsert all students in ONE batch
    const { data: upsertedStudents, error: studentsErr } = await supabaseAdmin
      .from('students')
      .upsert(studentUpserts, { onConflict: 'school_id, academic_year_id, roll_number' })
      .select('id, roll_number, school_id')

    if (studentsErr || !upsertedStudents) {
      return { error: `Student batch upsert failed: ${studentsErr?.message}` }
    }

    // Create a fast lookup for Student ID
    const studentIdMap = new Map()
    for (const s of upsertedStudents) {
      studentIdMap.set(`${s.school_id}_${s.roll_number}`, s.id)
    }

    // 4. Prepare Results Array
    const resultUpserts = []
    const coreKeys = ['school_code', 'roll_number', 'student_name', 'date_of_birth', 'class_name', 'division', 'total_marks', 'maximum_marks', 'percentage', 'grade', 'result_status']
    
    for (const v of validRows) {
      const { row, rowNum, sid, roll } = v
      const studentId = studentIdMap.get(`${sid}_${roll}`)
      if (!studentId) continue // Should not happen

      let calculatedObtained = 0
      let calculatedMax = 0
      const metadataObj: Record<string, any> = {}

      for (const [key, value] of Object.entries(row)) {
        if (coreKeys.includes(key)) continue
        const subject = subjectMap.get(key)
        if (subject) {
          if (value !== undefined && value !== '') {
            const markNum = Number(value)
            if (!isNaN(markNum) && markNum >= 0 && markNum <= subject.maximum_marks) {
              calculatedObtained += markNum
              calculatedMax += subject.maximum_marks
            } else {
              metadataObj[`${key}_error`] = `Invalid mark: ${value}`
            }
          }
        } else {
          if (value !== undefined && value !== '') metadataObj[key] = value
        }
      }

      const finalObtained = row['total_marks'] !== undefined && row['total_marks'] !== '' ? Number(row['total_marks']) : (calculatedMax > 0 ? calculatedObtained : null)
      const finalMax = row['maximum_marks'] !== undefined && row['maximum_marks'] !== '' ? Number(row['maximum_marks']) : (calculatedMax > 0 ? calculatedMax : null)
      const finalPercentage = row['percentage'] !== undefined && row['percentage'] !== '' ? Number(row['percentage']) : (finalMax && finalObtained ? Number(((finalObtained / finalMax) * 100).toFixed(2)) : null)

      resultUpserts.push({
        school_id: sid,
        student_id: studentId,
        exam_id: examId,
        total_marks: finalObtained,
        maximum_marks: finalMax,
        percentage: finalPercentage,
        grade: row['grade'] || null, 
        result_status: row['result_status'] || null,
        publication_status: 'PUBLISHED',
        published_at: new Date().toISOString(),
        metadata: metadataObj,
        // Carry forward the row context for marks parsing
        _originalRow: row
      })
    }

    // 5. Upsert all results in ONE batch
    const resultsToUpsert = resultUpserts.map(({ _originalRow, ...rest }) => rest)
    const { data: upsertedResults, error: resultsErr } = await supabaseAdmin
      .from('results')
      .upsert(resultsToUpsert, { onConflict: 'student_id, exam_id' })
      .select('id, student_id')

    if (resultsErr || !upsertedResults) {
      return { error: `Result batch upsert failed: ${resultsErr?.message}` }
    }

    const resultIdMap = new Map()
    for (const r of upsertedResults) {
      resultIdMap.set(r.student_id, r.id)
    }

    // 6. Prepare Marks Array
    const markUpserts = []
    for (const v of resultUpserts) {
      const resultId = resultIdMap.get(v.student_id)
      if (!resultId) continue

      for (const [key, value] of Object.entries(v._originalRow)) {
        if (coreKeys.includes(key)) continue
        const subject = subjectMap.get(key)
        if (subject && value !== undefined && value !== '') {
          const markNum = Number(value)
          if (!isNaN(markNum) && markNum >= 0 && markNum <= subject.maximum_marks) {
            markUpserts.push({
              school_id: v.school_id,
              result_id: resultId,
              subject_id: subject.id,
              marks_obtained: markNum,
              maximum_marks: subject.maximum_marks,
              passing_marks: subject.passing_marks
            })
          }
        }
      }
    }

    // 7. Upsert all marks in ONE batch (in chunks of 2000 if massive)
    if (markUpserts.length > 0) {
      const chunkSize = 2000
      for (let i = 0; i < markUpserts.length; i += chunkSize) {
        const chunk = markUpserts.slice(i, i + chunkSize)
        const { error: marksErr } = await supabaseAdmin
          .from('result_marks')
          .upsert(chunk, { onConflict: 'result_id, subject_id' })
        
        if (marksErr) throw new Error(`Marks batch upsert failed at chunk ${i}: ${marksErr.message}`)
      }
    }

    return { success: true, count: validRows.length, details: errorSummary.length > 0 ? errorSummary.slice(0, 50) : undefined }
  } catch (err: any) {
    return { error: 'Execution failed: ' + err.message }
  }
}
