export type UserRole = 'teacher' | 'student'

export interface Badge {
  name: string
  description: string
  icon: string
  awarded_at: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  enrolled_courses?: string[]
  pending_courses?: string[]
  xp?: number
  level?: number
  streak?: number
  badges?: Badge[]
  last_login?: string
}

export interface LeaderboardEntry {
  rank: number
  name: string
  xp: number
  level: number
  badges_count: number
}

export interface LeaderboardResponse {
  top_players: LeaderboardEntry[]
  user_rank: LeaderboardEntry
}

export interface TokenResponse {
  access_token: string
  token_type: string
  role: UserRole
  name: string
}

export interface Course {
  id: string
  title: string
  description: string
  course_outline: string
  teacher_id: string
  teacher_name: string
  created_at: string
  enrolled_count: number
  pending_students?: { student_id: string; student_name: string }[]
}

export interface Question {
  id: number
  type: 'mcq' | 'true_false' | 'short_answer' | 'essay'
  question: string
  options?: string[]
  correct_answer?: string
  expected_answer_guide?: string
  rubric?: string
  marks: number
  topic: string
}

export interface Exam {
  id: string
  course_id: string
  title: string
  assessment_type: 'exam' | 'quiz' | 'assignment'
  total_marks: number
  questions: Question[]
  created_by: string
  created_at: string
  deadline?: string
  time_limit?: number
  is_published: boolean
}

export interface AnswerItem {
  question_id: number
  answer: string
}

export interface Submission {
  id: string
  exam_id: string
  exam_title?: string
  student_id: string
  student_name: string
  answers: AnswerItem[]
  status: 'pending' | 'evaluated'
  submitted_at: string
}

export interface EvaluationResult {
  question_id: number
  marks_awarded: number
  marks_available: number
  is_correct: boolean
  feedback: string
  correct_answer: string
}

export interface Evaluation {
  id: string
  submission_id: string
  student_name: string
  exam_title: string
  total_marks_available: number
  marks_obtained: number
  percentage: number
  grade: string
  overall_feedback: string
  topic_performance?: { topic: string; score: number; total: number; feedback: string }[]
  results: EvaluationResult[]
  evaluated_at: string
}

export interface RoadmapModule {
  id: string
  title: string
  topics: string[]
  description: string
  prerequisites: string[]
  mastery_task: string
  status?: 'locked' | 'unlocked' | 'completed'
}

export interface CourseRoadmap {
  course_title: string
  modules: RoadmapModule[]
}

export interface Certificate {
  id: string
  course_id: string
  course_title: string
  student_id: string
  student_name: string
  teacher_name: string
  grade: string
  issued_at: string
  verification_code: string
}
