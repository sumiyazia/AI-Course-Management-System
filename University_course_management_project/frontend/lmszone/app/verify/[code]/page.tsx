'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Calendar, User, BookOpen, Award, CheckCircle2, ArrowRight } from 'lucide-react'
import { certificatesApi } from '@/lib/api'
import { Certificate } from '@/types'
import { motion } from 'framer-motion'

export default function VerificationPage() {
  const { code } = useParams<{ code: string }>()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const res = await certificatesApi.verify(code)
        setCert(res.data)
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    if (code) fetchCert()
  }, [code])

  if (loading) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fffe] flex flex-col items-center justify-center p-6 dot-pattern">
      {/* Branding */}
      <Link href="/" className="flex items-center gap-2 mb-12">
        <div className="w-10 h-10 bg-teal-gradient rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <span className="font-display text-2xl font-bold text-teal-900 tracking-tight">LMSZone</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl border border-amber-100 overflow-hidden"
      >
        <div className="bg-gradient-to-br from-[#1a2e2b] to-[#0d6e64] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-amber-300">
              {error ? <Award className="w-8 h-8 text-red-100" /> : <ShieldCheck className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 font-display">
              {error ? 'Certification Not Found' : 'Authenticated Credential'}
            </h1>
            <p className="text-amber-200 text-xs font-bold uppercase tracking-widest opacity-80">
              {error ? 'Invalid Verification Code' : `Credential ID: ${code}`}
            </p>
          </div>
        </div>

        <div className="p-10">
          {error ? (
            <div className="text-center">
              <p className="text-gray-500 mb-8 leading-relaxed">
                We couldn't find a record for this certificate. Please double-check the URL or contact the issuer.
              </p>
              <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 transition">
                Return to Homepage
              </Link>
            </div>
          ) : cert && (
            <div className="space-y-8">
              <div className="flex flex-col items-center text-center pb-8 border-b border-gray-100">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                <p className="text-gray-400 text-sm uppercase font-bold tracking-widest mb-1">Authenticated Course Completion</p>
                <h2 className="text-3xl font-bold text-gray-900">{cert.student_name}</h2>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Course</p>
                  <div className="flex items-center gap-2 text-gray-900 font-semibold">
                    <BookOpen className="w-4 h-4 text-teal-600" /> {cert.course_title}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Instructor</p>
                  <p className="text-gray-900 font-semibold">{cert.teacher_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Issue Date</p>
                  <div className="flex items-center gap-2 text-gray-900 font-semibold">
                    <Calendar className="w-4 h-4 text-teal-600" /> {new Date(cert.issued_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Final Status</p>
                  <div className="flex items-center gap-2 justify-end text-green-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> {cert.grade || 'Pass'}
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 rounded-2xl p-6 flex items-start gap-4 border border-teal-100">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-bold text-teal-900 text-sm mb-1">Official University Record</h4>
                  <p className="text-xs text-teal-700 leading-relaxed">
                    This certificate is a direct record from the LMS system. It confirms that the student has met all academic criteria for this course.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center text-xs text-gray-400">
                 <span>Verification Record: {cert.id}</span>
                 <Link href={`/courses/${cert.course_id}`} className="flex items-center gap-1 text-teal-600 font-bold hover:underline">
                   View Course Page <ArrowRight className="w-3 h-3" />
                 </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer message */}
      <p className="mt-12 text-gray-400 text-sm">
        Secure academic verification powered by LMSZone AI
      </p>
    </div>
  )
}
