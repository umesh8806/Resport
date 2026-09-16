'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { superAdminGlobalImportAction } from '@/actions/superAdminImport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload as UploadIcon, CheckCircle, AlertTriangle, Download as DownloadIcon } from 'lucide-react'

import Papa from 'papaparse'

export default function SuperAdminImportPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  
  const [yearId, setYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !yearId || !examId) return

    setLoading(true)
    setError(null)
    setErrorDetails([])
    setSuccess(null)
    setProgress(0)

    try {
      const text = await file.text()
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      const rows = parsed.data as any[]
      
      if (rows.length === 0) throw new Error('CSV is empty')
      
      const BATCH_SIZE = 500
      let totalImported = 0
      
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const res = await superAdminGlobalImportAction(yearId, examId, batch)
        
        if (res.error) {
          setError(res.error)
          if (res.details) setErrorDetails(res.details)
          return
        }
        totalImported += res.count || 0
        setProgress(Math.round(((i + batch.length) / rows.length) * 100))
      }

      setSuccess(`Successfully imported and Auto-Published ${totalImported} student results globally!`)
      setFile(null)
    } catch (err: any) {
      setError(err.message || 'Failed to process file')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Global Combined Import (Auto-Publish)</h2>
        <a href="/api/template?type=global" download>
          <Button variant="outline"><DownloadIcon className="w-4 h-4 mr-2"/> Download Global Template</Button>
        </a>
      </div>

      <Alert>
        <AlertDescription className="text-blue-800">
          <strong>Note:</strong> The CSV file must include a <code>school_code</code> column to identify which school each student belongs to. 
          Results uploaded here are automatically globally published and immediately available to students.
        </AlertDescription>
      </Alert>

      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="w-5 h-5 mr-2 text-green-600 inline" />
          <AlertDescription className="inline">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5 mr-2 inline" />
          <AlertDescription className="inline font-bold">{error}</AlertDescription>
          {errorDetails.length > 0 && (
            <div className="mt-2 text-sm max-h-40 overflow-y-auto bg-red-50 text-red-900 p-2 rounded">
              {errorDetails.map((msg, i) => <div key={i}>{msg}</div>)}
            </div>
          )}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Global CSV</CardTitle>
          <CardDescription>Select academic year, exam, and upload the combined multi-school template.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
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
              <Label>Combined CSV File</Label>
              <Input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} required />
            </div>

            <Button type="submit" disabled={loading || !file}>
              {loading ? 'Importing & Publishing...' : <><UploadIcon className="w-4 h-4 mr-2" /> Upload & Publish Globally</>}
            </Button>
            
            {loading && progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                <p className="text-xs text-center mt-1">{progress}% Complete</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
