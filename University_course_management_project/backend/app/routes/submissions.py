from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime
from bson import ObjectId
from app.models.schemas import SubmitAnswersRequest
from app.core.security import get_current_user, require_student
from app.core.database import get_db

router = APIRouter()

def _fmt_sub(s) -> dict:
    return {
        "id":           str(s["_id"]),
        "exam_id":      str(s["exam_id"]),
        "exam_title":   s.get("exam_title", "Untitled Exam"),
        "student_id":   str(s["student_id"]),
        "student_name": s.get("student_name", ""),
        "answers":      s.get("answers", []),
        "status":       s.get("status", "pending"),
        "submitted_at": s["submitted_at"],
        "integrity_logs": s.get("integrity_logs", []),
        "client_info":  s.get("client_info", {}),
        "flags":        s.get("flags", [])
    }


@router.get("/teacher", summary="Teacher: Get all submissions for my courses")
async def teacher_submissions(
    teacher=Depends(get_current_user),
    db=Depends(get_db)
):
    if teacher["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    # Logic: Submissions where exam was created by this teacher
    # We store teacher_id in courses, and course_id in exams...
    # Optimization: Find all courses for this teacher
    courses = await db["courses"].find({"teacher_id": ObjectId(teacher["id"])}).to_list(length=100)
    course_ids = [c["_id"] for c in courses]
    
    # Now find submissions for these courses
    subs = await db["submissions"].find({"course_id": {"$in": course_ids}}).sort("submitted_at", -1).to_list(length=200)
    return [_fmt_sub(s) for s in subs]



@router.post("/", summary="Student: Submit answers for an exam")
async def submit_answers(
    data: SubmitAnswersRequest,
    request: Request,
    student=Depends(require_student),
    db=Depends(get_db)
):
    # Validate exam exists and is published
    exam = await db["exams"].find_one({"_id": ObjectId(data.exam_id)})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if not exam.get("is_published"):
        raise HTTPException(status_code=403, detail="This exam is not available yet")

    # Check deadline
    if exam.get("deadline") and datetime.utcnow() > exam["deadline"]:
        raise HTTPException(status_code=400, detail="Submission deadline has passed")

    # Prevent duplicate submission
    existing = await db["submissions"].find_one({
        "exam_id":    ObjectId(data.exam_id),
        "student_id": ObjectId(student["id"])
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted this exam")

    answers = [{"question_id": a.question_id, "answer": a.answer} for a in data.answers]

    # IP & Device Fingerprinting
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "unknown")
    
    integrity_logs = [log.dict() for log in data.integrity_logs]
    
    # Flag checks
    flags = []
    if len(integrity_logs) > 5: # Arbitrary threshold for high activity
        flags.append("high_integrity_event_count")
    
    # Check if this student has used a different IP recently (multi-IP tracking)
    last_sub = await db["submissions"].find_one(
        {"student_id": ObjectId(student["id"])},
        sort=[("submitted_at", -1)]
    )
    if last_sub and last_sub.get("client_info", {}).get("ip") != client_ip:
        flags.append("multiple_ip_access")

    doc = {
        "exam_id":      ObjectId(data.exam_id),
        "exam_title":   exam.get("title", ""),
        "course_id":    exam.get("course_id"),
        "student_id":   ObjectId(student["id"]),
        "student_name": student["name"],
        "answers":      answers,
        "integrity_logs": integrity_logs,
        "client_info": {
            "ip": client_ip,
            "user_agent": user_agent,
            "provided_info": data.client_info
        },
        "flags":        flags,
        "status":       "pending",
        "submitted_at": datetime.utcnow(),
    }
    result = await db["submissions"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"message": "Answers submitted successfully", "submission": _fmt_sub(doc)}


@router.get("/my", summary="Student: Get my submissions")
async def my_submissions(
    student=Depends(require_student),
    db=Depends(get_db)
):
    subs = await db["submissions"].find(
        {"student_id": ObjectId(student["id"])}
    ).to_list(length=100)
    return [_fmt_sub(s) for s in subs]


@router.get("/exam/{exam_id}", summary="Teacher: Get all submissions for an exam")
async def exam_submissions(
    exam_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")

    subs = await db["submissions"].find(
        {"exam_id": ObjectId(exam_id)}
    ).to_list(length=500)
    return [_fmt_sub(s) for s in subs]


@router.get("/{submission_id}", summary="Get single submission")
async def get_submission(
    submission_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    sub = await db["submissions"].find_one({"_id": ObjectId(submission_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Students can only view their own
    if current_user["role"] == "student" and str(sub["student_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return _fmt_sub(sub)
