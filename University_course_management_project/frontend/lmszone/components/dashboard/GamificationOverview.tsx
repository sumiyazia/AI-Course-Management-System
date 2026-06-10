'use client'
import { User, Badge } from '@/types'
import { Flame, Trophy, Zap, Star } from 'lucide-react'

interface GamificationOverviewProps {
  user: User | null
  loading: boolean
}

export default function GamificationOverview({ user, loading }: GamificationOverviewProps) {
  if (loading) {
    return <div className="h-48 bg-gray-100 animate-pulse rounded-3xl" />
  }

  const xp = user?.xp || 0
  const level = user?.level || 1
  const streak = user?.streak || 0
  const badges = user?.badges || []
  
  // Progress to next level (every 1000 XP)
  const xpInCurrentLevel = xp % 1000
  const progressPercent = Math.max((xpInCurrentLevel / 1000) * 100, xp > 0 ? 2 : 0) // Minimum 2% if they have ANY xp so the bar isn't invisible

  const getLevelTitle = (lvl: number) => {
    if (lvl < 5) return 'Academic Novice'
    if (lvl < 10) return 'Scholar'
    if (lvl < 20) return 'Academic Warrior'
    if (lvl < 50) return 'Dean\'s Favorite'
    return 'Knowledge Legend'
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-3xl p-6 text-white shadow-xl overflow-hidden relative group">
      {/* Decorative background elements */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-all duration-700" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-700" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-gradient rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-teal-300 font-bold uppercase tracking-wider">Level {level}</p>
              <h3 className="text-xl font-bold font-display">{getLevelTitle(level)}</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <Flame className={`w-5 h-5 ${streak > 0 ? 'text-orange-500 animate-pulse' : 'text-gray-500'}`} />
            <span className="font-bold">{streak} Day Streak</span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-400">XP Progress</span>
            <span className="text-teal-400 font-bold">{xpInCurrentLevel} / 1000 XP</span>
          </div>
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-teal-300 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${progressPercent}%`, minWidth: xpInCurrentLevel > 0 ? '4px' : '0' }}
            />
          </div>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-gray-400">Total XP</span>
            </div>
            <p className="text-lg font-bold">{xp.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Badges</span>
            </div>
            <p className="text-lg font-bold">{badges.length}</p>
          </div>
        </div>
        
        {/* badges preview */}
        {badges.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {badges.slice(0, 5).map((badge, i) => (
              <div key={i} title={badge.description} className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/20 group/badge hover:bg-white/20 transition-colors">
                <span className="text-lg group-hover/badge:scale-125 transition-transform">{badge.icon}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
