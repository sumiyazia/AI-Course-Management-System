'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, BookOpen, ArrowRight, Lock, Mail } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(data)
      const { access_token, role, name } = res.data
      login(access_token, { id: '', name, email: data.email, role })
      toast.success(`Welcome back, ${name}!`)
      router.push(role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-teal-gradient flex">
      {/* Left visual */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden px-16">
        <div className="absolute inset-0 opacity-10 dot-pattern" />
        <div className="absolute top-20 right-10 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-teal-300/20 rounded-full blur-3xl animate-float" style={{animationDelay:'1.5s'}} />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-8 backdrop-blur">
            <img src="/logo.png" alt="LMSZone Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-4 leading-tight">
            Welcome<br />Back!
          </h1>
          <p className="text-teal-200 text-lg max-w-sm">Sign in to your LMSZone account and continue your learning journey.</p>
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-xs mx-auto">
            {[
              { label: 'Students', value: '12M+' },
              { label: 'Courses', value: '2.4K+' },
              { label: 'Teachers', value: '18K+' },
              { label: 'AI Evals', value: '850K+' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 text-center">
                <p className="font-display font-bold text-2xl text-amber-400">{s.value}</p>
                <p className="text-teal-200 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 bg-[var(--bg-main)] flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-md animate-slide-up">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <img src="/logo.png" alt="LMSZone Logo" className="w-9 h-9 object-contain" />
            <span className="font-display text-xl font-bold text-teal-800">LMS<span className="text-amber-500">Zone</span>.</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-[var(--text-main)] mb-2">Sign In</h2>
          <p className="text-gray-500 mb-8">Enter your credentials to access your account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@university.edu"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-teal-500 bg-[var(--bg-card)] focus:bg-[var(--bg-card)] transition-all text-sm font-medium text-[var(--text-main)]"
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
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-teal-500 bg-gray-50 focus:bg-white transition-all text-sm font-medium"
                  {...register('password', { required: 'Password is required' })}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-gradient text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-teal-200 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-semibold text-teal-700 hover:text-teal-900 transition-colors">
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
