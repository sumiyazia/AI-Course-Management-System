'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BookOpen, Brain, Users, Award, ArrowRight, ChevronRight, Star, Zap, Shield, BarChart3 } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const stats = [
  { label: 'Active Students', value: '12M+', icon: Users },
  { label: 'Courses Available', value: '2.4K+', icon: BookOpen },
  { label: 'AI Evaluations', value: '850K+', icon: Brain },
  { label: 'Success Rate', value: '87.6%', icon: Award },
]

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Exam Generation',
    desc: 'Generate exams, quizzes, and assignments in seconds using Groq AI, strictly scoped to your course syllabus.',
    color: 'from-teal-500 to-teal-700',
  },
  {
    icon: Zap,
    title: 'Instant Smart Evaluation',
    desc: 'Auto-evaluate entire student batches with detailed per-question feedback, grades, and performance analytics.',
    color: 'from-amber-400 to-amber-600',
  },
  {
    icon: Shield,
    title: 'Syllabus-Scoped Safety',
    desc: 'Our AI only generates and evaluates content within the course outline — no out-of-scope hallucinations.',
    color: 'from-teal-600 to-teal-900',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    desc: 'Track student progress, identify weak areas, and make data-driven teaching decisions at a glance.',
    color: 'from-amber-500 to-orange-600',
  },
]

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="min-h-screen bg-[var(--bg-main)] overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-teal-100 dark:border-teal-900/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="LMSZone Logo" className="w-12 h-12 object-contain" />
            <span className="font-display text-xl font-bold text-teal-800 dark:text-teal-100">
              LMS<span className="text-amber-500">Zone</span>.
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            <a href="#features" className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors">Features</a>
            <a href="#stats" className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors">About</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login" className="text-sm font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/auth/register" className="text-sm font-semibold text-white bg-teal-gradient px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-teal-200">
              Join for Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen bg-teal-gradient overflow-hidden flex items-center">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }} />
        </div>
        {/* Floating orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-teal-300/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

        <div className="max-w-[1440px] mx-auto px-6 pt-24 pb-0 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-end relative z-10">
          <div className={`${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            <div className="pb-24">
              <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                Top AI Learning Platform
              </div>
              <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6">
                Let&apos;s New Course<br />
                Best <span className="text-amber-400">Platform</span>
              </h1>
              <p className="text-teal-100 text-lg leading-relaxed mb-10 max-w-lg">
                LMSZone provides a specialized AI-powered environment tailored to university assessment — with intelligent exam generation, instant evaluation, and advanced security features.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/auth/register" className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-2xl shadow-amber-400/30 hover:shadow-amber-400/50 hover:-translate-y-0.5">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/auth/login" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-all backdrop-blur-sm">
                  Sign In
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>


          </div>

          {/* Hero Image Section - Positioned at bottom */}
          <div className={`${mounted ? 'animate-slide-in-right' : 'opacity-0'} relative lg:scale-110 xl:scale-125 z-20`}>
            <div className="absolute -inset-20 bg-teal-400/15 rounded-full blur-[120px]" />
            <img
              src="/hero-section.png"
              alt="LMSZone Platform"
              className="relative z-10 w-full h-auto drop-shadow-[0_20px_50px_rgba(13,110,100,0.3)] rounded-t-2xl md:rounded-t-3xl border-b-0"
            />
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L60 68C120 56 240 32 360 24C480 16 600 24 720 32C840 40 960 48 1080 44C1200 40 1320 24 1380 16L1440 8V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="currentColor" className="text-[var(--bg-main)]" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-20 bg-[var(--bg-main)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
              About LMSZone
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              A Learning Platform Based on<br />
              <span className="text-gradient">Practical Knowledge</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Founded by a team of passionate educators and tech enthusiasts, LMSZone blends innovative AI technology with world-class mentorship.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center p-8 rounded-3xl border border-teal-100 dark:border-teal-900/50 bg-gradient-to-b from-teal-50/50 dark:from-teal-900/20 to-white dark:to-gray-950 card-hover">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <img src="/logo.png" alt="Icon" className="w-10 h-10 object-contain" />
                </div>
                <p className="font-display text-3xl font-bold text-teal-800 dark:text-teal-100 mb-1">{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gradient-to-b from-[var(--bg-main)] to-teal-500/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose <span className="text-gradient">LMSZone</span>?
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Everything a modern university needs for intelligent, scalable assessment.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-7 card-hover group">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-lg">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-teal-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 dot-pattern" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform<br />Your Classroom?
          </h2>
          <p className="text-teal-100 text-lg mb-10 max-w-xl mx-auto">
            Join 12M+ learners and 18K+ educators already using LMSZone for smarter, faster, AI-powered assessments.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/register?role=teacher" className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-2xl">
              I&apos;m a Teacher →
            </Link>
            <Link href="/auth/register?role=student" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-8 py-4 rounded-2xl transition-all">
              I&apos;m a Student →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#041210] border-t border-white/5 pt-20 pb-10 overflow-hidden relative">
        {/* Abstract background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="LMSZone Logo" className="w-10 h-10 object-contain" />
                <span className="font-display text-2xl font-bold text-white">LMS<span className="text-amber-400">Zone</span>.</span>
              </div>
              <p className="text-teal-100/40 text-sm leading-relaxed max-w-xs">
                The world&apos;s most advanced AI-powered university assessment system. Empowering educators and students with smart, scalable evaluations.
              </p>
              <div className="flex items-center gap-4 pt-2">
                {['twitter', 'linkedin', 'github'].map((s) => (
                  <a key={s} href="#" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400 hover:bg-teal-500 hover:text-white transition-all">
                    <div className="capitalize font-bold text-[10px]">{s.charAt(0)}</div>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold mb-6">Quick Links</h4>
              <ul className="space-y-4">
                {['Features', 'Assessment', 'Dashboard', 'Pricing', 'API'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-teal-100/40 hover:text-amber-400 text-sm transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-bold mb-6">Resources</h4>
              <ul className="space-y-4">
                {['Documentation', 'Help Center', 'Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-teal-100/40 hover:text-amber-400 text-sm transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div className="space-y-6">
              <h4 className="text-white font-bold mb-2">Join Newsletter</h4>
              <p className="text-teal-100/40 text-sm">Get the latest updates on AI in education.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Email address" 
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white w-full focus:outline-none focus:border-teal-500 transition-colors"
                />
                <button className="bg-teal-gradient text-white p-2.5 rounded-xl hover:opacity-90 transition-opacity">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-teal-100/20 text-xs">
              © 2026 LMSZone Inc. All rights reserved. Built with precision for higher education.
            </p>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 text-teal-100/20 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                System Status: Operational
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
