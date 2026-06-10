'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { authApi, coursesApi, submissionsApi, gamificationApi } from '@/lib/api'
import { BookOpen, FileText, Award, TrendingUp, ArrowRight, Search, Clock, Trophy } from 'lucide-react'
import { Course, Submission, User } from '@/types'
import Cookies from 'js-cookie'
import GamificationOverview from '@/components/dashboard/GamificationOverview'

export default function StudentDashboard() {
  const { user: authUser } = useAuth()
  const [userData, setUserData] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [userRank, setUserRank] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authUser && !userData) setUserData(authUser)
  }, [authUser])

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, sRes, uRes, lRes] = await Promise.all([
          coursesApi.my(), // Fetch only enrolled courses
          submissionsApi.my(),
          authApi.me(), // Refresh user data to get approval updates
          gamificationApi.getLeaderboard(3) // Get top 3 for the preview
        ])
        setCourses(cRes.data)
        setSubmissions(sRes.data)
        setUserData(uRes.data)
        setLeaderboard(lRes.data.top_players)
        setUserRank(lRes.data.user_rank)
        
        // Update local session data
        Cookies.set('user', JSON.stringify(uRes.data))
      } catch { } finally { setLoading(false) }
    }
    load()
  }, [])

  const enrolledCount = userData?.enrolled_courses?.length ?? 0
  const pendingCourses = userData?.pending_courses?.length ?? 0
  const evaluated = submissions.filter(s => s.status === 'evaluated').length
  const pending = submissions.filter(s => s.status === 'pending').length

  const statCards = [
    { label: 'Enrolled Courses', value: enrolledCount, icon: BookOpen, color: 'from-teal-500 to-teal-700' },
    { label: 'Course Approvals', value: pendingCourses, icon: Clock, color: 'from-blue-500 to-blue-700' },
    { label: 'Evaluated', value: evaluated, icon: Award, color: 'from-green-500 to-green-700' },
    { label: 'Pending Reviews', value: pending, icon: TrendingUp, color: 'from-orange-400 to-orange-600' },
  ]

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎓</span>
          <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">
            Hello, <span className="text-gradient">{userData?.name || authUser?.name}</span>
          </h1>
        </div>
        <p className="text-gray-500">Track your learning progress and upcoming exams.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-subtle)] card-hover">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-md`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-display text-2xl font-bold text-[var(--text-main)]">{loading ? '...' : s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Gamification Column */}
        <div className="lg:col-span-1">
          <GamificationOverview user={userData} loading={loading} />
          
          <div className="mt-8 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6">
             <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-600" /> Leaderboard
              </h2>
              <Link href="/leaderboard" className="text-xs text-teal-600 font-semibold hover:text-teal-800 flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {userRank ? (
                <>You are ranked <span className="text-[var(--text-main)] font-bold">#{userRank.rank}</span> overall.</>
              ) : 'Loading rank...'}
            </p>
            <div className="space-y-4">
              {leaderboard.map((player) => (
                <div key={player.rank} className={`flex items-center gap-3 p-1 rounded-lg ${player.name === userData?.name ? 'bg-teal-50 border border-teal-100' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    player.rank === 1 ? 'bg-amber-100 text-amber-700' : 
                    player.rank === 2 ? 'bg-gray-100 text-gray-700' : 
                    player.rank === 3 ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-400'
                  }`}>
                    {player.rank}
                  </div>
                  <div className="flex-1 text-sm font-medium truncate">{player.name}</div>
                  <div className="text-xs font-bold text-teal-600">{player.xp >= 1000 ? `${(player.xp / 1000).toFixed(1)}k` : player.xp} XP</div>
                </div>
              ))}
              {leaderboard.length === 0 && !loading && (
                <p className="text-center text-xs text-gray-400 py-4">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* My Enrolled Courses */}
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" /> My Enrolled Courses ({courses.length})
              </h2>
              <Link href="/courses" className="text-xs text-teal-600 font-semibold hover:text-teal-800 flex items-center gap-1">
                Browse More <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {courses.slice(0, 4).map(c => (
                  <Link key={c.id} href={`/courses/${c.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-main)] transition-colors group border border-transparent hover:border-[var(--border-subtle)] bg-gray-50/50">
                    <div className="w-10 h-10 rounded-xl bg-teal-gradient flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[var(--text-main)] truncate group-hover:text-teal-700">{c.title}</p>
                      <p className="text-[10px] text-gray-500">by {c.teacher_name}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-600 flex-shrink-0" />
                  </Link>
                ))}
                {courses.length === 0 && (
                  <div className="py-8 text-center col-span-2">
                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">You are not enrolled in any courses yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Recent Submissions
            </h2>
            <Link href="/submissions" className="text-xs text-teal-600 font-semibold hover:text-teal-800 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-teal-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No submissions yet</p>
              <Link href="/courses" className="mt-3 inline-flex items-center gap-1 text-teal-600 text-sm font-semibold">
                Find a course <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.slice(0, 4).map(s => (
                <Link key={s.id} href={`/submissions/${s.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-main)] transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.status === 'evaluated' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                    {s.status === 'evaluated'
                      ? <Award className="w-5 h-5 text-green-600" />
                      : <FileText className="w-5 h-5 text-amber-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--text-main)] truncate group-hover:text-teal-700">Exam Submission</p>
                    <p className="text-xs text-gray-500">{new Date(s.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`badge ${s.status === 'evaluated' ? 'badge-green' : 'badge-orange'}`}>
                    {s.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}
