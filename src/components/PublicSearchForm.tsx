'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyAndFetchResult, verifyAndFetchResultByExam } from '@/actions/publicResult'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function PublicSearchForm({ initialMode, initialOptions }: { initialMode: string, initialOptions: any }) {
  const [mode] = useState(initialMode)
  const [options] = useState(initialOptions)
  
  const [schoolId, setSchoolId] = useState('')
  const [yearId, setYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [dob, setDob] = useState('')
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [availableResults, setAvailableResults] = useState<{id: string, exam_name: string, academic_year: string, published_at: string}[] | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let res;
      if (mode === 'SCHOOL_ROLL_DOB') {
        if (!schoolId || !rollNumber || !dob) { setError('Please fill in all fields.'); setLoading(false); return; }
        res = await verifyAndFetchResult(schoolId, rollNumber, dob)
      } else {
        if (!yearId || !examId || !rollNumber) { setError('Please fill in all fields.'); setLoading(false); return; }
        res = await verifyAndFetchResultByExam(yearId, examId, rollNumber)
      }

      if (res.error) setError(res.error)
      else if (res.results && res.results.length > 0) setAvailableResults(res.results)
      else setError('No published results found.')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredExams = options.exams.filter((e: any) => e.academic_year_id === yearId)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-blue-600">
        <CardHeader className="text-center bg-white border-b pb-6">
          <CardTitle className="text-2xl font-bold text-blue-900">Student Results Portal</CardTitle>
          <CardDescription>
            {availableResults 
              ? 'Select the exam result you wish to view.' 
              : 'Enter your details to view your academic result.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 bg-white">
          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
          
          {!availableResults ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {mode === 'SCHOOL_ROLL_DOB' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">School</Label>
                    <Select value={schoolId} onValueChange={(v) => setSchoolId(v || '')}>
                      <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select your school" /></SelectTrigger>
                      <SelectContent>
                        {options.schools.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.school_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Roll Number</Label>
                    <Input type="text" placeholder="Enter Roll Number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required className="bg-gray-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Date of Birth</Label>
                    <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className="bg-gray-50" />
                  </div>
                </>
              )}

              {mode === 'YEAR_EXAM_ROLL' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Academic Year</Label>
                    <Select value={yearId} onValueChange={(val) => { setYearId(val || ''); setExamId(''); }}>
                      <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select Year" /></SelectTrigger>
                      <SelectContent>
                        {options.years.map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Exam</Label>
                    <Select value={examId} onValueChange={(v) => setExamId(v || '')} disabled={!yearId}>
                      <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select Exam" /></SelectTrigger>
                      <SelectContent>
                        {filteredExams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.exam_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Roll Number</Label>
                    <Input type="text" placeholder="Enter Roll Number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required className="bg-gray-50" />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 mt-2" disabled={loading}>
                {loading ? 'Searching...' : 'Search Results'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                {availableResults.map((res) => (
                  <Button key={res.id} variant="outline" className="h-auto p-4 flex flex-col items-start text-left justify-start gap-1 hover:bg-blue-50 hover:border-blue-300 transition-colors border-gray-200 shadow-sm" onClick={() => router.push(`/result/${res.id}`)}>
                    <span className="font-bold text-lg text-blue-900">{res.exam_name}</span>
                    <span className="text-sm text-gray-600">Academic Year: {res.academic_year}</span>
                    <span className="text-xs text-gray-400">Published: {new Date(res.published_at).toLocaleDateString()}</span>
                  </Button>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-gray-500 hover:text-gray-700" onClick={() => setAvailableResults(null)}>
                ← Back to Search
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 text-center text-sm text-gray-400">
        <a href="/login" className="hover:text-gray-600 transition-colors">Admin Login</a>
      </div>
    </div>
  )
}
