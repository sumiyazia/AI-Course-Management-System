from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import connect_db, disconnect_db
from app.routes import auth, courses, exams, submissions, evaluations, insights, materials, gamification, certificates

app = FastAPI(
    title="University AI Assessment System",
    description="AI-powered exam generation and evaluation system using Groq + MongoDB",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()

app.include_router(auth.router,        prefix="/api/auth",        tags=["Authentication"])
app.include_router(courses.router,     prefix="/api/courses",     tags=["Courses"])
app.include_router(exams.router,       prefix="/api/exams",       tags=["Exams"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])
app.include_router(evaluations.router, prefix="/api/evaluations", tags=["Evaluations"])
app.include_router(insights.router,    prefix="/api/insights",    tags=["AI Insights"])
app.include_router(materials.router,   prefix="/api/materials",   tags=["Course Materials"])
app.include_router(gamification.router,prefix="/api/gamification",tags=["Gamification"])
app.include_router(certificates.router,prefix="/api/certificates",tags=["Certificates"])

@app.get("/")
async def root():
    return {"message": "University AI Assessment API is running", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
