'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Home, Upload, Users, FileText, Settings } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">School Admin</h1>
        </div>
        <div className="flex-1 py-4 flex flex-col gap-1 px-4">
          <Link href="/dashboard" className={`flex items-center px-3 py-2 rounded-md ${pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Home className="w-5 h-5 mr-3" /> Dashboard
          </Link>
          <Link href="/dashboard/students" className={`flex items-center px-3 py-2 rounded-md ${pathname.includes('/students') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Users className="w-5 h-5 mr-3" /> Students
          </Link>
          <Link href="/dashboard/results" className={`flex items-center px-3 py-2 rounded-md ${pathname.includes('/results') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FileText className="w-5 h-5 mr-3" /> Results
          </Link>
          <Link href="/dashboard/import" className={`flex items-center px-3 py-2 rounded-md ${pathname.includes('/import') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Upload className="w-5 h-5 mr-3" /> Import CSV
          </Link>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout} className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
            <LogOut className="w-5 h-5 mr-3" /> Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8">
          <h2 className="text-xl font-semibold text-gray-800">
            {pathname === '/dashboard' ? 'Dashboard' : 
             pathname.includes('/import') ? 'Import Results' :
             pathname.includes('/students') ? 'Students' :
             pathname.includes('/results') ? 'Results' : ''}
          </h2>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
