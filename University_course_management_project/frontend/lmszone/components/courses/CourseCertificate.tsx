'use client'
import { motion } from 'framer-motion'
import { Download, Share2, ShieldCheck, GraduationCap, Award, Loader2 } from 'lucide-react'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { certificatesApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { Certificate } from '@/types'

interface CourseCertificateProps {
  certificate: Certificate
}

export default function CourseCertificate({ certificate }: CourseCertificateProps) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const certificateRef = useRef<HTMLDivElement>(null)

  const verificationUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${certificate.verification_code}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verificationUrl)}`

  const handleExportPDF = async () => {
    if (!certificateRef.current) return
    setIsExporting(true)

    try {
      // Import html-to-image which has better support for modern CSS
      const { toPng } = await import('html-to-image')
      const { jsPDF } = await import('jspdf')

      // Ensure fonts are loaded to prevent fallback fonts in PDF
      await document.fonts.ready

      const element = certificateRef.current
      
      // Capture the element as high-res PNG
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 5, // Extremely high resolution
        cacheBust: true,
        backgroundColor: '#f0eff0',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      })
      
      // Create PDF (A4 Landscape)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // Add image to PDF
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
      
      // Download the PDF
      pdf.save(`Certificate_${certificate.student_name.replace(/\s+/g, '_')}.pdf`)

      // ---- RESET PROGRESS FLOW ----
      // Small delay to ensure download started
      setTimeout(async () => {
        try {
          await certificatesApi.resetProgress(certificate.id)
          toast.success("Certificate downloaded! Your course progress has been reset so you can re-enroll.")
          router.push('/dashboard/student')
        } catch (resetError) {
          console.error("Failed to reset progress:", resetError)
        }
      }, 1500)

    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export certificate. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-5xl mx-auto"
    >
      {/* ── Certificate Card ── */}
      <div
        id="premium-certificate"
        ref={certificateRef}
        className="relative w-full overflow-hidden shadow-2xl print:shadow-none bg-[#f0eff0]"
        style={{ aspectRatio: '1.414 / 1' }}
      >
        {/* Marble background */}
        <div className="absolute inset-0 cert-bg" />

        {/* Double gold border */}
        <div className="absolute inset-[10px] pointer-events-none" style={{ border: '1.5px solid rgba(185,148,30,0.45)' }} />
        <div className="absolute inset-[14px] pointer-events-none" style={{ border: '0.5px solid rgba(185,148,30,0.18)' }} />

        {/* Teal corner — top-left (SVG for perfect PDF rendering) */}
        <div className="absolute top-0 left-0 w-32 h-32 overflow-hidden z-10 pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="0,0 65,0 0,65" fill="#0d5a51" />
            <line x1="0" y1="58" x2="58" y2="0" stroke="#c9a227" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Teal corner — bottom-right (SVG for perfect PDF rendering) */}
        <div className="absolute bottom-0 right-0 w-32 h-32 overflow-hidden z-10 pointer-events-none transform rotate-180">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="0,0 65,0 0,65" fill="#0d5a51" />
            <line x1="0" y1="58" x2="58" y2="0" stroke="#c9a227" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Main content */}
        <div className="relative z-20 h-full flex flex-col items-center justify-between px-[8%] py-[4%] text-center">

          {/* ── Header ── */}
          <div className="w-full flex flex-col items-center gap-1">
            <p className="cert-org">LMSZone University Academy · Excellence in Digital Learning</p>
            <div className="cert-divider" />
            <h1 className="cert-title-of">Certificate &nbsp; Of &nbsp; Completion</h1>
          </div>

          {/* ── Middle — name & description ── */}
          <div className="w-full relative flex flex-col items-center gap-2">
            {/* Academic Icons */}
            <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-[4%] opacity-20">
              <GraduationCap className="w-16 h-16 text-[#b8860b]" />
              <Award className="w-16 h-16 text-[#b8860b]" />
            </div>

            <p className="cert-presented">This document proudly certifies that</p>
            <h2 className="cert-name">{certificate.student_name}</h2>
            <div className="cert-name-underline" />
            <p className="cert-desc">
              Has successfully fulfilled all academic requirements and demonstrated outstanding mastery in the course
              <span className="font-semibold not-italic text-[#1c2a50]"> {certificate.course_title} </span>
              awarded by the LMSZone Academic Board with all rights and privileges pertaining thereto.
            </p>
          </div>

          {/* ── Bottom ── */}
          <div className="w-full flex flex-col items-center gap-4">
            {/* Three-column: Instructor | QR + Grade | Registrar */}
            <div className="w-full grid grid-cols-3 gap-8 items-end">

              {/* Instructor */}
              <div className="flex flex-col items-center gap-1">
                <span className="cert-sig-name">{certificate.teacher_name}</span>
                <div className="cert-sig-line" />
                <span className="cert-sig-label">Directing Instructor</span>
              </div>

              {/* QR Code + Grade Badge */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-4">
                  {/* QR */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="cert-qr-wrap">
                      <img src={qrCodeUrl} alt="Verify QR" className="w-full h-full object-contain" />
                    </div>
                    <span className="cert-ver-code">SECURE-ID: {certificate.verification_code}</span>
                  </div>
                  {/* Grade Seal */}
                  <div className="cert-grade-badge">
                    <span className="cert-grade-val">
                      {(certificate as any).grade ?? 'A+'}
                    </span>
                    <span className="cert-grade-lbl">Distinction</span>
                  </div>
                </div>
              </div>

              {/* Registrar */}
              <div className="flex flex-col items-center gap-1">
                <span className="cert-sig-name">LMSZone Board</span>
                <div className="cert-sig-line" />
                <span className="cert-sig-label">Academic Registrar</span>
              </div>
            </div>

            {/* Footer — date & ID */}
            <div className="w-full flex justify-between items-center px-2 mt-1">
              <span className="cert-footer-text">
                Date Issued: {new Date(certificate.issued_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </span>
              <span className="cert-footer-text flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                ID: {certificate.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="mt-6 flex justify-center gap-4 print:hidden flex-wrap">
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-7 py-3 bg-[#1c2a50] text-white rounded-xl font-semibold text-sm hover:bg-[#0d1a38] transition-all shadow-lg hover:scale-105 disabled:opacity-70 disabled:scale-100"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.08em' }}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Export Certificate
            </>
          )}
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(verificationUrl)
            alert('Verification link copied!')
          }}
          className="flex items-center gap-2 px-7 py-3 bg-white text-[#1c2a50] border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 transition shadow-md"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.08em' }}
        >
          <Share2 className="w-4 h-4" /> Copy Link
        </button>
      </div>

      {/* ── Global styles ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Cinzel:wght@400;600;700&display=swap');

        /* ---- Certificate background: marble ---- */
        .cert-bg {
          background-color: #f0eff0;
          background-image:
            radial-gradient(ellipse 80% 40% at 20% 30%, rgba(180,180,190,0.28) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 70%, rgba(160,160,170,0.22) 0%, transparent 60%),
            radial-gradient(ellipse 100% 30% at 50% 10%, rgba(200,200,210,0.18) 0%, transparent 50%),
            radial-gradient(ellipse 40% 60% at 70% 20%, rgba(190,190,200,0.2) 0%, transparent 50%),
            repeating-linear-gradient(
              -45deg,
              transparent 0px, transparent 18px,
              rgba(150,150,160,0.045) 18px, rgba(150,150,160,0.045) 19px
            ),
            repeating-linear-gradient(
              45deg,
              transparent 0px, transparent 26px,
              rgba(130,130,140,0.03) 26px, rgba(130,130,140,0.03) 27px
            );
        }

        /* ---- Teal corner clips (Deprecating for SVG better compatibility) ---- */
        .teal-corner-tl, .gold-trim-tl, .teal-corner-br, .gold-trim-br { display: none; }

        /* ---- Typography ---- */
        .cert-org {
          font-family: 'Cinzel', serif;
          font-size: clamp(7px, 1.1vw, 10px);
          letter-spacing: 0.22em;
          color: #4a4a55;
          text-transform: uppercase;
        }
        .cert-divider {
          width: 80px; height: 1px;
          background: linear-gradient(to right, transparent, #c9a227, transparent);
          margin: 3px auto;
        }
        .cert-title-of {
          font-family: 'Cinzel', serif;
          font-size: clamp(12px, 2vw, 20px);
          font-weight: 700;
          letter-spacing: 0.28em;
          color: #1c2a50;
          text-transform: uppercase;
        }
        .cert-presented {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: clamp(10px, 1.5vw, 14px);
          color: #666;
        }
        .cert-name {
          font-family: 'Great Vibes', cursive;
          font-size: clamp(28px, 6vw, 58px);
          color: #1c2a50;
          line-height: 1.1;
          letter-spacing: 0.02em;
        }
        .cert-name-underline {
          width: 52%; height: 1px;
          background: linear-gradient(to right, transparent, #444, transparent);
          margin: 2px auto 0;
        }
        .cert-desc {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: clamp(9px, 1.35vw, 13px);
          color: #444;
          max-width: 68%;
          line-height: 1.55;
        }
        .cert-role {
          font-family: 'Cinzel', serif;
          font-size: clamp(8px, 1.2vw, 11px);
          letter-spacing: 0.22em;
          color: #1c2a50;
          text-transform: uppercase;
        }

        /* ---- Signatures ---- */
        .cert-sig-name {
          font-family: 'Great Vibes', cursive;
          font-size: clamp(13px, 2.2vw, 22px);
          color: #2a2a2a;
          display: block;
        }
        .cert-sig-line {
          width: 90%; height: 1px;
          background: #333;
          margin: 1px auto;
        }
        .cert-sig-label {
          font-family: 'Cinzel', serif;
          font-size: clamp(5.5px, 0.85vw, 8px);
          letter-spacing: 0.18em;
          color: #777;
          text-transform: uppercase;
          display: block;
        }

        /* ---- QR ---- */
        .cert-qr-wrap {
          width: clamp(38px, 5.5vw, 55px);
          height: clamp(38px, 5.5vw, 55px);
          border: 1.5px solid rgba(185,148,30,0.35);
          padding: 2px;
          background: white;
        }
        .cert-ver-code {
          font-family: 'Cinzel', serif;
          font-size: clamp(5px, 0.75vw, 7px);
          color: #c9a227;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: block;
          text-align: center;
        }

        /* ---- Grade badge ---- */
        .cert-grade-badge {
          background: linear-gradient(135deg, #c9a227, #e8c94a, #b8860b);
          border-radius: 50%;
          width: clamp(32px, 4.8vw, 48px);
          height: clamp(32px, 4.8vw, 48px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.22);
        }
        .cert-grade-val {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: clamp(9px, 1.5vw, 14px);
          color: #3a2200;
          line-height: 1;
          display: block;
        }
        .cert-grade-lbl {
          font-family: 'Cinzel', serif;
          font-size: clamp(4px, 0.55vw, 5.5px);
          color: #5a3800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          display: block;
        }

        /* ---- Footer ---- */
        .cert-footer-text {
          font-family: 'Cinzel', serif;
          font-size: clamp(5.5px, 0.8vw, 7.5px);
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        /* ---- Print ---- */
        @media print {
          body * { visibility: hidden; }
          #premium-certificate, #premium-certificate * { visibility: visible; }
          #premium-certificate {
            position: fixed; left: 0; top: 0;
            width: 100vw; height: 100vh;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { size: landscape; margin: 0; }
        }
      `}</style>
    </motion.div>
  )
}