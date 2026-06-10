'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Bell, LogOut, ChevronDown, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function Navbar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [dropOpen, setDropOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-teal-100 dark:border-teal-900/50 h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="LMSZone Logo" className="w-12 h-12 object-contain" />
          <span className="font-display text-xl font-bold text-teal-800 dark:text-teal-100">
            LMS<span className="text-amber-500">Zone</span>.
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {user && (
            <>
              <button className="relative w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors">
                <Bell className="w-4 h-4 text-teal-600 dark:text-teal-300" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full text-white text-[9px] font-bold flex items-center justify-center">3</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  className="flex items-center gap-2 bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 rounded-2xl px-3 py-2 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-gradient flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-none">{user.name}</p>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-teal-100 dark:border-teal-900 overflow-hidden z-50 animate-slide-up">
                    <Link
                      href={`/dashboard/${user.role}`}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/40 transition-colors"
                      onClick={() => setDropOpen(false)}
                    >
                      <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setDropOpen(false) }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-gray-800"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
