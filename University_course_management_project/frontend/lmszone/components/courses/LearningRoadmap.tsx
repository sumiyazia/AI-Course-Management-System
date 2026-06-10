'use client'
import { CourseRoadmap, RoadmapModule } from '@/types'
import { CheckCircle2, Lock, PlayCircle, Info } from 'lucide-react'
import { motion } from 'framer-motion'

interface LearningRoadmapProps {
  roadmap: CourseRoadmap | null
  loading: boolean
}

export default function LearningRoadmap({ roadmap, loading }: LearningRoadmapProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!roadmap || !roadmap.modules) return null

  return (
    <div className="relative py-8">
      {/* Dynamic SVG Path Background */}
      <div className="absolute left-[39px] top-10 bottom-10 w-0.5 bg-dashed-line pointer-events-none" />

      <div className="space-y-12">
        {roadmap.modules.map((module, index) => (
          <RoadmapItem 
            key={module.id} 
            module={module} 
            isLast={index === roadmap.modules.length - 1} 
            index={index}
          />
        ))}
      </div>

      <style jsx>{`
        .bg-dashed-line {
          background-image: linear-gradient(to bottom, var(--border-subtle) 50%, transparent 50%);
          background-size: 1px 12px;
        }
      `}</style>
    </div>
  )
}

function RoadmapItem({ module, isLast, index }: { module: RoadmapModule, isLast: boolean, index: number }) {
  const status = module.status || 'locked'
  
  const statusConfig = {
    completed: {
      color: 'bg-green-500',
      icon: CheckCircle2,
      border: 'border-green-200',
      text: 'text-green-700',
      bg: 'bg-green-50'
    },
    unlocked: {
      color: 'bg-teal-500',
      icon: PlayCircle,
      border: 'border-teal-200',
      text: 'text-teal-700',
      bg: 'bg-teal-50'
    },
    locked: {
      color: 'bg-gray-300',
      icon: Lock,
      border: 'border-gray-200',
      text: 'text-gray-400',
      bg: 'bg-gray-50'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative flex gap-8 items-start group"
    >
      {/* Node */}
      <div className="relative z-10">
        <div className={`w-20 h-20 rounded-3xl ${config.color} flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-300`}>
          <Icon className="w-10 h-10 text-white" />
        </div>
        {status === 'completed' && (
           <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
             MASTERED
           </div>
        )}
      </div>

      {/* Content Card */}
      <div className={`flex-1 bg-[var(--bg-card)] rounded-3xl border ${config.border} p-6 shadow-sm group-hover:shadow-md transition-shadow relative overflow-hidden`}>
        {/* Glow effect for unlocked */}
        {status === 'unlocked' && (
           <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
        )}
        
        <div className="flex justify-between items-start mb-2">
          <h4 className={`text-lg font-bold font-display ${status === 'locked' ? 'text-gray-400' : 'text-[var(--text-main)]'}`}>
            {module.title}
          </h4>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${config.bg} ${config.text}`}>
            {status}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-4 line-clamp-2 italic">
          "{module.description}"
        </p>

        {status !== 'locked' && (
          <div className="space-y-3">
             <div className="flex flex-wrap gap-2">
               {module.topics.map(t => (
                 <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">
                   {t}
                 </span>
               ))}
             </div>
             
             <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 p-2 rounded-xl mt-2">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-[10px] text-amber-800 font-medium font-display">
                  <span className="font-bold">Mastery Task:</span> {module.mastery_task}
                </p>
             </div>
          </div>
        )}
        
        {status === 'locked' && (
           <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-2">
             <Lock className="w-3 h-3" /> Complete previous modules to unlock
           </p>
        )}
      </div>
    </motion.div>
  )
}
