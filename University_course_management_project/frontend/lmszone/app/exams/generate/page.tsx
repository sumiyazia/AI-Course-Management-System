'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { coursesApi, examsApi } from '@/lib/api'
import { Zap, BookOpen, ArrowLeft, Check, AlertTriangle, Download, Award, FileText, Clock } from 'lucide-react'
import { Course } from '@/types'

interface GenerateForm {
  course_id: string
  title: string
  num_questions: number
  question_types: string[]
  difficulty: string
  assessment_type: string
  topic_focus: string
  deadline: string
  time_limit: number
}

const questionTypes = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
]
const difficulties = ['easy', 'medium', 'hard']
const assessmentTypes = ['exam', 'quiz', 'assignment']

function GenerateExamContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [outOfScope, setOutOfScope] = useState<string | null>(null)
  const [generated, setGenerated] = useState<any>(null)
  const [publishing, setPublishing] = useState(false)

  const typeStyles: Record<string, { color: string; icon: any; title: string }> = {
    exam: { color: 'from-teal-600 to-teal-800', icon: Award, title: 'Term Exam' },
    quiz: { color: 'from-amber-400 to-amber-600', icon: Zap, title: 'Quick Quiz' },
    assignment: { color: 'from-indigo-500 to-indigo-700', icon: FileText, title: 'Assignment' },
  }

  const handleDownloadPDF = () => {
    window.print()
  }

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<GenerateForm>({
    defaultValues: {
      course_id: params.get('course_id') || '',
      num_questions: 10,
      question_types: ['mcq', 'short_answer'],
      difficulty: 'medium',
      assessment_type: 'exam',
      topic_focus: '',
      deadline: '',
    }
  })

  const selectedTypes = watch('question_types')

  useEffect(() => {
    coursesApi.my().then(r => setCourses(r.data)).catch(() => {})
  }, [])

  const toggleType = (type: string) => {
    const curr = selectedTypes || []
    if (curr.includes(type)) {
      if (curr.length > 1) setValue('question_types', curr.filter(t => t !== type))
    } else {
      setValue('question_types', [...curr, type])
    }
  }

  const onSubmit = async (data: GenerateForm) => {
    setLoading(true)
    setOutOfScope(null)
    setGenerated(null)
    try {
      const payload = {
        ...data,
        num_questions: Number(data.num_questions),
        deadline: data.deadline || undefined,
        time_limit: data.time_limit ? Number(data.time_limit) : undefined,
      }
      const res = await examsApi.generate(payload)
      if (res.data.out_of_scope) {
        setOutOfScope(res.data.message)
      } else {
        setGenerated(res.data.exam)
        toast.success('Exam generated successfully!')
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const message = typeof detail === 'string' ? detail : (Array.isArray(detail) ? 'Check your input selection' : 'Generation failed')
      toast.error(message)
    } finally { setLoading(false) }
  }

  const handlePublish = async () => {
    if (!generated) return
    setPublishing(true)
    try {
      await examsApi.publish(generated.id)
      toast.success('Exam published! Students can now see it.')
      router.push('/exams')
    } catch { toast.error('Failed to publish') }
    finally { setPublishing(false) }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">Generate Assessment</h1>
          <p className="text-gray-500 mt-1">Let AI create a perfectly-scoped exam from your course syllabus.</p>
        </div>

        {outOfScope && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Out of Scope</p>
              <p className="text-amber-700 text-sm mt-1">{outOfScope}</p>
            </div>
          </div>
        )}

        {generated ? (
          <div className="animate-slide-up">
             {/* Print Only Exam Header */}
             <div className="print-only mb-10 pb-6 border-b-4 border-double border-gray-900">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h1 className="text-4xl font-bold uppercase tracking-tighter">LMSZone Academy</h1>
                   <p className="text-lg font-medium">{generated.title}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold uppercase">Assessment Type: {generated.assessment_type || 'Exam'}</p>
                   <p className="text-sm">Total Marks: {generated.total_marks}</p>
                   <p className="text-sm">Questions: {generated.questions?.length}</p>
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

             {/* Header Section for Preview */}
             <div className={`bg-gradient-to-br ${typeStyles[generated.assessment_type || 'exam']?.color} rounded-3xl p-8 mb-6 relative overflow-hidden text-white shadow-xl print:shadow-none print:rounded-none print:p-4 print:text-black print:bg-none print:border-b-2 print:border-gray-300`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 print:hidden" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full mb-4 print:text-gray-500 print:bg-gray-100">
                    Preview: {typeStyles[generated.assessment_type || 'exam']?.title}
                  </span>
                  <h2 className="font-display text-3xl font-bold mb-4 print:text-xl">{generated.title}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm print:text-gray-600">
                    <span className="flex items-center gap-1.5 font-semibold"><Check className="w-4 h-4" /> AI Generated</span>
                    <span className="flex items-center gap-1.5"><Award className="w-4 h-4" /> {generated.total_marks} marks</span>
                    <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {generated.questions?.length} questions</span>
                  </div>
                </div>
                <button 
                  onClick={handleDownloadPDF} 
                  className="flex items-center gap-2 bg-white text-teal-800 font-bold px-5 py-3 rounded-2xl hover:bg-teal-50 transition-all shadow-lg print:hidden"
                >
                  <Download className="w-4 h-4" /> Save as PDF
                </button>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8 shadow-sm print:border-none print:p-0">
              <div className="space-y-8 mb-10">
                {generated.questions?.map((q: any, i: number) => (
                  <div key={i} className="pb-8 border-b border-gray-50 last:border-0 print:border-gray-200">
                    <div className="flex items-start gap-4">
                      <span className="w-8 h-8 rounded-xl bg-gray-50 border border-teal-100 text-teal-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5 print:hidden">{i+1}</span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <p className="text-lg font-semibold text-[var(--text-main)] leading-tight">{q.question}</p>
                          <span className="text-xs font-bold text-teal-600 bg-teal-500/10 px-2 py-1 rounded-lg">[{q.marks} Pts]</span>
                        </div>
                        
                        {q.options ? (
                          <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            {q.options.map((o: string, j: number) => {
                              const isCorrect = q.correct_answer && o.includes(q.correct_answer);
                              return (
                                <div key={j} className={`p-4 rounded-2xl border-2 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-50'} print:border print:border-gray-100`}>
                                  <span className={`text-sm ${isCorrect ? 'font-bold text-green-700' : 'text-gray-700'}`}>{o}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-24 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 text-xs print:border-gray-200">
                             Student response area
                          </div>
                        )}

                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl print:hidden">
                          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1">Answer / Guide</p>
                          <p className="text-sm text-blue-900 font-medium">{q.correct_answer || q.expected_answer_guide}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4 print:hidden">
              <button 
                onClick={() => setGenerated(null)} 
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                 <ArrowLeft className="w-4 h-4" /> Start Over
              </button>
              <button 
                onClick={handlePublish} 
                disabled={publishing} 
                className="flex-[2] py-4 rounded-2xl bg-teal-gradient text-white font-bold hover:opacity-90 transition shadow-xl shadow-teal-100 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {publishing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-5 h-5" />}
                {publishing ? 'Publishing...' : 'Publish to Students'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8">
              <h2 className="font-semibold text-[var(--text-main)] mb-6 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" /> Basic Settings
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course *</label>
                    <select className="w-full px-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-main)] text-[var(--text-main)] transition-all text-sm"
                    {...register('course_id', { required: 'Please select a course' })}>
                    <option value="">Select a course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  {errors.course_id && <p className="text-red-500 text-xs mt-1">{errors.course_id.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Assessment Type</label>
                    <select className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-teal-500 bg-gray-50 text-sm"
                      {...register('assessment_type')}>
                      {assessmentTypes.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                    <select className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-teal-500 bg-gray-50 text-sm"
                      {...register('difficulty')}>
                      {difficulties.map(d => <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Questions</label>
                    <input type="number" min={1} max={50}
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-main)] text-[var(--text-main)] text-sm"
                      {...register('num_questions')} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Title (optional)</label>
                    <input type="text" placeholder="Leave blank for AI title"
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-main)] text-[var(--text-main)] text-sm"
                      {...register('title')} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Question Types</label>
                  <div className="flex gap-3">
                    {questionTypes.map(qt => (
                      <button key={qt.value} type="button" onClick={() => toggleType(qt.value)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          selectedTypes?.includes(qt.value)
                            ? 'border-teal-600 bg-teal-50 text-teal-700'
                            : 'border-gray-200 text-gray-500 hover:border-teal-300'
                        }`}>
                        {qt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Topic Focus (optional)</label>
                  <input type="text" placeholder="e.g., Chapter 3: Variables and Data Types"
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-teal-500 bg-gray-50 text-sm"
                    {...register('topic_focus')} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline (optional)</label>
                  <input type="datetime-local"
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-main)] text-[var(--text-main)] text-sm"
                    {...register('deadline')} />
                </div>

                {watch('assessment_type') !== 'assignment' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Time Limit (minutes)</label>
                    <div className="relative">
                      <input type="number" min={1} placeholder="e.g. 60"
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-main)] text-[var(--text-main)] text-sm pl-12"
                        {...register('time_limit')} />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 italic">Student will see a countdown once they start the assessment.</p>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-teal-gradient text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition shadow-xl shadow-teal-200 disabled:opacity-60 text-lg">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" /> Generate Exam with AI
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function GenerateExamPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">Loading...</div>
      </DashboardLayout>
    }>
      <GenerateExamContent />
    </Suspense>
  )
}
