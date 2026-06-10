'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { coursesApi, examsApi } from '@/lib/api'
import { FileText, Zap, BookOpen, ArrowRight, Trash2, Eye, CheckCircle, Clock } from 'lucide-react'
import { Course, Exam } from '@/types'

export default function ExamsPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [examsByCourse, setExamsByCourse] = useState<Record<string, Exam[]>>({})
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const cRes = user?.role === 'teacher' ? await coursesApi.my() : await coursesApi.list()
      const courseList: Course[] = cRes.data
      setCourses(courseList)
      const examMap: Record<string, Exam[]> = {}
      await Promise.all(courseList.map(async (c) => {
        try {
          const eRes = await examsApi.byCourse(c.id)
          if (eRes.data.length > 0) examMap[c.id] = eRes.data
        } catch {}
      }))
      setExamsByCourse(examMap)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user])

  const handleDelete = async (examId: string) => {
    if (!confirm('Delete this exam?')) return
    try {
      await examsApi.delete(examId)
      toast.success('Exam deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const handlePublish = async (examId: string) => {
    try {
      await examsApi.publish(examId)
      toast.success('Exam published!')
      load()
    } catch { toast.error('Failed to publish') }
  }

  const typeColors: Record<string, string> = {
    exam: 'bg-teal-100 text-teal-700',
    quiz: 'bg-amber-100 text-amber-700',
    assignment: 'bg-purple-100 text-purple-700',
  }

  const allExams = Object.values(examsByCourse).flat()

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">
            {user?.role === 'teacher' ? 'Assessments' : 'My Exams'}
          </h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'teacher' ? `${allExams.length} assessments across ${Object.keys(examsByCourse).length} courses` : 'View your available exams and quizzes'}
          </p>
        </div>
        {user?.role === 'teacher' && (
          <Link href="/exams/generate" className="inline-flex items-center gap-2 bg-teal-gradient text-white font-semibold px-5 py-3 rounded-2xl hover:opacity-90 transition shadow-lg shadow-teal-200">
            <Zap className="w-4 h-4" /> Generate Exam
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1,2].map(i => (
            <div key={i} className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="space-y-3">
                {[1,2].map(j => <div key={j} className="h-14 bg-gray-100 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : allExams.length === 0 ? (
        <div className="text-center py-20 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)]">
          <FileText className="w-16 h-16 text-teal-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 text-lg mb-2">No assessments yet</h3>
          {user?.role === 'teacher' ? (
            <>
              <p className="text-gray-500 text-sm mb-6">Generate your first AI-powered exam</p>
              <Link href="/exams/generate" className="inline-flex items-center gap-2 bg-teal-gradient text-white font-semibold px-6 py-3 rounded-2xl">
                <Zap className="w-4 h-4" /> Generate Exam
              </Link>
            </>
          ) : (
            <p className="text-gray-500 text-sm">No exams published yet. Enroll in courses to see exams.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {courses.map(c => {
            const cExams = examsByCourse[c.id] || []
            if (cExams.length === 0) return null
            return (
              <div key={c.id} className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-teal-50 dark:bg-teal-950/40 border-b border-[var(--border-subtle)]">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  <h2 className="font-semibold text-teal-800">{c.title}</h2>
                  <span className="ml-auto text-xs text-teal-600 font-medium">{cExams.length} assessments</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {cExams.map(e => (
                    <div key={e.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[var(--text-main)]">{e.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[e.assessment_type]}`}>
                            {e.assessment_type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">{e.total_marks} marks</span>
                          <span className="text-xs text-gray-500">{e.questions.length} questions</span>
                          {e.deadline && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {new Date(e.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {e.is_published
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Published</span>
                          : <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">Draft</span>
                        }
                        <Link href={`/exams/${e.id}`} className="p-2 rounded-xl hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {user?.role === 'teacher' && !e.is_published && (
                          <button onClick={() => handlePublish(e.id)} className="p-2 rounded-xl hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Publish">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {user?.role === 'teacher' && (
                          <button onClick={() => handleDelete(e.id)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
