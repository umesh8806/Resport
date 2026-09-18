'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      let query = supabase
        .from('students')
        .select('*')
        .order('student_name')
        .limit(100)
      
      if (debouncedSearch) {
        query = query.ilike('student_name', `%${debouncedSearch}%`)
      }

      const { data } = await query
      if (data) setStudents(data)
      setLoading(false)
    }
    loadData()
  }, [debouncedSearch])

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6">
        <Input 
          placeholder="Search student name..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="bg-white rounded-md shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>DOB</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
            ) : students.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.roll_number}</TableCell>
                <TableCell>{s.student_name}</TableCell>
                <TableCell>{s.class_name}</TableCell>
                <TableCell>{s.division || '-'}</TableCell>
                <TableCell>{new Date(s.date_of_birth).toLocaleDateString()}</TableCell>
                <TableCell>{s.mobile_number || '-'}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                    {s.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && !loading && (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-500">No students found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
