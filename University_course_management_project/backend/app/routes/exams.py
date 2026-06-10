from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from app.models.schemas import GenerateExamRequest, PublishExamRequest
from app.core.security import get_current_user, require_teacher
from app.core.database import get_db
from app.services.groq_service import generate_exam, generate_assignment

router = APIRouter()

def _fmt_exam(e) -> dict:
    return {
        "id":              str(e["_id"]),
        "course_id":       str(e["course_id"]),
        "title":           e["title"],
        "assessment_type": e.get("assessment_type", "exam"),
        "total_marks":     e.get("total_marks", 0),
        "questions":       e.get("questions", []),
        "created_by":      str(e["created_by"]),
        "created_at":      e["created_at"],
        "deadline":        e.get("deadline"),
        "time_limit":      e.get("time_limit"),
        "is_published":    e.get("is_published", False),
    }


@router.post("/generate", summary="Teacher: Generate exam/quiz/assignment using AI")
async def generate(
    data: GenerateExamRequest,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    course = await db["courses"].find_one({"_id": ObjectId(data.course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if str(course["teacher_id"]) != teacher["id"]:
        raise HTTPException(status_code=403, detail="Not your course")

    instructions = {
        "num_questions":  data.num_questions,
        "question_types": [qt.value for qt in data.question_types],
        "difficulty":     data.difficulty.value,
        "topic_focus":    data.topic_focus or "",
        "type":           data.assessment_type.value,
    }

    # Check if out-of-scope response
    if data.assessment_type.value == "exam":
        ai_result = await generate_exam(course["course_outline"], instructions)
    else:
        ai_result = await generate_assignment(course["course_outline"], instructions)

    if ai_result.get("out_of_scope"):
        return {"out_of_scope": True, "message": ai_result.get("message")}

    # Persist to DB
    title = data.title or ai_result.get("title", f"{data.assessment_type.value.capitalize()}")
    doc = {
        "course_id":       ObjectId(data.course_id),
        "course_name":     course["title"],
        "title":           title,
        "assessment_type": data.assessment_type.value,
        "total_marks":     ai_result.get("total_marks", 0),
        "time_limit":      data.time_limit or ai_result.get("estimated_duration_minutes") or ai_result.get("time_limit"),
        "questions":       ai_result.get("questions") or ai_result.get("tasks", []),
        "created_by":      ObjectId(teacher["id"]),
        "created_at":      datetime.utcnow(),
        "deadline":        data.deadline,
        "is_published":    False,
        "ai_raw":          ai_result,
    }
    result = await db["exams"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"message": "Assessment generated successfully", "exam": _fmt_exam(doc)}


@router.post("/publish", summary="Teacher: Publish exam so students can see it")
async def publish_exam(
    data: PublishExamRequest,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    exam = await db["exams"].find_one({"_id": ObjectId(data.exam_id)})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if str(exam["created_by"]) != teacher["id"]:
        raise HTTPException(status_code=403, detail="Not your exam")

    await db["exams"].update_one(
        {"_id": ObjectId(data.exam_id)},
        {"$set": {"is_published": True}}
    )
    return {"message": "Exam published successfully"}


@router.get("/course/{course_id}", summary="Get all exams for a course")
async def get_course_exams(
    course_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    query = {"course_id": ObjectId(course_id)}
    # Students only see published exams if enrolled
    if current_user["role"] == "student":
        enrolled = current_user.get("enrolled_courses", [])
        if course_id not in enrolled:
            return []  # Return empty list if not enrolled
        query["is_published"] = True

    exams = await db["exams"].find(query).to_list(length=100)
    
    # Strip answers for students
    if current_user["role"] == "student":
        for e in exams:
            clean_questions = []
            for q in e.get("questions", []):
                q_clean = {k: v for k, v in q.items() if k not in ("correct_answer", "expected_answer_guide", "rubric")}
                clean_questions.append(q_clean)
            e["questions"] = clean_questions

    return [_fmt_exam(e) for e in exams]


@router.get("/{exam_id}", summary="Get single exam detail")
async def get_exam(
    exam_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    exam = await db["exams"].find_one({"_id": ObjectId(exam_id)})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Students only see published exams of their enrolled courses
    if current_user["role"] == "student":
        enrolled = current_user.get("enrolled_courses", [])
        if str(exam["course_id"]) not in enrolled:
            raise HTTPException(status_code=403, detail="You are not enrolled in this course")
            
        if not exam.get("is_published"):
            raise HTTPException(status_code=403, detail="Exam not published yet")
        # Strip correct answers for students
        questions = []
        for q in exam.get("questions", []):
            q_clean = {k: v for k, v in q.items()
                       if k not in ("correct_answer", "expected_answer_guide", "rubric")}
            questions.append(q_clean)
        exam["questions"] = questions

    return _fmt_exam(exam)


@router.delete("/{exam_id}", summary="Teacher: Delete an exam")
async def delete_exam(
    exam_id: str,
    teacher=Depends(require_teacher),
    db=Depends(get_db)
):
    exam = await db["exams"].find_one({"_id": ObjectId(exam_id)})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if str(exam["created_by"]) != teacher["id"]:
        raise HTTPException(status_code=403, detail="Not your exam")

    await db["exams"].delete_one({"_id": ObjectId(exam_id)})
    return {"message": "Exam deleted"}
