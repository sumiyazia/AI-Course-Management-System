'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, BookOpen, ArrowRight, Lock, Mail, User, GraduationCap, Briefcase } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

interface RegisterForm {
  name: string
  email: string
  password: string
  role: 'teacher' | 'student'
}

function RegisterContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { login } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const defaultRole = (params.get('role') as 'teacher' | 'student') || 'student'
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { role: defaultRole }
  })
  const role = watch('role')

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    try {
      const res = await authApi.register(data)
      const { access_token, role: r, name } = res.data
      login(access_token, { id: '', name, email: data.email, role: r })
      toast.success(`Welcome to LMSZone, ${name}!`)
      router.push(r === 'teacher' ? '/dashboard/teacher' : '/dashboard/student')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-teal-gradient flex">
      {/* Left */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden px-16">
        <div className="absolute inset-0 opacity-10 dot-pattern" />
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl animate-float" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-8">
            <img src="/logo.png" alt="LMSZone Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-4">Join the<br />Future of<br /><span className="text-amber-400">Learning</span></h1>
          <p className="text-teal-200 text-lg max-w-sm">Create your free account and access AI-powered assessments, instant evaluations, and world-class courses.</p>
          <div className="mt-10 space-y-3 text-left max-w-xs mx-auto">
            {[
              '✅ AI exam generation in seconds',
              '✅ Instant smart evaluation',
              '✅ Syllabus-scoped safety',
              '✅ Detailed performance analytics',
            ].map((f, i) => (
              <p key={i} className="text-teal-100 text-sm font-medium">{f}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 bg-[var(--bg-card)] flex items-center justify-center px-8 py-12 overflow-y-auto">
        <div className="w-full max-w-md animate-slide-up">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/logo.png" alt="LMSZone Logo" className="w-9 h-9 object-contain" />
            <span className="font-display text-xl font-bold text-teal-800">LMS<span className="text-amber-500">Zone</span>.</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-[var(--text-main)] mb-2">Create Account</h2>
          <p className="text-gray-500 mb-8">Join thousands of students and teachers on LMSZone</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(['student', 'teacher'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setValue('role', r)}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                  role === r
                    ? 'border-teal-600 bg-teal-500/10'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-teal-300'
                }`}
              >
                {r === 'student' ? (
                  <GraduationCap className={`w-6 h-6 ${role === r ? 'text-teal-600' : 'text-gray-400'}`} />
                ) : (
                  <Briefcase className={`w-6 h-6 ${role === r ? 'text-teal-600' : 'text-gray-400'}`} />
                )}
                <span className={`text-sm font-semibold capitalize ${role === r ? 'text-teal-700' : 'text-gray-500'}`}>
                  I&apos;m a {r}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-main)] focus:bg-[var(--bg-card)] transition-all text-sm font-medium text-[var(--text-main)]"
                  {...register('name', { required: 'Name is required' })}
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@university.edu"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-main)] focus:bg-[var(--bg-card)] transition-all text-sm font-medium text-[var(--text-main)]"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-teal-500 bg-gray-50 focus:bg-white transition-all text-sm font-medium"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <input type="hidden" {...register('role')} />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-gradient text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-teal-200 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-teal-700 hover:text-teal-900">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-teal-gradient flex items-center justify-center text-white">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
