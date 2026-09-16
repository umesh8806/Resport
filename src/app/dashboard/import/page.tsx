'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateCsvAction, confirmImportAction } from '@/actions/csvImport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Upload as UploadIcon, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ImportPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState<string | null>(null)

  const [yearId, setYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [preview, setPreview] = useState<any>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
        setSchoolId(profile?.school_id)
      }

      const { data: years } = await supabase.from('academic_years').select('*').eq('status', 'ACTIVE')
      if (years) setAcademicYears(years)
    }
    loadData()
  }, [])

  useEffect(() => {
    async function loadExams() {
      if (!yearId) {
        setExams([])
        return
      }
      const { data } = await supabase.from('exams').select('*').eq('academic_year_id', yearId).eq('status', 'ACTIVE')
      if (data) setExams(data)
    }
    loadExams()
  }, [yearId])

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !yearId || !examId || !schoolId) return

    setLoading(true)
    setError(null)
    setPreview(null)
    setSuccess(false)

    try {
      const text = await file.text()
      const res = await validateCsvAction(schoolId, yearId, examId, 'v1', text)
      
      if (res.error) {
        setError(res.error)
      } else {
        setPreview(res.stats)
        setJobId(res.jobId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process file')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!jobId) return
    setImporting(true)
    setError(null)
    
    try {
      const res = await confirmImportAction(jobId)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setPreview(null)
        setFile(null)
      }
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Import Results</h2>
        <a href="/api/template" download>
          <Button variant="outline"><Download className="w-4 h-4 mr-2"/> Download Template</Button>
        </a>
      </div>

      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="w-5 h-5 mr-2 text-green-600 inline" />
          <AlertDescription className="inline">Import completed successfully!</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5 mr-2 inline" />
          <AlertDescription className="inline">{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>Select academic year, exam, and upload the filled template.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleValidate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={yearId} onValueChange={(v) => setYearId(v || '')} required>
                  <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exam</Label>
                <Select value={examId} onValueChange={(v) => setExamId(v || '')} required disabled={!yearId}>
                  <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
                  <SelectContent>
                    {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.exam_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>CSV File</Label>
              <Input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} required />
            </div>

            <Button type="submit" disabled={loading || !file || preview}>
              {loading ? 'Validating...' : <><UploadIcon className="w-4 h-4 mr-2" /> Validate File</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {preview && (
        <Card className="border-blue-200 shadow-md">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle>Import Preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded border">
                <p className="text-sm text-gray-500">Total Rows</p>
                <p className="text-2xl font-bold">{preview.total}</p>
              </div>
              <div className="p-4 bg-green-50 rounded border border-green-100">
                <p className="text-sm text-green-700">Valid Rows</p>
                <p className="text-2xl font-bold text-green-700">{preview.valid}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded border border-blue-100">
                <p className="text-sm text-blue-700">New Students</p>
                <p className="text-2xl font-bold text-blue-700">{preview.newStudents}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded border border-orange-100">
                <p className="text-sm text-orange-700">Updates</p>
                <p className="text-2xl font-bold text-orange-700">{preview.updatedStudents}</p>
              </div>
            </div>

            {preview.invalid > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Errors ({preview.invalid})</h3>
                <div className="bg-red-50 p-4 rounded border border-red-200 max-h-64 overflow-y-auto">
                  <table className="w-full text-sm text-left text-red-900">
                    <thead>
                      <tr><th>Row</th><th>Student</th><th>Field</th><th>Error</th></tr>
                    </thead>
                    <tbody>
                      {preview.errors.map((err: any, i: number) => (
                        <tr key={i} className="border-t border-red-100">
                          <td className="py-1">{err.row_number}</td>
                          <td className="py-1">{err.student_name}</td>
                          <td className="py-1">{err.field}</td>
                          <td className="py-1 font-medium">{err.error_message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.invalid > 50 && <p className="text-xs mt-2 text-red-700">Showing first 50 errors...</p>}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button variant="outline" onClick={() => { setPreview(null); setJobId(null) }} disabled={importing}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={importing || preview.invalid > 0} className="bg-blue-600 hover:bg-blue-700">
                {importing ? 'Importing...' : 'Confirm Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
