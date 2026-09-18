import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

import { ResultActions } from '@/components/ResultActions'

// Cache this page for 1 hour (3600 seconds) on Vercel's global CDN.
// This allows the portal to handle tens of thousands of concurrent users
// without overwhelming the Supabase database.
export const revalidate = 3600 

export default async function ResultPage({ params }: { params: { id: string } }) {
  const { id } = await params
  
  const { data: result, error: resultError } = await supabaseAdmin
    .from('results')
    .select(`
      id,
      total_marks,
      maximum_marks,
      percentage,
      grade,
      result_status,
      published_at,
      calculation_version,
      metadata,
      students!inner ( roll_number, student_name, class_name, division, date_of_birth, mobile_number, schools!inner (id, school_name, logo_url, address, status) ),
      exams ( exam_name, academic_years (name) ),
      result_marks (
        marks_obtained,
        maximum_marks,
        passing_marks,
        subjects ( subject_name, display_order )
      )
    `)
    .eq('id', id)
    .eq('publication_status', 'PUBLISHED')
    .single()

  if (resultError || !result || (result.students as any).schools.status !== 'ACTIVE') {
    notFound()
  }

  const marks = result.result_marks as any
  const student = result.students as any
  const school = student.schools as any
  const exam = result.exams as any

  // --- TEMPLATE COMPILATION ---
  
  // 1. Fetch template
  const { data: templateData } = await supabaseAdmin
    .from('global_settings')
    .select('setting_value')
    .eq('setting_key', 'universal_result_template')
    .single()

  let templateStr = templateData?.setting_value?.html
  if (!templateStr || templateStr.trim() === '') {
    // Fallback to default
    const { defaultResultTemplate } = await import('@/lib/defaultTemplate')
    templateStr = defaultResultTemplate
  }

  // 2. Build Marks Table HTML with Inline Styles (Tailwind Proof)
  let marksHtml = `
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: sans-serif; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
          <th style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase;">Subject</th>
          <th style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; text-align: center;">Max Marks</th>
          <th style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; text-align: center;">Passing</th>
          <th style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; text-align: center;">Marks Obtained</th>
        </tr>
      </thead>
      <tbody>
  `
  marks?.forEach((m: any) => {
    marksHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 16px; color: #334155; font-size: 15px;">${m.subjects.subject_name}</td>
          <td style="padding: 16px; color: #334155; font-size: 15px; text-align: center;">${m.maximum_marks}</td>
          <td style="padding: 16px; color: #334155; font-size: 15px; text-align: center;">${m.passing_marks}</td>
          <td style="padding: 16px; color: #0f172a; font-size: 16px; text-align: center;"><strong>${m.marks_obtained}</strong></td>
        </tr>
    `
  })

  // Add metadata if any
  if (result.metadata && Object.keys(result.metadata).length > 0) {
    Object.entries(result.metadata).forEach(([key, value]) => {
      marksHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
          <td style="padding: 16px; color: #64748b; font-size: 14px; text-transform: capitalize;">${key.replace(/_/g, ' ')}</td>
          <td style="padding: 16px; color: #94a3b8; font-size: 14px; text-align: center;">-</td>
          <td style="padding: 16px; color: #94a3b8; font-size: 14px; text-align: center;">-</td>
          <td style="padding: 16px; color: #0f172a; font-size: 16px; text-align: center;"><strong>${String(value)}</strong></td>
        </tr>
      `
    })
  }

  marksHtml += `
      </tbody>
    </table>
  `

  // 3. Inject Variables
  let compiledHtml = templateStr
    .replace(/\{\{school_name\}\}/g, school.school_name || '')
    .replace(/\{\{school_address\}\}/g, school.address || '')
    .replace(/\{\{exam_name\}\}/g, exam?.exam_name || '')
    .replace(/\{\{academic_year\}\}/g, exam?.academic_years?.name || '')
    .replace(/\{\{student_name\}\}/g, student.student_name || '')
    .replace(/\{\{roll_number\}\}/g, student.roll_number || '')
    .replace(/\{\{class_name\}\}/g, student.class_name || '')
    .replace(/\{\{division\}\}/g, student.division ? `- ${student.division}` : '')
    .replace(/\{\{date_of_birth\}\}/g, new Date(student.date_of_birth).toLocaleDateString())
    .replace(/\{\{mobile_number\}\}/g, student.mobile_number || 'N/A')
    .replace(/\{\{total_marks\}\}/g, result.total_marks !== null ? String(result.total_marks) : 'N/A')
    .replace(/\{\{maximum_marks\}\}/g, result.maximum_marks !== null ? String(result.maximum_marks) : 'N/A')
    .replace(/\{\{percentage\}\}/g, result.percentage !== null ? String(result.percentage) : 'N/A')
    .replace(/\{\{grade\}\}/g, result.grade || 'N/A')
    .replace(/\{\{result_status\}\}/g, result.result_status || 'N/A')
    .replace(/\{\{marks_table\}\}/g, marksHtml)

  // Try to avoid html2canvas tainted canvas issues with external images
  compiledHtml = compiledHtml.replace(/<img /gi, '<img crossorigin="anonymous" ')

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <ResultActions resultId={id} studentName={student.student_name} />

        {/* The wrapper ID is required for html2pdf.js to target the correct element */}
        <div id="printable-result-card" className="bg-white shadow-lg border-2 border-gray-100 print:shadow-none print:border-none print:m-0 print:p-0">
          <div dangerouslySetInnerHTML={{ __html: compiledHtml }} />
        </div>
      </div>
    </div>
  )
}
