'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function createSchoolAdminAction(email: string, password: string, name: string, schoolId: string) {
  const supabase = await createClient()
  
  // Verify current user is SUPER_ADMIN
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'SUPER_ADMIN') return { error: 'Forbidden' }

  // Create user in Auth
  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return { error: authError?.message || 'Failed to create auth user' }
  }

  // Create profile
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: newUser.user.id,
    role: 'SCHOOL_ADMIN',
    school_id: schoolId,
    name,
    status: 'ACTIVE'
  })

  if (profileError) {
    // Rollback auth user
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return { error: profileError.message }
  }

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: user.id,
    action: 'CREATED_SCHOOL_ADMIN',
    entity: 'profiles',
    entity_id: newUser.user.id,
    description: `Created admin for school ${schoolId}`
  })

  return { success: true }
}
