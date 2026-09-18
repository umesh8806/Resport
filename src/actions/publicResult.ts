'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Simple in-memory rate limiter for serverless environments
const rateLimitCache = new Map<string, { count: number, resetAt: number }>()
const MAX_REQUESTS = 20
const WINDOW_MS = 60 * 1000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitCache.get(ip)
  
  if (!record || now > record.resetAt) {
    rateLimitCache.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  
  if (record.count >= MAX_REQUESTS) {
    return false
  }
  
  record.count++
  return true
}

// In Next.js Server Actions, we don't have direct access to the Request object to get the IP.
// As a fallback, we can rate limit by a combination of the parameters to prevent brute-forcing a specific roll number.
function getIdentifier(prefix: string, ...args: string[]) {
  return `${prefix}:${args.join('-')}`
}

export async function verifyAndFetchResult(schoolId: string, rollNumber: string, dob: string) {
  const identifier = getIdentifier('strict', schoolId, rollNumber)
  if (!checkRateLimit(identifier)) {
    return { error: 'Too many requests. Please try again in a minute.' }
  }

  const sanitizedRoll = rollNumber.replace(/\./g, '-').toUpperCase().trim()

  // Find the student securely using service role to bypass restrictive RLS 
  // Find the student records (could be multiple if student spans multiple academic years)
  const { data: students, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('school_id', schoolId)
    .eq('roll_number', sanitizedRoll)
    .eq('date_of_birth', dob)
    .eq('status', 'ACTIVE')

  if (studentError || !students || students.length === 0) {
    return { error: `We could not find a matching published result for Roll Number: ${sanitizedRoll}` }
  }

  const studentIds = students.map(s => s.id)

  // Find the published result for any of these student records (get the latest one)
  const { data: results, error: resultError } = await supabaseAdmin
    .from('results')
    .select(`
      id,
      total_marks,
      maximum_marks,
      percentage,
      grade,
      result_status,
      published_at,
      exams ( exam_name, academic_years (name) )
    `)
    .in('student_id', studentIds)
    .eq('publication_status', 'PUBLISHED')
    .order('published_at', { ascending: false })

  if (resultError || !results || results.length === 0) {
    return { error: 'We could not find a matching published result.' }
  }

  return {
    success: true,
    results: results.map((r: any) => ({
      id: r.id,
      exam_name: r.exams?.exam_name,
      academic_year: r.exams?.academic_years?.name,
      published_at: r.published_at
    }))
  }
}

export async function verifyAndFetchResultByExam(yearId: string, examId: string, rollNumber: string) {
  const identifier = getIdentifier('convenience', yearId, examId, rollNumber)
  if (!checkRateLimit(identifier)) {
    return { error: 'Too many requests. Please try again in a minute.' }
  }

  const sanitizedRoll = rollNumber.replace(/\./g, '-').toUpperCase().trim()
  
  // Find students with this roll number in this academic year
  const { data: students, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('academic_year_id', yearId)
    .eq('roll_number', sanitizedRoll)
    .eq('status', 'ACTIVE')

  if (studentError || !students || students.length === 0) {
    return { error: `No active student found with Roll Number: ${sanitizedRoll}` }
  }

  const studentIds = students.map(s => s.id)

  const { data: results, error: resultError } = await supabaseAdmin
    .from('results')
    .select(`
      id,
      published_at,
      exams ( exam_name, academic_years (name) )
    `)
    .in('student_id', studentIds)
    .eq('exam_id', examId)
    .eq('publication_status', 'PUBLISHED')
    .order('published_at', { ascending: false })

  if (resultError || !results || results.length === 0) {
    return { error: 'No published result found for this exam and roll number.' }
  }

  return {
    success: true,
    results: results.map((r: any) => ({
      id: r.id,
      exam_name: r.exams?.exam_name,
      academic_year: r.exams?.academic_years?.name,
      published_at: r.published_at
    }))
  }
}

export async function getActiveSchools() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('id, school_name')
    .eq('status', 'ACTIVE')
    .order('school_name')
  
  if (error) return []
  return data
}

export async function getPublicSettings() {
  const { data, error } = await supabaseAdmin
    .from('global_settings')
    .select('setting_value')
    .eq('setting_key', 'public_search_mode')
    .single()
  
  if (error || !data) return { mode: 'SCHOOL_ROLL_DOB' }
  return data.setting_value
}

export async function getPublicFormOptions() {
  const [schools, years, exams] = await Promise.all([
    supabaseAdmin.from('schools').select('id, school_name').eq('status', 'ACTIVE').order('school_name'),
    supabaseAdmin.from('academic_years').select('id, name').eq('status', 'ACTIVE').order('name'),
    supabaseAdmin.from('exams').select('id, academic_year_id, exam_name').eq('status', 'ACTIVE').order('exam_name')
  ])
  return {
    schools: schools.data || [],
    years: years.data || [],
    exams: exams.data || []
  }
}

export async function fetchStudentsByMobile(schoolId: string, mobileNumber: string) {
  const identifier = getIdentifier('mobile', schoolId, mobileNumber)
  if (!checkRateLimit(identifier)) {
    return { error: 'Too many requests. Please try again in a minute.' }
  }

  const { data: students, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, student_name, class_name, roll_number')
    .eq('school_id', schoolId)
    .eq('mobile_number', mobileNumber.trim())
    .eq('status', 'ACTIVE')

  if (studentError || !students || students.length === 0) {
    return { error: 'No active student found with this mobile number.' }
  }

  return { success: true, students }
}

export async function fetchResultsByStudentId(studentId: string) {
  const { data: results, error: resultError } = await supabaseAdmin
    .from('results')
    .select(`
      id,
      published_at,
      exams ( exam_name, academic_years (name) )
    `)
    .eq('student_id', studentId)
    .eq('publication_status', 'PUBLISHED')
    .order('published_at', { ascending: false })

  if (resultError || !results || results.length === 0) {
    return { error: 'No published result found for this student.' }
  }

  return {
    success: true,
    results: results.map((r: any) => ({
      id: r.id,
      exam_name: r.exams?.exam_name,
      academic_year: r.exams?.academic_years?.name,
      published_at: r.published_at
    }))
  }
}

