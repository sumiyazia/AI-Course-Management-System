'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { submissionsApi } from '@/lib/api'
import { ClipboardCheck, Award, FileText, Calendar, Eye, ArrowRight } from 'lucide-react'
import { Submission } from '@/types'

export default function SubmissionsPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const call = user.role === 'teacher' ? submissionsApi.teacher() : submissionsApi.my()
    call
      .then(r => setSubmissions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">
          {user?.role === 'teacher' ? 'Student Submissions' : 'My Submissions'}
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.role === 'teacher' 
            ? 'Review and evaluate your students work' 
            : 'Track all your exam submissions and results'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] animate-pulse" />)}
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)]">
          <ClipboardCheck className="w-16 h-16 text-teal-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 text-lg mb-2">No submissions found</h3>
          <p className="text-gray-500 text-sm mb-6">
            {user?.role === 'teacher' ? 'No students have submitted any exams yet.' : 'Take an exam to see your submissions here'}
          </p>
          {user?.role === 'student' && (
            <Link href="/exams" className="inline-flex items-center gap-2 bg-teal-gradient text-white font-semibold px-6 py-3 rounded-2xl">
              Browse Exams <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] overflow-hidden">
          <div className="divide-y border-[var(--border-subtle)]">
            {submissions.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-5 hover:bg-[var(--bg-main)] transition-colors group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  s.status === 'evaluated' ? 'bg-green-500/10' : 'bg-amber-500/10'
                }`}>
                  {s.status === 'evaluated'
                    ? <Award className="w-6 h-6 text-green-600" />
                    : <FileText className="w-6 h-6 text-amber-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-main)] truncate">
                    {s.exam_title || 'Untitled Assessment'}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    {user?.role === 'teacher' && (
                      <span className="font-bold text-teal-700">Student: {s.student_name}</span>
                    )}
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(s.submitted_at).toLocaleString()}
                    </span>
                    <span className="text-gray-400">{s.answers.length} answers</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`badge ${s.status === 'evaluated' ? 'badge-green' : 'badge-orange'}`}>
                    {s.status}
                  </span>
                  {user?.role === 'teacher' ? (
                    <Link href={`/exams/${s.exam_id}`}
                      className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-800 transition-colors">
                      <Eye className="w-4 h-4" /> Grade Now
                    </Link>
                  ) : (
                    s.status === 'evaluated' && (
                      <Link href={`/submissions/${s.id}`}
                        className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-800 transition-colors">
                        <Eye className="w-4 h-4" /> View Result
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
