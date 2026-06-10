'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { evaluationsApi } from '@/lib/api'
import { Award, CheckCircle, XCircle, ArrowLeft, TrendingUp, MessageSquare, Target, Lightbulb, PieChart } from 'lucide-react'
import { Evaluation } from '@/types'

export default function SubmissionResultPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    evaluationsApi.bySubmission(id)
      .then(r => setEvaluation(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Not found'))
      .finally(() => setLoading(false))
  }, [id])

  const gradeColor = (g: string) => {
    if (g === 'A') return 'text-green-600'
    if (g === 'B') return 'text-teal-600'
    if (g === 'C') return 'text-amber-600'
    if (g === 'D') return 'text-orange-600'
    return 'text-red-600'
  }

  const gradeBg = (g: string) => {
    if (g === 'A') return 'from-green-400 to-green-600'
    if (g === 'B') return 'from-teal-400 to-teal-600'
    if (g === 'C') return 'from-amber-400 to-amber-600'
    if (g === 'D') return 'from-orange-400 to-orange-600'
    return 'from-red-400 to-red-600'
  }

  if (loading) return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-48 bg-gray-100 rounded-3xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-3xl animate-pulse" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    </DashboardLayout>
  )

  if (error) return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-gray-500">{error}</p>
        <button onClick={() => router.back()} className="mt-4 text-teal-600 font-semibold">Go back</button>
      </div>
    </DashboardLayout>
  )

  if (!evaluation) return null

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Score Hero */}
        <div className={`bg-gradient-to-br ${gradeBg(evaluation.grade)} rounded-3xl p-8 mb-6 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10 flex items-center justify-between gap-8 flex-wrap">
            <div>
              <p className="text-white/70 text-sm font-medium mb-2">{evaluation.exam_title}</p>
              <h1 className="font-display text-4xl font-bold text-white mb-1">{evaluation.student_name}</h1>
              <p className="text-white/70">Evaluated {new Date(evaluation.evaluated_at).toLocaleDateString()}</p>
            </div>
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-white/20 border-4 border-white/30 flex flex-col items-center justify-center">
                <p className="font-display text-5xl font-bold text-white">{evaluation.grade}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-5 text-center">
            <Award className="w-5 h-5 text-teal-600 mx-auto mb-2" />
            <p className="font-display font-bold text-2xl text-[var(--text-main)]">{evaluation.marks_obtained}</p>
            <p className="text-xs text-gray-500">Marks Obtained</p>
          </div>
          <div className="bg-white rounded-2xl border border-teal-100 p-5 text-center">
            <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="font-display font-bold text-2xl text-[var(--text-main)]">{evaluation.total_marks_available}</p>
            <p className="text-xs text-gray-500">Total Marks</p>
          </div>
          <div className="bg-white rounded-2xl border border-teal-100 p-5 text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-2" />
            <p className="font-display font-bold text-2xl text-[var(--text-main)]">{evaluation.percentage.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Score</p>
          </div>
        </div>

        {/* Analysis Dashboard Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Main Feedback */}
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8 shadow-sm flex flex-col">
            <h2 className="font-display text-xl font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-600" /> Executive Summary
            </h2>
            <div className="flex-1 bg-teal-50/10 rounded-2xl p-6 border border-[var(--border-subtle)]">
               <p className="text-gray-700 text-sm leading-relaxed italic">"{evaluation.overall_feedback}"</p>
            </div>
          </div>

          {/* Performance Radar (Simplified) */}
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8 shadow-sm">
            <h2 className="font-display text-xl font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-teal-600" /> Score distribution
            </h2>
             <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Mastery Level</span>
                  <span className="text-sm font-bold text-teal-700">{evaluation.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-8">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${gradeBg(evaluation.grade)} transition-all duration-1000`}
                    style={{ width: `${evaluation.percentage}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Status</p>
                      <p className={`text-lg font-bold ${gradeColor(evaluation.grade)}`}>{evaluation.percentage >= 50 ? 'Qualified' : 'Needs Retake'}</p>
                   </div>
                   <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Rank</p>
                      <p className="text-lg font-bold text-gray-800">Top {Math.max(5, 100 - Math.round(evaluation.percentage))}%</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Topic Analytics Table */}
        {evaluation.topic_performance && evaluation.topic_performance.length > 0 && (
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8 mb-8 shadow-sm">
            <h2 className="font-display text-xl font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-teal-600" /> Broad Topic Analysis
            </h2>
            <div className="space-y-6">
               {evaluation.topic_performance.map((tp, i) => {
                 const pct = (tp.score / tp.total) * 100
                 return (
                   <div key={i} className="group">
                     <div className="flex items-center justify-between mb-2">
                       <div>
                        <p className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                          <CheckCircle className={`w-3.5 h-3.5 ${pct >= 70 ? 'text-green-500' : 'text-gray-300'}`} />
                          {tp.topic}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{tp.feedback}</p>
                       </div>
                       <span className={`text-xs font-bold px-2 py-1 rounded-lg ${pct >= 75 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                         {tp.score}/{tp.total}
                       </span>
                     </div>
                     <div className="h-2 w-full bg-[var(--bg-main)] rounded-full overflow-hidden">
                       <div 
                        className={`h-full transition-all duration-700 rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} 
                        style={{ width: `${pct}%` }} 
                       />
                     </div>
                   </div>
                 )
               })}
            </div>
          </div>
        )}

        {/* Insight Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 mb-8 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Lightbulb className="w-32 h-32" />
           </div>
           <div className="relative z-10">
              <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-yellow-400" /> Knowledge Gap Insights
              </h2>
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                Based on these results, you have demonstrated a strong understanding of {evaluation.topic_performance?.filter(t => (t.score/t.total) >= 0.7).map(t => t.topic).join(', ') || 'foundation concepts'}. 
                To improve your score, focus your next study session on {evaluation.topic_performance?.filter(t => (t.score/t.total) < 0.7).map(t => t.topic).join(', ') || 'advanced application'}.
              </p>
              <div className="flex gap-4">
                 <button onClick={() => router.push('/courses')} className="px-5 py-2 bg-white text-gray-900 font-bold rounded-xl text-sm hover:bg-gray-100 transition">Return to Course</button>
                 <button onClick={() => window.print()} className="px-5 py-2 bg-white/10 text-white font-bold rounded-xl text-sm hover:bg-white/20 transition border border-white/20">Download Report</button>
              </div>
           </div>
        </div>


        {/* Overall feedback */}
        <div className="bg-teal-900/10 border border-teal-800/30 rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-teal-400 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Overall Feedback
          </h2>
          <p className="text-teal-100/80 text-sm leading-relaxed">{evaluation.overall_feedback}</p>
        </div>

        {/* Per-question results */}
        <div className="space-y-4">
          <h2 className="font-semibold text-[var(--text-main)] text-lg">Question-by-Question Breakdown</h2>
          {evaluation.results.map((r, i) => (
            <div key={i} className={`bg-[var(--bg-card)] rounded-2xl border-2 p-5 ${r.is_correct ? 'border-green-500/20' : 'border-red-500/10'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${r.is_correct ? 'bg-green-100' : 'bg-red-100'}`}>
                  {r.is_correct
                    ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : <XCircle className="w-4 h-4 text-red-500" />
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <span className="font-semibold text-sm text-[var(--text-main)]">Question {r.question_id}</span>
                    <span className={`font-bold text-sm ${r.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                      {r.marks_awarded} / {r.marks_available} marks
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mb-2">{r.feedback}</p>
                  {r.correct_answer && (
                    <div className="bg-green-500/10 rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-green-400 mb-0.5">Correct Answer:</p>
                      <p className="text-xs text-green-100/70">{r.correct_answer}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
