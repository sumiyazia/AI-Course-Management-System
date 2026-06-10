'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
  }, [user, isLoading, router])

  if (isLoading) return (
    <div className="min-h-screen bg-teal-gradient flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-semibold">Loading LMSZone...</p>
      </div>
    </div>
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Navbar />
      <Sidebar />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
