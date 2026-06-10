# LMSZone — AI-Powered University Assessment Frontend

A complete Next.js 14 frontend for the University AI Assessment System backend.

## Tech Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (teal/amber color theme matching the LMSZone design)
- **React Hook Form** + Zod validation
- **Axios** for API calls
- **react-hot-toast** for notifications
- **Lucide React** icons
- **Framer Motion** animations

## Features
- 🏠 Landing page with hero, stats, features, CTA
- 🔐 Register & Login (teacher / student roles)
- 📚 Course management (create, list, enroll, detail)
- ⚡ AI Exam Generation (via Groq — exam / quiz / assignment)
- 📝 Take Exams (MCQ, short answer, essay)
- ✅ View Evaluations with per-question breakdown
- 👩‍🏫 Teacher dashboard with quick actions
- 🎓 Student dashboard with enrollment tracking
- 📊 Submission management

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure API URL
Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure
```
app/
├── page.tsx                    # Landing page
├── auth/
│   ├── login/page.tsx          # Login
│   └── register/page.tsx       # Register
├── dashboard/
│   ├── teacher/page.tsx        # Teacher dashboard
│   └── student/page.tsx        # Student dashboard
├── courses/
│   ├── page.tsx                # Course listing
│   ├── create/page.tsx         # Create course
│   └── [id]/page.tsx           # Course detail
├── exams/
│   ├── page.tsx                # Exams listing
│   ├── generate/page.tsx       # Generate exam with AI
│   └── [id]/page.tsx           # Exam detail + take exam
└── submissions/
    ├── page.tsx                # My submissions
    └── [id]/page.tsx           # Evaluation result

components/
├── layout/
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── DashboardLayout.tsx

lib/
└── api.ts                      # Axios API client

hooks/
└── useAuth.tsx                 # Auth context

types/
└── index.ts                    # TypeScript types
```

## Color Theme
- **Primary**: Teal (#0d6e64) — matching LMSZone brand
- **Accent**: Amber/Orange (#f59e0b)
- **Dark**: Teal dark (#0a3330)
- **Font**: Playfair Display (headings) + DM Sans (body)
