'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, FileText, ClipboardCheck, Users,
  BarChart3, PlusCircle, CheckSquare, LogOut, GraduationCap
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'

const teacherLinks = [
  { href: '/dashboard/teacher', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/courses', icon: BookOpen, label: 'My Courses' },
  { href: '/courses/create', icon: PlusCircle, label: 'Create Course' },
  { href: '/exams', icon: FileText, label: 'Assessments' },
  { href: '/submissions', icon: ClipboardCheck, label: 'Submissions' },
]

const studentLinks = [
  { href: '/dashboard/student', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/courses', icon: BookOpen, label: 'Browse Courses' },
  { href: '/exams', icon: FileText, label: 'My Exams' },
  { href: '/submissions', icon: GraduationCap, label: 'My Results' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const links = user?.role === 'teacher' ? teacherLinks : studentLinks

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col py-6 z-40">
      <div className="px-4 mb-6">
        <div className="bg-teal-50 dark:bg-teal-900/30 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-gradient flex items-center justify-center shadow">
            <span className="text-white font-bold">{user?.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate max-w-[120px]">{user?.name}</p>
            <span className={`badge text-[10px] ${user?.role === 'teacher' ? 'badge-teal' : 'badge-orange'}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-teal-gradient text-white shadow-md shadow-teal-200 dark:shadow-teal-900/40'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300'
              )}
            >
              <link.icon className={clsx('w-4 h-4', active ? 'text-white' : 'text-current')} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 mt-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
