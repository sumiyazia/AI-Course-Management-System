from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from app.core.security import get_current_user, require_teacher
from app.core.database import get_db
from app.models.schemas import CourseInsightsResponse, RemedialQuizRequest, StudyGuideRequest, StudyGuideResponse
from app.services.groq_service import analyze_course_performance, generate_remedial_quiz, generate_study_guide

router = APIRouter()

@router.get("/course/{course_id}", response_model=CourseInsightsResponse, summary="Teacher: Get AI insights on course bottlenecks")
async def get_course_insights(
    course_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Fetch all evaluations for this course
    evaluations = await db["evaluations"].find({"course_id": ObjectId(course_id)}).to_list(length=1000)
    
    if not evaluations:
        raise HTTPException(status_code=400, detail="Not enough data yet. Need student submissions to analyze.")

    # Aggregate evaluation results for AI processing
    # We send a representative sample of performance data
    agg_data = []
    for ev in evaluations:
        agg_data.append({
            "student_name": ev.get("student_name", "Student"),
            "exam_title": ev.get("exam_title", ""),
            "overall_percentage": ev.get("percentage", 0),
            "results": [
                {
                    "topic": r.get("topic", "General"),
                    "is_correct": r.get("is_correct", False),
                    "marks_awarded": r.get("marks_awarded", 0),
                    "marks_available": r.get("marks_available", 0)
                } for r in ev.get("results", [])
            ]
        })

    # Limit payload size to avoid token limits but keep it representative
    sample_data = agg_data[:20] 

    ai_insights = await analyze_course_performance(course["course_outline"], sample_data)
    
    return {
        "course_id": course_id,
        "generated_at": datetime.utcnow(),
        **ai_insights
    }

@router.post("/remedial-quiz", summary="Student: Generate a personalized remedial quiz based on past failure")
async def create_remedial_quiz(
    req: RemedialQuizRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    # Find evaluation
    evaluation = await db["evaluations"].find_one({"submission_id": ObjectId(req.submission_id)})
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found. Has the exam been evaluated?")

    if str(evaluation["student_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only generate remedial quizzes for your own submissions.")

    # Identify failed questions/topics
    failed_context = []
    for res in evaluation.get("results", []):
        if not res.get("is_correct", False):
            # Try to match with original exam to get focus
            exam = await db["exams"].find_one({"_id": evaluation["exam_id"]})
            orig_q = next((q for q in exam["questions"] if q["id"] == res["question_id"]), {})
            
            failed_context.append({
                "question": orig_q.get("question", ""),
                "topic": orig_q.get("topic", "General"),
                "student_answer": "(Evaluated as incorrect)",
                "feedback": res.get("feedback", "")
            })

    if not failed_context:
        return {"message": "Great job! You didn't fail any questions in this exam. No remedial quiz needed."}

    course = await db["courses"].find_one({"_id": evaluation["course_id"]})
    
    quiz_data = await generate_remedial_quiz(course["course_outline"], failed_context)
    
    # Save this as a special "remedial_quiz" type in exams collection (optional, but good for tracking)
    quiz_doc = {
        "course_id": evaluation["course_id"],
        "title": quiz_data["title"],
        "assessment_type": "remedial_quiz",
        "parent_exam_id": evaluation["exam_id"],
        "student_id": ObjectId(current_user["id"]),
        "questions": quiz_data["questions"],
        "created_at": datetime.utcnow(),
        "is_published": True 
    }
    
    result = await db["exams"].insert_one(quiz_doc)
    quiz_doc["id"] = str(result.inserted_id)
    
    return {"message": "Remedial quiz generated successfully", "quiz": quiz_data, "quiz_id": quiz_doc["id"]}

@router.post("/study-guide", response_model=StudyGuideResponse, summary="Generate a comprehensive study guide")
async def get_study_guide(
    req: StudyGuideRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(req.course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    guide_data = await generate_study_guide(course["course_outline"], req.topic_focus)
    
    return {
        "course_id": req.course_id,
        "title": guide_data["title"],
        "summary": guide_data["summary"],
        "key_concepts": guide_data.get("key_concepts", []),
        "practice_prompts": guide_data.get("practice_prompts", []),
        "important_terms": guide_data.get("important_terms", []),
        "exam_tips": guide_data.get("exam_tips", [])
    }
