'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles(name), schools(school_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setLogs(data)
      setLoading(false)
    }
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Audit Logs</h2>

      <div className="bg-white rounded-md shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : logs.map(l => {
              const profile = l.profiles as any
              const school = l.schools as any
              return (
              <TableRow key={l.id}>
                <TableCell className="text-sm">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell>{profile?.name || 'System'}</TableCell>
                <TableCell><span className="font-medium text-blue-700">{l.action}</span></TableCell>
                <TableCell>{l.entity}</TableCell>
                <TableCell>{school?.school_name || '-'}</TableCell>
                <TableCell className="text-gray-500 text-sm">{l.description}</TableCell>
              </TableRow>
            )})}
            {logs.length === 0 && !loading && (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-500">No logs found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
