'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Plus, Edit } from 'lucide-react'

export default function ConfigPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Data
  const [schools, setSchools] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [searchMode, setSearchMode] = useState('SCHOOL_ROLL_DOB')

  // Forms State
  const [newSubject, setNewSubject] = useState({ code: '', name: '', max: 100, pass: 35 })
  const [newClass, setNewClass] = useState('')
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [newMapping, setNewMapping] = useState({ subjectId: '', max: 100, pass: 35 })

  const [templateHtml, setTemplateHtml] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (selectedSchoolId) loadClasses(selectedSchoolId)
    else setClasses([])
  }, [selectedSchoolId])

  useEffect(() => {
    if (selectedClassId) loadClassSubjects(selectedClassId)
    else setClassSubjects([])
  }, [selectedClassId])

  const loadAll = async () => {
    setLoading(true)
    const [subRes, schRes, setRes, tmplRes] = await Promise.all([
      supabase.from('subjects').select('*').order('subject_name'),
      supabase.from('schools').select('*').order('school_name'),
      supabase.from('global_settings').select('setting_value').eq('setting_key', 'public_search_mode').single(),
      supabase.from('global_settings').select('setting_value').eq('setting_key', 'universal_result_template').single()
    ])
    if (subRes.data) setSubjects(subRes.data)
    if (schRes.data) setSchools(schRes.data)
    if (setRes.data) setSearchMode(setRes.data.setting_value.mode)
    if (tmplRes.data) setTemplateHtml(tmplRes.data.setting_value.html)
    setLoading(false)
  }

  const handleUpdateSearchMode = async (mode: string) => {
    setSearchMode(mode)
    const { error } = await supabase.from('global_settings').upsert(
      { setting_key: 'public_search_mode', setting_value: { mode } },
      { onConflict: 'setting_key' }
    )
    if (error) showMsg(error.message, null)
    else showMsg(null, 'Public Search Mode updated successfully!')
  }

  const handleUpdateTemplate = async () => {
    const { error } = await supabase.from('global_settings').upsert(
      { setting_key: 'universal_result_template', setting_value: { html: templateHtml } },
      { onConflict: 'setting_key' }
    )
    if (error) showMsg(error.message, null)
    else showMsg(null, 'Universal HTML Template updated successfully!')
  }

  const loadClasses = async (schoolId: string) => {
    const { data } = await supabase.from('class_configs').select('*').eq('school_id', schoolId).order('class_name')
    if (data) setClasses(data)
  }

  const loadClassSubjects = async (classId: string) => {
    const { data } = await supabase
      .from('class_subjects')
      .select('*, subjects(subject_name, subject_code)')
      .eq('class_config_id', classId)
    if (data) setClassSubjects(data)
  }

  const showMsg = (err: string | null, succ: string | null) => {
    setError(err); setSuccess(succ)
    setTimeout(() => { setError(null); setSuccess(null) }, 5000)
  }

  // --- Handlers ---
  const handleAddSubject = async () => {
    if (!newSubject.code || !newSubject.name) return showMsg('Code and Name required', null)
    const { error } = await supabase.from('subjects').insert({
      subject_code: newSubject.code.toUpperCase(),
      subject_name: newSubject.name,
      maximum_marks: newSubject.max,
      passing_marks: newSubject.pass,
      active: true
    })
    if (error) showMsg(error.message, null)
    else { showMsg(null, 'Subject added globally'); loadAll(); setNewSubject({ code: '', name: '', max: 100, pass: 35 }) }
  }

  const handleAddClass = async () => {
    if (!newClass || !selectedSchoolId) return
    const { error } = await supabase.from('class_configs').insert({ class_name: newClass, school_id: selectedSchoolId })
    if (error) showMsg(error.message, null)
    else { showMsg(null, 'Class added'); loadClasses(selectedSchoolId); setNewClass('') }
  }

  const handleAddMapping = async () => {
    if (!selectedClassId || !newMapping.subjectId) return
    const { error } = await supabase.from('class_subjects').insert({
      class_config_id: selectedClassId,
      subject_id: newMapping.subjectId,
      maximum_marks: newMapping.max,
      passing_marks: newMapping.pass
    })
    if (error) showMsg(error.message, null)
    else { showMsg(null, 'Subject mapped to class successfully'); loadClassSubjects(selectedClassId) }
  }

  const handleRemoveMapping = async (mappingId: string) => {
    const { error } = await supabase.from('class_subjects').delete().eq('id', mappingId)
    if (error) showMsg(error.message, null)
    else { showMsg(null, 'Mapping removed'); loadClassSubjects(selectedClassId) }
  }

  if (loading && subjects.length === 0) return <div className="p-8">Loading configuration...</div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dynamic Class & Subject Configuration</h2>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="bg-green-50 text-green-800"><AlertDescription>{success}</AlertDescription></Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 0. PUBLIC PORTAL SETTINGS */}
        <Card className="md:col-span-2 border-green-200 shadow-sm">
          <CardHeader className="bg-green-50 border-b border-green-100">
            <CardTitle className="text-green-900">Public Portal Settings</CardTitle>
            <CardDescription className="text-green-700">Configure how students search for their results on the main website.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="w-full max-w-xl">
              <Label>Search Form Mode</Label>
              <Select value={searchMode} onValueChange={(val) => { if (val) handleUpdateSearchMode(val); }}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select search mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHOOL_ROLL_DOB">
                    <div className="font-medium">Strict Security Mode</div>
                    <div className="text-xs text-gray-500">School + Roll Number + Date of Birth</div>
                  </SelectItem>
                  <SelectItem value="YEAR_EXAM_ROLL">
                    <div className="font-medium">Convenience Mode (Global Roll Number)</div>
                    <div className="text-xs text-gray-500">Academic Year + Exam + Roll Number</div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-3">
                {searchMode === 'SCHOOL_ROLL_DOB' 
                  ? 'Highly secure. Requires Date of Birth to verify identity. Handles duplicate roll numbers across different schools safely.'
                  : 'Requires Roll Numbers to be entirely unique across the whole platform for a given exam. Faster for students, but less secure.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 0.5 UNIVERSAL HTML TEMPLATE */}
        <Card className="md:col-span-2 border-purple-200 shadow-sm">
          <CardHeader className="bg-purple-50 border-b border-purple-100">
            <CardTitle className="text-purple-900">Universal Result HTML Template</CardTitle>
            <CardDescription className="text-purple-700">Customize the exact HTML and CSS layout for all result cards (Web & PDF).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md border">
              <strong>Available Variables:</strong> 
              <code className="mx-2">{'{{school_name}}'}</code>
              <code className="mx-2">{'{{school_address}}'}</code>
              <code className="mx-2">{'{{exam_name}}'}</code>
              <code className="mx-2">{'{{academic_year}}'}</code>
              <code className="mx-2">{'{{student_name}}'}</code>
              <code className="mx-2">{'{{roll_number}}'}</code>
              <code className="mx-2">{'{{class_name}}'}</code>
              <code className="mx-2">{'{{division}}'}</code>
              <code className="mx-2">{'{{date_of_birth}}'}</code>
              <code className="mx-2">{'{{total_marks}}'}</code>
              <code className="mx-2">{'{{maximum_marks}}'}</code>
              <code className="mx-2">{'{{percentage}}'}</code>
              <code className="mx-2">{'{{grade}}'}</code>
              <code className="mx-2">{'{{result_status}}'}</code><br/>
              <strong>Special Table Injector:</strong> <code className="mx-2">{'{{marks_table}}'}</code> (Automatically generates the grades table)
            </div>
            
            <textarea
              className="w-full h-96 p-4 font-mono text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={templateHtml}
              onChange={(e) => setTemplateHtml(e.target.value)}
              placeholder="<!-- Leave blank to use the system default template -->"
            />
            <Button onClick={handleUpdateTemplate} className="bg-purple-600 hover:bg-purple-700 text-white">Save Template</Button>
          </CardContent>
        </Card>

        {/* 1. GLOBAL SUBJECTS */}
        <Card>
          <CardHeader>
            <CardTitle>Global Subject Registry</CardTitle>
            <CardDescription>Define all possible subjects taught across any school.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-2 items-end bg-gray-50 p-4 rounded-md">
              <div className="col-span-1 space-y-1"><Label>Code</Label><Input value={newSubject.code} onChange={e=>setNewSubject({...newSubject, code: e.target.value})} placeholder="MATH" /></div>
              <div className="col-span-2 space-y-1"><Label>Name</Label><Input value={newSubject.name} onChange={e=>setNewSubject({...newSubject, name: e.target.value})} placeholder="Mathematics" /></div>
              <div className="col-span-1 space-y-1"><Label>Max</Label><Input type="number" value={newSubject.max} onChange={e=>setNewSubject({...newSubject, max: Number(e.target.value)})} /></div>
              <div className="col-span-1 space-y-1"><Label>Pass</Label><Input type="number" value={newSubject.pass} onChange={e=>setNewSubject({...newSubject, pass: Number(e.target.value)})} /></div>
              <div className="col-span-5 mt-2"><Button onClick={handleAddSubject} className="w-full"><Plus className="w-4 h-4 mr-2"/> Add Global Subject</Button></div>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-gray-100"><tr><th className="p-2 text-left">Code</th><th className="p-2 text-left">Subject</th><th className="p-2">Max</th><th className="p-2">Pass</th></tr></thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 font-medium">{s.subject_code}</td>
                      <td className="p-2">{s.subject_name}</td>
                      <td className="p-2 text-center">{s.maximum_marks}</td>
                      <td className="p-2 text-center">{s.passing_marks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 2. SCHOOL & CLASS CONFIGURATION */}
        <Card className="md:col-span-2 border-blue-200 shadow-sm">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-blue-900">School-Specific Class & Curriculum</CardTitle>
            <CardDescription className="text-blue-700">Select a school and a class to configure its exact subjects and grading scales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            {/* SCHOOL SELECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6">
              <div className="space-y-2">
                <Label>1. Select School</Label>
                <Select value={selectedSchoolId} onValueChange={(val) => { setSelectedSchoolId(val || ''); setSelectedClassId(''); setClasses([]); setClassSubjects([]); }}>
                  <SelectTrigger><SelectValue placeholder="-- Select a School --" /></SelectTrigger>
                  <SelectContent>
                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.school_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedSchoolId && (
                <div className="space-y-2">
                  <Label>2. Select or Add Class</Label>
                  <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || '')}>
                    <SelectTrigger><SelectValue placeholder="-- Select a Class --" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex gap-2 mt-2">
                    <Input value={newClass} onChange={e=>setNewClass(e.target.value)} placeholder="e.g. 10th Standard" className="h-8 text-sm" />
                    <Button size="sm" onClick={handleAddClass} disabled={!newClass}><Plus className="w-4 h-4 mr-1"/> Add</Button>
                  </div>
                </div>
              )}
            </div>

            {/* SUBJECT MAPPING FOR CLASS */}
            {selectedSchoolId && selectedClassId && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center">
                  Subjects for {classes.find(c => c.id === selectedClassId)?.class_name} 
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({schools.find(s => s.id === selectedSchoolId)?.school_name})
                  </span>
                </h3>

                {classSubjects.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No subjects mapped to this class yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {classSubjects.map(cs => (
                      <div key={cs.id} className="border p-3 rounded-md shadow-sm relative group bg-gray-50 hover:bg-white transition-colors border-gray-200">
                        <div className="font-bold text-gray-800">{cs.subjects.subject_name} ({cs.subjects.subject_code})</div>
                        <div className="text-sm text-gray-600 mt-1">Max: {cs.maximum_marks} | Pass: {cs.passing_marks}</div>
                        <button onClick={() => handleRemoveMapping(cs.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-100 bg-blue-50/50 p-4 rounded-md border border-blue-100">
                  <h4 className="text-sm font-medium mb-2 text-blue-900">Map New Subject to this Class</h4>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <Label className="text-xs">Global Subject</Label>
                      <Select value={newMapping.subjectId} onValueChange={(val) => {
                        const s = subjects.find(x => x.id === val)
                        if (s && val) setNewMapping({ subjectId: val, max: s.maximum_marks, pass: s.passing_marks })
                      }}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Max Marks</Label>
                      <Input type="number" value={newMapping.max} onChange={e=>setNewMapping({...newMapping, max: Number(e.target.value)})} className="bg-white" />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Pass Marks</Label>
                      <Input type="number" value={newMapping.pass} onChange={e=>setNewMapping({...newMapping, pass: Number(e.target.value)})} className="bg-white" />
                    </div>
                    <Button onClick={handleAddMapping} disabled={!newMapping.subjectId} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-2"/> Map Subject</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
