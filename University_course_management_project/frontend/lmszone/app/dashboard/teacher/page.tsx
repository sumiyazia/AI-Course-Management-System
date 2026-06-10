'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { coursesApi, examsApi, submissionsApi } from '@/lib/api'
import { BookOpen, FileText, ClipboardCheck, Users, TrendingUp, PlusCircle, ArrowRight, Zap } from 'lucide-react'
import { Course, Exam } from '@/types'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ assessments: 0, submissions: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          coursesApi.my(),
          submissionsApi.teacher()
        ])
        setCourses(cRes.data)
        
        // Calculate stats
        const subList = sRes.data
        const pendingCount = subList.filter((s: any) => s.status === 'pending').length
        
        // We don't have an 'all exams' teacher endpoint, but we can infer from submissions or fetch per course
        // For now, let's just count unique exam_ids in submissions as a proxy, or better, fetch exams
        // Actually, we can just rely on the submissions count for now to fix the "0 evaluate" confusion
        setStats({
          assessments: new Set(subList.map((s: any) => s.exam_id)).size,
          submissions: subList.length
        })
      } catch (err) {
        console.error("Dashboard load error:", err)
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const statCards = [
    { label: 'My Courses', value: courses.length, icon: BookOpen, color: 'from-teal-500 to-teal-700', link: '/courses' },
    { label: 'Total Enrolled', value: courses.reduce((a, c) => a + c.enrolled_count, 0), icon: Users, color: 'from-amber-400 to-amber-600', link: '/courses' },
    { label: 'Total Exams', value: stats.assessments, icon: FileText, color: 'from-teal-600 to-teal-900', link: '/exams' },
    { label: 'Submissions', value: stats.submissions, icon: ClipboardCheck, color: 'from-orange-400 to-orange-600', link: '/submissions' },
  ]

  const quickActions = [
    { label: 'Create Course', icon: PlusCircle, href: '/courses/create', color: 'bg-teal-gradient', desc: 'Add new course with syllabus' },
    { label: 'Generate Exam', icon: Zap, href: '/exams/generate', color: 'bg-orange-gradient', desc: 'AI-powered exam creation' },
    { label: 'View Submissions', icon: ClipboardCheck, href: '/submissions', color: 'bg-teal-gradient', desc: 'Review pending submissions' },
    { label: 'Analytics', icon: TrendingUp, href: '/dashboard/teacher', color: 'bg-orange-gradient', desc: 'Performance insights' },
  ]

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">👋</span>
          <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">
            Welcome back, <span className="text-gradient">{user?.name}</span>
          </h1>
        </div>
        <p className="text-gray-500">Here&apos;s what&apos;s happening with your courses today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((s, i) => (
          <Link href={s.link} key={i} className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-subtle)] card-hover group">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-display text-2xl font-bold text-[var(--text-main)]">{loading ? '...' : s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6">
          <h2 className="font-semibold text-[var(--text-main)] mb-5 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a, i) => (
              <Link key={i} href={a.href} className={`${a.color} text-white rounded-2xl p-4 flex flex-col gap-2 hover:opacity-90 transition-all group`}>
                <a.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-sm">{a.label}</p>
                <p className="text-[11px] text-white/80">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* My Courses */}
        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" /> My Courses
            </h2>
            <Link href="/courses" className="text-xs text-teal-600 font-semibold hover:text-teal-800 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 text-teal-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No courses yet</p>
              <Link href="/courses/create" className="mt-3 inline-flex items-center gap-1 text-teal-600 text-sm font-semibold">
                Create your first course <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.slice(0,4).map(c => (
                <Link key={c.id} href={`/courses/${c.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-main)] transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-teal-gradient flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--text-main)] truncate group-hover:text-teal-700">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.enrolled_count} students enrolled</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-600 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
