'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { examsApi, submissionsApi, evaluationsApi } from '@/lib/api'
import { FileText, Clock, Award, ArrowLeft, Send, Eye, CheckCircle, BarChart3, Zap, Download, HelpCircle, Lightbulb, ShieldAlert, AlertTriangle } from 'lucide-react'
import { Exam } from '@/types'

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [showTimesUp, setShowTimesUp] = useState(false)
  const submissionStarted = useRef(false)
  const timerInterval = useRef<NodeJS.Timeout | null>(null)
  const sessionStartTime = useRef<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const eRes = await examsApi.get(id)
        setExam(eRes.data)
        
        if (user?.role === 'teacher') {
          const [sRes, rRes] = await Promise.all([
            submissionsApi.byExam(id),
            evaluationsApi.examResults(id)
          ])
          setSubmissions(sRes.data)
          setResults(rRes.data.results)
        } else if (user?.role === 'student') {
          const mySubs = await submissionsApi.my()
          const alreadySubmitted = mySubs.data.some((s: any) => s.exam_id === id)
          if (alreadySubmitted) setSubmitted(true)
        }
      } catch { router.push('/exams') }
      finally { setLoading(false) }
    }
    if (user) load()

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current)
    }
  }, [id, user])

  // Timer Initialization & Logic
  useEffect(() => {
    if (!exam || submitted || user?.role !== 'student' || loading) return
    if (exam.assessment_type === 'assignment') return
    
    // If exam has no time limit AND no deadline, we still run the session logic
    // but the timer will be effectively null (infinite time)
    
    // If there is a time limit, we only start the timer when hasStarted is true
    if (exam.time_limit && !hasStarted) return
    
    // Set session start time if not already set
    if (hasStarted && !sessionStartTime.current) {
      sessionStartTime.current = Date.now()
    }

    const calculateTimeLeft = () => {
      let timeLeftValues: number[] = []
      
      // 1. Deadline cutoff
      if (exam.deadline) {
        const deadlineDiff = new Date(exam.deadline).getTime() - Date.now()
        timeLeftValues.push(Math.floor(deadlineDiff / 1000))
      }
      
      // 2. Time limit from start
      if (exam.time_limit && sessionStartTime.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTime.current) / 1000)
        timeLeftValues.push((exam.time_limit * 60) - elapsed)
      }

      if (timeLeftValues.length === 0) return null
      return Math.max(0, Math.min(...timeLeftValues))
    }

    const initial = calculateTimeLeft()
    setTimeLeft(initial)

    if (initial !== null && initial <= 0) {
      setShowTimesUp(true)
      handleSubmit(true)
    }

    timerInterval.current = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
      
      if (remaining !== null && remaining <= 0) {
        if (timerInterval.current) clearInterval(timerInterval.current)
        
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
          audio.play().catch(() => {})
        } catch {}
        
        setShowTimesUp(true)
        handleSubmit(true)
      }
    }, 1000)

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current)
    }
  }, [exam, submitted, user, loading, hasStarted])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
  }

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!exam || submitted || submissionStarted.current) return
    
    // Mark as started immediately to prevent race conditions
    submissionStarted.current = true
    
    const answerList = exam.questions.map(q => ({
      question_id: q.id,
      answer: answers[q.id] || '',
    }))
    
    if (!isAutoSubmit) {
      const unanswered = answerList.filter(a => !a.answer.trim()).length
      if (unanswered > 0 && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) {
        submissionStarted.current = false
        return
      }
    }

    setSubmitting(true)
    try {
      await submissionsApi.submit({ exam_id: id, answers: answerList })
      if (isAutoSubmit) {
        toast.error('Cheating Detected: Assessment auto-submitted due to tab switching.', { duration: 6000 })
      } else {
        toast.success('Exam submitted successfully!')
      }
      setSubmitted(true)
      
      if (isAutoSubmit) {
        // Keep the Time's Up overlay or showing a message for 2 seconds then redirect
        setTimeout(() => {
          setShowTimesUp(false)
          router.push('/submissions')
        }, 2000)
      } else {
        setShowTimesUp(false)
      }
    } catch (err: any) {
      submissionStarted.current = false
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  // Anti-cheating detection
  useEffect(() => {
    if (user?.role !== 'student' || submitted || loading || !exam) return

    const handleCheating = () => {
      if (!submitted && !submitting) {
        // We use document.hidden check primarily
        if (document.hidden) {
          handleSubmit(true)
        }
      }
    }

    const handleBlur = () => {
      // Blur can be sensitive (system dialogs), but usually used for cheat prevention
      if (!submitted && !submitting) {
        handleSubmit(true)
      }
    }

    document.addEventListener('visibilitychange', handleCheating)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleCheating)
      window.removeEventListener('blur', handleBlur)
    }
  }, [user, submitted, loading, exam, answers])

  const handleEvaluateAll = async () => {
    setEvaluating(true)
    try {
      const res = await evaluationsApi.evaluateAll(id)
      if (res.data.evaluated > 0) {
        toast.success(`Successfully evaluated ${res.data.evaluated} submissions!`)
      } else if (res.data.errors && res.data.errors.length > 0) {
        const errMsg = res.data.errors[0]?.error || 'Unknown AI Error'
        toast.error(`Evaluation failed: ${errMsg.substring(0, 80)}...`)
        console.error("Evaluation errors:", res.data.errors)
      } else {
        toast.success('No new pending submissions found.')
      }
      
      const [sRes, rRes] = await Promise.all([
        submissionsApi.byExam(id),
        evaluationsApi.examResults(id)
      ])
      setSubmissions(sRes.data)
      setResults(rRes.data.results)
    } catch (e: any) { 
      toast.error(e.response?.data?.detail || 'Evaluation process failed')
    } finally { setEvaluating(false) }
  }

  if (loading) return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="h-40 bg-gray-100 rounded-3xl animate-pulse mb-6" />
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    </DashboardLayout>
  )
  if (!exam) return null

  const BookOpen = FileText // Fallback if BookOpen from types conflicts with icon name

  const typeStyles: Record<string, { color: string; icon: any; title: string }> = {
    exam: { color: 'from-teal-600 to-teal-800', icon: Award, title: 'Term Exam' },
    quiz: { color: 'from-amber-400 to-amber-600', icon: Zap, title: 'Quick Quiz' },
    assignment: { color: 'from-indigo-500 to-indigo-700', icon: BookOpen, title: 'Assignment' },
  }
  const currentStyle = typeStyles[exam.assessment_type] || typeStyles.exam
  const Icon = currentStyle.icon

  const handleDownloadPDF = () => {
    window.print()
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Start Assessment Screen for Exams/Quizzes */}
        {user?.role === 'student' && !submitted && !hasStarted && (exam.assessment_type === 'exam' || exam.assessment_type === 'quiz') && (
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-12 text-center animate-slide-up shadow-xl mb-10">
            <div className={`w-20 h-20 rounded-3xl ${timeLeft !== null && timeLeft <= 0 ? 'bg-red-50' : 'bg-teal-50'} flex items-center justify-center mx-auto mb-6`}>
              <Zap className={`w-10 h-10 ${timeLeft !== null && timeLeft <= 0 ? 'text-red-500' : 'text-teal-600'}`} />
            </div>
            
            <h2 className="font-display text-3xl font-bold text-[var(--text-main)] mb-4">
              {timeLeft !== null && timeLeft <= 0 ? 'Assessment Closed' : 'Ready to Start?'}
            </h2>
            
            <div className="max-w-md mx-auto space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                 <span className="text-sm font-medium text-gray-500">Duration</span>
                 <span className="font-bold text-teal-700">{exam.time_limit ? `${exam.time_limit} Minutes` : 'Until Deadline'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                 <span className="text-sm font-medium text-gray-500">Questions</span>
                 <span className="font-bold text-teal-700">{exam.questions.length} Items</span>
              </div>
              
              {timeLeft !== null && timeLeft <= 0 ? (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                   <p className="text-sm text-red-600 font-bold">This assessment is no longer accepting submissions.</p>
                </div>
              ) : (
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">
                   ⚠️ Warning: Leaving the tab will auto-submit.
                </p>
              )}
            </div>

            <button 
              onClick={() => setHasStarted(true)}
              disabled={timeLeft !== null && timeLeft <= 0}
              className={`px-12 py-4 font-bold rounded-2xl transition shadow-xl text-lg flex items-center gap-2 mx-auto ${
                timeLeft !== null && timeLeft <= 0 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-teal-gradient text-white hover:opacity-90 shadow-teal-100'
              }`}
            >
              {timeLeft !== null && timeLeft <= 0 ? 'Deadline Passed' : 'Start Assessment Now'}
              <Zap className={`w-5 h-5 ${timeLeft !== null && timeLeft <= 0 ? 'fill-gray-400' : 'fill-white'}`} />
            </button>
          </div>
        )}

        {submitted && (
          <div className="bg-white rounded-3xl border border-green-200 p-10 text-center animate-slide-up mb-10 shadow-lg">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Exam Submitted!</h2>
            <p className="text-gray-500 mb-8">Your answers have been saved. Wait for your teacher to evaluate them.</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => router.push('/submissions')} className="bg-teal-gradient text-white font-bold px-8 py-3 rounded-2xl hover:opacity-90 transition">
                View My Submissions
              </button>
              <button onClick={() => router.push(user?.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student')} className="border border-teal-600 text-teal-700 font-bold px-8 py-3 rounded-2xl hover:bg-teal-50 transition">
                Return Home
              </button>
            </div>
          </div>
        )}

        {/* Print Only Exam Header */}
        <div className="print-only mb-10 pb-6 border-b-4 border-double border-gray-900">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold uppercase tracking-tighter">LMSZone Academy</h1>
              <p className="text-lg font-medium">{exam.title}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold uppercase">Assessment Type: {exam.assessment_type || 'Exam'}</p>
              <p className="text-sm">Total Marks: {exam.total_marks}</p>
              <p className="text-sm">Questions: {exam.questions.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 border-t-2 border-gray-900 pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex border-b border-gray-400 pb-1">
                <span className="font-bold text-xs w-32">STUDENT NAME:</span>
                <div className="flex-1" />
              </div>
              <div className="flex border-b border-gray-400 pb-1">
                <span className="font-bold text-xs w-32">DEPARTMENT:</span>
                <div className="flex-1" />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex border-b border-gray-400 pb-1">
                <span className="font-bold text-xs w-32">ROLL NUMBER:</span>
                <div className="flex-1" />
              </div>
              <div className="flex border-b border-gray-400 pb-1">
                <span className="font-bold text-xs w-32">DATE:</span>
                <div className="flex-1" />
              </div>
            </div>
          </div>
        </div>

        <div id="exam-content" className={`bg-gradient-to-br ${currentStyle.color} rounded-3xl p-8 mb-6 relative overflow-hidden text-white shadow-xl print:shadow-none print:rounded-none print:p-4 print:text-black print:bg-none print:border-b-2 print:border-gray-300`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 print:hidden" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full mb-4 print:text-gray-500 print:bg-gray-100">
                {currentStyle.title}
              </span>
              <h1 className="font-display text-4xl font-bold mb-4 print:text-2xl">{exam.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm print:text-gray-600">
                <span className="flex items-center gap-1.5 font-semibold"><Award className="w-4 h-4" /> {exam.total_marks} marks</span>
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {exam.questions.length} questions</span>
                {exam.deadline && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Due: {new Date(exam.deadline).toLocaleDateString()}</span>}
              </div>
            </div>
            
            {user?.role === 'teacher' && (
              <button 
                onClick={handleDownloadPDF} 
                className="flex items-center gap-2 bg-white text-teal-800 font-bold px-5 py-3 rounded-2xl hover:bg-teal-50 transition-all shadow-lg print:hidden"
              >
                <Download className="w-4 h-4" /> Save as PDF
              </button>
            )}
          </div>
        </div>

        {/* Security Warning for Students */}
        {!submitted && user?.role === 'student' && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 mb-8 flex items-start gap-4 animate-pulse-slow">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 mb-1 flex items-center gap-2">
                Anti-Cheating Protection Enabled
                <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>
              </h3>
              <p className="text-amber-800 text-sm leading-relaxed">
                To ensure a fair testing environment, this assessment will <span className="font-bold underline">auto-submit</span> if you switch tabs, minimize the window, or leave this page. Please stay on this screen until you complete the exam.
              </p>
            </div>
          </div>
        )}

        {/* Teacher view: Analytics & submissions */}
        {user?.role === 'teacher' && (
          <div className="space-y-6 mb-10">
            {/* Header Tabs */}
            <div className="flex items-center gap-4 bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-subtle)] w-fit mb-4 print:hidden">
               <button onClick={() => setShowAnalytics(false)} className={`px-6 py-2 rounded-xl text-sm font-bold transition ${!showAnalytics ? 'bg-teal-gradient text-white shadow-lg' : 'text-gray-500 hover:text-teal-700'}`}>
                 Submissions
               </button>
               <button onClick={() => setShowAnalytics(true)} className={`px-6 py-2 rounded-xl text-sm font-bold transition ${showAnalytics ? 'bg-teal-gradient text-white shadow-lg' : 'text-gray-500 hover:text-teal-700'}`}>
                 Analytics
               </button>
            </div>

            {!showAnalytics ? (
              <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-600" /> All Submissions ({submissions.length})
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-gray-100 text-gray-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-200 transition">
                      <Download className="w-4 h-4" /> Export Marksheet
                    </button>
                    {submissions.some(s => s.status === 'pending') && (
                      <button onClick={handleEvaluateAll} disabled={evaluating}
                        className="flex items-center gap-2 bg-teal-gradient text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-60">
                        {evaluating ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
                        Evaluate All
                      </button>
                    )}
                  </div>
                </div>
                {submissions.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No submissions yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Submitted At</th>
                          <th>Status</th>
                          <th className="text-right">Grade / Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map(s => {
                           const res = results.find(r => r.submission_id === s.id);
                           return (
                            <tr key={s.id}>
                              <td className="font-medium">{s.student_name}</td>
                              <td className="text-gray-500 text-xs">{new Date(s.submitted_at).toLocaleString()}</td>
                              <td>
                                <span className={`badge ${s.status === 'evaluated' ? 'badge-green' : 'badge-orange'}`}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="text-right">
                                {s.status === 'evaluated' ? (
                                  <div className="flex items-center justify-end gap-3">
                                     <span className="font-display font-bold text-teal-700">{res?.grade} ({res?.percentage.toFixed(0)}%)</span>
                                     <button onClick={() => router.push(`/submissions/${s.id}`)} className="text-xs text-gray-400 hover:text-teal-600 underline">Details</button>
                                  </div>
                                ) : (
                                  <button onClick={async () => {
                                    try {
                                      await evaluationsApi.evaluate(s.id)
                                      toast.success('Evaluated!')
                                      const [sRes, rRes] = await Promise.all([submissionsApi.byExam(id), evaluationsApi.examResults(id)])
                                      setSubmissions(sRes.data); setResults(rRes.data.results)
                                    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed') }
                                  }}
                                    className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors">
                                    AI Evaluate
                                  </button>
                                )}
                              </td>
                            </tr>
                           )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
                 {/* Summary Stats */}
                 <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8 shadow-sm lg:col-span-1">
                    <h3 className="font-display text-xl font-bold text-[var(--text-main)] mb-6">Performance</h3>
                    <div className="space-y-6">
                       <div className="p-4 bg-teal-50 rounded-2xl">
                          <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">Class Average</p>
                          <p className="text-3xl font-display font-bold text-teal-900">
                            {(results.reduce((acc, curr) => acc + curr.percentage, 0) / (results.length || 1)).toFixed(1)}%
                          </p>
                       </div>
                       <div className="p-4 bg-amber-50 rounded-2xl">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Passing Rate</p>
                          <p className="text-3xl font-display font-bold text-amber-900">
                             {((results.filter(r => r.percentage >= 50).length / (results.length || 1)) * 100).toFixed(0)}%
                          </p>
                       </div>
                       <div className="p-4 bg-indigo-50 rounded-2xl">
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Top Grade</p>
                          <p className="text-3xl font-display font-bold text-indigo-900">
                             {results.length > 0 ? results.sort((a,b) => b.percentage - a.percentage)[0].grade : 'N/A'}
                          </p>
                       </div>
                    </div>
                 </div>

                 {/* Grade Chart */}
                 <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8 shadow-sm lg:col-span-2">
                    <h3 className="font-display text-xl font-bold text-[var(--text-main)] mb-6">Grade Distribution</h3>
                    <div className="flex flex-col gap-4">
                       {['A', 'B', 'C', 'D', 'F'].map(g => {
                          const count = results.filter(r => r.grade === g).length;
                          const pct = (count / (results.length || 1)) * 100;
                          const colors: any = { A: 'bg-green-500', B: 'bg-teal-500', C: 'bg-amber-400', D: 'bg-orange-500', F: 'bg-red-500' };
                          return (
                            <div key={g} className="space-y-2">
                               <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="w-8">{g}</span>
                                  <span className="text-gray-400">{count} Students</span>
                               </div>
                               <div className="h-6 w-full bg-gray-50 rounded-xl overflow-hidden relative border border-gray-100">
                                  <div className={`h-full ${colors[g]} transition-all duration-1000 flex items-center px-2 text-[10px] text-white font-bold`} style={{ width: `${pct}%` }}>
                                    {pct > 5 && `${pct.toFixed(0)}%`}
                                  </div>
                               </div>
                            </div>
                          )
                       })}
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Print Only Results Table (Full List) */}
        <div className="print-only mt-10">
           <h2 className="text-2xl font-bold mb-4">Official Marksheet</h2>
           <table className="w-full border-collapse border border-gray-900 text-sm">
              <thead className="bg-gray-100">
                 <tr>
                    <th className="border border-gray-900 p-2 text-left">Student Name</th>
                    <th className="border border-gray-900 p-2 text-center">Marks</th>
                    <th className="border border-gray-900 p-2 text-center">Percentage</th>
                    <th className="border border-gray-900 p-2 text-center">Grade</th>
                 </tr>
              </thead>
              <tbody>
                 {results.map(r => (
                    <tr key={r.id}>
                       <td className="border border-gray-900 p-2">{r.student_name}</td>
                       <td className="border border-gray-900 p-2 text-center">{r.marks_obtained} / {r.total_marks_available}</td>
                       <td className="border border-gray-900 p-2 text-center">{r.percentage.toFixed(1)}%</td>
                       <td className="border border-gray-900 p-2 text-center font-bold">{r.grade}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
           <div className="mt-20 flex justify-between px-10">
              <div className="text-center">
                 <div className="w-48 border-b border-black mb-1"></div>
                 <p className="text-xs font-bold uppercase">Department Head Signature</p>
              </div>
              <div className="text-center">
                 <div className="w-48 border-b border-black mb-1"></div>
                 <p className="text-xs font-bold uppercase">Instructor Signature</p>
              </div>
           </div>
        </div>

          {/* Return Home Link ... */}
        {showTimesUp && (
          <div className="fixed inset-0 z-[100] bg-red-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-[40px] p-12 max-w-lg w-full text-center shadow-2xl scale-up-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <Clock className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="font-display text-5xl font-black text-gray-900 mb-4 tracking-tighter">TIME IS UP!</h2>
              <p className="text-gray-500 text-lg mb-10">
                Your assessment has been automatically submitted. Please wait while we process your answers.
              </p>
              <div className="flex gap-4 justify-center">
                 <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
                 <span className="font-bold text-red-600 uppercase tracking-widest text-sm self-center">Submitting...</span>
              </div>
            </div>
          </div>
        )}

        {/* Questions List Container */}
        {((user?.role === 'student' && (hasStarted || submitted)) || user?.role === 'teacher') && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between print:hidden">
              <h2 className="font-display text-xl font-bold text-[var(--text-main)]">Questions</h2>
              {user?.role === 'teacher' && <span className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-2"><Lightbulb className="w-3 h-3"/> Teacher View (Answers Visible)</span>}
            </div>

            {/* Sticky Floating Timer */}
            {!submitted && user?.role === 'student' && hasStarted && (
              <div className="sticky top-20 z-40 mb-8 animate-slide-up print:hidden">
                <div className={`flex items-center justify-between p-4 rounded-3xl shadow-xl transition-all border-2 ${
                  timeLeft !== null && timeLeft < 300 ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-white/90 backdrop-blur-md border-teal-100 text-teal-800'
                }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${timeLeft !== null && timeLeft < 300 ? 'bg-white/20' : 'bg-teal-50'}`}>
                          <Clock className={`w-6 h-6 ${timeLeft !== null && timeLeft < 300 ? 'text-white' : 'text-teal-600'}`} />
                      </div>
                      <div>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${timeLeft !== null && timeLeft < 300 ? 'text-white/80' : 'text-teal-500'}`}>
                            {timeLeft !== null ? 'Time Remaining' : 'Self-Paced Assessment'}
                          </p>
                          <h2 className="text-3xl font-display font-extrabold leading-none">
                            {timeLeft !== null ? formatTime(timeLeft) : 'No Time Limit'}
                          </h2>
                      </div>
                    </div>
                </div>
              </div>
            )}

            {exam.questions.map((q, i) => (
              <div key={q.id} className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6 animate-slide-up shadow-sm print:border-gray-300 print:shadow-none print:p-0 print:mb-8" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-teal-100 text-teal-800 text-sm font-bold flex items-center justify-center flex-shrink-0 print:hidden">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <p className="font-semibold text-lg text-[var(--text-main)] leading-tight">{q.question}</p>
                      <span className="text-xs font-bold text-teal-600 whitespace-nowrap bg-teal-50 px-2 py-1 rounded-lg">[{q.marks} Pts]</span>
                    </div>

                    {(q.type === 'mcq' || q.type === 'true_false') && q.options ? (
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {q.options.map((opt, j) => {
                          const isCorrect = user?.role === 'teacher' && q.correct_answer && opt.toLowerCase().includes(q.correct_answer.toLowerCase());
                          const isSelected = answers[q.id] === opt || answers[q.id] === opt.charAt(0);
                          return (
                            <label key={j} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                              isSelected ? 'border-teal-500 bg-teal-50' : 
                              isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-50 hover:border-teal-100'
                            } print:border print:border-gray-200 print:bg-white`}>
                              {user?.role === 'student' && !submitted && (
                                <input type="radio" name={`q_${q.id}`} value={opt}
                                  checked={isSelected}
                                  onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300" />
                              )}
                              {isCorrect && <CheckCircle className="w-4 h-4 text-green-500 print:hidden" />}
                              <span className={`text-sm ${isCorrect ? 'font-bold text-green-700' : 'text-gray-700'}`}>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(user?.role === 'student' && !submitted) && (
                          <textarea
                            rows={q.type === 'essay' ? 6 : 3}
                            placeholder={q.type === 'essay' ? 'Write your detailed essay here...' : 'Your answer...'}
                            value={answers[q.id] || ''}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-teal-500 bg-gray-50 focus:bg-white transition-all text-sm resize-none"
                          />
                        )}
                        {/* Empty lines for print if short answer/essay */}
                        {user?.role === 'teacher' && q.type !== 'mcq' && (
                          <div className="h-24 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 text-xs print:border-gray-200">
                             Student response area
                          </div>
                        )}
                      </div>
                    )}

                    {/* Teacher view of expected answer */}
                    {user?.role === 'teacher' && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl print:hidden">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-tighter mb-1 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3"/> Correct Answer / Guide
                        </p>
                        <p className="text-sm text-blue-900 font-medium">{q.correct_answer || q.expected_answer_guide || q.rubric}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {!submitted && user?.role === 'student' && (
              <button 
                onClick={() => handleSubmit()} 
                disabled={submitting}
                className="w-full py-4 bg-teal-gradient text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition shadow-xl shadow-teal-200 disabled:opacity-60 text-lg print:hidden"
              >
                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
