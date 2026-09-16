'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SchoolAdminDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({ students: 0, results: 0 })
  const [schoolName, setSchoolName] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('school_id, schools(school_name)').eq('id', user.id).single()
      
      if (profile) {
        const school = profile.schools as any
        setSchoolName(school?.school_name || 'School')
        
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', profile.school_id)
        const { count: resultCount } = await supabase.from('results').select('*', { count: 'exact', head: true }).eq('school_id', profile.school_id)
        
        setStats({
          students: studentCount || 0,
          results: resultCount || 0
        })
      }
    }
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard - {schoolName}</h2>
        <Link href="/dashboard/import">
          <Button><Upload className="w-4 h-4 mr-2" /> Import Results CSV</Button>
        </Link>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Results</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.results}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="flex gap-4">
          <Link href="/dashboard/results">
            <Button variant="outline" className="w-48 h-24 flex flex-col items-center justify-center">
              <FileText className="w-8 h-8 mb-2 text-blue-600" />
              Manage & Publish Results
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
