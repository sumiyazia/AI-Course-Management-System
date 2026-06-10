'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { coursesApi } from '@/lib/api'
import { BookOpen, Users, PlusCircle, Search, ArrowRight, CheckCircle } from 'lucide-react'
import { Course } from '@/types'

export default function CoursesPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [enrolling, setEnrolling] = useState<string | null>(null)

  const fetchCourses = async () => {
    try {
      const res = user?.role === 'teacher' ? await coursesApi.my() : await coursesApi.list()
      setCourses(res.data)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { fetchCourses() }, [user])

  const handleEnroll = async (courseId: string) => {
    setEnrolling(courseId)
    try {
      await coursesApi.enroll(courseId)
      toast.success('Successfully enrolled!')
      fetchCourses()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Enrollment failed')
    } finally { setEnrolling(null) }
  }

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher_name.toLowerCase().includes(search.toLowerCase())
  )

  const isEnrolled = (id: string) => user?.enrolled_courses?.includes(id)

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">
            {user?.role === 'teacher' ? 'My Courses' : 'Browse Courses'}
          </h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'teacher' ? 'Manage your courses and create new ones' : 'Explore and enroll in available courses'}
          </p>
        </div>
        {user?.role === 'teacher' && (
          <Link href="/courses/create" className="inline-flex items-center gap-2 bg-teal-gradient text-white font-semibold px-5 py-3 rounded-2xl hover:opacity-90 transition shadow-lg shadow-teal-200">
            <PlusCircle className="w-4 h-4" /> Create Course
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search courses or teachers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-card)] transition-all text-sm text-[var(--text-main)]"
        />
      </div>

      {/* Courses grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-3 w-3/4" />
              <div className="h-3 bg-gray-100 rounded mb-2 w-full" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-teal-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 text-lg mb-2">No courses found</h3>
          <p className="text-gray-500 text-sm mb-6">
            {user?.role === 'teacher' ? "You haven't created any courses yet." : "No courses match your search."}
          </p>
          {user?.role === 'teacher' && (
            <Link href="/courses/create" className="inline-flex items-center gap-2 bg-teal-gradient text-white font-semibold px-6 py-3 rounded-2xl">
              <PlusCircle className="w-4 h-4" /> Create First Course
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => (
            <div key={c.id} className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] overflow-hidden card-hover group flex flex-col">
              {/* Card header */}
              <div className="h-3 bg-teal-gradient" />
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3 h-3" />
                    {c.enrolled_count}
                  </div>
                </div>
                <h3 className="font-semibold text-[var(--text-main)] mb-1 group-hover:text-teal-700 transition-colors">{c.title}</h3>
                <p className="text-xs text-gray-500 mb-2">by {c.teacher_name}</p>
                {c.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-4 flex-1">{c.description}</p>
                )}
                <div className="mt-auto flex gap-2">
                  <Link href={`/courses/${c.id}`} className="flex-1 text-center text-sm font-semibold text-teal-700 border-2 border-[var(--border-subtle)] py-2.5 rounded-xl hover:bg-teal-50 transition-colors flex items-center justify-center gap-1">
                    View <ArrowRight className="w-3 h-3" />
                  </Link>
                  {user?.role === 'student' && (
                    isEnrolled(c.id) ? (
                      <div className="flex items-center gap-1 px-3 py-2.5 text-sm font-semibold text-green-700 bg-green-50 rounded-xl">
                        <CheckCircle className="w-3 h-3" /> Enrolled
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEnroll(c.id)}
                        disabled={enrolling === c.id}
                        className="flex-1 text-sm font-semibold text-white bg-teal-gradient py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-60"
                      >
                        {enrolling === c.id ? '...' : 'Enroll'}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
