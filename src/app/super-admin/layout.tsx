'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Home, Building, Users, Settings, Database, Activity } from 'lucide-react'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white">Super Admin</h1>
        </div>
        <div className="flex-1 py-4 flex flex-col gap-1 px-4">
          <Link href="/super-admin/dashboard" className={`flex items-center px-3 py-2 rounded-md ${pathname === '/super-admin/dashboard' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            <Home className="w-5 h-5 mr-3" /> Dashboard
          </Link>
          <Link href="/super-admin/schools" className={`flex items-center px-3 py-2 rounded-md ${pathname.includes('/schools') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            <Building className="w-5 h-5 mr-3" /> Schools
          </Link>
          <Link href="/super-admin/admins" className={`flex items-center px-3 py-2 rounded-md ${pathname.includes('/admins') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            <Users className="w-5 h-5 mr-3" /> Admins
          </Link>
          <Link href="/super-admin/config" className={`flex items-center px-3 py-2 rounded-md ${pathname.includes('/config') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            <Settings className="w-5 h-5 mr-3" /> Global Config
          </Link>
          <Link href="/super-admin/import" className={`flex items-center px-3 py-2 rounded-md ${pathname.includes('/import') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            <Database className="w-5 h-5 mr-3" /> Global Import
          </Link>
          <Link href="/super-admin/audit" className={`flex items-center px-3 py-2 rounded-md ${pathname.includes('/audit') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            <Activity className="w-5 h-5 mr-3" /> Audit Logs
          </Link>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center w-full px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-md transition-colors">
            <LogOut className="w-5 h-5 mr-3" /> Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 capitalize">
            {pathname.split('/').pop()?.replace('-', ' ')}
          </h2>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
