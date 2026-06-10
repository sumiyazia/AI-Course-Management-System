# University AI Assessment System — Backend

A FastAPI backend for AI-powered exam generation and evaluation using **Groq API** (free tier) and **MongoDB**.

---

## Features

| Feature | Details |
|---|---|
| **Teacher** | Create courses with syllabus, generate exams/quizzes/assignments using AI, publish them, view all results |
| **Student** | Enroll in courses, view published exams, submit answers |
| **AI Evaluation** | Groq (Llama 3.3 70B) auto-grades every submission with detailed feedback |
| **Syllabus Lock** | AI is strictly limited to topics in the course outline |
| **Out-of-Scope Guard** | If a topic isn't in the syllabus, AI flags it instead of answering |
| **Auth** | JWT-based auth with Teacher / Student roles |

---

## Quick Start

### 1. Prerequisites
- Python 3.10+
- MongoDB running locally (`mongod`) OR a MongoDB Atlas connection string

### 2. Clone / Extract and Setup

```bash
cd uni_ai_backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `GROQ_API_KEY` → Get free at https://console.groq.com (no credit card required)
- `MONGODB_URL` → Your MongoDB connection string
- `SECRET_KEY` → Any random long string

### 4. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000/docs** for interactive Swagger UI.

---

## API Endpoints

### Auth
| Method | URL | Description |
|---|---|---|
| POST | `/api/auth/register` | Register teacher or student |
| POST | `/api/auth/login` | Login, get JWT token |
| GET | `/api/auth/me` | Get current user profile |

### Courses
| Method | URL | Role | Description |
|---|---|---|---|
| POST | `/api/courses/` | Teacher | Create course with syllabus |
| GET | `/api/courses/` | Both | List all courses |
| GET | `/api/courses/my` | Teacher | My courses |
| GET | `/api/courses/{id}` | Both | Course detail |
| POST | `/api/courses/enroll` | Student | Enroll in a course |
| POST | `/api/courses/check-topic` | Both | Check if topic is in syllabus |

### Exams / Quizzes / Assignments
| Method | URL | Role | Description |
|---|---|---|---|
| POST | `/api/exams/generate` | Teacher | AI-generate assessment |
| POST | `/api/exams/publish` | Teacher | Publish to students |
| GET | `/api/exams/course/{id}` | Both | List assessments for course |
| GET | `/api/exams/{id}` | Both | Get assessment (answers hidden for students) |
| DELETE | `/api/exams/{id}` | Teacher | Delete assessment |

### Submissions
| Method | URL | Role | Description |
|---|---|---|---|
| POST | `/api/submissions/` | Student | Submit answers |
| GET | `/api/submissions/my` | Student | My submissions |
| GET | `/api/submissions/exam/{id}` | Teacher | All submissions for an exam |
| GET | `/api/submissions/{id}` | Both | Single submission |

### Evaluations
| Method | URL | Role | Description |
|---|---|---|---|
| POST | `/api/evaluations/evaluate/{submission_id}` | Teacher | AI-evaluate one submission |
| POST | `/api/evaluations/evaluate-all/{exam_id}` | Teacher | AI-evaluate all pending submissions |
| GET | `/api/evaluations/submission/{id}` | Both | Get evaluation result |
| GET | `/api/evaluations/exam/{id}/results` | Teacher | All results for an exam |

---

## Example Workflow

### As Teacher:
1. Register: `POST /api/auth/register` with `role: "teacher"`
2. Create course: `POST /api/courses/` — paste full syllabus in `course_outline`
3. Generate exam: `POST /api/exams/generate` — choose number of questions, type, difficulty
4. Publish: `POST /api/exams/publish`
5. After students submit → `POST /api/evaluations/evaluate-all/{exam_id}`
6. View results: `GET /api/evaluations/exam/{id}/results`

### As Student:
1. Register: `POST /api/auth/register` with `role: "student"`
2. Enroll: `POST /api/courses/enroll`
3. View exam: `GET /api/exams/{id}` (correct answers hidden)
4. Submit: `POST /api/submissions/`
5. View result: `GET /api/evaluations/submission/{id}`

---

## Groq Free Tier Info

- **Model used:** `llama-3.3-70b-versatile`
- **Free limits:** ~30 requests/min, 6000 tokens/min, 14400 requests/day
- **Sufficient for:** Development + small classes
- **Upgrade if:** Running multiple classes simultaneously in production

Get your API key (no credit card): https://console.groq.com

---

## Project Structure

```
uni_ai_backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, routers
│   ├── core/
│   │   ├── config.py        # Settings from .env
│   │   ├── database.py      # MongoDB connection (Motor async)
│   │   └── security.py      # JWT, password hashing, role guards
│   ├── models/
│   │   └── schemas.py       # Pydantic models for all requests/responses
│   ├── routes/
│   │   ├── auth.py          # Register, login, profile
│   │   ├── courses.py       # Course CRUD + enroll
│   │   ├── exams.py         # AI exam generation + publish
│   │   ├── submissions.py   # Student answer submission
│   │   └── evaluations.py   # AI evaluation + results
│   └── services/
│       └── groq_service.py  # All Groq API calls + syllabus-locked prompts
├── .env.example             # Environment variables template
├── requirements.txt
└── README.md
```
