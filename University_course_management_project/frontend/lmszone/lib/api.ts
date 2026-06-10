import axios from 'axios'
import Cookies from 'js-cookie'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = Cookies.get('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('token')
      Cookies.remove('user')
      if (typeof window !== 'undefined') window.location.href = '/auth/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string; role: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
}

// Courses
export const coursesApi = {
  list: () => api.get('/api/courses/'),
  get: (id: string) => api.get(`/api/courses/${id}`),
  create: (data: { title: string; description: string; course_outline: string }) =>
    api.post('/api/courses/', data),
  my: () => api.get('/api/courses/my'),
  getRoadmap: (id: string) => api.get(`/api/courses/${id}/roadmap`),
  enroll: (course_id: string) => api.post('/api/courses/enroll', { course_id }),
  checkTopic: (course_id: string, topic: string) =>
    api.post('/api/courses/check-topic', { course_id, topic }),
  getPending: (course_id: string) => api.get(`/api/courses/${course_id}/pending`),
  approve: (course_id: string, student_id: string, approve: boolean) =>
    api.post(`/api/courses/${course_id}/approve`, { student_id, approve }),
  getEnrolledStudents: (course_id: string) => api.get(`/api/courses/${course_id}/students`),
  unenrollStudent: (course_id: string, student_id: string) =>
    api.delete(`/api/courses/${course_id}/students/${student_id}`),
  delete: (course_id: string) => api.delete(`/api/courses/${course_id}`),
}

// Exams
export const examsApi = {
  generate: (data: any) => api.post('/api/exams/generate', data),
  publish: (exam_id: string) => api.post('/api/exams/publish', { exam_id }),
  byCourse: (course_id: string) => api.get(`/api/exams/course/${course_id}`),
  get: (id: string) => api.get(`/api/exams/${id}`),
  delete: (id: string) => api.delete(`/api/exams/${id}`),
}

// Submissions
export const submissionsApi = {
  submit: (data: { exam_id: string; answers: { question_id: number; answer: string }[] }) =>
    api.post('/api/submissions/', data),
  my: () => api.get('/api/submissions/my'),
  teacher: () => api.get('/api/submissions/teacher'),
  byExam: (exam_id: string) => api.get(`/api/submissions/exam/${exam_id}`),
  get: (id: string) => api.get(`/api/submissions/${id}`),
}

// Evaluations
export const evaluationsApi = {
  evaluate: (submission_id: string) => api.post(`/api/evaluations/evaluate/${submission_id}`),
  evaluateAll: (exam_id: string) => api.post(`/api/evaluations/evaluate-all/${exam_id}`),
  bySubmission: (submission_id: string) => api.get(`/api/evaluations/submission/${submission_id}`),
  examResults: (exam_id: string) => api.get(`/api/evaluations/exam/${exam_id}/results`),
}

// Materials & RAG
export const materialsApi = {
  upload: (course_id: string, formData: FormData) => 
    api.post(`/api/materials/upload/${course_id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  list: (course_id: string) => api.get(`/api/materials/course/${course_id}`),
  chat: (data: { course_id: string; question: string; material_id?: string }) => 
    api.post('/api/materials/chat', data),
  delete: (id: string) => api.delete(`/api/materials/${id}`),
  markAsRead: (id: string) => api.post(`/api/materials/read/${id}`),
}

// Insights & Analytics
export const insightsApi = {
  getCourseInsights: (course_id: string) => api.get(`/api/insights/course/${course_id}`),
  generateRemedialQuiz: (submission_id: string) => api.post('/api/insights/remedial-quiz', { submission_id }),
  getStudyGuide: (course_id: string, topic_focus?: string) => 
    api.post('/api/insights/study-guide', { course_id, topic_focus }),
}

// Gamification
export const gamificationApi = {
  getLeaderboard: (limit: number = 10) => api.get(`/api/gamification/leaderboard?limit=${limit}`),
  getCourseLeaderboard: (courseId: string, limit: number = 10) => 
    api.get(`/api/gamification/leaderboard/course/${courseId}?limit=${limit}`),
  getProfile: () => api.get('/api/gamification/profile'),
}

// Certificates
export const certificatesApi = {
  issue: (data: { course_id: string; student_id: string; grade?: string }) => 
    api.post('/api/certificates/issue', data),
  verify: (code: string) => api.get(`/api/certificates/verify/${code}`),
  my: () => api.get('/api/certificates/student'),
  byCourse: (courseId: string) => api.get(`/api/certificates/course/${courseId}`),
  resetProgress: (certId: string) => api.post(`/api/certificates/${certId}/reset-progress`),
}

export default api
