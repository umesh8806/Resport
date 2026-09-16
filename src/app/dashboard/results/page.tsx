'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ResultsPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [schoolId, setSchoolId] = useState<string | null>(null)

  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchResults = async () => {
    setLoading(true)
    let query = supabase
      .from('results')
      .select('*, students!inner(*), exams!inner(*)')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (statusFilter !== 'ALL') {
      query = query.eq('publication_status', statusFilter)
    }
    
    if (debouncedSearch) {
      query = query.ilike('students.student_name', `%${debouncedSearch}%`)
    }

    const { data } = await query
    if (data) setResults(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchResults()
  }, [statusFilter, debouncedSearch])

  const togglePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PUBLISHED' ? 'UNPUBLISHED' : 'PUBLISHED'
    const payload: any = { publication_status: newStatus }
    if (newStatus === 'PUBLISHED') payload.published_at = new Date().toISOString()
    
    const { error } = await supabase.from('results').update(payload).eq('id', id)
    if (error) alert(error.message)
    else fetchResults()
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6">
        <Input 
          placeholder="Search student name..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'ALL')}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="UNPUBLISHED">Unpublished</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-md shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Publication</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
            ) : results.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.students.roll_number}</TableCell>
                <TableCell>{r.students.student_name}</TableCell>
                <TableCell>{r.exams.exam_name}</TableCell>
                <TableCell>{r.percentage !== null ? `${r.percentage}%` : '-'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${r.result_status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {r.result_status}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    r.publication_status === 'PUBLISHED' ? 'bg-blue-100 text-blue-800' : 
                    r.publication_status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {r.publication_status}
                  </span>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => togglePublish(r.id, r.publication_status)}>
                    {r.publication_status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {results.length === 0 && !loading && (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-500">No results found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
