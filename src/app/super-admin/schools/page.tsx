'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Form state
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  const fetchSchools = async () => {
    setLoading(true)
    const { data } = await supabase.from('schools').select('*').order('created_at', { ascending: false })
    if (data) setSchools(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchSchools()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('schools').insert({
      school_code: code,
      school_name: name,
      address,
      status: 'ACTIVE'
    })
    
    if (error) {
      alert(error.message)
    } else {
      setOpen(false)
      fetchSchools()
      setCode('')
      setName('')
      setAddress('')
    }
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const { error } = await supabase.from('schools').update({ status: newStatus }).eq('id', id)
    if (error) alert(error.message)
    else fetchSchools()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Schools</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            Add New School
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>School Code</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} required placeholder="SCH001" />
              </div>
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="ABC High School" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Create School</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-md shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
            ) : schools.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.school_code}</TableCell>
                <TableCell>{s.school_name}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {s.status}
                  </span>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(s.id, s.status)}>
                    {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {schools.length === 0 && !loading && (
              <TableRow><TableCell colSpan={4} className="text-center text-gray-500">No schools found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
