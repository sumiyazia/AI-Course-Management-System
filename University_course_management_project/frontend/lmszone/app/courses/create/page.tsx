'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { coursesApi } from '@/lib/api'
import { BookOpen, FileText, ArrowLeft, Sparkles } from 'lucide-react'

interface CourseForm {
  title: string
  description: string
  course_outline: string
}

export default function CreateCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<CourseForm>()

  const onSubmit = async (data: CourseForm) => {
    setLoading(true)
    try {
      await coursesApi.create(data)
      toast.success('Course created successfully!')
      router.push('/courses')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create course')
    } finally { setLoading(false) }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">Create New Course</h1>
          <p className="text-gray-500 mt-1">Add your course details and syllabus — AI will use this to generate exams.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Tip: Write a detailed course outline</p>
            <p className="text-amber-700 text-xs mt-0.5">The more detailed your syllabus, the better the AI-generated exams and evaluations will be. Include all topics, subtopics, and learning objectives.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8">
            <h2 className="font-semibold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" /> Course Information
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Introduction to Computer Science"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-main)] text-[var(--text-main)] focus:bg-[var(--bg-card)] transition-all text-sm"
                  {...register('title', { required: 'Title is required' })}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the course..."
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-teal-500 bg-gray-50 focus:bg-white transition-all text-sm resize-none"
                  {...register('description')}
                />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8">
            <h2 className="font-semibold text-[var(--text-main)] mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" /> Course Outline / Syllabus *
            </h2>
            <p className="text-xs text-gray-500 mb-5">This is the core content the AI will use. Be as detailed as possible.</p>

            <textarea
              rows={14}
              placeholder={`Week 1: Introduction to Programming
- What is programming?
- History of programming languages
- Setting up development environment

Week 2: Variables and Data Types
- Integers, floats, strings, booleans
- Variable declaration and assignment
- Type conversion

Week 3: Control Flow
- If/else statements
- Loops (for, while)
- Break and continue statements

...continue with all topics`}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-main)] text-[var(--text-main)] focus:bg-[var(--bg-card)] transition-all text-sm font-mono resize-none"
              {...register('course_outline', { required: 'Course outline is required' })}
            />
            {errors.course_outline && <p className="text-red-500 text-xs mt-1">{errors.course_outline.message}</p>}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-teal-gradient text-white font-bold rounded-2xl hover:opacity-90 transition shadow-lg shadow-teal-200 disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <BookOpen className="w-4 h-4" />}
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
