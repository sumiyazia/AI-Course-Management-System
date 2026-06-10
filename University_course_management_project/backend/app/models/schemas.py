from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum

# ─── ENUMS ────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    teacher = "teacher"
    student = "student"

class QuestionType(str, Enum):
    mcq          = "mcq"
    true_false   = "true_false"
    short_answer = "short_answer"
    essay        = "essay"

class DifficultyLevel(str, Enum):
    easy   = "easy"
    medium = "medium"
    hard   = "hard"

class AssessmentType(str, Enum):
    exam       = "exam"
    quiz       = "quiz"
    assignment = "assignment"

class SubmissionStatus(str, Enum):
    pending   = "pending"
    evaluated = "evaluated"

# ─── AUTH ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    role:     UserRole

class UserLogin(BaseModel):
    email:    EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    name:         str

# ─── COURSE ───────────────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    title:          str
    description:    Optional[str] = ""
    course_outline: str = Field(..., description="Full syllabus/course outline text")

class CourseResponse(BaseModel):
    id:             str
    title:          str
    description:    str
    course_outline: str
    teacher_id:     str
    teacher_name:   str
    created_at:     datetime
    enrolled_count: int = 0

class EnrollRequest(BaseModel):
    course_id: str

# ─── EXAM / QUIZ / ASSIGNMENT ─────────────────────────────────────────────────

class GenerateExamRequest(BaseModel):
    course_id:      str
    title:          Optional[str] = ""
    num_questions:  int           = Field(default=10, ge=1, le=50)
    question_types: List[QuestionType] = [QuestionType.mcq, QuestionType.short_answer]
    difficulty:     DifficultyLevel    = DifficultyLevel.medium
    topic_focus:    Optional[str]      = ""
    assessment_type: AssessmentType    = AssessmentType.exam
    deadline:        Optional[datetime] = None
    time_limit:      Optional[int]      = Field(default=None, description="Time limit in minutes")

class ExamResponse(BaseModel):
    id:              str
    course_id:       str
    title:           str
    assessment_type: str
    total_marks:     int
    questions:       List[dict]
    created_by:      str
    created_at:      datetime
    deadline:        Optional[datetime] = None
    time_limit:      Optional[int]      = None
    is_published:    bool = False

class PublishExamRequest(BaseModel):
    exam_id: str

# ─── SUBMISSION ───────────────────────────────────────────────────────────────

class AnswerItem(BaseModel):
    question_id: int
    answer:      str

class IntegrityLog(BaseModel):
    event_type: str  # "tab_switch", "fullscreen_exit", "paste", "blur", "focus"
    timestamp:  datetime
    details:    Optional[str] = ""

class SubmitAnswersRequest(BaseModel):
    exam_id:        str
    answers:        List[AnswerItem]
    integrity_logs: List[IntegrityLog] = []
    client_info:    Optional[dict] = {} # IP, User Agent, etc.

class SubmissionResponse(BaseModel):
    id:         str
    exam_id:    str
    student_id: str
    student_name: str
    answers:    List[dict]
    status:     str
    submitted_at: datetime

# ─── EVALUATION ───────────────────────────────────────────────────────────────

class EvaluationResponse(BaseModel):
    id:                    str
    submission_id:         str
    student_name:          str
    exam_title:            str
    total_marks_available: int
    marks_obtained:        float
    percentage:            float
    grade:                 str
    overall_feedback:      str
    results:               List[dict]
    evaluated_at:          datetime

# ─── INSIGHTS & ADAPTIVE LEARNING ───────────────────────────────────────────

class TopicInsight(BaseModel):
    topic: str
    average_score_percentage: float
    student_struggle_count: int
    recommendation: str

class CourseInsightsResponse(BaseModel):
    course_id: str
    generated_at: datetime
    overall_performance_summary: str
    bottleneck_topics: List[TopicInsight]
    suggested_actions: List[str]

class RemedialQuizRequest(BaseModel):
    submission_id: str

class StudyGuideRequest(BaseModel):
    course_id: str
    topic_focus: Optional[str] = ""

class StudyGuideResponse(BaseModel):
    course_id: str
    title: str
    summary: str
    key_concepts: List[dict]
    practice_prompts: List[str]
    important_terms: List[dict]

# ─── MATERIALS & RAG ─────────────────────────────────────────────────────────

class MaterialResponse(BaseModel):
    id:          str
    course_id:   str
    title:       str
    file_type:   str # "pdf", "docx", "txt"
    upload_date: datetime
    size_bytes:  int

class ChatRequest(BaseModel):
    course_id:   str
    question:    str
    material_id: Optional[str] = None # Optional: limit to one file

class ChatResponse(BaseModel):
    answer:      str
    sources:     List[str] # Filenames of materials used

# ─── GAMIFICATION ───────────────────────────────────────────────────────────

class Badge(BaseModel):
    name: str
    description: str
    icon: str # Emoji or Icon name
    awarded_at: datetime

class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    xp: int
    level: int
    streak: int
    badges: List[Badge]
    last_login: Optional[datetime]

class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    xp: int
    level: int
    badges_count: int

class LeaderboardResponse(BaseModel):
    top_players: List[LeaderboardEntry]
    user_rank: Optional[LeaderboardEntry]

# ─── CERTIFICATES ─────────────────────────────────────────────────────────────

class CertificateIssueRequest(BaseModel):
    course_id: str
    student_id: str
    grade: str = "Pass"

class CertificateResponse(BaseModel):
    id: str
    course_id: str
    course_title: str
    student_id: str
    student_name: str
    teacher_name: str
    grade: str
    issued_at: datetime
    verification_code: str

# ─── MISC ─────────────────────────────────────────────────────────────────────

class TopicCheckRequest(BaseModel):
    course_id: str
    topic:     str

class MessageResponse(BaseModel):
    message: str
    data:    Optional[Any] = None
