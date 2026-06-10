'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { coursesApi, examsApi, certificatesApi } from '@/lib/api'
import { BookOpen, Users, FileText, ArrowLeft, CheckCircle, Zap, Clock, BarChart3, MessageCircle, Send, Upload, Trash2, HelpCircle, Award, Share2, X, Lock } from 'lucide-react'
import { Course, Exam, Certificate } from '@/types'
import { materialsApi } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import LearningRoadmap from '@/components/courses/LearningRoadmap'
import CourseCertificate from '@/components/courses/CourseCertificate'
import { CourseRoadmap } from '@/types'

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [pendingStudents, setPendingStudents] = useState<any[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)
  const [deletingCourse, setDeletingCourse] = useState(false)
  const [unenrolling, setUnenrolling] = useState<string | null>(null)

  // RAG / Materials State
  const [materials, setMaterials] = useState<any[]>([])
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [roadmap, setRoadmap] = useState<CourseRoadmap | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'roadmap'>('overview')
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [showCert, setShowCert] = useState(false)
  const [issuingCert, setIssuingCert] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const promises: Promise<any>[] = [
          coursesApi.get(id),
          examsApi.byCourse(id),
          materialsApi.list(id),
          certificatesApi.my(),
        ]
        if (user?.role === 'teacher') {
          promises.push(coursesApi.getPending(id))
          promises.push(coursesApi.getEnrolledStudents(id))
        }

        const res = await Promise.all(promises)
        setCourse(res[0].data)
        setExams(res[1].data)
        setMaterials(res[2].data)

        // Find if I have a certificate for this course
        const myCerts: Certificate[] = res[3].data
        const myCert = myCerts.find(c => c.course_id === id)
        if (myCert) setCertificate(myCert)

        if (user?.role === 'teacher') {
          if (res[4]) setPendingStudents(res[4].data)
          if (res[5]) setEnrolledStudents(res[5].data)
        } else {
          // If student, roadmaps are fetched differently or through coursesApi.getRoadmap(id)
          try {
            const rdRes = await coursesApi.getRoadmap(id)
            setRoadmap(rdRes.data)
          } catch { }
        }
      } catch { router.push('/courses') }
      finally { setLoading(false) }
    }
    load()
  }, [id, user?.role])

  const isEnrolled = user?.enrolled_courses?.includes(id)
  const isPending = user?.pending_courses?.includes(id)

  const handleEnroll = async () => {
    setEnrolling(true)
    try {
      const resp = await coursesApi.enroll(id)
      toast.success(resp.data.message || 'Enrollment request sent!')
      const res = await coursesApi.get(id)
      setCourse(res.data)
      window.location.reload()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Enrollment failed')
    } finally { setEnrolling(false) }
  }

  const handleApprove = async (student_id: string, approve: boolean) => {
    setApproving(student_id)
    try {
      await coursesApi.approve(id, student_id, approve)
      toast.success(approve ? 'Student approved!' : 'Student rejected.')
      const [pRes, eRes, cRes] = await Promise.all([
        coursesApi.getPending(id),
        coursesApi.getEnrolledStudents(id),
        coursesApi.get(id)
      ])
      setPendingStudents(pRes.data)
      setEnrolledStudents(eRes.data)
      setCourse(cRes.data)
    } catch (err: any) {
      toast.error('Failed to update status')
    } finally {
      setApproving(null)
    }
  }

  const handleUnenroll = async (student_id: string) => {
    if (!confirm('Are you sure you want to remove this student from the course?')) return
    setUnenrolling(student_id)
    try {
      await coursesApi.unenrollStudent(id, student_id)
      toast.success('Student removed from course')
      const [eRes, cRes] = await Promise.all([
        coursesApi.getEnrolledStudents(id),
        coursesApi.get(id)
      ])
      setEnrolledStudents(eRes.data)
      setCourse(cRes.data)
    } catch {
      toast.error('Failed to remove student')
    } finally {
      setUnenrolling(null)
    }
  }

  const handleIssueCertificate = async (student_id: string) => {
    if (!confirm('This will officially complete the course for this student and award a certificate. Continue?')) return
    setIssuingCert(student_id)
    try {
      await certificatesApi.issue({ course_id: id, student_id })
      toast.success('Certificate issued successfully!')
      // Refresh enrolled students to reflect any status change if we add it
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to issue certificate')
    } finally {
      setIssuingCert(null)
    }
  }

  const handleDeleteCourse = async () => {
    if (!confirm('CRITICAL: This will delete the course, all exams, and all student results. This cannot be undone. Continue?')) return
    setDeletingCourse(true)
    try {
      await coursesApi.delete(id)
      toast.success('Course deleted permanently')
      router.push('/dashboard/teacher')
    } catch {
      toast.error('Failed to delete course')
      setDeletingCourse(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return toast.error('Only PDF files are supported')
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      await materialsApi.upload(id, formData)
      toast.success('Material uploaded successfully')
      const mRes = await materialsApi.list(id)
      setMaterials(mRes.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteMaterial = async (mId: string) => {
    if (!confirm('Delete this material?')) return
    try {
      await materialsApi.delete(mId)
      toast.success('Material deleted')
      setMaterials(prev => prev.filter(m => m.id !== mId))
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleChat = async () => {
    if (!chatInput.trim() || isChatting) return

    const userMsg = chatInput.trim()
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatInput('')
    setIsChatting(true)

    try {
      const resp = await materialsApi.chat({ course_id: id, question: userMsg })
      setChatMessages(prev => [...prev, { role: 'ai', content: resp.data.answer }])
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'AI is currently unavailable')
    } finally {
      setIsChatting(false)
    }
  }

  const assessmentTypeColor = (type: string) => {
    if (type === 'exam') return 'badge-teal'
    if (type === 'quiz') return 'badge-orange'
    return 'badge-gray'
  }

  if (loading) return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="h-48 bg-gray-100 rounded-3xl animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    </DashboardLayout>
  )

  if (!course) return null

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Hero card */}
        <div className="bg-teal-gradient rounded-3xl p-8 mb-6 relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
              <h1 className="font-display text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-teal-200 mb-4">by {course.teacher_name}</p>
              {course.description && <p className="text-teal-100 text-sm max-w-xl">{course.description}</p>}
            </div>

            {user?.role === 'student' && (
              certificate ? (
                <button
                  onClick={() => setShowCert(true)}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-2xl transition shadow-lg shadow-green-200"
                >
                  <Award className="w-5 h-5" /> View Certificate
                </button>
              ) : isEnrolled ? (
                <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2.5 rounded-2xl font-semibold text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" /> Enrolled
                </div>
              ) : isPending ? (
                <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2.5 rounded-2xl font-semibold text-sm">
                  <Clock className="w-4 h-4 text-amber-400" /> Pending Approval
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="bg-amber-400 hover:bg-amber-500 text-white font-bold px-6 py-3 rounded-2xl transition shadow-lg disabled:opacity-60"
                >
                  {enrolling ? 'Requesting...' : 'Request Enrollment'}
                </button>
              )
            )}

            {user?.role === 'teacher' && (
              <div className="flex items-center gap-3">
                <Link href={`/exams/generate?course_id=${course.id}`} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-white font-bold px-5 py-3 rounded-2xl transition shadow-lg">
                  <Zap className="w-4 h-4" /> Generate Exam
                </Link>
                <button
                  onClick={handleDeleteCourse}
                  disabled={deletingCourse}
                  className="bg-white/10 hover:bg-red-500/20 border border-white/20 text-white font-bold p-3 rounded-2xl transition"
                  title="Delete Course"
                >
                  {deletingCourse ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-5 h-5 text-red-200" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Enrolled Students', value: course.enrolled_count, icon: Users },
            { label: 'Assessments', value: exams.length, icon: FileText },
            { label: 'Created', value: new Date(course.created_at).toLocaleDateString(), icon: Clock },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-teal-100 p-5 text-center">
              <s.icon className="w-5 h-5 text-teal-600 mx-auto mb-2" />
              <p className="font-display font-bold text-xl text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-teal-100 mb-8 overflow-hidden overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 text-sm font-bold transition-all relative ${activeTab === 'overview' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Course Overview
            {activeTab === 'overview' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
          </button>
          {(isEnrolled || user?.role === 'teacher') && (
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`pb-3 px-1 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'roadmap' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Zap className="w-4 h-4" /> Learning Roadmap
              {activeTab === 'roadmap' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
            </button>
          )}
        </div>

        {activeTab === 'roadmap' ? (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-display text-[var(--text-main)] mb-2">The Learning Path</h2>
              <p className="text-sm text-gray-500">A dynamic, AI-generated guide to mastering this course. Earn marks in assessments to unlock new modules.</p>
            </div>
            <LearningRoadmap roadmap={roadmap} loading={loading} />
          </div>
        ) : (
          <div className="space-y-8">
            {user?.role === 'teacher' && pendingStudents.length > 0 && (
              <div className="bg-white rounded-3xl border border-amber-100 p-6">
                <h2 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Pending Enrollment Requests ({pendingStudents.length})
                </h2>
                <div className="space-y-3">
                  {pendingStudents.map(student => (
                    <div key={student.student_id} className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-800 font-bold flex items-center justify-center">
                          {student.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{student.student_name}</p>
                          <p className="text-xs text-gray-500">Wants to join this course</p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleApprove(student.student_id, false)}
                          disabled={approving === student.student_id}
                          className="flex-1 sm:flex-none px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(student.student_id, true)}
                          disabled={approving === student.student_id}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Course Outline */}
                <div className="bg-white rounded-3xl border border-teal-100 p-6">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-600" /> Course Outline
                  </h2>
                  <div className="bg-gray-50 rounded-2xl p-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">{course.course_outline}</pre>
                  </div>
                </div>

                {/* Enrolled Students for Teacher */}
                {user?.role === 'teacher' && (
                  <div className="bg-white rounded-3xl border border-teal-100 p-6">
                    <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600" /> Enrolled Students ({enrolledStudents.length})
                    </h2>
                    {enrolledStudents.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm italic">No students enrolled yet</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {enrolledStudents.map(s => (
                          <div key={s.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                                  <p className="text-[10px] text-gray-500 truncate">{s.email}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleUnenroll(s.id)}
                                disabled={unenrolling === s.id}
                                className="text-xs font-bold text-red-300 hover:text-red-500 transition-colors"
                              >
                                {unenrolling === s.id ? '...' : 'Remove'}
                              </button>
                            </div>
                            <button
                              onClick={() => handleIssueCertificate(s.id)}
                              disabled={issuingCert === s.id}
                              className="w-full py-2 bg-white border border-teal-100 text-teal-600 text-xs font-bold rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <Award className="w-3.5 h-3.5" />
                              {issuingCert === s.id ? 'Issuing...' : 'Complete Course & Issue Certificate'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Materials & AI Chat */}
                {(isEnrolled || user?.role === 'teacher') ? (
                  <div className={`bg-white rounded-3xl border border-teal-100 p-6 flex flex-col ${showChat ? 'lg:row-span-2 min-h-[500px]' : ''} transition-all duration-300`}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-teal-600" /> Course Materials & AI
                      </h2>
                      <button
                        onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${showChat ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600'}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> {showChat ? 'Show Files' : 'Ask AI'}
                      </button>
                    </div>

                    {!showChat ? (
                      <div className="flex-1 flex flex-col">
                        {user?.role === 'teacher' && (
                          <div className="mb-4">
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-teal-100 rounded-2xl hover:bg-teal-50/50 transition-colors cursor-pointer group">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className={`w-6 h-6 text-teal-400 mb-2 ${uploading ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
                                <p className="text-xs text-gray-500">{uploading ? 'Processing...' : 'Upload PDF Study Material'}</p>
                              </div>
                              <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={uploading} />
                            </label>
                          </div>
                        )}

                        {materials.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">No study materials uploaded yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {materials.map(m => (
                              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-4 h-4 text-red-500" />
                                  </div>
                                  <span className="text-xs font-medium text-gray-700 truncate">{m.title}</span>
                                </div>
                                {user?.role === 'teacher' && (
                                  <button onClick={() => handleDeleteMaterial(m.id)} className="text-gray-300 hover:text-red-500 p-1">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {materials.length > 0 && (
                          <button
                            onClick={() => setShowChat(true)}
                            className="mt-4 w-full py-3 bg-teal-50 text-teal-700 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-teal-100 transition-colors"
                          >
                            <Zap className="w-4 h-4" /> Power-up with AI Chat
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col h-full min-h-0">
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin">
                          {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                              <div className="w-16 h-16 bg-teal-gradient p-4 rounded-3xl mb-4 shadow-lg shadow-teal-200 flex items-center justify-center">
                                <MessageCircle className="w-8 h-8 text-white" />
                              </div>
                              <p className="text-sm font-bold text-gray-900 mb-1">Knowledge Assistant</p>
                              <p className="text-xs text-gray-500">Ask me anything about the uploaded materials.</p>
                            </div>
                          ) : (
                            chatMessages.map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[95%] p-4 rounded-2xl text-xs leading-relaxed ${msg.role === 'user'
                                    ? 'bg-teal-600 text-white rounded-br-none'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                                  }`}>
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table className="border-collapse border border-gray-300 min-w-full text-[10px]" {...props} /></div>,
                                      th: ({ node, ...props }) => <th className="border border-gray-300 bg-gray-200 px-2 py-1 font-bold" {...props} />,
                                      td: ({ node, ...props }) => <td className="border border-gray-300 px-2 py-1" {...props} />,
                                      p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                      strong: ({ node, ...props }) => <strong className="font-bold text-teal-900 dark:text-teal-300" {...props} />,
                                      ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                      ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ))
                          )}
                          {isChatting && (
                            <div className="flex justify-start">
                              <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-none border border-gray-200">
                                <div className="flex gap-1.5">
                                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-teal-300 transition-colors">
                          <input
                            type="text"
                            placeholder="Type your question..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-xs py-2.5 px-3"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                          />
                          <button
                            onClick={handleChat}
                            disabled={!chatInput.trim() || isChatting}
                            className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center hover:bg-teal-700 transition-colors disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-dashed border-teal-100 p-12 text-center">
                    <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-teal-200" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Materials Locked</h3>
                    <p className="text-sm text-gray-500 mb-4">You must be enrolled in this course to access study materials and the AI Knowledge Assistant.</p>
                    <button onClick={handleEnroll} className="text-teal-600 font-bold text-sm hover:underline">Request Enrollment Now</button>
                  </div>
                )}

                {/* Assessments */}
                <div className="bg-white rounded-3xl border border-teal-100 p-6">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" /> Assessments ({exams.length})
                  </h2>
                  {exams.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-teal-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No assessments yet</p>
                      {user?.role === 'teacher' && (
                        <Link href={`/exams/generate?course_id=${course.id}`} className="mt-3 inline-flex items-center gap-1 text-teal-600 text-sm font-semibold">
                          <Zap className="w-3 h-3" /> Generate First Exam
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {exams.map(e => (
                        <Link key={e.id} href={`/exams/${e.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors group">
                          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-teal-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{e.title}</p>
                            <p className="text-xs text-gray-500">{e.total_marks} marks</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`badge ${assessmentTypeColor(e.assessment_type)}`}>{e.assessment_type}</span>
                            {!e.is_published && <span className="badge badge-gray">draft</span>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Certificate Modal */}
      {showCert && certificate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-5xl max-h-full overflow-y-auto no-scrollbar print:overflow-visible"
          >
            <button
              onClick={() => setShowCert(false)}
              className="absolute top-4 right-4 z-[110] p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors print:hidden"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="print-area">
              <CourseCertificate certificate={certificate} />
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  )
}
